# Yield Generation System for Staked Tokens

## Overview

The yield generation system allows staked tokens to generate value in safe, controlled ways while maintaining the ability for users to unstake at any time. The system uses a **pluggable strategy pattern** that allows different yield strategies to be implemented and swapped as needed.

## Architecture

### Components

1. **`IYieldStrategy.sol`** - Interface defining the contract for yield strategies
2. **`TreasuryYieldStrategy.sol`** - Safe treasury/buyback strategy (initial implementation)
3. **`FlexibleTieredStaking.sol`** - Updated with yield integration

### Key Features

✅ **Safe & Modest**: Default strategy uses buyback and burn (no external protocol risk)  
✅ **Unstaking Preserved**: Users can always unstake (system withdraws from yield if needed)  
✅ **Configurable Limits**: Maximum % of staked tokens that can be deployed (default: 50%)  
✅ **Emergency Controls**: Owner can pause, withdraw, or change strategies  
✅ **Automatic Management**: System automatically deploys/withdraws as needed  

## How It Works

### Treasury Yield Strategy (Current Implementation)

The `TreasuryYieldStrategy` is the safest option:

1. **Token Holding**: Staked tokens are held in the strategy contract
2. **Buyback Mechanism**: Protocol fees (ETH) can be sent to the strategy
3. **Token Purchase**: Strategy swaps ETH for tokens via Uniswap
4. **Burn**: Purchased tokens are burned, reducing supply and increasing value
5. **Yield**: Value increase benefits all stakers proportionally

**Benefits:**
- No external protocol risk
- No impermanent loss
- No liquidity lockup
- Simple and transparent

### Integration with Staking

When users stake:
- Tokens are deposited normally
- System automatically deploys a portion to yield (if enabled and within limits)

When users unstake:
- System checks if enough tokens are available in contract
- If not, automatically withdraws from yield strategy
- User receives tokens immediately

## Configuration

### Setting Up Yield Strategy

1. **Deploy TreasuryYieldStrategy**:
   ```solidity
   TreasuryYieldStrategy strategy = new TreasuryYieldStrategy(
       tokenAddress,
       uniswapRouterAddress,
       ownerAddress
   );
   ```

2. **Set Staking Contract** (one-time):
   ```solidity
   strategy.setStakingContract(stakingContractAddress);
   ```

3. **Configure in Staking Contract**:
   ```solidity
   staking.setYieldStrategy(strategyAddress);
   staking.setYieldEnabled(true);
   staking.setMaxYieldDeployment(5000); // 50% max
   ```

### Safety Limits

- **Max Deployment**: Configurable percentage (default 50%)
- **Strategy Status Checks**: System verifies strategy is active and safe before deploying
- **Emergency Withdraw**: Owner can withdraw all funds instantly if needed

## Usage

### For Protocol Owners

**Enable Yield Generation:**
```solidity
// Set strategy
staking.setYieldStrategy(strategyAddress);

// Enable yield
staking.setYieldEnabled(true);

// Set max deployment (50% = 5000 basis points)
staking.setMaxYieldDeployment(5000);
```

**Execute Buyback (Send ETH to strategy):**
```solidity
// Send ETH to strategy contract
strategy.executeBuyback{value: ethAmount}();
```

**Manual Management:**
```solidity
// Manually deploy tokens to yield
staking.deployToYield(amount);

// Withdraw from yield
staking.withdrawFromYield(shares);

// Emergency withdraw all
staking.emergencyWithdrawFromYield();
```

### For Users

Users don't need to do anything different! The yield system works automatically:
- Staking works the same way
- Unstaking works the same way
- Yield benefits are shared proportionally

## Yield Distribution

In the **TreasuryYieldStrategy**, yield is distributed through:
- **Buyback & Burn**: Reduces token supply, increasing value for all holders
- **Proportional Benefit**: All stakers benefit based on their stake size

For future strategies (e.g., lending protocols), yield could be:
- Distributed as additional tokens to stakers
- Reinvested automatically
- Claimable by users

## Safety Features

1. **Maximum Deployment Limit**: Only a percentage of staked tokens can be deployed (default 50%)
2. **Strategy Status Checks**: System verifies strategy is safe before deploying
3. **Automatic Withdrawal**: System withdraws from yield when users unstake
4. **Emergency Controls**: Owner can pause or withdraw instantly
5. **Reentrancy Protection**: All functions use `nonReentrant` modifier

## Future Strategies

The pluggable interface allows for future strategies:

### Potential Strategies:
1. **Aave/Compound Lending**: Deposit tokens to lending protocols (requires token conversion)
2. **Liquidity Provision**: Provide liquidity to DEX pairs (higher risk, higher yield)
3. **Stablecoin Lending**: Convert to stablecoins and lend (very safe, lower yield)
4. **Multi-Strategy**: Combine multiple strategies for diversification

### Adding a New Strategy:

1. Implement `IYieldStrategy` interface
2. Deploy the new strategy contract
3. Update staking contract: `staking.setYieldStrategy(newStrategyAddress)`

## Events

The system emits events for transparency:
- `YieldStrategySet`: When strategy is configured
- `YieldDeposited`: When tokens are deployed to yield
- `YieldWithdrawn`: When tokens are withdrawn from yield
- `YieldEnabled`: When yield is enabled/disabled
- `MaxYieldDeploymentUpdated`: When deployment limits change

## Monitoring

Check yield status:
```solidity
(
    address strategyAddress,
    uint256 deployedShares,
    uint256 totalValue,
    uint256 apyBps,
    bool isActive
) = staking.getYieldInfo();
```

Check strategy stats:
```solidity
(
    uint256 deposited,
    uint256 burned,
    uint256 currentBalance,
    bool active
) = strategy.getStats();
```

## Important Notes

⚠️ **Initial Strategy**: The `TreasuryYieldStrategy` is the safest option but requires protocol fees (ETH) to be sent to it for buybacks. Without buybacks, it simply holds tokens (no yield).

⚠️ **Unstaking**: Users can always unstake. The system automatically handles yield withdrawals if needed.

⚠️ **Owner Controls**: Only the contract owner can configure yield settings. This is intentional for safety.

⚠️ **Gradual Deployment**: The system deploys tokens gradually to avoid gas issues and maintain liquidity.

## Deployment Checklist

- [ ] Deploy `TreasuryYieldStrategy` contract
- [ ] Set staking contract address in strategy
- [ ] Configure strategy in `FlexibleTieredStaking`
- [ ] Set appropriate max deployment percentage
- [ ] Enable yield generation
- [ ] Test with small amounts first
- [ ] Monitor yield performance
- [ ] Set up buyback mechanism (if using TreasuryYieldStrategy)

## Questions?

The yield system is designed to be:
- **Safe**: Multiple safety limits and checks
- **Flexible**: Pluggable strategies for future expansion
- **Transparent**: All actions emit events
- **User-Friendly**: Works automatically without user intervention

For more advanced strategies or custom implementations, the `IYieldStrategy` interface can be extended.


