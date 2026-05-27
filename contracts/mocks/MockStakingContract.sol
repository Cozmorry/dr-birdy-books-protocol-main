// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITreasuryYieldStrategy {
    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 amount);
}

contract MockStakingContract {
    IERC20 public token;

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    function approveStrategy(address strategy, uint256 amount) external {
        token.approve(strategy, amount);
    }

    function callDeposit(address strategy, uint256 amount) external returns (uint256 shares) {
        shares = ITreasuryYieldStrategy(strategy).deposit(amount);
    }

    function callWithdraw(address strategy, uint256 shares) external returns (uint256 amount) {
        amount = ITreasuryYieldStrategy(strategy).withdraw(shares);
    }
}
