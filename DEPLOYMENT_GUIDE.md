# Dr. Birdy Books Protocol - Deployment Guide

This guide covers deploying both the smart contracts and the React frontend application.

## Prerequisites

- Node.js 16+
- MetaMask browser extension
- Base network access
- Git

## Smart Contract Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# Base Mainnet RPC
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASE_MAINNET_PRIVATE_KEY=your_private_key_here

# Base Sepolia Testnet RPC  
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here

# Etherscan API Key (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Deploy Contracts

```bash
# Deploy to Base Sepolia testnet
npm run deploy:testnet

# Deploy to Base Mainnet
npm run deploy:mainnet
```

### 4. Update Contract Addresses

After deployment, update the contract addresses in:
- `frontend/src/config/networks.ts`

## Frontend Deployment

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Update Contract Addresses

Edit `frontend/src/config/networks.ts` with your deployed contract addresses:

```typescript
export const CONTRACT_ADDRESSES = {
  reflectiveToken: '0x...', // Your deployed token address
  tokenDistribution: '0x...', // Your deployed distribution address
  flexibleTieredStaking: '0x...', // Your deployed staking address
  arweaveGateway: '0x...', // Your deployed gateway address
  improvedTimelock: '0x...', // Your deployed timelock address
};
```

### 3. Build for Production

```bash
cd frontend
npm run build
```

### 4. Deploy Frontend

#### Option A: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd frontend
vercel --prod
```

#### Option B: Netlify

1. Build the project:
```bash
cd frontend
npm run build
```

2. Upload the `build` folder to Netlify

#### Option C: GitHub Pages

1. Install gh-pages:
```bash
cd frontend
npm install --save-dev gh-pages
```

2. Add to package.json:
```json
{
  "homepage": "https://yourusername.github.io/dr-birdy-books-protocol",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

3. Deploy:
```bash
npm run deploy
```

## Configuration Steps

### 1. Smart Contract Initialization

After deployment, you need to initialize the contracts in the correct order:

1. **Deploy all contracts**
2. **Initialize ReflectiveToken** with required parameters
3. **Initialize TokenDistribution** with team wallet addresses
4. **Initialize FlexibleTieredStaking** with token and oracle addresses
5. **Set up contract relationships** (distribution contract, staking contract, etc.)

### 2. Frontend Configuration

Update the following files with your deployed addresses:

- `frontend/src/config/networks.ts` - Contract addresses
- `frontend/src/hooks/useContracts.ts` - Contract ABIs (if modified)

### 3. Network Configuration

The frontend automatically supports:
- Base Mainnet (Chain ID: 8453)
- Base Sepolia Testnet (Chain ID: 84531)

Users will be prompted to switch to Base network if they're on a different network.

## Testing the Deployment

### 1. Smart Contract Testing

```bash
# Run tests
npm test

# Run specific test file
npm test -- --grep "ReflectiveToken"
```

### 2. Frontend Testing

```bash
cd frontend
npm start
```

Open http://localhost:3000 and test:
- Wallet connection
- Network switching
- Contract interactions
- Staking functionality
- Token operations

## Production Checklist

- [ ] All contracts deployed and verified
- [ ] Contract addresses updated in frontend
- [ ] Frontend built and deployed
- [ ] MetaMask integration tested
- [ ] Base network switching tested
- [ ] All contract functions tested
- [ ] Error handling verified
- [ ] Mobile responsiveness checked

## Troubleshooting

### Common Issues

1. **"Contract not found" errors**
   - Verify contract addresses are correct
   - Check if contracts are deployed on the correct network

2. **MetaMask connection issues**
   - Ensure MetaMask is installed and unlocked
   - Check if the correct network is selected

3. **Transaction failures**
   - Verify sufficient ETH for gas fees
   - Check if contracts are properly initialized
   - Ensure user has required permissions

4. **Build errors**
   - Clear node_modules and reinstall
   - Check TypeScript compilation errors
   - Verify all dependencies are installed

### Support

For deployment issues:
1. Check contract deployment logs
2. Verify network connectivity
3. Ensure all dependencies are installed
4. Check browser console for errors

## Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive data
- Verify all contract addresses before deployment
- Test thoroughly on testnet before mainnet deployment
- Keep private keys secure and use hardware wallets for production

## Next Steps

After successful deployment:

1. **Monitor contract activity** on BaseScan
2. **Set up monitoring** for contract events
3. **Configure backup systems** for critical functions
4. **Plan for upgrades** using the timelock system
5. **Document user guides** for the frontend interface
