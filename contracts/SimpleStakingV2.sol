// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleStakingV2
 * @notice Minimal staking contract for debugging - NON-UPGRADEABLE
 */
contract SimpleStakingV2 is Ownable {
    IERC20 public stakingToken;
    
    mapping(address => uint256) public userStakedTokens;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    
    constructor(address _stakingToken) Ownable(msg.sender) {
        require(_stakingToken != address(0), "Invalid token");
        stakingToken = IERC20(_stakingToken);
    }
    
    /**
     * @notice Stake tokens - MINIMAL VERSION
     */
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake zero");
        
        // Just do the transfer
        bool success = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        
        // Update balance
        userStakedTokens[msg.sender] += amount;
        
        // Emit event
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @notice Unstake tokens
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "Cannot unstake zero");
        require(userStakedTokens[msg.sender] >= amount, "Insufficient staked");
        
        userStakedTokens[msg.sender] -= amount;
        
        bool success = stakingToken.transfer(msg.sender, amount);
        require(success, "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @notice Get total staked by user
     */
    function getStakedAmount(address user) external view returns (uint256) {
        return userStakedTokens[user];
    }
}

