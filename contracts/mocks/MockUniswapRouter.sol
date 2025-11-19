// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapRouter {
    address private _factory;

    constructor() {
        _factory = address(this); // Use self as factory for testing
    }

    function factory() external view returns (address) {
        return _factory;
    }

    function WETH() external pure returns (address) {
        return address(0);
    }

    function createPair(address, address) external view returns (address pair) {
        // Return this contract as the pair for testing
        return address(this);
    }

    // Mock pair functions
    function getReserves()
        external
        view
        returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)
    {
        return (1000000 * 10 ** 18, 1000000 * 10 ** 18, block.timestamp);
    }

    function token0() external pure returns (address) {
        return address(0x1111111111111111111111111111111111111111);
    }

    function token1() external pure returns (address) {
        return address(0x2222222222222222222222222222222222222222);
    }

    function getAmountsOut(
        uint amountIn,
        address[] memory path
    ) external pure returns (uint[] memory) {
        uint[] memory amounts = new uint[](path.length);
        for (uint i = 0; i < path.length; i++) {
            amounts[i] = amountIn; // Simple passthrough for testing
        }
        return amounts;
    }

    function getAmountsIn(
        uint amountOut,
        address[] memory path
    ) external pure returns (uint[] memory) {
        uint[] memory amounts = new uint[](path.length);
        for (uint i = 0; i < path.length; i++) {
            amounts[i] = amountOut; // Simple passthrough for testing
        }
        return amounts;
    }

    function quote(
        uint amountA,
        uint reserveA,
        uint reserveB
    ) external pure returns (uint amountB) {
        if (reserveA == 0 || reserveB == 0) return 0;

        // Check for potential overflow before multiplication
        // If either value is too large, use a safer calculation
        if (amountA > type(uint128).max || reserveB > type(uint128).max) {
            // For very large numbers, use a simplified calculation to prevent overflow
            // This maintains reasonable accuracy while preventing overflow
            return (amountA / reserveA) * reserveB;
        }

        // Safe to perform multiplication for smaller numbers
        return (amountA * reserveB) / reserveA;
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        // Mock implementation - just return the input amount
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn; // Mock ETH amount
        return amounts;
    }
}
