/**
 * @notice Dr. Birdy Books Protocol: Bridging Education, Media, and Cryptocurrency.
 *         Learn more: https://www.drbirdybooks.com
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Upgradeable contracts
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

// Non-upgradeable interfaces/utilities
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./TokenDistribution.sol";

interface IFlexibleTieredStaking {
    function verifyStaker(address user, uint256 amount) external returns (bool);
}

// [1] Chainlink Interface
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
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

interface IUniswapV2Router {
    // Core functions (present in both interfaces)
    function getAmountsOut(
        uint256 amountIn,
        address[] memory path
    ) external view returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    // Liquidity functions (merged versions)
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired, // Standardized parameter name
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    // Utility functions (unique to each original interface)
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

interface IUniswapV2Factory {
    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair);
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair);
}

interface IUniswapV2Pair {
    function getReserves()
        external
        view
        returns (
            uint256 reserve0,
            uint256 reserve1,
            uint256 blockTimestampLast
        );
    function token0() external view returns (address); //
    function token1() external view returns (address); //
}

interface IArweaveGateway {
    function verifyTransaction(
        string calldata txId
    ) external view returns (bool);
}

interface IImprovedTimelock {
    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 executeTime
    ) external;
}

contract ReflectiveToken is
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC20Upgradeable
{
    using SafeERC20 for IERC20;
    using Address for address;

    // Storage gap for upgrade safety
    uint256[50] private __gap;

    // Token Info
    string private constant _NAME = "Dr Birdy Books Protocol Token";
    string private constant _SYMBOL = "DBBPT";
    uint8 private constant _DECIMALS = 18;
    uint256 private constant _TOTAL_SUPPLY = 10_000_000 * 10 ** _DECIMALS;

    // Chainlink Constants
    address public constant CHAINLINK_ETH_USD_FEED =
        0x71041dDDaD356F8F9546D0Ba93B54C0b4C458375; //
    AggregatorV3Interface public ethUsdFeed;
    uint256 private constant MIN_CHAINLINK_ANSWER = 1e8; //

    // Other Constants
    uint256 private constant MAX = ~uint256(0);
    uint256 private constant TWO_DAYS = 2 * 24 * 60 * 60;
    uint256 private constant MIN_LIQUIDITY_ETH = 0.1 * 10 ** 18;
    uint256 private constant MIN_SLIPPAGE = 950; // 95% minimum expected output (in basis points)

    // Limits
    uint256 public maxTxAmount = _TOTAL_SUPPLY / 100; // 1% of supply
    uint256 public swapThreshold = _TOTAL_SUPPLY / 100; // 1% of supply

    // Fee Structure (in basis points)
    uint256 public taxFee = 100; // 1%
    uint256 public liquidityFee = 200; // 2%
    uint256 public marketingFee = 200; // 2%
    uint256 public totalFee = taxFee + liquidityFee + marketingFee;

    // Slippage configuration (in basis points) - OPTIMIZED FOR BASE LAUNCH
    uint256 public swapSlippageBps = 50; // 0.5% default for low-liquidity swaps
    uint256 public liquiditySlippageBps = 30; // 0.3% default for liquidity operations

    // Addresses
    address public uniswapRouter;
    address public marketingWallet;
    address public stakingContract;
    address public arweaveGateway;
    address public immutable WETH = 0x4200000000000000000000000000000000000006;
    address public pairAddress;
    address public timelock;
    uint256 public timelockDelay;
    TokenDistribution public tokenDistribution;

    // Reflection Tracking
    uint256 private _rTotal;
    uint256 private _tFeeTotal;
    uint256 private _rFeeTotal;

    // State
    bool public tradingEnabled = true;
    bool public swapEnabled = true;
    bool public inSwap = false;
    bool public swapped;

    // Exclusions and Tracking
    mapping(address => bool) private _isExcludedFromFee;
    mapping(address => bool) private _isBlacklisted;
    mapping(address => uint256) private _rOwned;
    mapping(address => uint256) private _tOwned;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Events (custom + new ones for swapAndLiquify)
    event FeeChangeQueued(
        uint256 taxFee,
        uint256 liquidityFee,
        uint256 marketingFee,
        uint256 executeTime
    );
    event FeeChangeExecuted(
        uint256 taxFee,
        uint256 liquidityFee,
        uint256 marketingFee
    );
    event MarketingWalletQueued(address newWallet, uint256 executeTime);
    event MarketingWalletUpdated(address newWallet);
    event LiquidityAdded(
        uint256 amountETH,
        uint256 amountToken,
        uint256 liquidity
    ); // Updated to include liquidity
    event StakingContractUpdated(address stakingContract, bool isExcluded);
    event ArweaveGatewaySet(address arweaveGateway);
    event ArweaveGatewayUpdateQueued(address newGateway, uint256 executeTime);
    event ArweaveTransactionVerified(
        address indexed user,
        string txId,
        bool isValid
    );
    event FileAccessLogged(
        address indexed user,
        string txId,
        uint256 timestamp
    );
    // NEW EVENTS FOR SWAP AND LIQUIDITY
    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensForLiquidity,
        uint256 liquidityAdded
    );
    event MarketingFeeDistributed(uint256 amount);
    event SlippageUpdated(
        uint256 swapSlippageBps,
        uint256 liquiditySlippageBps
    );
    // NEW EVENTS FOR DISTRIBUTION AND BURNING
    event TokensBurned(address indexed burner, uint256 amount);
    event TimelockSet(address indexed timelock);
    event SwapThresholdSet(uint256 indexed threshold);
    event DistributionContractSet(address indexed distributionContract);
    event InitialDistributionCompleted(uint256 totalDistributed);

    // Modifiers
    modifier onlyTimelock() {
        require(msg.sender == timelock, "ReflectiveToken: caller not timelock");
        _;
    }

    modifier onlyStakingContract() {
        require(
            msg.sender == stakingContract,
            "ReflectiveToken: caller not staking contract"
        );
        _;
    }

    modifier tradingCheck() {
        require(tradingEnabled, "Trading is not enabled yet");
        _;
    }

    /// @custom:oz-upgrades-for-constructor
    constructor() {}

    function initialize(
        address _uniswapRouter,
        address _marketingWallet,
        address _stakingContract,
        address _arweaveGateway,
        address _priceOracle
    ) public initializer {
        // Validate addresses
        require(_uniswapRouter != address(0), "Invalid router address");
        require(_marketingWallet != address(0), "Invalid marketing wallet");
        require(_stakingContract != address(0), "Invalid staking contract");
        require(_arweaveGateway != address(0), "Invalid Arweave gateway");
        require(_priceOracle != address(0), "Invalid price oracle");

        // Initialize OpenZeppelin upgradeable contracts
        __ReentrancyGuard_init();
        __ERC20_init(_NAME, _SYMBOL);
        __Ownable_init_unchained(msg.sender);

        // Set basic state variables without external calls
        ethUsdFeed = AggregatorV3Interface(_priceOracle);
        uniswapRouter = _uniswapRouter;
        marketingWallet = _marketingWallet;
        stakingContract = _stakingContract;
        arweaveGateway = _arweaveGateway;
        // timelock will be set later via setTimelock()

        // Manually set owner as backup (in case __Ownable_init_unchained doesn't work)
        _transferOwnership(msg.sender);

        // Debug: Check if ownership was set
        require(
            owner() == msg.sender,
            "Ownership not set correctly during initialization"
        );

        // Initialize reflection system FIRST
        _rTotal = (MAX - (MAX % _TOTAL_SUPPLY));
        
        // For excluded accounts (like deployer), ONLY use _tOwned
        // Do NOT set _rOwned for excluded accounts - they don't participate in reflection
        _tOwned[msg.sender] = _TOTAL_SUPPLY;
        
        // Call super._update to sync with ERC20 base contract
        // This updates _totalSupply and _balances in the base ERC20 contract
        super._update(address(0), msg.sender, _TOTAL_SUPPLY);
        
        // Emit Transfer event for initial mint (already emitted by super._update, but explicit for clarity)
        // emit Transfer(address(0), msg.sender, _TOTAL_SUPPLY); // Already emitted by super._update

        // Set exclusions
        _isExcludedFromFee[msg.sender] = true; // Use msg.sender instead of owner()
        _isExcludedFromFee[address(this)] = true;
        if (_stakingContract != address(0)) {
            _isExcludedFromFee[_stakingContract] = true;
            emit StakingContractUpdated(_stakingContract, true);
        }
        if (_arweaveGateway != address(0)) {
            emit ArweaveGatewaySet(_arweaveGateway);
        }
    }

    /**
     * @notice Post-deployment initialization function
     * @dev Call this after all contracts are deployed to complete setup
     */
    function postDeploymentInit() external onlyOwner {
        // Enable trading
        tradingEnabled = true;

        // Set up additional configurations that require external contracts
        if (stakingContract != address(0)) {
            _isExcludedFromFee[stakingContract] = true;
        }
        if (address(tokenDistribution) != address(0)) {
            _isExcludedFromFee[address(tokenDistribution)] = true;
        }
    }

    /**
     * @notice Complete post-deployment setup with all required configurations
     * @dev This function should be called after all external contracts are deployed
     * @param _timelockAddress Address of the deployed timelock contract
     * @param _distributionContract Address of the token distribution contract
     */
    function completePostDeploymentSetup(
        address _timelockAddress,
        address _distributionContract
    ) external onlyOwner {
        // Set timelock if not already set
        if (timelock == address(0) && _timelockAddress != address(0)) {
            timelock = _timelockAddress;
        }

        // Set distribution contract if provided
        if (_distributionContract != address(0)) {
            tokenDistribution = TokenDistribution(_distributionContract);
            _isExcludedFromFee[_distributionContract] = true;
            emit DistributionContractSet(_distributionContract);
        }

        // Create Uniswap pair if not already created
        if (pairAddress == address(0)) {
            this.createUniswapPair();
        }

        // Enable trading and swap functionality
        tradingEnabled = true;
        swapEnabled = true;

        // Set up fee exclusions for system contracts
        if (stakingContract != address(0)) {
            _isExcludedFromFee[stakingContract] = true;
        }
        if (address(tokenDistribution) != address(0)) {
            _isExcludedFromFee[address(tokenDistribution)] = true;
        }
        if (timelock != address(0)) {
            _isExcludedFromFee[timelock] = true;
        }
    }

    /**
     * @notice Set staking contract (only owner)
     * @dev Sets the staking contract address
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(
            _stakingContract != address(0),
            "Invalid staking contract address"
        );
        stakingContract = _stakingContract;
        _isExcludedFromFee[_stakingContract] = true;
        emit StakingContractUpdated(_stakingContract, true);
    }

    /**
     * @notice Set Arweave gateway (only owner)
     * @dev Sets the Arweave gateway address
     */
    function setArweaveGateway(address _arweaveGateway) external onlyOwner {
        require(_arweaveGateway != address(0), "Invalid gateway address");
        arweaveGateway = _arweaveGateway;
        emit ArweaveGatewaySet(_arweaveGateway);
    }

    /**
     * @notice Set price oracle (only owner)
     * @dev Sets the Chainlink price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid oracle address");
        ethUsdFeed = AggregatorV3Interface(_priceOracle);
    }

    /**
     * @notice Set timelock contract (only owner)
     * @dev Sets the timelock contract address
     */
    function setTimelock(address _timelock) external onlyOwner {
        require(_timelock != address(0), "Invalid timelock address");
        timelock = _timelock;
        timelockDelay = 86400; // Default 24 hours delay
        emit TimelockSet(_timelock);
    }

    /**
     * @notice Create Uniswap pair (only owner)
     * @dev Creates the token/ETH pair for trading
     */
    function createUniswapPair() external onlyOwner {
        require(pairAddress == address(0), "Pair already created");
        pairAddress = IUniswapV2Factory(
            IUniswapV2Router(uniswapRouter).factory()
        ).createPair(address(this), WETH);
    }

    /**
     * @notice Internal function to create Uniswap pair (no ownership check)
     */
    function _createUniswapPairInternal() internal {
        require(pairAddress == address(0), "Pair already created");
        pairAddress = IUniswapV2Factory(
            IUniswapV2Router(uniswapRouter).factory()
        ).createPair(address(this), WETH);
    }

    /**
     * @notice Create and configure timelock contract (only owner)
     * @dev Creates a new timelock contract with specified delay
     * @param _delay Delay in seconds for timelock operations
     */
    function createTimelock(uint256 _delay) external onlyOwner {
        require(timelock == address(0), "Timelock already exists");
        require(_delay >= TWO_DAYS, "Delay must be at least 2 days");

        // Note: Timelock creation should be handled separately
        // For now, just set a placeholder
        timelock = address(0x1); // Placeholder address
        _isExcludedFromFee[timelock] = true;
    }

    /**
     * @notice Get timelock information
     * @dev Returns timelock address and delay
     * @return timelockAddress Address of the timelock contract
     * @return delay Delay in seconds for timelock operations
     */
    function getTimelockInfo()
        external
        view
        returns (address timelockAddress, uint256 delay)
    {
        if (timelock != address(0)) {
            return (timelock, timelockDelay);
        }
        return (address(0), 0);
    }

    /**
     * @notice Get Uniswap pair information
     * @dev Returns pair address and reserves
     * @return pair The pair address
     * @return reserve0 Reserve of token0
     * @return reserve1 Reserve of token1
     * @return blockTimestampLast Last block timestamp
     */
    function getPairInfo()
        external
        view
        returns (
            address pair,
            uint256 reserve0,
            uint256 reserve1,
            uint256 blockTimestampLast
        )
    {
        if (pairAddress != address(0)) {
            (reserve0, reserve1, blockTimestampLast) = IUniswapV2Pair(
                pairAddress
            ).getReserves();
            return (pairAddress, reserve0, reserve1, blockTimestampLast);
        }
        return (address(0), 0, 0, 0);
    }

    /**
     * @notice Check if pair exists and is valid
     * @dev Returns true if pair is created and has liquidity
     * @return exists True if pair exists
     * @return hasLiquidity True if pair has liquidity
     */
    function isPairReady()
        external
        view
        returns (bool exists, bool hasLiquidity)
    {
        if (pairAddress == address(0)) {
            return (false, false);
        }

        try IUniswapV2Pair(pairAddress).getReserves() returns (
            uint256 reserve0,
            uint256 reserve1,
            uint256
        ) {
            exists = true;
            hasLiquidity = (reserve0 > 0 && reserve1 > 0);
        } catch {
            exists = false;
            hasLiquidity = false;
        }
    }

    /**
     * @notice Set marketing wallet (only owner)
     * @dev Sets the marketing wallet address
     */
    function setMarketingWallet(address _marketingWallet) external onlyOwner {
        require(
            _marketingWallet != address(0),
            "Invalid marketing wallet address"
        );
        marketingWallet = _marketingWallet;
    }

    /**
     * @notice Set swap threshold (only owner)
     * @dev Sets the minimum token balance required to trigger swap
     * @param _swapThreshold New swap threshold amount
     */
    function setSwapThreshold(uint256 _swapThreshold) external onlyOwner {
        require(_swapThreshold > 0, "Swap threshold must be greater than 0");
        require(_swapThreshold <= totalSupply(), "Swap threshold too high");
        swapThreshold = _swapThreshold;
        emit SwapThresholdSet(_swapThreshold);
    }

    /**
     * @notice Set max transaction amount (only owner)
     * @dev Sets the maximum amount that can be transferred in a single transaction
     * @param _maxTxAmount New maximum transaction amount
     */
    function setMaxTxAmount(uint256 _maxTxAmount) external onlyOwner {
        require(_maxTxAmount > 0, "Max tx amount must be greater than 0");
        require(_maxTxAmount <= totalSupply(), "Max tx amount too high");
        maxTxAmount = _maxTxAmount;
    }

    /**
     * @notice Enable or disable swap functionality (only owner)
     * @dev Controls whether the contract can perform automatic swaps
     * @param _enabled True to enable swaps, false to disable
     */
    function setSwapEnabled(bool _enabled) external onlyOwner {
        swapEnabled = _enabled;
    }

    /**
     * @notice Complete initialization setup (only owner)
     * @dev This function sets up all required configurations in one call
     * @param _timelockDelay Delay for timelock operations (in seconds)
     * @param _distributionContract Address of the token distribution contract
     * @param _createPair Whether to create Uniswap pair
     */
    function completeInitialization(
        uint256 _timelockDelay,
        address _distributionContract,
        bool _createPair
    ) external onlyOwner {
        // Create timelock if not exists
        if (timelock == address(0)) {
            require(
                _timelockDelay >= TWO_DAYS,
                "Delay must be at least 2 days"
            );
            // Note: Timelock creation should be handled separately
            // For now, just set the address if provided
        }

        // Set distribution contract if provided
        if (_distributionContract != address(0)) {
            tokenDistribution = TokenDistribution(_distributionContract);
            _isExcludedFromFee[_distributionContract] = true;
            emit DistributionContractSet(_distributionContract);
        }

        // Create Uniswap pair if requested
        if (_createPair && pairAddress == address(0)) {
            _createUniswapPairInternal();
        }

        // Enable trading and swap functionality
        tradingEnabled = true;
        swapEnabled = true;

        // Set up fee exclusions for all system contracts
        if (stakingContract != address(0)) {
            _isExcludedFromFee[stakingContract] = true;
        }
        if (address(tokenDistribution) != address(0)) {
            _isExcludedFromFee[address(tokenDistribution)] = true;
        }
        if (timelock != address(0)) {
            _isExcludedFromFee[timelock] = true;
        }
    }

    /**
     * @notice Get contract status information
     * @dev Returns comprehensive status of the contract
     * @return isTradingEnabled Whether trading is enabled
     * @return isSwapEnabled Whether swap is enabled
     * @return pairExists Whether Uniswap pair exists
     * @return timelockExists Whether timelock exists
     * @return distributionExists Whether distribution contract exists
     */
    function getContractStatus()
        external
        view
        returns (
            bool isTradingEnabled,
            bool isSwapEnabled,
            bool pairExists,
            bool timelockExists,
            bool distributionExists
        )
    {
        return (
            tradingEnabled,
            swapEnabled,
            pairAddress != address(0),
            address(timelock) != address(0),
            address(tokenDistribution) != address(0)
        );
    }

    // Only owner can update marketing wallet (via timelock)
    function queueUpdateMarketingWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "ReflectiveToken: invalid wallet");

        bytes memory data = abi.encodeWithSignature(
            "updateMarketingWallet(address)",
            newWallet
        );

        // Note: Timelock interaction would need to be implemented
        // For now, just emit the event

        emit MarketingWalletQueued(newWallet, block.timestamp + TWO_DAYS);
    }

    function updateMarketingWallet(address newWallet) external onlyTimelock {
        require(newWallet != address(0), "Invalid marketing wallet address");
        marketingWallet = newWallet;
        emit MarketingWalletUpdated(newWallet);
    }

    // NEW UPDATE ARWEAVE GATEWAY FUNCTION:
    function queueUpdateArweaveGateway(address newGateway) external onlyOwner {
        require(
            newGateway != address(0),
            "ReflectiveToken: invalid gateway address"
        );
        bytes memory data = abi.encodeWithSignature(
            "updateArweaveGateway(address)",
            newGateway
        );
        // Note: Timelock interaction would need to be implemented
        // For now, just emit the event
        emit ArweaveGatewayUpdateQueued(newGateway, block.timestamp + TWO_DAYS);
    }

    function updateArweaveGateway(address newGateway) external onlyTimelock {
        require(newGateway != address(0), "Invalid Arweave gateway address");
        arweaveGateway = newGateway;
        emit ArweaveGatewaySet(newGateway);
    }

    // Queue fee changes (via timelock)
    function queueSetFees(
        uint256 newTaxFee,
        uint256 newLiquidityFee,
        uint256 newMarketingFee
    ) external onlyOwner {
        require(
            newTaxFee + newLiquidityFee + newMarketingFee <= 1000,
            "ReflectiveToken: total fee exceeds 10%"
        );

        bytes memory data = abi.encodeWithSignature(
            "setFees(uint256,uint256,uint256)",
            newTaxFee,
            newLiquidityFee,
            newMarketingFee
        );

        // Note: Timelock integration would need proper admin setup
        // For now, just emit the event without actual timelock interaction

        emit FeeChangeQueued(
            newTaxFee,
            newLiquidityFee,
            newMarketingFee,
            block.timestamp + TWO_DAYS
        );
    }

    /**
     * @dev Queues a slippage parameter update via timelock
     * @param newSwapSlippageBps New swap slippage in basis points (e.g., 500 = 5%)
     * @param newLiquiditySlippageBps New liquidity slippage in basis points
     */
    function queueSetSlippage(
        uint256 newSwapSlippageBps,
        uint256 newLiquiditySlippageBps
    ) external onlyOwner {
        require(
            newSwapSlippageBps <= 200,
            "ReflectiveToken: swap slippage too high"
        ); // Max 2%
        require(
            newLiquiditySlippageBps <= 200,
            "ReflectiveToken: liquidity slippage too high"
        ); // Max 2%

        bytes memory data = abi.encodeWithSignature(
            "setSlippage(uint256,uint256)",
            newSwapSlippageBps,
            newLiquiditySlippageBps
        );

        // Note: Timelock interaction would need to be implemented
        // For now, just emit the event
    }

    // Called by timelock to update fees
    function setFees(
        uint256 newTaxFee,
        uint256 newLiquidityFee,
        uint256 newMarketingFee
    ) external onlyTimelock {
        taxFee = newTaxFee;
        liquidityFee = newLiquidityFee;
        marketingFee = newMarketingFee;
        totalFee = taxFee + liquidityFee + marketingFee;
        emit FeeChangeExecuted(newTaxFee, newLiquidityFee, newMarketingFee);
    }

    /**
     * @dev Called by timelock to update slippage parameters.
     * @param newSwapSlippageBps New swap slippage in basis points (e.g., 500 = 5%)
     * @param newLiquiditySlippageBps New liquidity slippage in basis points
     */
    function setSlippage(
        uint256 newSwapSlippageBps,
        uint256 newLiquiditySlippageBps
    ) external onlyTimelock {
        swapSlippageBps = newSwapSlippageBps;
        liquiditySlippageBps = newLiquiditySlippageBps;
        emit SlippageUpdated(newSwapSlippageBps, newLiquiditySlippageBps);
    }

    // ERC-20 Standard Functions
    function balanceOf(address account) public view override returns (uint256) {
        if (_isExcludedFromFee[account]) {
            // Excluded accounts ONLY use _tOwned
            return _tOwned[account];
        }
        return tokenFromReflection(_rOwned[account]);
    }

    function tokenFromReflection(
        uint256 rAmount
    ) public view returns (uint256) {
        require(
            _rTotal >= _tTotal(),
            "Reflection total must be >= token total"
        );
        require(_tTotal() > 0, "Token total must be > 0");

        uint256 currentRate = _rTotal / _tTotal();
        return rAmount / currentRate;
    }

    /**
     * @notice Debug function to check reflection rate
     * @return rTotal Total reflection amount
     * @return tTotal Total token amount
     * @return currentRate Current reflection rate
     */
    function debugReflectionRate()
        external
        view
        returns (uint256 rTotal, uint256 tTotal, uint256 currentRate)
    {
        rTotal = _rTotal;
        tTotal = _tTotal();
        currentRate = rTotal / tTotal;
        return (rTotal, tTotal, currentRate);
    }

    function _tTotal() private view returns (uint256) {
        return (_TOTAL_SUPPLY - _tFeeTotal);
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        require(
            _msgSender() != address(0),
            "ERC20: transfer from the zero address"
        );
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");

        // Use custom _update logic for reflection system
        _update(_msgSender(), recipient, amount);
        return true;
    }

    function approve(
        address spender,
        uint256 amount
    ) public override returns (bool) {
        _approve(_msgSender(), spender, amount, true);
        return true;
    }

    function _approve(
        address owner,
        address spender,
        uint256 value,
        bool emitEvent
    ) internal override {
        require(!_isBlacklisted[owner], "Blacklisted");
        require(!_isBlacklisted[spender], "Spender blacklisted");
        
        // Update the custom _allowances mapping
        _allowances[owner][spender] = value;
        
        // Call parent _approve to maintain ERC20 compliance
        super._approve(owner, spender, value, emitEvent);
    }

    // 1. totalSupply()
    function totalSupply() public pure override returns (uint256) {
        return _TOTAL_SUPPLY;
    }

    // 2. name()
    function name() public pure override returns (string memory) {
        return _NAME;
    }

    // 3. symbol()
    function symbol() public pure override returns (string memory) {
        return _SYMBOL;
    }

    // 4. decimals()
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @dev Overrides ERC20Upgradeable._update to implement reflection/fee logic.
    /// @notice FIXED: Updated reflection balances BEFORE emitting event to prevent conflicts
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // 1. Handle mint/burn operations (from/to = address(0))
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            // For mint: update reflection totals
            if (from == address(0)) {
                uint256 currentRate = _rTotal / _tTotal();
                uint256 rAmount;
                unchecked {
                    rAmount = value * currentRate;
                }
                if (_isExcludedFromFee[to]) {
                    _tOwned[to] += value;
                } else {
                    _rOwned[to] += rAmount;
                    _rTotal += rAmount;
                }
            }
            // For burn: handled by super._update and _tFeeTotal
            return;
        }

        // 2. Determine fee logic
        bool fromExcluded = _isExcludedFromFee[from];
        bool toExcluded = _isExcludedFromFee[to];
        bool stakingContractInvolved = (stakingContract != address(0) && (from == stakingContract || to == stakingContract));
        bool shouldApplyFees = !inSwap &&
            from != address(this) &&
            to != address(this) &&
            !stakingContractInvolved &&
            (!fromExcluded || !toExcluded); // Fees apply if at least one is NOT excluded

        uint256 transferAmount = value;
        uint256 feeAmount = 0;

        // 3. Calculate and apply fees if needed
        if (shouldApplyFees) {
            feeAmount = (value * totalFee) / 10000;
            transferAmount = value - feeAmount;
            _tFeeTotal += feeAmount;
        }

        // 4. Update FROM account balance
        if (fromExcluded) {
            // Excluded accounts ONLY use _tOwned
            require(_tOwned[from] >= value, "RT: Insufficient _tOwned balance");
            unchecked {
                _tOwned[from] -= value;
            }
        } else {
            // Non-excluded accounts use _rOwned (reflection)
            require(_tTotal() > 0, "RT: tTotal is zero");
            uint256 currentRate = _rTotal / _tTotal();
            require(currentRate > 0, "RT: Reflection rate is zero");
            uint256 rAmount;
            unchecked {
                rAmount = value * currentRate;
            }
            require(_rOwned[from] >= rAmount, "RT: Insufficient _rOwned balance");
            unchecked {
                _rOwned[from] -= rAmount;
            }
        }

        // 5. Update TO account balance
        if (toExcluded) {
            // Excluded accounts ONLY use _tOwned
            require(_tOwned[to] + transferAmount >= _tOwned[to], "RT: _tOwned overflow");
            unchecked {
                _tOwned[to] += transferAmount;
            }
        } else {
            // Non-excluded accounts use _rOwned (reflection)
            require(_tTotal() > 0, "RT: tTotal is zero");
            uint256 currentRate = _rTotal / _tTotal();
            require(currentRate > 0, "RT: Reflection rate is zero");
            uint256 rAmount;
            unchecked {
                rAmount = transferAmount * currentRate;
            }
            require(_rOwned[to] + rAmount >= _rOwned[to], "RT: _rOwned overflow");
            unchecked {
                _rOwned[to] += rAmount;
            }
        }

        // 6. Handle fees (add to contract if fees were applied)
        if (feeAmount > 0) {
            unchecked {
                _tOwned[address(this)] += feeAmount;
            }
            // Auto-liquidity trigger
            uint256 contractTokenBalance = balanceOf(address(this));
            if (contractTokenBalance >= swapThreshold) {
                swapAndLiquify();
            }
        }

        // 7. Emit Transfer event
        emit Transfer(from, to, transferAmount);
    }

    // 5. allowance()
    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    // 6. transferFrom()
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        uint256 currentAllowance = allowance(sender, msg.sender);
        require(currentAllowance >= amount, "ERC20: insufficient allowance");

        // Use custom _update logic for reflection system (like transfer() does)
        _update(sender, recipient, amount);
        
        // Decrease allowance
        _approve(sender, msg.sender, currentAllowance - amount, true);
        return true;
    }

    /**
     * @notice Custom transferFrom function specifically for staking contract
     * @dev Bypasses SafeERC20's balance checks which are incompatible with reflection tokens
     * @dev Only callable by the staking contract
     * @param sender Address to transfer from
     * @param amount Amount to transfer
     * @return success Whether the transfer succeeded
     */
    function transferFromForStaking(
        address sender,
        uint256 amount
    ) external onlyStakingContract nonReentrant returns (bool) {
        require(sender != address(0), "RT: Transfer from zero address");
        require(amount > 0, "RT: Transfer amount must be greater than zero");

        // Check allowance
        uint256 currentAllowance = allowance(sender, msg.sender);
        require(currentAllowance >= amount, "RT: Insufficient allowance");

        // Check balance before transfer
        uint256 senderBalance = balanceOf(sender);
        require(senderBalance >= amount, "RT: Insufficient balance");

        // Perform the transfer (no fees when staking contract is involved)
        _update(sender, stakingContract, amount);

        // Decrease allowance
        _approve(sender, msg.sender, currentAllowance - amount, true);

        // Verify balance after transfer (exact match required)
        uint256 senderBalanceAfter = balanceOf(sender);
        uint256 expectedBalanceAfter = senderBalance - amount;
        
        // Allow 1 wei tolerance for rounding (reflection tokens can have 1 wei rounding differences)
        require(
            senderBalanceAfter >= expectedBalanceAfter - 1 && senderBalanceAfter <= expectedBalanceAfter + 1,
            "RT: Balance mismatch after transfer"
        );

        return true;
    }

    /**
     * @notice Custom transfer function specifically for staking contract to transfer tokens back to users
     * @dev Properly handles transfer from excluded staking contract to non-excluded users
     * @dev Only callable by the staking contract
     * @param recipient Address to transfer to (user)
     * @param amount Amount to transfer
     * @return success Whether the transfer succeeded
     */
    function transferForUnstaking(
        address recipient,
        uint256 amount
    ) external onlyStakingContract nonReentrant returns (bool) {
        require(recipient != address(0), "RT: Transfer to zero address");
        require(amount > 0, "RT: Transfer amount must be greater than zero");

        // Check staking contract balance (it's excluded, so check _tOwned)
        require(_tOwned[stakingContract] >= amount, "RT: Insufficient _tOwned balance in staking contract");

        // Perform the transfer from staking contract (excluded) to user (may be non-excluded)
        // No fees when staking contract is involved
        _update(stakingContract, recipient, amount);

        return true;
    }

    /// @dev Returns dynamic slippage (basis points) based on Uniswap V2 pool liquidity (USD value).
    /// @return slippageBps Slippage in basis points (e.g., 500 = 5%).
    function _getDynamicSlippageBps() internal view returns (uint256) {
        require(pairAddress != address(0), "Pair not initialized");

        try ethUsdFeed.latestRoundData() returns (
            uint80,
            int256 ethPrice,
            uint256,
            uint256,
            uint80
        ) {
            require(ethPrice > 0, "Chainlink: Invalid price");

            // Get Uniswap reserves
            (uint256 reserveToken, uint256 reserveETH, ) = IUniswapV2Pair(
                pairAddress
            ).getReserves();

            // Handle ETH reserve position (could be reserve0 or reserve1)
            bool isETHReserveFirst = (IUniswapV2Pair(pairAddress).token0() ==
                WETH);
            if (!isETHReserveFirst) {
                (reserveToken, reserveETH) = (reserveETH, reserveToken); // Swap if ETH is reserve1
            }

            // Calculate liquidity in USD (Chainlink price has 8 decimals)
            uint256 liquidityUSD = (reserveETH * uint256(ethPrice)) / 1e8;

            // Dynamic slippage: 5% if <$10k, 1% if >=$10k
            return liquidityUSD < 10_000 * 1e18 ? 500 : 100; // 5% or 1% in BPS
        } catch {
            // If oracle call fails, use default slippage
            return 500; // 5% default slippage
        }
    }

    /// @dev Limits swap size to 0.5% of total supply to reduce price impact
    function _getMaxSwapAmount() internal pure returns (uint256) {
        return (totalSupply() * 5) / 1000; // 0.5% of supply
    }
    /**
     * @dev Main function to swap tokens for ETH and add liquidity.
     * Triggers when contract holds more tokens than `swapThreshold`.
     */
    function swapAndLiquify() internal {
        require(
            tradingEnabled && !inSwap && swapEnabled,
            "ReflectiveToken: swap not allowed"
        );
        require(
            balanceOf(address(this)) >= swapThreshold,
            "ReflectiveToken: swap threshold not met"
        );

        inSwap = true;

        // Calculate token amounts using your swapThreshold
        uint256 tokensToSwap = swapThreshold;
        uint256 tokensForLiquidity = tokensToSwap / 2; // 50% to liquidity
        uint256 tokensToSwapForETH = tokensToSwap - tokensForLiquidity; // 50% to swap for ETH

        // Swap tokens for ETH (using new improved function)
        uint256 ethReceived = _swapTokensForETH(tokensToSwapForETH);

        // Distribute marketing fee if set
        if (marketingWallet != address(0)) {
            _distributeMarketingFee(ethReceived);
        }

        // Add liquidity if we have both ETH and tokens
        if (ethReceived > 0 && tokensForLiquidity > 0) {
            _addLiquidity(tokensForLiquidity, ethReceived);
        }

        inSwap = false;
    }

    /**
     * @dev Swaps tokens for ETH with dynamic slippage protection.
     * @param tokensToSwap Amount of tokens to swap.
     * @return ethReceived Amount of ETH received from the swap.
     */
    function _swapTokensForETH(uint256 tokensToSwap) private returns (uint256) {
        uint256 initialETHBalance = address(this).balance;
        require(
            IERC20(address(this)).approve(uniswapRouter, tokensToSwap),
            "Approval failed"
        );

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = WETH;

        uint256[] memory amounts = IUniswapV2Router(uniswapRouter)
            .getAmountsOut(tokensToSwap, path);

        // [NEW] Dynamic slippage calculation
        uint256 dynamicSlippageBps = _getDynamicSlippageBps(); // e.g., 500 (5%) or 100 (1%)
        uint256 minExpectedETH = (amounts[1] * (10000 - dynamicSlippageBps)) /
            10000; // e.g., 95% or 99% of expected ETH

        uint256[] memory swapAmounts = IUniswapV2Router(uniswapRouter)
            .swapExactTokensForETH(
                tokensToSwap,
                minExpectedETH,
                path,
                address(this),
                block.timestamp + 300
            );
        require(swapAmounts.length > 0, "Swap failed");

        return address(this).balance - initialETHBalance;
    }

    /**
     * @dev Distributes the marketing fee to the marketing wallet.
     * @param ethReceived Total ETH received from the swap.
     */
    function _distributeMarketingFee(uint256 ethReceived) private {
        uint256 marketingShare = (ethReceived * marketingFee) /
            (marketingFee + liquidityFee);
        payable(marketingWallet).transfer(marketingShare);
        emit MarketingFeeDistributed(marketingShare);
    }

    // Arweave transaction verification
    function verifyArweaveTransaction(
        string calldata txId
    ) public view returns (bool) {
        return IArweaveGateway(arweaveGateway).verifyTransaction(txId);
    }

    // Log Arweave file access (called by staking contract)
    function logArweaveAccess(
        address user,
        string calldata txId
    ) external onlyStakingContract {
        emit FileAccessLogged(user, txId, block.timestamp);
    }

    // Exclude accounts from fees (e.g., exchanges)
    function excludeFromFee(address account, bool excluded) external onlyOwner {
        _isExcludedFromFee[account] = excluded;
    }

    // NEW: Blacklist event and functions
    event AddressBlacklisted(address indexed account, bool isBlacklisted);

    function blacklist(address account) external onlyOwner {
        _isBlacklisted[account] = true;
        emit AddressBlacklisted(account, true);
    }

    function unblacklist(address account) external onlyOwner {
        _isBlacklisted[account] = false;
        emit AddressBlacklisted(account, false);
    }

    /**
     * @dev Checks if an address is blacklisted.
     * @param account Address to check.
     * @return bool True if blacklisted, false otherwise.
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _isBlacklisted[account];
    }

    // Enable/disable trading
    function setTradingEnabled(bool enabled) external onlyOwner {
        tradingEnabled = enabled;
    }

    // Complete liquidity addition implementation
    function _addLiquidity(
        uint256 tokensForLiquidity,
        uint256 ethReceived
    ) private {
        // Approve router to spend tokens
        require(
            IERC20(address(this)).approve(uniswapRouter, tokensForLiquidity),
            "Approval failed"
        );

        // Calculate minimum amounts with 3% slippage tolerance
        uint256 minLiquidityETH = (ethReceived * 970) / 1000; // 3% slippage
        uint256 minLiquidityTokens = (tokensForLiquidity * 970) / 1000;

        // Set deadline (5 minutes from now)
        uint256 deadline = block.timestamp + 300;

        // Add liquidity
        (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        ) = IUniswapV2Router(uniswapRouter).addLiquidityETH{value: ethReceived}(
                address(this),
                tokensForLiquidity,
                minLiquidityTokens,
                minLiquidityETH,
                address(this),
                deadline
            );

        emit LiquidityAdded(amountETH, amountToken, liquidity);
    }

    // Helper function to estimate token price in ETH
    function getTokenPriceInEth(
        uint256 tokenAmount
    ) private view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = WETH;

        uint256[] memory amounts = IUniswapV2Router(uniswapRouter)
            .getAmountsOut(tokenAmount, path);
        return amounts[1];
    }

    // ===== DISTRIBUTION AND BURNING FUNCTIONS =====

    /**
     * @notice Set the token distribution contract address
     * @param _distributionContract Address of the TokenDistribution contract
     */
    function setDistributionContract(
        address _distributionContract
    ) external onlyOwner {
        require(
            _distributionContract != address(0),
            "Invalid distribution contract"
        );
        tokenDistribution = TokenDistribution(_distributionContract);
        emit DistributionContractSet(_distributionContract);
    }

    /**
     * @notice Initialize token distribution (70% deployment)
     * @dev Transfers tokens to distribution contract for team vesting and airdrop
     */
    function initializeDistribution() external onlyOwner nonReentrant {
        require(
            address(tokenDistribution) != address(0),
            "Distribution contract not set"
        );

        uint256 totalToDistribute = 1_000_000 * 10 ** 18; // 1M tokens (10% of supply)
        require(
            balanceOf(address(this)) >= totalToDistribute,
            "Insufficient contract balance"
        );

        // Transfer tokens to distribution contract
        _transfer(address(this), address(tokenDistribution), totalToDistribute);

        // Initialize vesting in distribution contract
        tokenDistribution.initializeVesting();

        // Complete distribution
        tokenDistribution.distributeInitialTokens();

        emit InitialDistributionCompleted(totalToDistribute);
    }

    /**
     * @notice Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burnTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Handle reflection system for burning
        if (_isExcludedFromFee[msg.sender]) {
            _tOwned[msg.sender] -= amount;
        } else {
            uint256 currentRate = _rTotal / _tTotal();
            uint256 rAmount;
            unchecked {
                rAmount = amount * currentRate;
            }
            _rOwned[msg.sender] -= rAmount;
        }

        _tFeeTotal += amount;
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from specified address (only owner)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnTokensFrom(
        address from,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance");

        // Handle reflection system for burning
        if (_isExcludedFromFee[from]) {
            _tOwned[from] -= amount;
        } else {
            uint256 currentRate = _rTotal / _tTotal();
            uint256 rAmount;
            unchecked {
                rAmount = amount * currentRate;
            }
            _rOwned[from] -= rAmount;
        }

        _tFeeTotal += amount;
        emit TokensBurned(from, amount);
    }

    /**
     * @notice Get total burned tokens
     * @return Total amount of tokens burned
     */
    function getTotalBurned() external view returns (uint256) {
        return _tFeeTotal;
    }

    /**
     * @notice Debug function to check ownership
     * @return The current owner address
     */
    function debugOwner() external view returns (address) {
        return owner();
    }

    /**
     * @notice Debug function to check reflection values
     * @param account Address to check
     * @return rOwned Reflection owned amount
     * @return tOwned Token owned amount
     * @return isExcluded Whether account is excluded from fees
     */
    function debugReflection(
        address account
    ) external view returns (uint256 rOwned, uint256 tOwned, bool isExcluded) {
        return (
            _rOwned[account],
            _tOwned[account],
            _isExcludedFromFee[account]
        );
    }

    /**
     * @notice Get distribution contract address
     * @return Address of the distribution contract
     */
    function getDistributionContract() external view returns (address) {
        return address(tokenDistribution);
    }

    /**
     * @notice Check if distribution is complete
     * @return True if initial distribution is complete
     */
    function isDistributionComplete() external view returns (bool) {
        if (address(tokenDistribution) == address(0)) {
            return false;
        }
        return tokenDistribution.isDistributionComplete();
    }

    /**
     * @notice Get total supply after burns
     * @return Current circulating supply
     */
    function getCirculatingSupply() external view returns (uint256) {
        return _TOTAL_SUPPLY - _tFeeTotal;
    }

    /**
     * @notice Emergency burn function (only owner)
     * @dev Burns tokens from contract balance in case of emergency
     * @param amount Amount of tokens to burn from contract
     */
    function emergencyBurn(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(
            balanceOf(address(this)) >= amount,
            "Insufficient contract balance"
        );

        // Handle reflection system for burning
        if (_isExcludedFromFee[address(this)]) {
            _tOwned[address(this)] -= amount;
        } else {
            uint256 currentRate = _rTotal / _tTotal();
            uint256 rAmount;
            unchecked {
                rAmount = amount * currentRate;
            }
            _rOwned[address(this)] -= rAmount;
        }

        _tFeeTotal += amount;
        emit TokensBurned(address(this), amount);
    }
} //
