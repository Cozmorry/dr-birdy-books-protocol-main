# Dr. Birdy Books Protocol Frontend

A React TypeScript application for interacting with the Dr. Birdy Books Protocol smart contracts on Base network.

## Features

- **MetaMask Integration**: Connect and manage wallet connections
- **Base Network Support**: Automatic network switching to Base mainnet/testnet
- **Token Management**: View balances, transfer, and burn tokens
- **Staking System**: Stake/unstake tokens with tier-based access
- **Vesting Management**: Claim vested tokens for team members
- **Real-time Updates**: Live contract state monitoring

## Smart Contracts

This frontend interacts with the following contracts:

- **ReflectiveToken**: Main ERC20 token with reflection mechanics
- **TokenDistribution**: Team vesting and airdrop distribution
- **FlexibleTieredStaking**: Tier-based staking system
- **ArweaveGateway**: File verification system
- **ImprovedTimelock**: Governance timelock

## Getting Started

### Prerequisites

- Node.js 16+ 
- MetaMask browser extension
- Access to Base network

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Configuration

Update contract addresses in `src/config/networks.ts` after deployment:

```typescript
export const CONTRACT_ADDRESSES = {
  reflectiveToken: '0x...', // Your deployed token address
  tokenDistribution: '0x...', // Your deployed distribution address
  flexibleTieredStaking: '0x...', // Your deployed staking address
  arweaveGateway: '0x...', // Your deployed gateway address
  improvedTimelock: '0x...', // Your deployed timelock address
};
```

## Usage

1. **Connect Wallet**: Click "Connect MetaMask" to link your wallet
2. **Switch Network**: Automatically prompts to switch to Base network
3. **View Information**: See your token balance, staking status, and tier level
4. **Stake Tokens**: Stake DBBPT tokens to unlock tier-based access
5. **Claim Vesting**: Team members can claim their vested tokens
6. **Manage Tokens**: Transfer or burn tokens as needed

## Network Configuration

The app supports:
- **Base Mainnet** (Chain ID: 8453)
- **Base Sepolia Testnet** (Chain ID: 84531)

## Development

### Project Structure

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── config/             # Network and contract configuration
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

### Key Components

- `WalletConnect`: MetaMask connection management
- `TokenInfo`: Display user token information
- `StakingPanel`: Staking/unstaking interface
- `VestingPanel`: Team vesting management
- `TierInfo`: Staking tier display
- `TokenActions`: Token transfer and burn

### Custom Hooks

- `useWeb3`: Web3 provider and wallet management
- `useContracts`: Smart contract interaction logic

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Security Notes

- Always verify contract addresses before use
- Never share your private keys
- Be cautious with token burning (irreversible)
- Verify transactions on BaseScan before confirming

## Support

For issues or questions:
- Check the smart contract documentation
- Verify network connectivity
- Ensure MetaMask is properly configured
- Check Base network status

## License

MIT License - See LICENSE file for details