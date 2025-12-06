/**
 * @notice Dr. Birdy Books Staking: Grants $DBBP stakers exclusive access to premium content,
 *         platform features, and gated educational resources.
 * @dev Staked $DBBP unlocks file downloads and core protocol functionality.
 *      Part of the Dr. Birdy Books Protocol.
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFlexibleTieredStaking {
    function hasAccess(address user) external view returns (bool);
}

// OpenZeppelin Imports
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IPriceOracle {
    /**
     * @notice Returns the latest round data from Chainlink oracle
     * @return roundId The round ID
     * @return answer The price answer
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp when round was updated
     * @return answeredInRound The round ID in which answer was computed
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

interface IUniswapV2Pair {
    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IYieldStrategy {
    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 amount);
    function getTotalValue() external view returns (uint256 totalValue);
    function getYieldRate() external view returns (uint256 apyBps);
    function getStatus() external view returns (bool isActive, bool isSafe);
    function emergencyWithdraw() external returns (uint256 amount);
}

contract FlexibleTieredStaking is
    Ownable,
    AccessControl,
    ReentrancyGuard,
    Pausable
{
    // Note: Not using SafeERC20 because its balance checks are incompatible with reflection tokens
    // We use standard ERC20 transferFrom/transfer functions instead

    // --- Roles ---
    bytes32 public constant FILE_MANAGER_ROLE = keccak256("FILE_MANAGER_ROLE");

    // --- Pause State ---
    // Using Pausable from OpenZeppelin (whenNotPaused and whenPaused modifiers are inherited)

    // --- ERC20 Token to stake ---
    IERC20 public stakingToken;

    // --- Tier Struct ---
    struct Tier {
        uint256 threshold; // USD value with 8 decimals
        string name; // Tier label for clarity
    }

    Tier[] public tiers;

    // --- Arweave File Struct ---
    struct ArweaveFile {
        string txId; // Arweave transaction ID or URI
        string fileType; // e.g., "pdf", "jpeg" (optional)
        string description; // Optional description or metadata
        uint256 version; // Version number for file
        uint256 timestamp; // Timestamp when file was added or updated
    }

    // Files associated with each tier
    mapping(uint256 => ArweaveFile[]) private tierFiles;

    // Personal files associated with individual users
    mapping(address => ArweaveFile[]) private userFiles;

    // --- State Variables ---
    mapping(address => uint256) public userStakedTokens;
    mapping(address => uint256) public lastUnstakeTimestamp;
    mapping(address => uint256) public firstStakeTimestamp;
    mapping(address => uint256) public stakeTimestamp; // Track last stake timestamp for minimum staking duration

    uint256 public constant GRACE_PERIOD = 1 days;
    uint256 public constant MIN_STAKING_DURATION = 1 days; // Minimum time before unstaking allowed

    // Token price oracles to get USD price (primary and optional backup)
    // Note: These should be ETH/USD oracles (Chainlink). Token/USD is calculated via Uniswap.
    IPriceOracle public primaryPriceOracle;
    IPriceOracle public backupPriceOracle;
    
    // Uniswap V2 Pair for token/ETH price calculation
    address public uniswapPair;
    address public constant WETH = 0x4200000000000000000000000000000000000006; // Base WETH

    // Gas refund reward amount (in wei)
    uint256 public gasRefundReward = 0.001 ether;

    // Max users that can be processed in one clearExpiredAccess call
    uint256 public constant MAX_USERS_PER_CLEAR = 10;

    // --- Yield Generation ---
    IYieldStrategy public yieldStrategy;
    uint256 public maxYieldDeploymentBps = 5000; // 50% max (in basis points)
    uint256 public yieldDeployedShares; // Total shares deployed to yield strategy
    bool public yieldEnabled = false;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event TierUpdated(address indexed user, uint256 tierIndex);
    event UniswapPairSet(address indexed pairAddress);

    event TierAdded(uint256 tierIndex, uint256 threshold, string name);
    event TierModified(uint256 tierIndex, uint256 newThreshold, string newName);
    event TierRemoved(uint256 tierIndex);

    // Events for Arweave file management
    event TierFileAdded(
        uint256 indexed tierIndex,
        string txId,
        string fileType,
        string description,
        uint256 version,
        uint256 timestamp
    );
    event UserFileAdded(
        address indexed user,
        string txId,
        string fileType,
        string description,
        uint256 version,
        uint256 timestamp
    );

    // Event for file access logging
    event FileAccessLogged(
        address indexed user,
        uint256 indexed tierIndex,
        string txId,
        uint256 timestamp
    );
    event GasRefundRewardSet(uint256 indexed gasRefundReward);
    
    // Yield generation events
    event YieldStrategySet(address indexed strategy);
    event YieldDeposited(uint256 amount, uint256 shares);
    event YieldWithdrawn(uint256 shares, uint256 amount);
    event MaxYieldDeploymentUpdated(uint256 newMaxBps);
    event YieldEnabled(bool enabled);

    // --- Constructor ---
    /**
     * @notice Initializes the staking contract
     * @param _stakingToken Address of the ERC20 token to be staked
     * @param _primaryPriceOracle Address of the primary Chainlink price oracle
     * @param _backupPriceOracle Address of the backup Chainlink price oracle (optional, can be zero)
     */
    constructor(
        address _stakingToken,
        address _primaryPriceOracle,
        address _backupPriceOracle
    ) Ownable(msg.sender) {
        // Grant DEFAULT_ADMIN_ROLE to the deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Set up the staking token
        require(_stakingToken != address(0), "Invalid staking token address");
        stakingToken = IERC20(_stakingToken);

        // Set up oracles
        require(
            _primaryPriceOracle != address(0),
            "Invalid primary oracle address"
        );
        primaryPriceOracle = IPriceOracle(_primaryPriceOracle);

        if (_backupPriceOracle != address(0)) {
            backupPriceOracle = IPriceOracle(_backupPriceOracle);
        }

        // Grant roles
        _grantRole(FILE_MANAGER_ROLE, msg.sender);

        // Initialize with default tiers (optional)
        tiers.push(Tier(24 * 10 ** 8, "Tier 1")); // $24
        tiers.push(Tier(50 * 10 ** 8, "Tier 2")); // $50
        tiers.push(Tier(1000 * 10 ** 8, "Tier 3")); // $1000
    }

    // --- Pause Control Functions ---

    /**
     * @notice Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Tier Management Functions ---

    /**
     * @notice Add a new tier at the end (only owner)
     * @param threshold USD value threshold with 8 decimals
     * @param name Tier name label
     */
    function addTier(
        uint256 threshold,
        string calldata name
    ) external onlyOwner {
        require(bytes(name).length > 0, "Tier name required");
        tiers.push(Tier(threshold, name));
        emit TierAdded(tiers.length - 1, threshold, name);
    }

    /**
     * @notice Update tier threshold and/or name by index (only owner)
     * @param tierIndex Index of the tier to update
     * @param newThreshold New USD threshold with 8 decimals
     * @param newName New tier name label
     */
    function updateTier(
        uint256 tierIndex,
        uint256 newThreshold,
        string calldata newName
    ) external onlyOwner {
        require(tierIndex < tiers.length, "Invalid tier index");
        require(bytes(newName).length > 0, "Tier name required");

        tiers[tierIndex].threshold = newThreshold;
        tiers[tierIndex].name = newName;

        emit TierModified(tierIndex, newThreshold, newName);
    }

    /**
     * @notice Remove tier by index (only owner)
     * @param tierIndex Index of the tier to remove
     */
    function removeTier(uint256 tierIndex) external onlyOwner {
        require(tierIndex < tiers.length, "Invalid tier index");

        // Move last tier to removed spot and pop last
        tiers[tierIndex] = tiers[tiers.length - 1];
        tiers.pop();

        emit TierRemoved(tierIndex);
    }

    /**
     * @notice Get number of tiers
     * @return count Number of tiers
     */
    function getTierCount() external view returns (uint256 count) {
        return tiers.length;
    }

    /**
     * @notice Get tier info by index
     * @param tierIndex Index of the tier
     * @return threshold USD threshold with 8 decimals
     * @return name Tier name label
     */
    function getTier(
        uint256 tierIndex
    ) external view returns (uint256 threshold, string memory name) {
        require(tierIndex < tiers.length, "Invalid tier index");
        Tier storage t = tiers[tierIndex];
        return (t.threshold, t.name);
    }

    // --- Arweave File Management ---

    /**
     * @notice Add files to a tier (only FILE_MANAGER_ROLE)
     * @param tierIndex Tier index
     * @param txIds Array of Arweave transaction IDs or URIs
     * @param fileTypes Array of file types (e.g., "pdf", "jpeg")
     * @param descriptions Array of file descriptions
     * @param versions Array of version numbers
     */
    function addFileToTierBatch(
        uint256 tierIndex,
        string[] calldata txIds,
        string[] calldata fileTypes,
        string[] calldata descriptions,
        uint256[] calldata versions
    ) external onlyRole(FILE_MANAGER_ROLE) {
        require(tierIndex < tiers.length, "Invalid tier");
        require(
            txIds.length == fileTypes.length &&
                txIds.length == descriptions.length &&
                txIds.length == versions.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < txIds.length; i++) {
            tierFiles[tierIndex].push(
                ArweaveFile({
                    txId: txIds[i],
                    fileType: fileTypes[i],
                    description: descriptions[i],
                    version: versions[i],
                    timestamp: block.timestamp
                })
            );
            emit TierFileAdded(
                tierIndex,
                txIds[i],
                fileTypes[i],
                descriptions[i],
                versions[i],
                block.timestamp
            );
        }
    }

    /**
     * @notice Add personal files to a user (only FILE_MANAGER_ROLE)
     * @param user User address
     * @param txIds Array of Arweave transaction IDs or URIs
     * @param fileTypes Array of file types
     * @param descriptions Array of descriptions
     * @param versions Array of version numbers
     */
    function addFileToUserBatch(
        address user,
        string[] calldata txIds,
        string[] calldata fileTypes,
        string[] calldata descriptions,
        uint256[] calldata versions
    ) external onlyRole(FILE_MANAGER_ROLE) {
        require(user != address(0), "Invalid user address");
        require(
            txIds.length == fileTypes.length &&
                txIds.length == descriptions.length &&
                txIds.length == versions.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < txIds.length; i++) {
            userFiles[user].push(
                ArweaveFile({
                    txId: txIds[i],
                    fileType: fileTypes[i],
                    description: descriptions[i],
                    version: versions[i],
                    timestamp: block.timestamp
                })
            );
            emit UserFileAdded(
                user,
                txIds[i],
                fileTypes[i],
                descriptions[i],
                versions[i],
                block.timestamp
            );
        }
    }

    /**
     * @notice Get files associated with a tier
     * @param tierIndex Tier index
     * @return Array of ArweaveFile structs
     */
    function getTierFiles(
        uint256 tierIndex
    ) external view returns (ArweaveFile[] memory) {
        require(tierIndex < tiers.length, "Invalid tier index");
        return tierFiles[tierIndex];
    }

    /**
     * @notice Get personal files associated with a user
     * @param user User address
     * @return Array of ArweaveFile structs
     */
    function getUserFiles(
        address user
    ) external view returns (ArweaveFile[] memory) {
        return userFiles[user];
    }

    /**
     * @notice Log when a user accesses a file (anyone can call, logs event)
     * @param user User address
     * @param tierIndex Tier index
     * @param txId Arweave transaction ID or URI
     */
    function logFileAccess(
        address user,
        uint256 tierIndex,
        string calldata txId
    ) external {
        emit FileAccessLogged(user, tierIndex, txId, block.timestamp);
    }

    // --- Staking Functions ---

    /**
     * @notice Stake tokens by transferring them to contract
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Cannot stake zero tokens");
        require(address(stakingToken) != address(0), "Staking token not set");
        require(address(primaryPriceOracle) != address(0), "Price oracle not set");

        // Use standard transferFrom instead of SafeERC20's safeTransferFrom
        // SafeERC20's balance checks are incompatible with reflection tokens
        // We trust the token's transferFrom implementation
        bool success = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        if (firstStakeTimestamp[msg.sender] == 0) {
            firstStakeTimestamp[msg.sender] = block.timestamp;
        }

        userStakedTokens[msg.sender] += amount;
        stakeTimestamp[msg.sender] = block.timestamp;

        _updateUserTier(msg.sender);

        // Optionally deploy to yield strategy if enabled and within limits
        if (yieldEnabled && address(yieldStrategy) != address(0)) {
            _deployToYieldIfPossible();
        }

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Batch stake multiple amounts (gas efficient)
     * @param amounts Array of token amounts to stake
     */
    function stakeBatch(
        uint256[] calldata amounts
    ) external whenNotPaused nonReentrant {
        require(amounts.length > 0, "No amounts provided");
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Zero amount in batch");
            totalAmount += amounts[i];
        }

        // Use standard transferFrom instead of SafeERC20's safeTransferFrom
        // SafeERC20's balance checks are incompatible with reflection tokens
        bool success = stakingToken.transferFrom(msg.sender, address(this), totalAmount);
        require(success, "Token transfer failed");

        if (firstStakeTimestamp[msg.sender] == 0) {
            firstStakeTimestamp[msg.sender] = block.timestamp;
        }

        for (uint256 i = 0; i < amounts.length; i++) {
            userStakedTokens[msg.sender] += amounts[i];
        }
        stakeTimestamp[msg.sender] = block.timestamp;

        _updateUserTier(msg.sender);

        emit Staked(msg.sender, totalAmount);
    }

    /**
     * @notice Unstake tokens by transferring them back to user
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Cannot unstake zero tokens");
        require(
            userStakedTokens[msg.sender] >= amount,
            "Insufficient staked tokens"
        );

        // Enforce minimum staking duration before unstaking allowed
        require(
            block.timestamp >=
                stakeTimestamp[msg.sender] + MIN_STAKING_DURATION,
            "Minimum staking duration not met"
        );

        userStakedTokens[msg.sender] -= amount;
        lastUnstakeTimestamp[msg.sender] = block.timestamp;

        _updateUserTier(msg.sender);

        // Withdraw from yield if needed to cover unstaking
        if (yieldEnabled && address(yieldStrategy) != address(0) && yieldDeployedShares > 0) {
            _withdrawFromYieldIfNeeded(amount);
        }

        // Transfer tokens back to user using custom unstaking function
        // This properly handles reflection token transfers from excluded staking contract
        // Cast to ReflectiveToken to access transferForUnstaking
        (bool success, ) = address(stakingToken).call(
            abi.encodeWithSignature("transferForUnstaking(address,uint256)", msg.sender, amount)
        );
        require(success, "Token transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Batch unstake multiple amounts (gas efficient)
     * @param amounts Array of token amounts to unstake
     */
    function unstakeBatch(
        uint256[] calldata amounts
    ) external whenNotPaused nonReentrant {
        require(amounts.length > 0, "No amounts provided");
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Zero amount in batch");
            require(
                userStakedTokens[msg.sender] >= amounts[i],
                "Insufficient staked tokens"
            );
            totalAmount += amounts[i];
        }

        // Enforce minimum staking duration before unstaking allowed
        require(
            block.timestamp >=
                stakeTimestamp[msg.sender] + MIN_STAKING_DURATION,
            "Minimum staking duration not met"
        );

        for (uint256 i = 0; i < amounts.length; i++) {
            userStakedTokens[msg.sender] -= amounts[i];
        }
        lastUnstakeTimestamp[msg.sender] = block.timestamp;

        _updateUserTier(msg.sender);

        // Transfer tokens back to user using custom unstaking function
        // This properly handles reflection token transfers from excluded staking contract
        // Cast to ReflectiveToken to access transferForUnstaking
        (bool success, ) = address(stakingToken).call(
            abi.encodeWithSignature("transferForUnstaking(address,uint256)", msg.sender, totalAmount)
        );
        require(success, "Token transfer failed");

        emit Unstaked(msg.sender, totalAmount);
    }

    // --- Internal: Update user's tier ---

    /**
     * @dev Update user's tier based on current USD stake value
     * @param user User address
     */
    function _updateUserTier(address user) internal {
        // Check if oracles are properly initialized before trying to get USD value
        if (address(primaryPriceOracle) == address(0)) {
            // If no oracle is set, emit tier update with max value (no tier)
            emit TierUpdated(user, type(uint256).max);
            return;
        }

        uint256 usdValue = _getUserUsdValue(user);

        uint256 bestTierIndex = type(uint256).max; // Use max uint as sentinel for no tier
        uint256 highestThreshold = 0;

        for (uint256 i = 0; i < tiers.length; i++) {
            if (
                usdValue >= tiers[i].threshold &&
                tiers[i].threshold > highestThreshold
            ) {
                highestThreshold = tiers[i].threshold;
                bestTierIndex = i;
            }
        }

        if (bestTierIndex == type(uint256).max) {
            emit TierUpdated(user, type(uint256).max);
        } else {
            emit TierUpdated(user, bestTierIndex);
        }
    }

    // --- Access Check ---

    /**
     * @notice Check if user has access based on tier and grace period after unstake
     * @param user User address
     * @return hasAccess Boolean indicating access status
     */
    function hasAccess(address user) public view returns (bool) {
        uint256 usdValue = _getUserUsdValue(user);
        uint256 bestTierIndex = type(uint256).max;
        uint256 highestThreshold = 0;

        for (uint256 i = 0; i < tiers.length; i++) {
            if (
                usdValue >= tiers[i].threshold &&
                tiers[i].threshold > highestThreshold
            ) {
                highestThreshold = tiers[i].threshold;
                bestTierIndex = i;
            }
        }

        if (bestTierIndex == type(uint256).max) {
            // No tier met, check grace period after unstake
            if (block.timestamp <= lastUnstakeTimestamp[user] + GRACE_PERIOD) {
                return true;
            }
            return false;
        }

        return true;
    }

    /**
     * @notice Get current tier index and name of a user
     * @param user User address
     * @return tierIndex Tier index or -1 if none
     * @return tierName Tier name or empty string if none
     */
    function getUserTier(
        address user
    ) external view returns (int256 tierIndex, string memory tierName) {
        uint256 usdValue = _getUserUsdValue(user);

        int256 bestTierIndex = -1;
        uint256 highestThreshold = 0;

        for (uint256 i = 0; i < tiers.length; i++) {
            if (
                usdValue >= tiers[i].threshold &&
                tiers[i].threshold > highestThreshold
            ) {
                highestThreshold = tiers[i].threshold;
                bestTierIndex = int256(i);
            }
        }

        if (bestTierIndex == -1) {
            return (-1, "");
        } else {
            return (bestTierIndex, tiers[uint256(bestTierIndex)].name);
        }
    }

    // --- Helper: Get USD value of user stake ---

    /**
     * @dev Get USD value of user's staked tokens using oracles
     * @param user User address
     * @return usdValue USD value with 8 decimals
     * @notice Oracle returns ETH/USD, so we need to:
     *         1. Get token/ETH price from Uniswap (if pair exists)
     *         2. Multiply by ETH/USD from oracle
     *         3. This gives token/USD price
     *         If no Uniswap pair exists, assume 1 token = 1 USD for testing
     */
    function _getUserUsdValue(address user) internal view returns (uint256) {
        uint256 stakedTokens = userStakedTokens[user];
        if (stakedTokens == 0) {
            return 0;
        }

        // SIMPLIFIED FOR NOW: Assume 1 token = $1 USD
        // This allows staking to work while we debug the oracle/Uniswap integration
        // TODO: Re-enable full USD calculation once Uniswap pair is set
        if (uniswapPair == address(0)) {
            // Return USD value with 8 decimals (stakedTokens is 18 decimals)
            // 1 token (1e18) = 1 USD (1e8)
            return stakedTokens / (10 ** 10); // Convert from 18 to 8 decimals
        }

        // Get ETH/USD price from oracle
        int256 ethUsdPrice = 0;
        bool hasValidOracle = false;
        
        try primaryPriceOracle.latestRoundData() returns (
            uint80,
            int256 primaryPrice,
            uint256,
            uint256 primaryUpdatedAt,
            uint80
        ) {
            if (
                primaryPrice > 0 &&
                (block.timestamp - primaryUpdatedAt) < 24 hours
            ) {
                ethUsdPrice = primaryPrice;
                hasValidOracle = true;
            } else if (address(backupPriceOracle) != address(0)) {
                // Try backup oracle if primary is stale
                try backupPriceOracle.latestRoundData() returns (
                    uint80,
                    int256 backupPrice,
                    uint256,
                    uint256 backupUpdatedAt,
                    uint80
                ) {
                    if (
                        backupPrice > 0 &&
                        (block.timestamp - backupUpdatedAt) < 24 hours
                    ) {
                        ethUsdPrice = backupPrice;
                        hasValidOracle = true;
                    }
                } catch {
                    // Backup oracle failed
                }
            }
        } catch {
            // Primary oracle failed, try backup if available
            if (address(backupPriceOracle) != address(0)) {
                try backupPriceOracle.latestRoundData() returns (
                    uint80,
                    int256 backupPrice,
                    uint256,
                    uint256 backupUpdatedAt,
                    uint80
                ) {
                    if (
                        backupPrice > 0 &&
                        (block.timestamp - backupUpdatedAt) < 24 hours
                    ) {
                        ethUsdPrice = backupPrice;
                        hasValidOracle = true;
                    }
                } catch {
                    // Both oracles failed
                }
            }
        }

        if (!hasValidOracle || ethUsdPrice <= 0) {
            return 0; // No valid oracle price
        }

        // Try to get token/ETH price from Uniswap pair
        uint256 tokenUsdPrice = 0;
        if (uniswapPair != address(0)) {
            try IUniswapV2Pair(uniswapPair).getReserves() returns (
                uint112 reserve0,
                uint112 reserve1,
                uint32
            ) {
                address token0 = IUniswapV2Pair(uniswapPair).token0();
                address token1 = IUniswapV2Pair(uniswapPair).token1();
                
                // Determine which reserve is token and which is WETH
                uint256 reserveToken;
                uint256 reserveETH;
                
                if (token0 == address(stakingToken)) {
                    // Token is token0, WETH is token1
                    reserveToken = uint256(reserve0);
                    reserveETH = uint256(reserve1);
                } else if (token1 == address(stakingToken)) {
                    // Token is token1, WETH is token0
                    reserveToken = uint256(reserve1);
                    reserveETH = uint256(reserve0);
                } else {
                    // Pair doesn't contain our token
                    reserveToken = 0;
                    reserveETH = 0;
                }

                // Calculate token/ETH price: (reserveETH * 1e18) / reserveToken
                // This gives ETH per token (with 18 decimals)
                if (reserveToken > 0 && reserveETH > 0) {
                    // token/ETH = reserveETH / reserveToken (both have 18 decimals)
                    // token/USD = (reserveETH / reserveToken) * (ETH/USD)
                    // = (reserveETH * ETH/USD) / reserveToken
                    // Result needs to be in USD per token with 8 decimals
                    // reserveETH and reserveToken have 18 decimals
                    // ETH/USD has 8 decimals
                    // So: (reserveETH * ETH/USD) / reserveToken = (reserveETH * ETH/USD * 1e8) / (reserveToken * 1e8)
                    // Simplified: (reserveETH * ethUsdPrice * 1e8) / (reserveToken * 1e8)
                    // = (reserveETH * ethUsdPrice) / reserveToken
                    tokenUsdPrice = (reserveETH * uint256(ethUsdPrice)) / reserveToken;
                }
            } catch {
                // Uniswap pair call failed, will use fallback
            }
        }

        // If we couldn't get price from Uniswap, assume 1 token = 1 USD for testing
        // This is a fallback for when there's no liquidity yet
        if (tokenUsdPrice == 0) {
            tokenUsdPrice = 1e8; // 1 USD per token with 8 decimals
        }

        // Calculate USD value: (stakedTokens * tokenUsdPrice) / 1e18
        // stakedTokens has 18 decimals, tokenUsdPrice has 8 decimals
        // Result should have 8 decimals: (1e18 * 1e8) / 1e18 = 1e8
        return (stakedTokens * tokenUsdPrice) / 1e18;
    }

    // --- Emergency Withdrawal ---

    /**
     * @notice Emergency withdraw staked tokens (only allowed when paused)
     */
    function emergencyWithdraw() external whenPaused nonReentrant {
        uint256 balance = userStakedTokens[msg.sender];
        require(balance > 0, "No staked tokens to withdraw");

        userStakedTokens[msg.sender] = 0;

        // Transfer tokens back to user (using standard transfer instead of SafeERC20)
        bool success = stakingToken.transfer(msg.sender, balance);
        require(success, "Token transfer failed");

        emit Unstaked(msg.sender, balance);
    }

    // --- Admin functions to update oracles and gas refund amount ---

    /**
     * @notice Set staking token address (only owner)
     * @param _stakingToken New staking token address
     */
    function setStakingToken(address _stakingToken) external onlyOwner {
        require(_stakingToken != address(0), "Invalid staking token address");
        stakingToken = IERC20(_stakingToken);
    }

    /**
     * @notice Set primary price oracle address (only owner)
     * @param _primaryPriceOracle New primary oracle address
     */
    function setPrimaryPriceOracle(
        address _primaryPriceOracle
    ) external onlyOwner {
        require(_primaryPriceOracle != address(0), "Invalid address");
        primaryPriceOracle = IPriceOracle(_primaryPriceOracle);
    }

    /**
     * @notice Set backup price oracle address (only owner)
     * @param _backupPriceOracle New backup oracle address
     */
    function setBackupPriceOracle(
        address _backupPriceOracle
    ) external onlyOwner {
        backupPriceOracle = IPriceOracle(_backupPriceOracle);
    }

    /**
     * @notice Set gas refund reward amount in wei (only owner)
     * @param _gasRefundReward New gas refund amount
     */
    function setGasRefundReward(uint256 _gasRefundReward) external onlyOwner {
        gasRefundReward = _gasRefundReward;
        emit GasRefundRewardSet(_gasRefundReward);
    }

    /**
     * @notice Withdraw excess ETH from contract (only owner)
     * @param amount Amount of ETH to withdraw in wei
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(msg.sender).transfer(amount);
    }

    // --- Helper: Check token allowance ---

    /**
     * @notice Check the token allowance of a user for this contract
     * @param user User address
     * @return allowance Amount of tokens approved for staking contract
     */
    function allowance(address user) external view returns (uint256) {
        return stakingToken.allowance(user, address(this));
    }

    // --- Utility Functions ---

    /**
     * @notice Get contract status information
     * @return isPaused Whether contract is paused
     * @return stakingTokenSet Whether staking token is set
     * @return primaryOracleSet Whether primary oracle is set
     * @return backupOracleSet Whether backup oracle is set
     * @return tierCount Number of tiers configured
     */
    function getContractStatus()
        external
        view
        returns (
            bool isPaused,
            bool stakingTokenSet,
            bool primaryOracleSet,
            bool backupOracleSet,
            uint256 tierCount
        )
    {
        return (
            paused(),
            address(stakingToken) != address(0),
            address(primaryPriceOracle) != address(0),
            address(backupPriceOracle) != address(0),
            tiers.length
        );
    }

    /**
     * @notice Get user staking information
     * @param user User address
     * @return stakedAmount Amount of tokens staked by user
     * @return usdValue USD value of staked tokens
     * @return userHasAccess Whether user has access based on tier
     * @return canUnstake Whether user can unstake (minimum duration met)
     */
    function getUserStakingInfo(
        address user
    )
        external
        view
        returns (
            uint256 stakedAmount,
            uint256 usdValue,
            bool userHasAccess,
            bool canUnstake
        )
    {
        stakedAmount = userStakedTokens[user];
        usdValue = _getUserUsdValue(user);
        userHasAccess = hasAccess(user);
        canUnstake =
            block.timestamp >= stakeTimestamp[user] + MIN_STAKING_DURATION;
    }

    /**
     * @notice Set Uniswap pair address for token/ETH price calculation
     * @param _uniswapPair Address of the Uniswap V2 pair
     */
    function setUniswapPair(address _uniswapPair) external onlyOwner {
        uniswapPair = _uniswapPair;
        emit UniswapPairSet(_uniswapPair);
    }

    /**
     * @notice Get oracle information
     * @return primaryOracle Address of primary oracle
     * @return backupOracle Address of backup oracle
     * @return currentGasRefundReward Current gas refund reward amount
     * @return pairAddress Address of Uniswap pair (if set)
     */
    function getOracleInfo()
        external
        view
        returns (
            address primaryOracle,
            address backupOracle,
            uint256 currentGasRefundReward,
            address pairAddress
        )
    {
        return (
            address(primaryPriceOracle),
            address(backupPriceOracle),
            gasRefundReward,
            uniswapPair
        );
    }

    /**
     * @notice Get total staked tokens across all users
     * @return total Total staked amount
     */
    function getTotalStaked() external view returns (uint256 total) {
        return stakingToken.balanceOf(address(this));
    }

    /**
     * @notice Get contract balances
     * @return ethBalance ETH balance of contract
     * @return tokenBalance Token balance of contract
     */
    function getContractBalances()
        external
        view
        returns (uint256 ethBalance, uint256 tokenBalance)
    {
        return (address(this).balance, stakingToken.balanceOf(address(this)));
    }

    /**
     * @notice Verify if user is a staker for a specific tier
     * @param user User address
     * @param tierIndex Tier index to check
     * @return isStaker True if user meets tier requirements
     */
    function verifyStaker(
        address user,
        uint256 tierIndex
    ) external view returns (bool isStaker) {
        if (tierIndex >= tiers.length) return false;

        uint256 usdValue = _getUserUsdValue(user);
        return usdValue >= tiers[tierIndex].threshold;
    }

    /**
     * @notice Check if user meets tier requirement
     * @param user User address
     * @param tierIndex Tier index to check
     * @return meetsRequirement True if user meets the tier requirement
     */
    function meetsTierRequirement(
        address user,
        uint256 tierIndex
    ) external view returns (bool meetsRequirement) {
        if (tierIndex >= tiers.length) return false;

        uint256 usdValue = _getUserUsdValue(user);
        return usdValue >= tiers[tierIndex].threshold;
    }

    // --- Yield Generation Management ---

    /**
     * @notice Set the yield strategy contract (only owner)
     * @param _strategy Address of the yield strategy contract
     */
    function setYieldStrategy(address _strategy) external onlyOwner {
        require(_strategy != address(0), "Invalid strategy address");
        yieldStrategy = IYieldStrategy(_strategy);
        emit YieldStrategySet(_strategy);
    }

    /**
     * @notice Enable or disable yield generation (only owner)
     * @param _enabled True to enable, false to disable
     */
    function setYieldEnabled(bool _enabled) external onlyOwner {
        yieldEnabled = _enabled;
        emit YieldEnabled(_enabled);
    }

    /**
     * @notice Set maximum percentage of staked tokens that can be deployed to yield (only owner)
     * @param _maxBps Maximum percentage in basis points (e.g., 5000 = 50%)
     */
    function setMaxYieldDeployment(uint256 _maxBps) external onlyOwner {
        require(_maxBps <= 10000, "Cannot exceed 100%");
        maxYieldDeploymentBps = _maxBps;
        emit MaxYieldDeploymentUpdated(_maxBps);
    }

    /**
     * @notice Manually deploy tokens to yield strategy (only owner)
     * @param amount Amount of tokens to deploy
     */
    function deployToYield(uint256 amount) external onlyOwner nonReentrant {
        require(yieldEnabled, "Yield not enabled");
        require(address(yieldStrategy) != address(0), "Strategy not set");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 totalStaked = stakingToken.balanceOf(address(this));
        uint256 currentDeployed = yieldDeployedShares;
        uint256 maxDeployable = (totalStaked * maxYieldDeploymentBps) / 10000;
        
        require(currentDeployed + amount <= maxDeployable, "Exceeds max deployment limit");
        
        // Check strategy status
        (bool isActive, bool isSafe) = yieldStrategy.getStatus();
        require(isActive && isSafe, "Strategy not safe");
        
        // Approve and deposit
        bool success = stakingToken.approve(address(yieldStrategy), amount);
        require(success, "Approval failed");
        
        uint256 shares = yieldStrategy.deposit(amount);
        yieldDeployedShares += shares;
        
        emit YieldDeposited(amount, shares);
    }

    /**
     * @notice Withdraw tokens from yield strategy (only owner)
     * @param shares Number of shares to withdraw
     */
    function withdrawFromYield(uint256 shares) external onlyOwner nonReentrant {
        require(shares > 0, "Shares must be greater than 0");
        require(shares <= yieldDeployedShares, "Insufficient shares");
        
        uint256 amount = yieldStrategy.withdraw(shares);
        yieldDeployedShares -= shares;
        
        emit YieldWithdrawn(shares, amount);
    }

    /**
     * @notice Emergency withdraw all funds from yield strategy (only owner)
     */
    function emergencyWithdrawFromYield() external onlyOwner nonReentrant {
        require(address(yieldStrategy) != address(0), "Strategy not set");
        
        uint256 amount = yieldStrategy.emergencyWithdraw();
        yieldDeployedShares = 0;
        
        emit YieldWithdrawn(yieldDeployedShares, amount);
    }

    /**
     * @notice Get yield strategy information
     * @return strategyAddress Address of yield strategy
     * @return deployedShares Total shares deployed
     * @return totalValue Total value in strategy
     * @return apyBps Annual percentage yield in basis points
     * @return isActive Whether strategy is active
     */
    function getYieldInfo() external view returns (
        address strategyAddress,
        uint256 deployedShares,
        uint256 totalValue,
        uint256 apyBps,
        bool isActive
    ) {
        if (address(yieldStrategy) == address(0)) {
            return (address(0), 0, 0, 0, false);
        }
        
        totalValue = yieldStrategy.getTotalValue();
        apyBps = yieldStrategy.getYieldRate();
        (isActive, ) = yieldStrategy.getStatus();
        
        return (
            address(yieldStrategy),
            yieldDeployedShares,
            totalValue,
            apyBps,
            isActive
        );
    }

    /**
     * @dev Internal function to deploy tokens to yield if conditions are met
     */
    function _deployToYieldIfPossible() internal {
        if (!yieldEnabled || address(yieldStrategy) == address(0)) {
            return;
        }
        
        // Check strategy status
        (bool isActive, bool isSafe) = yieldStrategy.getStatus();
        if (!isActive || !isSafe) {
            return;
        }
        
        uint256 totalStaked = stakingToken.balanceOf(address(this));
        uint256 currentDeployed = yieldDeployedShares;
        uint256 maxDeployable = (totalStaked * maxYieldDeploymentBps) / 10000;
        
        // Only deploy if we're below the limit
        if (currentDeployed < maxDeployable) {
            uint256 availableToDeploy = maxDeployable - currentDeployed;
            uint256 contractBalance = stakingToken.balanceOf(address(this));
            
            // Deploy a small portion to avoid gas issues
            uint256 deployAmount = availableToDeploy < contractBalance 
                ? availableToDeploy 
                : contractBalance;
            
            if (deployAmount > 0) {
                // Try to deploy, but don't fail if it doesn't work
                try stakingToken.approve(address(yieldStrategy), deployAmount) returns (bool success) {
                    if (success) {
                        try yieldStrategy.deposit(deployAmount) returns (uint256 shares) {
                            yieldDeployedShares += shares;
                            emit YieldDeposited(deployAmount, shares);
                        } catch {
                            // Silently fail - yield deployment is optional
                        }
                    }
                } catch {
                    // Silently fail - yield deployment is optional
                }
            }
        }
    }

    /**
     * @dev Internal function to withdraw from yield if needed for unstaking
     */
    function _withdrawFromYieldIfNeeded(uint256 requiredAmount) internal {
        if (yieldDeployedShares == 0) {
            return;
        }
        
        uint256 contractBalance = stakingToken.balanceOf(address(this));
        
        // Only withdraw if we don't have enough in contract
        if (contractBalance < requiredAmount) {
            uint256 needed = requiredAmount - contractBalance;
            
            // Calculate shares needed (approximate 1:1 for simplicity)
            uint256 sharesToWithdraw = needed <= yieldDeployedShares 
                ? needed 
                : yieldDeployedShares;
            
            if (sharesToWithdraw > 0) {
                try yieldStrategy.withdraw(sharesToWithdraw) returns (uint256 amount) {
                    yieldDeployedShares -= sharesToWithdraw;
                    emit YieldWithdrawn(sharesToWithdraw, amount);
                } catch {
                    // If withdrawal fails, we'll try to use contract balance
                    // This shouldn't happen if strategy is properly implemented
                }
            }
        }
    }

    // --- Allow contract to receive ETH for gas refund rewards ---
    receive() external payable {}

    fallback() external payable {}
}
