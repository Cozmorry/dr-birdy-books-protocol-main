export interface ContractAddresses {
  reflectiveToken: string;
  tokenDistribution: string;
  flexibleTieredStaking: string;
  arweaveGateway: string;
  improvedTimelock: string;
}

export interface UserInfo {
  address: string;
  balance: string;
  stakedAmount: string;
  tier: number;
  hasAccess: boolean;
  canUnstake: boolean;
}

export interface VestingInfo {
  totalAmount: string;
  claimed: string;
  claimable: string;
  vestingEndTime: string;
}

export interface TierInfo {
  threshold: string;
  name: string;
}

export interface ArweaveFile {
  txId: string;
  fileType: string;
  description: string;
  version: number;
  timestamp: number;
}

export interface TierFile {
  txId: string;
  fileType: string;
  description: string;
  version: number;
  timestamp: number;
}

export interface UserFile {
  txId: string;
  fileType: string;
  description: string;
  version: number;
  timestamp: number;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
}
