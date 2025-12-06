// Deployment Configuration
// Update these values before deployment

const DEPLOYMENT_CONFIG = {
  // Base Network Configuration
  UNISWAP_ROUTER: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24", // Base Uniswap V2 Router (verified)
  UNISWAP_FACTORY: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6", // Base Uniswap V2 Factory
  WETH: "0x4200000000000000000000000000000000000006", // Base WETH (verified)
  MARKETING_WALLET: "0xF347Ce7bC1DA78c8DD482816dD4a38Db27700B22", // Provided
  PRIMARY_ORACLE: "0x71041dDDaD356F8F9546D0Ba93B54C0b4C458375", // Chainlink ETH/USD on Base (verified)
  BACKUP_ORACLE: "0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8", // Chainlink BTC/USD on Base (verified)

  // Team Wallet Addresses
  TEAM_WALLETS: {
    JOSEPH: "0x4d8b10e7d6bff54c8c1c1c42240c74e173c5f8ed", // J - 1.625%
    AJ: "0xdd82052fbc8edc7091dafa1540f16c63c51cb2fb", // A - 1.625%
    DSIGN: "0x0000000000000000000000000000000000000000", // D - 1.625% (to be updated later)
    DEVELOPER: "0xe409c2f794647ac4940d7f1b6506790098bba136", // Morris - 1%
    BIRDY: "0xad19c12098037b7d35009c7cc794769e1427cc2d", // B - 1.625%
    AIRDROP: "0xad19c12098037b7d35009c7cc794769e1427cc2d", // Replace with actual
  },

  // Token Configuration
  TOKEN_CONFIG: {
    NAME: "Dr Birdy Books Protocol Token",
    SYMBOL: "DBBPT",
    DECIMALS: 18,
    TOTAL_SUPPLY: "10000000", // 10M tokens TODO: INCREASE IF YOU WANT
  },

  // Fee Configuration (in basis points)
  FEE_CONFIG: {
    TAX_FEE: 100, // 1%
    LIQUIDITY_FEE: 200, // 2%
    MARKETING_FEE: 200, // 2%
    BURN_FEE: 50, // 0.5%
  },

  // Staking Configuration
  STAKING_CONFIG: {
    GRACE_PERIOD: 86400, // 1 day in seconds
    MIN_STAKING_DURATION: 86400, // 1 day in seconds
    GAS_REFUND_REWARD: "1000000000000000", // 0.001 ETH in wei
  },

  // Distribution Configuration
  // Total Supply: 10,000,000 tokens
  // Team Allocations:
  //   - J, A, D, B: 1.625% each = 162,500 tokens each
  //   - Morris (Developer): 1% = 100,000 tokens
  //   - Total Team: 750,000 tokens (7.5%)
  DISTRIBUTION_CONFIG: {
    TEAM_ALLOCATION_STANDARD: "162500", // 162,500 tokens (1.625%) for J, A, D, B
    TEAM_ALLOCATION_DEVELOPER: "100000", // 100,000 tokens (1%) for Morris
    AIRDROP_ALLOCATION: "250000", // 250,000 tokens for airdrop
    VESTING_DURATION: 31536000, // 365 days in seconds
    VESTING_CLIFF: 7776000, // 90 days in seconds
  },

  // Tier Configuration (USD values with 8 decimals)
  TIER_CONFIG: [
    { threshold: "2400000000", name: "Tier 1" }, // $24
    { threshold: "5000000000", name: "Tier 2" }, // $50
    { threshold: "100000000000", name: "Tier 3" }, // $1000
  ],
};

// Validation function
function validateConfig() {
  const config = DEPLOYMENT_CONFIG;

  // Check required addresses
  if (config.UNISWAP_ROUTER === "0x0000000000000000000000000000000000000000") {
    throw new Error("UNISWAP_ROUTER not set");
  }

  if (
    config.MARKETING_WALLET === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error("MARKETING_WALLET not set");
  }

  if (config.PRIMARY_ORACLE === "0x0000000000000000000000000000000000000000") {
    throw new Error("PRIMARY_ORACLE not set");
  }

  // Check team wallets (DSIGN can be zero as it will be updated later)
  const teamWallets = Object.values(config.TEAM_WALLETS);
  for (const [key, wallet] of Object.entries(config.TEAM_WALLETS)) {
    if (wallet === "0x0000000000000000000000000000000000000000" && key !== "DSIGN") {
      throw new Error(`Team wallet ${key} not updated`);
    }
  }

  console.log("✅ Configuration validated successfully");
  return true;
}

module.exports = {
  DEPLOYMENT_CONFIG,
  validateConfig,
};
