/**
 * @notice Interface for yield generation strategies
 * @dev Allows pluggable yield strategies while maintaining safety and unstaking capability
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IYieldStrategy {
    /**
     * @notice Deposit tokens into the yield strategy
     * @param amount Amount of tokens to deposit
     * @return shares Number of shares received (for tracking)
     */
    function deposit(uint256 amount) external returns (uint256 shares);

    /**
     * @notice Withdraw tokens from the yield strategy
     * @param shares Number of shares to withdraw
     * @return amount Amount of tokens received
     */
    function withdraw(uint256 shares) external returns (uint256 amount);

    /**
     * @notice Get the total value of tokens in the strategy
     * @return totalValue Total token value (principal + yield)
     */
    function getTotalValue() external view returns (uint256 totalValue);

    /**
     * @notice Get the current yield rate (APY in basis points, e.g., 500 = 5%)
     * @return apyBps Annual percentage yield in basis points
     */
    function getYieldRate() external view returns (uint256 apyBps);

    /**
     * @notice Check if strategy is active and safe
     * @return isActive True if strategy is active
     * @return isSafe True if strategy is safe to use
     */
    function getStatus() external view returns (bool isActive, bool isSafe);

    /**
     * @notice Emergency withdraw all funds (only callable by owner)
     * @return amount Amount withdrawn
     */
    function emergencyWithdraw() external returns (uint256 amount);
}


