/**
 * @notice Dr. Birdy Books Token Distribution: Manages initial token allocation,
 *         team vesting schedules, and airdrop distribution.
 * @dev Implements secure token distribution with vesting for team members.
 *      Part of the Dr. Birdy Books Protocol.
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenDistribution is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // Storage gap for upgrade safety
    uint256[50] private __gap;

    // Token contract reference
    IERC20 public token;

    // Team allocation addresses (1.5% each = 150,000 tokens)
    address public josephWallet;
    address public ajWallet;
    address public dsignWallet;
    address public developerWallet;
    address public birdyWallet;

    // Airdrop wallet (2.5% = 250,000 tokens)
    address public airdropWallet;

    // Allocation amounts (in wei)
    uint256 public constant TEAM_ALLOCATION = 150_000 * 10 ** 18; // 150,000 tokens per team member
    uint256 public constant AIRDROP_ALLOCATION = 250_000 * 10 ** 18; // 250,000 tokens for airdrop
    uint256 public constant TOTAL_DISTRIBUTED = 1_000_000 * 10 ** 18; // 1M tokens (10% of supply)

    // Vesting configuration
    uint256 public constant VESTING_DURATION = 365 days; // 1 year vesting
    uint256 public constant VESTING_CLIFF = 90 days; // 3 month cliff
    uint256 public constant VESTING_START = 0; // Will be set during initialization

    // Vesting tracking
    struct VestingInfo {
        uint256 totalAmount;
        uint256 startTime;
        uint256 duration;
        uint256 claimed;
        bool isActive;
    }

    mapping(address => VestingInfo) public vestingInfo;
    address[] public teamMembers;

    // Distribution state
    bool public initialDistributionComplete;
    bool public vestingInitialized;

    // Events
    event TokensDistributed(
        address indexed recipient,
        uint256 amount,
        bool isVested
    );
    event VestingInitialized(uint256 startTime);
    event TokensClaimed(
        address indexed recipient,
        uint256 amount,
        uint256 remaining
    );
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event TeamWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet,
        string memberName
    );
    event VestingMigrated(
        address indexed oldWallet,
        address indexed newWallet,
        uint256 totalAmount,
        uint256 claimed
    );

    // Modifiers
    modifier onlyTeamMember() {
        require(vestingInfo[msg.sender].isActive, "Not a team member");
        _;
    }

    modifier distributionNotComplete() {
        require(!initialDistributionComplete, "Distribution already complete");
        _;
    }

    modifier vestingNotInitialized() {
        require(!vestingInitialized, "Vesting already initialized");
        _;
    }

    /// @custom:oz-upgrades-for-constructor
    constructor() {}

    /**
     * @notice Initialize the token distribution contract
     * @param _token Address of the token contract
     * @param _josephWallet Joseph's wallet address
     * @param _ajWallet AJ's wallet address
     * @param _dsignWallet D-Sign's wallet address
     * @param _developerWallet Developer's wallet address
     * @param _birdyWallet Birdy's wallet address
     * @param _airdropWallet Airdrop wallet address
     */
    function initialize(
        address _token,
        address _josephWallet,
        address _ajWallet,
        address _dsignWallet,
        address _developerWallet,
        address _birdyWallet,
        address _airdropWallet
    ) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        require(_token != address(0), "Invalid token address");
        require(_josephWallet != address(0), "Invalid Joseph wallet");
        require(_ajWallet != address(0), "Invalid AJ wallet");
        require(_dsignWallet != address(0), "Invalid D-Sign wallet");
        require(_developerWallet != address(0), "Invalid developer wallet");
        require(_birdyWallet != address(0), "Invalid Birdy wallet");
        require(_airdropWallet != address(0), "Invalid airdrop wallet");

        token = IERC20(_token);

        // Set team wallet addresses
        josephWallet = _josephWallet;
        ajWallet = _ajWallet;
        dsignWallet = _dsignWallet;
        developerWallet = _developerWallet;
        birdyWallet = _birdyWallet;
        airdropWallet = _airdropWallet;

        // Initialize team members array
        teamMembers = [
            josephWallet,
            ajWallet,
            dsignWallet,
            developerWallet,
            birdyWallet
        ];

        initialDistributionComplete = false;
        vestingInitialized = false;
    }

    /**
     * @notice Post-deployment initialization function
     * @dev Call this after all contracts are deployed to complete setup
     */
    function postDeploymentInit() external onlyOwner {
        // Additional setup that might require external contracts
        // This function can be called after all contracts are deployed
    }

    /**
     * @notice Initialize vesting schedules for team members
     * @dev Can only be called once by owner
     */
    function initializeVesting() external onlyOwner vestingNotInitialized {
        uint256 startTime = block.timestamp;

        for (uint256 i = 0; i < teamMembers.length; i++) {
            address member = teamMembers[i];
            vestingInfo[member] = VestingInfo({
                totalAmount: TEAM_ALLOCATION,
                startTime: startTime,
                duration: VESTING_DURATION,
                claimed: 0,
                isActive: true
            });
        }

        vestingInitialized = true;
        emit VestingInitialized(startTime);
    }

    /**
     * @notice Distribute initial tokens (70% deployment)
     * @dev Can only be called once by owner
     */
    function distributeInitialTokens()
        external
        onlyOwner
        distributionNotComplete
        nonReentrant
    {
        require(vestingInitialized, "Vesting not initialized");
        require(
            token.balanceOf(address(this)) >= TOTAL_DISTRIBUTED,
            "Insufficient token balance"
        );

        // Distribute airdrop tokens immediately
        token.safeTransfer(airdropWallet, AIRDROP_ALLOCATION);
        emit TokensDistributed(airdropWallet, AIRDROP_ALLOCATION, false);

        // Team tokens are already allocated to this contract for vesting
        // They will be claimed gradually through the vesting mechanism

        initialDistributionComplete = true;
    }

    /**
     * @notice Calculate claimable tokens for a team member
     * @param member Team member address
     * @return claimable Amount of tokens that can be claimed
     */
    function calculateClaimable(address member) public view returns (uint256) {
        VestingInfo memory info = vestingInfo[member];

        if (
            !info.isActive || block.timestamp < info.startTime + VESTING_CLIFF
        ) {
            return 0;
        }

        uint256 elapsed = block.timestamp - info.startTime;
        if (elapsed >= info.duration) {
            return info.totalAmount - info.claimed;
        }

        uint256 vested = (info.totalAmount * elapsed) / info.duration;
        return vested - info.claimed;
    }

    /**
     * @notice Claim vested tokens
     * @dev Can be called by team members to claim their vested tokens
     */
    function claimVestedTokens() external onlyTeamMember nonReentrant {
        VestingInfo storage info = vestingInfo[msg.sender];
        uint256 claimable = calculateClaimable(msg.sender);

        require(claimable > 0, "No tokens to claim");
        require(
            token.balanceOf(address(this)) >= claimable,
            "Insufficient contract balance"
        );

        info.claimed += claimable;
        token.safeTransfer(msg.sender, claimable);

        emit TokensClaimed(
            msg.sender,
            claimable,
            info.totalAmount - info.claimed
        );
    }

    /**
     * @notice Get vesting information for a team member
     * @param member Team member address
     * @return totalAmount Total allocated amount
     * @return claimed Amount already claimed
     * @return claimable Amount currently claimable
     * @return vestingEndTime When vesting ends
     */
    function getVestingInfo(
        address member
    )
        external
        view
        returns (
            uint256 totalAmount,
            uint256 claimed,
            uint256 claimable,
            uint256 vestingEndTime
        )
    {
        VestingInfo memory info = vestingInfo[member];
        
        // If wallet is deactivated, return zeros
        if (!info.isActive) {
            return (0, 0, 0, 0);
        }
        
        return (
            info.totalAmount,
            info.claimed,
            calculateClaimable(member),
            info.startTime + info.duration
        );
    }

    /**
     * @notice Get all team members
     * @return Array of team member addresses
     */
    function getTeamMembers() external view returns (address[] memory) {
        return teamMembers;
    }

    /**
     * @notice Check if a team member has completed vesting
     * @param member Team member address
     * @return True if vesting is complete
     */
    function isVestingComplete(address member) external view returns (bool) {
        VestingInfo memory info = vestingInfo[member];
        return block.timestamp >= info.startTime + info.duration;
    }

    /**
     * @notice Emergency function to withdraw tokens (only owner)
     * @dev Should only be used in extreme circumstances
     * @param amount Amount of tokens to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(
            amount <= token.balanceOf(address(this)),
            "Insufficient balance"
        );
        token.safeTransfer(owner(), amount);
        emit EmergencyWithdraw(address(token), amount);
    }

    /**
     * @notice Get contract token balance
     * @return Current token balance of this contract
     */
    function getContractBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Check if initial distribution is complete
     * @return True if distribution is complete
     */
    function isDistributionComplete() external view returns (bool) {
        return initialDistributionComplete;
    }

    /**
     * @notice Get total distributed amount
     * @return Total amount that will be distributed
     */
    function getTotalDistributed() external pure returns (uint256) {
        return TOTAL_DISTRIBUTED;
    }

    /**
     * @notice Get team allocation amount
     * @return Amount allocated to each team member
     */
    function getTeamAllocation() external pure returns (uint256) {
        return TEAM_ALLOCATION;
    }

    /**
     * @notice Get airdrop allocation amount
     * @return Amount allocated for airdrop
     */
    function getAirdropAllocation() external pure returns (uint256) {
        return AIRDROP_ALLOCATION;
    }

    /**
     * @notice Update team wallet addresses
     * @dev Can only be called by owner. If vesting is initialized, migrates vesting data.
     * @param _josephWallet Joseph's new wallet address
     * @param _ajWallet AJ's new wallet address
     * @param _dsignWallet D-Sign's new wallet address
     * @param _developerWallet Developer's new wallet address
     * @param _birdyWallet Birdy's new wallet address
     * @param _airdropWallet Airdrop's new wallet address
     */
    function updateTeamWallets(
        address _josephWallet,
        address _ajWallet,
        address _dsignWallet,
        address _developerWallet,
        address _birdyWallet,
        address _airdropWallet
    ) external onlyOwner {
        require(_josephWallet != address(0), "Invalid Joseph wallet");
        require(_ajWallet != address(0), "Invalid AJ wallet");
        require(_dsignWallet != address(0), "Invalid D-Sign wallet");
        require(_developerWallet != address(0), "Invalid developer wallet");
        require(_birdyWallet != address(0), "Invalid Birdy wallet");
        require(_airdropWallet != address(0), "Invalid airdrop wallet");

        // Store old addresses for events
        address oldJoseph = josephWallet;
        address oldAj = ajWallet;
        address oldDsign = dsignWallet;
        address oldDeveloper = developerWallet;
        address oldBirdy = birdyWallet;
        address oldAirdrop = airdropWallet;

        // Update wallet addresses
        josephWallet = _josephWallet;
        ajWallet = _ajWallet;
        dsignWallet = _dsignWallet;
        developerWallet = _developerWallet;
        birdyWallet = _birdyWallet;
        airdropWallet = _airdropWallet;

        // Update team members array
        teamMembers = [
            josephWallet,
            ajWallet,
            dsignWallet,
            developerWallet,
            birdyWallet
        ];

        // If vesting is initialized, migrate vesting data
        if (vestingInitialized) {
            _migrateVestingData(oldJoseph, josephWallet, "Joseph");
            _migrateVestingData(oldAj, ajWallet, "AJ");
            _migrateVestingData(oldDsign, dsignWallet, "D-Sign");
            _migrateVestingData(oldDeveloper, developerWallet, "Developer");
            _migrateVestingData(oldBirdy, birdyWallet, "Birdy");
        }

        // Emit events
        emit TeamWalletUpdated(oldJoseph, josephWallet, "Joseph");
        emit TeamWalletUpdated(oldAj, ajWallet, "AJ");
        emit TeamWalletUpdated(oldDsign, dsignWallet, "D-Sign");
        emit TeamWalletUpdated(oldDeveloper, developerWallet, "Developer");
        emit TeamWalletUpdated(oldBirdy, birdyWallet, "Birdy");
        emit TeamWalletUpdated(oldAirdrop, airdropWallet, "Airdrop");
    }

    /**
     * @notice Internal function to migrate vesting data from old to new wallet
     * @param oldWallet The old wallet address
     * @param newWallet The new wallet address
     */
    function _migrateVestingData(
        address oldWallet,
        address newWallet,
        string memory /* memberName */
    ) internal {
        VestingInfo storage oldInfo = vestingInfo[oldWallet];
        
        if (oldInfo.isActive) {
            // Create new vesting info for the new wallet
            vestingInfo[newWallet] = VestingInfo({
                totalAmount: oldInfo.totalAmount,
                startTime: oldInfo.startTime,
                duration: oldInfo.duration,
                claimed: oldInfo.claimed,
                isActive: true
            });

            // Deactivate old wallet
            oldInfo.isActive = false;

            // Emit migration event
            emit VestingMigrated(
                oldWallet,
                newWallet,
                oldInfo.totalAmount,
                oldInfo.claimed
            );
        }
    }

    /**
     * @notice Get current team wallet addresses
     * @return joseph Joseph's wallet address
     * @return aj AJ's wallet address
     * @return dsign D-Sign's wallet address
     * @return developer Developer's wallet address
     * @return birdy Birdy's wallet address
     * @return airdrop Airdrop wallet address
     */
    function getTeamWallets() external view returns (
        address joseph,
        address aj,
        address dsign,
        address developer,
        address birdy,
        address airdrop
    ) {
        return (
            josephWallet,
            ajWallet,
            dsignWallet,
            developerWallet,
            birdyWallet,
            airdropWallet
        );
    }

    /**
     * @notice Check if a wallet is active for vesting
     * @param member Team member address
     * @return True if the wallet is active for vesting
     */
    function isWalletActive(address member) external view returns (bool) {
        return vestingInfo[member].isActive;
    }
}
