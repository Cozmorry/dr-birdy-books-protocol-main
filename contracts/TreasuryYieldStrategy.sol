/**
 * @notice Treasury Yield Strategy: Safest yield generation through buyback and burn
 * @dev Uses protocol fees to buy back tokens and burn them, increasing value for stakers
 *      This is the safest strategy as it doesn't lock funds in external protocols
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IYieldStrategy.sol";

interface IUniswapV2Router {
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
    
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);

    function WETH() external pure returns (address);
}

interface IReflectiveToken {
    function burnTokens(uint256 amount) external;
    function transferForUnstaking(address to, uint256 amount) external;
}

contract TreasuryYieldStrategy is IYieldStrategy, Ownable, ReentrancyGuard {
    IERC20 public immutable token;
    IUniswapV2Router public uniswapRouter;
    address public stakingContract;
    
    // Strategy state
    uint256 private totalDeposited; // Total tokens deposited
    uint256 private totalBurned; // Total tokens burned (yield)
    bool public isActive = true;
    
    // Configuration
    uint256 public minBuybackAmount = 100 * 10**18; // Minimum 100 tokens to trigger buyback
    uint256 public estimatedAPY = 200; // 2% APY estimate (conservative, based on protocol fees)
    
    // Events
    event TokensDeposited(uint256 amount);
    event BuybackExecuted(uint256 ethAmount, uint256 tokensBought, uint256 tokensBurned);
    event StrategyPaused();
    event StrategyResumed();
    event MinBuybackAmountUpdated(uint256 newAmount);
    event UniswapRouterUpdated(address newRouter);

    constructor(
        address _token,
        address _uniswapRouter,
        address _owner
    ) Ownable(_owner) {
        require(_token != address(0), "Invalid token address");
        require(_uniswapRouter != address(0), "Invalid router address");
        
        token = IERC20(_token);
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
    }

    /**
     * @notice Set the staking contract address (can only be set once)
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(stakingContract == address(0), "Staking contract already set");
        require(_stakingContract != address(0), "Invalid address");
        stakingContract = _stakingContract;
    }

    /**
     * @notice Deposit tokens into the strategy
     * @dev In this strategy, tokens are simply held. Yield comes from buybacks.
     */
    function deposit(uint256 amount) external override nonReentrant returns (uint256 shares) {
        require(isActive, "Strategy is paused");
        require(msg.sender == stakingContract, "Only staking contract can deposit");
        require(amount > 0, "Amount must be greater than 0");
        
        totalDeposited += amount;
        emit TokensDeposited(amount);
        
        // Shares = 1:1 with tokens (no compounding in this simple strategy)
        return amount;
    }

    /**
     * @notice Withdraw tokens from the strategy
     * @dev Returns tokens 1:1. Yield is distributed via buybacks, not withdrawals.
     */
    function withdraw(uint256 shares) external override nonReentrant returns (uint256 amount) {
        require(msg.sender == stakingContract, "Only staking contract can withdraw");
        require(shares > 0, "Shares must be greater than 0");
        require(totalDeposited >= shares, "Insufficient deposits");
        
        totalDeposited -= shares;
        
        // Transfer tokens back to staking contract
        IReflectiveToken(address(token)).transferForUnstaking(stakingContract, shares);
        
        return shares;
    }

    /**
     * @notice Execute buyback and burn using ETH from protocol fees
     * @dev This is the yield mechanism - protocol fees buy tokens and burn them
     */
    function executeBuyback() external payable nonReentrant {
        require(isActive, "Strategy is paused");
        require(msg.value > 0, "No ETH sent");
        require(address(this).balance >= msg.value, "Insufficient balance");
        
        // Get WETH address
        address weth = uniswapRouter.WETH();
        require(weth != address(0), "Invalid WETH address");
        
        // Prepare swap path: ETH -> WETH -> Token
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = address(token);
        
        // Get minimum amount out (with 1% slippage tolerance)
        uint256[] memory amountsOut = uniswapRouter.getAmountsOut(msg.value, path);
        require(amountsOut.length >= 2, "Invalid path");
        uint256 minAmountOut = (amountsOut[1] * 99) / 100; // 1% slippage
        
        // Execute swap
        uint256[] memory amounts = uniswapRouter.swapExactETHForTokens{value: msg.value}(
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300 // 5 minute deadline
        );
        
        uint256 tokensBought = amounts[1];
        
        // Burn the tokens (this is the yield - reduces supply, increases value)
        if (tokensBought > 0) {
            IReflectiveToken(address(token)).burnTokens(tokensBought);
            totalBurned += tokensBought;
            
            emit BuybackExecuted(msg.value, tokensBought, tokensBought);
        }
    }

    /**
     * @notice Get total value (deposited tokens)
     */
    function getTotalValue() external view override returns (uint256 totalValue) {
        return totalDeposited;
    }

    /**
     * @notice Get estimated yield rate (APY in basis points)
     */
    function getYieldRate() external view override returns (uint256 apyBps) {
        return estimatedAPY;
    }

    /**
     * @notice Get strategy status
     */
    function getStatus() external view override returns (bool isActiveStatus, bool isSafe) {
        return (isActive, isActive && stakingContract != address(0));
    }

    /**
     * @notice Emergency withdraw all tokens
     */
    function emergencyWithdraw() external override onlyOwner nonReentrant returns (uint256 amount) {
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            IReflectiveToken(address(token)).transferForUnstaking(owner(), balance);
        }
        return balance;
    }

    /**
     * @notice Pause the strategy
     */
    function pause() external onlyOwner {
        isActive = false;
        emit StrategyPaused();
    }

    /**
     * @notice Resume the strategy
     */
    function resume() external onlyOwner {
        isActive = true;
        emit StrategyResumed();
    }

    /**
     * @notice Update minimum buyback amount
     */
    function setMinBuybackAmount(uint256 _minAmount) external onlyOwner {
        require(_minAmount > 0, "Amount must be greater than 0");
        minBuybackAmount = _minAmount;
        emit MinBuybackAmountUpdated(_minAmount);
    }

    /**
     * @notice Update Uniswap router
     */
    function setUniswapRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router address");
        uniswapRouter = IUniswapV2Router(_router);
        emit UniswapRouterUpdated(_router);
    }

    /**
     * @notice Get strategy statistics
     */
    function getStats() external view returns (
        uint256 deposited,
        uint256 burned,
        uint256 currentBalance,
        bool active
    ) {
        return (
            totalDeposited,
            totalBurned,
            token.balanceOf(address(this)),
            isActive
        );
    }

    // Allow contract to receive ETH for buybacks
    receive() external payable {
        // ETH can be sent directly for buybacks
    }
}

