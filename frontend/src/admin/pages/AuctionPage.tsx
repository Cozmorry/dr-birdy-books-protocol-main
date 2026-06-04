import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '../../hooks/useWeb3Store';
import { useWeb3 } from '../../hooks/useWeb3';
import { getContractAddresses } from '../../config/networks';
import {
  AUCTION_ABI,
  AUCTION_BYTECODE,
  MOCK_ERC20_ABI,
  MOCK_ERC20_BYTECODE,
} from '../../config/auction-artifact';
import {
  Gavel,
  Shield,
  Coins,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Play,
  StopCircle,
  RefreshCw,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  DollarSign,
  HelpCircle,
  ExternalLink,
  Wallet,
  Rocket,
  FlaskConical,
  Copy,
  Zap,
} from 'lucide-react';

const CONTINUOUS_CLEARING_AUCTION_ABI = [
  "function token() view returns (address)",
  "function currency() view returns (address)",
  "function tokenAmount() view returns (uint256)",
  "function floorPrice() view returns (uint256)",
  "function startBlock() view returns (uint256)",
  "function endBlock() view returns (uint256)",
  "function fundsRecipient() view returns (address)",
  "function liquidityRecipient() view returns (address)",
  "function totalCurrencyContributed() view returns (uint256)",
  "function clearingPrice() view returns (uint256)",
  "function totalTokensSold() view returns (uint256)",
  "function isEnded() view returns (bool)",
  "function isCanceled() view returns (bool)",
  "function isFinalized() view returns (bool)",
  "function currencyContributed(address bidder) view returns (uint256)",
  "function tokensClaimed(address bidder) view returns (bool)",
  "function refundClaimed(address bidder) view returns (bool)",
  "function bid(uint256 amount) external",
  "function endAuctionEarly() external",
  "function cancelAuction() external",
  "function finalize() external",
  "function claimTokens() external",
  "function claimRefund() external",
  "function withdrawUnsoldTokens() external",
  "function owner() view returns (address)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function setStakingContract(address staking) external",
  "function getStakingContract() view returns (address)",
  "function stakingContract() view returns (address)",
  "function excludeFromFee(address account, bool excluded) external"
];

interface AuctionState {
  tokenAddress: string;
  currencyAddress: string;
  tokenAmount: bigint;
  floorPrice: bigint;
  startBlock: bigint;
  endBlock: bigint;
  fundsRecipient: string;
  liquidityRecipient: string;
  totalCurrencyContributed: bigint;
  clearingPrice: bigint;
  totalTokensSold: bigint;
  isEnded: boolean;
  isCanceled: boolean;
  isFinalized: boolean;
  ownerAddress: string;
}

interface CurrencyMeta {
  symbol: string;
  decimals: number;
}

interface BidLog {
  bidder: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}

export default function AuctionPage() {
  const {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isCorrectNetwork,
    isLoading: web3Loading,
    error: web3Error,
    connectWallet,
    switchToBaseNetwork,
  } = useWeb3();

  const { setWeb3State } = useWeb3Store();

  // Sync state between component's useWeb3 and the app store
  useEffect(() => {
    if (setWeb3State) {
      setWeb3State({
        provider,
        signer,
        account,
        isConnected,
        isCorrectNetwork,
        web3Loading,
        web3Error,
      });
    }
  }, [provider, signer, account, isConnected, isCorrectNetwork, web3Loading, web3Error, setWeb3State]);

  // Selected auction address
  const [auctionAddress, setAuctionAddress] = useState<string>('');
  const [addressInput, setAddressInput] = useState<string>('');
  
  // Contracts and data state
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [currencyMeta, setCurrencyMeta] = useState<CurrencyMeta>({ symbol: 'USDC', decimals: 6 });
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  // Bid history state
  const [bidHistory, setBidHistory] = useState<BidLog[]>([]);
  
  // Claim history state
  interface ClaimLog {
    claimer: string;
    tokensReceived: string;
    txHash: string;
    blockNumber: number;
  }
  const [claimHistory, setClaimHistory] = useState<ClaimLog[]>([]);
  
  // Loading states
  const [isLoadingState, setIsLoadingState] = useState<boolean>(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  
  // Transaction action states
  const [isTxPending, setIsTxPending] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  
  // Simulation inputs
  const [bidAmount, setBidAmount] = useState<string>('100');
  const [originalStakingAddress, setOriginalStakingAddress] = useState<string>('');
  const [isAuctionExcluded, setIsAuctionExcluded] = useState<boolean>(false);

  // Developer Sandbox — deploy states
  const [sandboxTokenAddr, setSandboxTokenAddr] = useState<string>('');
  const [sandboxCurrencyAddr, setSandboxCurrencyAddr] = useState<string>('');
  const [sandboxTokenAmount, setSandboxTokenAmount] = useState<string>('1500000');
  const [sandboxFloorPrice, setSandboxFloorPrice] = useState<string>('0.1');
  const [sandboxStartDelay, setSandboxStartDelay] = useState<string>('5');
  const [sandboxDuration, setSandboxDuration] = useState<string>('500');
  const [sandboxFundsRecipient, setSandboxFundsRecipient] = useState<string>('');
  const [sandboxLiquidityRecipient, setSandboxLiquidityRecipient] = useState<string>('');
  const [sandboxOwner, setSandboxOwner] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const [deployedAuctionAddr, setDeployedAuctionAddr] = useState<string>('');

  // Default address resolution based on chain ID
  useEffect(() => {
    if (chainId) {
      const addresses = getContractAddresses(chainId);
      if (addresses && addresses.continuousClearingAuction && addresses.continuousClearingAuction !== ethers.ZeroAddress) {
        setAuctionAddress(addresses.continuousClearingAuction);
        setAddressInput(addresses.continuousClearingAuction);
      }
      // Pre-fill original staking address from network config
      if (addresses && addresses.flexibleTieredStaking && addresses.flexibleTieredStaking !== ethers.ZeroAddress) {
        setOriginalStakingAddress(addresses.flexibleTieredStaking);
      }
    }
  }, [chainId]);

  // Pre-fill sandbox owner/recipient fields when account connects
  useEffect(() => {
    if (account) {
      if (!sandboxOwner) setSandboxOwner(account);
      if (!sandboxFundsRecipient) setSandboxFundsRecipient(account);
      if (!sandboxLiquidityRecipient) setSandboxLiquidityRecipient(account);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  // Load contract state
  const fetchAuctionDetails = useCallback(async () => {
    if (!provider || !auctionAddress || !ethers.isAddress(auctionAddress)) {
      return;
    }

    setIsLoadingState(true);
    setTxError(null);
    
    try {
      const blockNum = await provider.getBlockNumber();
      setCurrentBlock(blockNum);

      const contract = new ethers.Contract(
        auctionAddress,
        CONTINUOUS_CLEARING_AUCTION_ABI,
        provider
      );

      // First, verify the contract exists by checking if it has code
      const code = await provider.getCode(auctionAddress);
      if (code === '0x') {
        throw new Error(`No contract found at address ${auctionAddress}. The address may be incorrect, or the contract is not deployed on ${chainId === 84532 ? 'Base Sepolia' : chainId === 8453 ? 'Base Mainnet' : 'this network'}.`);
      }

      // Fetch state in parallel
      const [
        tokenAddress,
        currencyAddress,
        tokenAmount,
        floorPrice,
        startBlock,
        endBlock,
        fundsRecipient,
        liquidityRecipient,
        totalCurrencyContributed,
        clearingPrice,
        totalTokensSold,
        isEnded,
        isCanceled,
        isFinalized,
        ownerAddress
      ] = await Promise.all([
        contract.token(),
        contract.currency(),
        contract.tokenAmount(),
        contract.floorPrice(),
        contract.startBlock(),
        contract.endBlock(),
        contract.fundsRecipient(),
        contract.liquidityRecipient(),
        contract.totalCurrencyContributed(),
        contract.clearingPrice(),
        contract.totalTokensSold(),
        contract.isEnded(),
        contract.isCanceled(),
        contract.isFinalized(),
        contract.owner()
      ]);

      setAuctionState({
        tokenAddress,
        currencyAddress,
        tokenAmount,
        floorPrice,
        startBlock,
        endBlock,
        fundsRecipient,
        liquidityRecipient,
        totalCurrencyContributed,
        clearingPrice,
        totalTokensSold,
        isEnded,
        isCanceled,
        isFinalized,
        ownerAddress
      });

      // Load currency metadata (symbol and decimals)
      const currencyContract = new ethers.Contract(currencyAddress, ERC20_ABI, provider);
      try {
        const [symbol, decimals] = await Promise.all([
          currencyContract.symbol(),
          currencyContract.decimals()
        ]);
        setCurrencyMeta({ symbol, decimals: Number(decimals) });
      } catch (err) {
        console.warn("Could not read currency decimals/symbol, using fallback USDC/6", err);
        setCurrencyMeta({ symbol: 'USDC', decimals: 6 });
      }

      // Try to load original staking contract address from ReflectiveToken
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        let originalStaking = '';
        try {
          originalStaking = await tokenContract.stakingContract();
        } catch {
          try {
            originalStaking = await tokenContract.getStakingContract();
          } catch {
            console.warn("Could not fetch stakingContract address from ReflectiveToken");
          }
        }
        if (originalStaking && originalStaking !== ethers.ZeroAddress && originalStaking.toLowerCase() !== auctionAddress.toLowerCase()) {
          setOriginalStakingAddress(originalStaking);
        }

        // Check if auction IS the current staking contract (indicates it's fee-exempt via legacy method)
        if (originalStaking && originalStaking.toLowerCase() === auctionAddress.toLowerCase()) {
          setIsAuctionExcluded(true);
          console.log("Auction is set as staking contract - fee exempt via legacy method");
        }
      } catch (err) {
        console.warn("Could not load original staking address:", err);
      }

    } catch (err: any) {
      console.error("Failed to load auction state:", err);
      setTxError(`Failed to load auction state at address: ${auctionAddress}. Please check if the address is correct and deployed on the current network.`);
      setAuctionState(null);
    } finally {
      setIsLoadingState(false);
    }
  }, [provider, auctionAddress]);

  // Fetch bidding events
  const fetchBiddingHistory = useCallback(async () => {
    if (!provider || !auctionAddress || !ethers.isAddress(auctionAddress)) {
      return;
    }

    setIsHistoryLoading(true);
    try {
      const contract = new ethers.Contract(
        auctionAddress,
        [
          "event BidSubmitted(address indexed bidder, uint256 amount)",
          "event TokensClaimed(address indexed bidder, uint256 tokensReceived)"
        ],
        provider
      );

      const currentBlockNum = await provider.getBlockNumber();
      // Base Sepolia RPC limits to 2000 blocks max
      const startLookupBlock = Math.max(0, currentBlockNum - 2000);

      // Fetch bid events
      const bidFilter = contract.filters.BidSubmitted();
      const bidEvents = await contract.queryFilter(bidFilter, startLookupBlock, 'latest');

      const formattedBids: BidLog[] = bidEvents
        .map((evt: any) => ({
          bidder: evt.args[0],
          amount: evt.args[1].toString(),
          txHash: evt.transactionHash,
          blockNumber: evt.blockNumber
        }))
        .reverse()
        .slice(0, 20); // Show last 20 bids

      setBidHistory(formattedBids);

      // Fetch claim events
      const claimFilter = contract.filters.TokensClaimed();
      const claimEvents = await contract.queryFilter(claimFilter, startLookupBlock, 'latest');

      const formattedClaims: ClaimLog[] = claimEvents
        .map((evt: any) => ({
          claimer: evt.args[0],
          tokensReceived: evt.args[1].toString(),
          txHash: evt.transactionHash,
          blockNumber: evt.blockNumber
        }))
        .reverse()
        .slice(0, 20); // Show last 20 claims

      setClaimHistory(formattedClaims);
    } catch (err) {
      console.error("Failed to query auction events:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [provider, auctionAddress]);

  useEffect(() => {
    if (provider && auctionAddress && ethers.isAddress(auctionAddress)) {
      fetchAuctionDetails();
      fetchBiddingHistory();
    }
  }, [provider, auctionAddress, fetchAuctionDetails, fetchBiddingHistory]);

  const handleUpdateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (ethers.isAddress(addressInput)) {
      setAuctionAddress(addressInput);
      setTxSuccess("Auction address updated.");
    } else {
      setTxError("Invalid contract address entered.");
    }
  };

  // Helper: format bigints with custom decimals
  const formatUnits = (value: bigint, decimals: number) => {
    return Number(ethers.formatUnits(value, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  // Run transactions with state wrapper
  const executeTx = async (txFn: () => Promise<ethers.ContractTransactionResponse>, successMsg: string) => {
    if (!signer) {
      setTxError("Wallet not connected.");
      return;
    }
    
    setIsTxPending(true);
    setTxError(null);
    setTxSuccess(null);

    try {
      const tx = await txFn();
      console.log("Tx sent:", tx.hash);
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        setTxSuccess(`${successMsg} (Tx Confirmed: ${tx.hash.substring(0, 10)}...)`);
        fetchAuctionDetails();
        fetchBiddingHistory();
      } else {
        throw new Error("Transaction reverted on-chain.");
      }
    } catch (err: any) {
      console.error("Transaction failed:", err);
      // Clean up technical messages
      let message = err.reason || err.message || "Unknown transaction failure.";
      if (message.includes("user rejected")) {
        message = "User rejected the transaction in the wallet.";
      }
      setTxError(message);
    } finally {
      setIsTxPending(false);
    }
  };

  // Owner action: End early
  const handleEndEarly = () => {
    const contract = new ethers.Contract(auctionAddress, CONTINUOUS_CLEARING_AUCTION_ABI, signer);
    executeTx(() => contract.endAuctionEarly(), "Auction bidding ended early successfully!");
  };

  // Owner action: Fund auction with DBBPT tokens
  const handleFundAuction = async () => {
    if (!auctionState || !signer) {
      setTxError("Wallet not connected or auction not loaded.");
      return;
    }

    const fundAmount = ethers.parseEther("1500000"); // 1.5M DBBPT
    const tokenABI = ["function transfer(address to, uint256 amount) returns (bool)"];
    const token = new ethers.Contract(auctionState.tokenAddress, tokenABI, signer);

    executeTx(
      () => token.transfer(auctionAddress, fundAmount),
      "Successfully funded auction with 1,500,000 DBBPT tokens!"
    );
  };

  // Owner action: Cancel auction
  const handleCancelAuction = () => {
    if (!window.confirm("Are you sure you want to cancel the auction? Bidders will be refunded 100% and tokens returned.")) {
      return;
    }
    const contract = new ethers.Contract(auctionAddress, CONTINUOUS_CLEARING_AUCTION_ABI, signer);
    executeTx(() => contract.cancelAuction(), "Auction canceled successfully!");
  };

  // Owner action: Finalize
  const handleFinalize = async () => {
    if (!auctionState || !provider) return;

    // Check if auction has tokens before finalizing
    try {
      const tokenContract = new ethers.Contract(auctionState.tokenAddress, ERC20_ABI, provider);
      const auctionBalance = await tokenContract.balanceOf(auctionAddress);
      
      if (auctionBalance < auctionState.tokenAmount) {
        setTxError(`Auction contract needs to be funded with ${ethers.formatEther(auctionState.tokenAmount)} DBBPT tokens before finalization. Current balance: ${ethers.formatEther(auctionBalance)} DBBPT. Click "Fund Auction" first.`);
        return;
      }
    } catch (err) {
      console.warn("Could not check auction token balance:", err);
    }

    const contract = new ethers.Contract(auctionAddress, CONTINUOUS_CLEARING_AUCTION_ABI, signer);
    executeTx(() => contract.finalize(), "Auction finalized successfully! Funds distributed and splits settled.");
  };

  // Owner action: Withdraw unsold
  const handleWithdrawUnsold = () => {
    const contract = new ethers.Contract(auctionAddress, CONTINUOUS_CLEARING_AUCTION_ABI, signer);
    executeTx(() => contract.withdrawUnsoldTokens(), "Unsold DBBPT tokens withdrawn successfully!");
  };

  // Exemption: set staking contract (exclude from fees) - DEPRECATED, use excludeFromFee instead
  const handleExcludeAuction = () => {
    if (!auctionState) return;
    const contract = new ethers.Contract(auctionState.tokenAddress, ERC20_ABI, signer);
    executeTx(
      () => contract.setStakingContract(auctionAddress),
      `Set Staking Contract to Auction address ${auctionAddress}. Claim transfers are now exempt from 5% Reflective fee!`
    );
  };

  // Exemption: restore staking contract - DEPRECATED, use excludeFromFee instead
  const handleRestoreStaking = () => {
    if (!auctionState) return;
    
    // Validate address
    if (!originalStakingAddress || originalStakingAddress.trim() === '') {
      setTxError("Please enter the original staking contract address to restore (should be pre-filled from network config).");
      return;
    }
    
    if (!ethers.isAddress(originalStakingAddress)) {
      setTxError(`Invalid Ethereum address: ${originalStakingAddress}. Please enter a valid address starting with 0x.`);
      return;
    }

    // Check if it's the same as auction (pointless operation)
    if (originalStakingAddress.toLowerCase() === auctionAddress.toLowerCase()) {
      setTxError("The original staking address is the same as the auction address. No change needed.");
      return;
    }
    
    const contract = new ethers.Contract(auctionState.tokenAddress, ERC20_ABI, signer);
    executeTx(
      () => contract.setStakingContract(originalStakingAddress),
      `Staking contract restored to ${originalStakingAddress.substring(0, 6)}...${originalStakingAddress.substring(38)}.`
    );
  };

  // NEW: Exclude/Include auction from fees (cleaner approach)
  const handleToggleAuctionFeeExemption = () => {
    if (!auctionState) return;
    const contract = new ethers.Contract(auctionState.tokenAddress, ERC20_ABI, signer);
    
    // Always exclude (set to true) since we can't read current state
    executeTx(
      () => contract.excludeFromFee(auctionAddress, true),
      `✅ Auction contract ${auctionAddress} is now EXCLUDED from 5% transfer fees!`
    );
  };

  // Bidder action: Claim Tokens
  const handleClaimTokens = async () => {
    if (!auctionState || !signer || !account) {
      setTxError("Wallet not connected or auction not loaded.");
      return;
    }

    if (!auctionState.isFinalized) {
      setTxError("Auction must be finalized before claiming tokens.");
      return;
    }

    const contract = new ethers.Contract(auctionAddress, CONTINUOUS_CLEARING_AUCTION_ABI, signer);
    
    try {
      // Check if already claimed
      const hasClaimed = await contract.tokensClaimed(account);
      if (hasClaimed) {
        setTxError("You have already claimed your tokens!");
        return;
      }

      // Check contribution
      const contribution = await contract.currencyContributed(account);
      if (contribution === BigInt(0)) {
        setTxError("You didn't bid in this auction. No tokens to claim.");
        return;
      }

      // Calculate tokens to receive
      const clearingPrice = await contract.clearingPrice();
      const tokensToReceive = (contribution * BigInt(1e18)) / clearingPrice;

      executeTx(
        () => contract.claimTokens(),
        `✅ Successfully claimed ${ethers.formatEther(tokensToReceive)} DBBPT tokens! (0% fee)`
      );
    } catch (err: any) {
      console.error("Claim check failed:", err);
      setTxError("Failed to check claim eligibility. Ensure auction is finalized.");
    }
  };

  // Bidder action: Claim Refund (if canceled)
  const handleClaimRefund = async () => {
    if (!auctionState || !signer || !account) {
      setTxError("Wallet not connected or auction not loaded.");
      return;
    }
    
    if (!auctionState.isCanceled) {
      setTxError("Auction must be canceled to claim refunds.");
      return;
    }
    
    const contract = new ethers.Contract(auctionAddress, CONTINUOUS_CLEARING_AUCTION_ABI, signer);
    
    try {
      // Check if already claimed refund
      const hasClaimedRefund = await contract.refundClaimed(account);
      if (hasClaimedRefund) {
        setTxError("You have already claimed your refund!");
        return;
      }

      // Check if you actually bid
      const contribution = await contract.currencyContributed(account);
      if (contribution === BigInt(0)) {
        setTxError("You didn't bid in this auction. No refund to claim.");
        return;
      }

      executeTx(
        () => contract.claimRefund(),
        `✅ Refund claimed successfully! You received ${ethers.formatUnits(contribution, currencyMeta.decimals)} ${currencyMeta.symbol} back (100%).`
      );
    } catch (err: any) {
      console.error("Refund check failed:", err);
      setTxError("Failed to check refund eligibility. Ensure auction is canceled.");
    }
  };

  // ─── Developer Sandbox ────────────────────────────────────────────────────

  const appendDeployLog = (msg: string) =>
    setDeployLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const handleDeployMockUSDC = async () => {
    if (!signer) { setTxError('Connect your wallet first.'); return; }
    if (chainId === 8453) { setTxError('Sandbox deployments are blocked on Base Mainnet.'); return; }

    setIsDeploying(true);
    setTxError(null);
    setTxSuccess(null);
    appendDeployLog('Deploying Mock USDC (MockERC20)…');

    try {
      const factory = new ethers.ContractFactory(MOCK_ERC20_ABI, MOCK_ERC20_BYTECODE, signer);
      // Deploy: name, symbol, initialSupply (1 billion with 6 decimals)
      const contract = await factory.deploy(
        'Mock USDC',
        'mUSDC',
        ethers.parseUnits('1000000000', 6),
      );
      appendDeployLog(`Tx sent: ${contract.deploymentTransaction()?.hash?.substring(0, 14)}…`);
      await contract.waitForDeployment();
      const addr = await contract.getAddress();
      setSandboxCurrencyAddr(addr);
      appendDeployLog(`✅ MockERC20 deployed at ${addr}`);
      setTxSuccess(`Mock USDC deployed → ${addr}`);
    } catch (err: any) {
      const msg = err.reason || err.message || 'Deployment failed.';
      appendDeployLog(`❌ ${msg}`);
      setTxError(msg);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeployAuction = async () => {
    if (!signer) { setTxError('Connect your wallet first.'); return; }
    if (chainId === 8453) { setTxError('Sandbox deployments are blocked on Base Mainnet.'); return; }
    if (!ethers.isAddress(sandboxTokenAddr))   { setTxError('Enter a valid Token address.'); return; }
    if (!ethers.isAddress(sandboxCurrencyAddr)){ setTxError('Enter a valid Currency address.'); return; }
    if (!ethers.isAddress(sandboxFundsRecipient))   { setTxError('Enter a valid Funds Recipient address.'); return; }
    if (!ethers.isAddress(sandboxLiquidityRecipient)) { setTxError('Enter a valid Liquidity Recipient address.'); return; }
    if (!ethers.isAddress(sandboxOwner))       { setTxError('Enter a valid Owner address.'); return; }

    setIsDeploying(true);
    setTxError(null);
    setTxSuccess(null);
    appendDeployLog('Deploying ContinuousClearingAuction…');

    try {
      const currentBlockNum = await provider!.getBlockNumber();
      const startBlock = BigInt(currentBlockNum) + BigInt(sandboxStartDelay || '5');
      const endBlock   = startBlock + BigInt(sandboxDuration || '500');

      // Currency decimals — try to read; fall back to 6 for USDC-style
      let currencyDecimals = 6;
      try {
        const cContract = new ethers.Contract(sandboxCurrencyAddr, ['function decimals() view returns (uint8)'], provider!);
        currencyDecimals = Number(await cContract.decimals());
      } catch { /* use default */ }

      const tokenAmountWei = ethers.parseUnits(sandboxTokenAmount || '1500000', 18);
      const floorPriceWei  = ethers.parseUnits(sandboxFloorPrice  || '0.1',     currencyDecimals);

      const factory = new ethers.ContractFactory(AUCTION_ABI, AUCTION_BYTECODE, signer);
      const contract = await factory.deploy(
        sandboxTokenAddr,
        sandboxCurrencyAddr,
        tokenAmountWei,
        floorPriceWei,
        startBlock,
        endBlock,
        sandboxFundsRecipient,
        sandboxLiquidityRecipient,
        sandboxOwner,
      );
      appendDeployLog(`Tx sent: ${contract.deploymentTransaction()?.hash?.substring(0, 14)}…`);
      await contract.waitForDeployment();
      const addr = await contract.getAddress();
      setDeployedAuctionAddr(addr);
      // Auto-populate the address input so user can load it immediately
      setAddressInput(addr);
      appendDeployLog(`✅ Auction deployed at ${addr}`);
      setTxSuccess(`ContinuousClearingAuction deployed → ${addr}`);
    } catch (err: any) {
      const msg = err.reason || err.message || 'Deployment failed.';
      appendDeployLog(`❌ ${msg}`);
      setTxError(msg);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleLoadDeployedAuction = () => {
    if (deployedAuctionAddr && ethers.isAddress(deployedAuctionAddr)) {
      setAuctionAddress(deployedAuctionAddr);
      setAddressInput(deployedAuctionAddr);
      setTxSuccess('Deployed auction loaded — fetching data…');
    }
  };

  // ─── Interactive Bid Simulator ─────────────────────────────────────────────

  // Helper: Mint Mock USDC for testing
  const handleMintMockUSDC = async () => {
    if (!auctionState || !signer || !account) {
      setTxError("Wallet not connected or auction not loaded.");
      return;
    }

    const mintAmount = ethers.parseUnits("100000", currencyMeta.decimals); // 100k USDC
    const mockUSDCABI = ["function mint(address to, uint256 amount) returns (bool)"];
    const mockUSDC = new ethers.Contract(auctionState.currencyAddress, mockUSDCABI, signer);

    executeTx(
      () => mockUSDC.mint(account, mintAmount),
      `Successfully minted 100,000 ${currencyMeta.symbol} to your wallet!`
    );
  };

  // Simulator: Bid
  const handleBidSimulator = async () => {
    if (!auctionState || !signer || !account) {
      setTxError("Wallet not connected or auction not loaded.");
      return;
    }
    
    setIsTxPending(true);
    setTxError(null);
    setTxSuccess(null);

    try {
      // Pre-flight checks
      const currentBlock = await provider?.getBlockNumber();
      
      if (currentBlock && currentBlock < Number(auctionState.startBlock)) {
        setTxError(`Auction hasn't started yet. Starts at block ${auctionState.startBlock} (current: ${currentBlock})`);
        setIsTxPending(false);
        return;
      }
      
      if (currentBlock && currentBlock >= Number(auctionState.endBlock)) {
        setTxError(`Auction has ended. Ended at block ${auctionState.endBlock} (current: ${currentBlock})`);
        setIsTxPending(false);
        return;
      }
      
      if (auctionState.isEnded || auctionState.isCanceled) {
        setTxError("Auction is ended or canceled. Cannot accept new bids.");
        setIsTxPending(false);
        return;
      }

      const amountParsed = ethers.parseUnits(bidAmount, currencyMeta.decimals);
      const currencyContract = new ethers.Contract(auctionState.currencyAddress, ERC20_ABI, signer);
      const auctionContract = new ethers.Contract(auctionAddress, CONTINUOUS_CLEARING_AUCTION_ABI, signer);
      
      // Check balance
      const balance = await currencyContract.balanceOf(account);
      if (balance < amountParsed) {
        setTxError(`Insufficient ${currencyMeta.symbol} balance. You have ${ethers.formatUnits(balance, currencyMeta.decimals)} but need ${bidAmount}.`);
        setIsTxPending(false);
        return;
      }
      
      // Step 1: Check allowance - always approve to handle multiple bids
      const allowance = await currencyContract.allowance(account, auctionAddress);
      if (allowance < amountParsed) {
        setTxSuccess(`Approving ${bidAmount} ${currencyMeta.symbol}...`);
        try {
          // Approve a large amount to cover multiple bids (or use max approval)
          const maxApproval = ethers.MaxUint256; // Unlimited approval
          const approveTx = await currencyContract.approve(auctionAddress, maxApproval);
          await approveTx.wait();
          setTxSuccess(`Approval confirmed. Sending bid...`);
        } catch (approveErr: any) {
          throw new Error(`Approval failed: ${approveErr.reason || approveErr.message}`);
        }
      }

      // Step 2: Call bid
      setTxSuccess(`Submitting bid of ${bidAmount} ${currencyMeta.symbol}...`);
      const bidTx = await auctionContract.bid(amountParsed);
      const receipt = await bidTx.wait();
      
      if (receipt && receipt.status === 1) {
        setTxSuccess(`✅ Bid of ${bidAmount} ${currencyMeta.symbol} submitted successfully!`);
        fetchAuctionDetails();
        fetchBiddingHistory();
      } else {
        throw new Error("Bid transaction reverted.");
      }
    } catch (err: any) {
      console.error("Simulation bid failed:", err);
      
      // Better error messages
      let errorMsg = err.reason || err.message || "Failed to submit bid.";
      
      // Decode common errors
      if (errorMsg.includes("user rejected")) {
        errorMsg = "Transaction was rejected in your wallet.";
      } else if (errorMsg.includes("insufficient funds")) {
        errorMsg = "Insufficient ETH for gas fees.";
      } else if (errorMsg.includes("execution reverted")) {
        errorMsg = "Transaction would fail. Possible reasons: auction not active, insufficient balance, or auction contract issue.";
      } else if (errorMsg.includes("CALL_EXCEPTION")) {
        errorMsg = "Contract call failed. Check that: 1) Auction is active, 2) You have enough USDC, 3) Bid amount > 0";
      }
      
      setTxError(errorMsg);
    } finally {
      setIsTxPending(false);
    }
  };

  // Status mapping logic
  const getAuctionStatus = () => {
    if (!auctionState) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    if (auctionState.isCanceled) {
      return { label: 'Canceled', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300' };
    }
    if (auctionState.isFinalized) {
      return { label: 'Finalized', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 border border-teal-300' };
    }
    if (auctionState.isEnded) {
      return { label: 'Ended (Awaiting Finalization)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300' };
    }
    
    const start = Number(auctionState.startBlock);
    const end = Number(auctionState.endBlock);

    if (currentBlock < start) {
      return { label: 'Pending Start', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-300' };
    }
    if (currentBlock >= end) {
      return { label: 'Ended (Awaiting Finalization)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300' };
    }
    
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 animate-pulse' };
  };

  // Math helper for real-time clearing price calculation
  const getCalculatedPrice = () => {
    if (!auctionState) return BigInt(0);
    if (auctionState.totalCurrencyContributed === BigInt(0)) {
      return auctionState.floorPrice;
    }

    const calculated = (auctionState.totalCurrencyContributed * BigInt(1e18)) / auctionState.tokenAmount;
    if (calculated < auctionState.floorPrice) {
      return auctionState.floorPrice;
    }
    return calculated;
  };

  // Math helper for tokens sold/allocated
  const getTokensSold = () => {
    if (!auctionState) return BigInt(0);
    if (auctionState.totalCurrencyContributed === BigInt(0)) {
      return BigInt(0);
    }
    
    const calculatedPrice = (auctionState.totalCurrencyContributed * BigInt(1e18)) / auctionState.tokenAmount;
    if (calculatedPrice < auctionState.floorPrice) {
      // sold = (raised * 1e18) / floorPrice
      return (auctionState.totalCurrencyContributed * BigInt(1e18)) / auctionState.floorPrice;
    }
    return auctionState.tokenAmount;
  };

  const status = getAuctionStatus();
  const calculatedClearingPrice = getCalculatedPrice();
  const tokensSold = getTokensSold();
  const blocksRemaining = auctionState ? Math.max(0, Number(auctionState.endBlock) - currentBlock) : 0;
  const isOwner = account && auctionState && account.toLowerCase() === auctionState.ownerAddress.toLowerCase();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Wallet Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Gavel className="h-8 w-8 text-primary-600 dark:text-blue-400" />
            Auction Management Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Uniform-price continuous clearing auction for DBBPT tokens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {account ? (
            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Connected Admin</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg shadow transition-all duration-200"
            >
              <Wallet className="w-4 h-4" />
              Connect Admin Wallet
            </button>
          )}
          
          <button
            onClick={() => { fetchAuctionDetails(); fetchBiddingHistory(); }}
            disabled={isLoadingState}
            className="p-2.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoadingState ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Network Alert */}
      {account && !isCorrectNetwork && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">Incorrect Network</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Please switch to Base Mainnet or Base Sepolia to interact with the contract.
              </p>
            </div>
          </div>
          <button
            onClick={switchToBaseNetwork}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            Switch to Base
          </button>
        </div>
      )}

      {/* Transaction Notifications */}
      {txError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-rose-900 dark:text-rose-200">Operation Error</p>
            <p className="text-sm text-rose-700 dark:text-rose-400 break-words">{txError}</p>
          </div>
        </div>
      )}

      {txSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">Success</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 break-words">{txSuccess}</p>
          </div>
        </div>
      )}

      {/* Address Selector Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleUpdateAddress} className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-gray-400" />
              Active Auction Contract Address
            </label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white text-sm font-medium rounded-lg transition-colors"
          >
            Load Contract
          </button>
        </form>
      </div>

      {isLoadingState && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">Querying auction configuration & metrics...</p>
        </div>
      )}

      {/* Main Auction Dashboard */}
      {!isLoadingState && auctionState && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Hero status and live metrics */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Hero Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-5 dark:opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                <Gavel className="w-64 h-64" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase ${status.color}`}>
                    {status.label}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                    Bidding Progress Overview
                  </h2>
                </div>

                <div className="text-left sm:text-right bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-3 rounded-xl shadow-xs">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Base Block</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">#{currentBlock}</p>
                </div>
              </div>

              {/* Bidding Progress Visualizer */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1">
                    <span className="text-gray-700 dark:text-gray-300">Raise Progress</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatUnits(auctionState.totalCurrencyContributed, currencyMeta.decimals)} {currencyMeta.symbol} raised
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: auctionState.totalCurrencyContributed > BigInt(0) ? '100%' : '0%',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Floor Price: {formatUnits(auctionState.floorPrice, currencyMeta.decimals)} {currencyMeta.symbol} per DBBPT</span>
                    <span>
                      {auctionState.totalCurrencyContributed > BigInt(0) ? 'Bids received ✓' : 'No bids yet'}
                    </span>
                  </div>
                </div>

                {/* Timeline status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Start Block</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                      #{auctionState.startBlock.toString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">End Block</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                      #{auctionState.endBlock.toString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Remaining Period</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                      {blocksRemaining > 0 ? `${blocksRemaining.toLocaleString()} blocks (~${(blocksRemaining * 2 / 60).toFixed(1)} mins)` : 'Expired'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Card 1: Total Currency Contributed */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Raised</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatUnits(auctionState.totalCurrencyContributed, currencyMeta.decimals)}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{currencyMeta.symbol}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>USDC Raising Pool</span>
                </div>
              </div>

              {/* Card 2: Clearing Price */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clearing Price</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatUnits(calculatedClearingPrice, currencyMeta.decimals)}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{currencyMeta.symbol}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  Floor Price Protection: {formatUnits(auctionState.floorPrice, currencyMeta.decimals)}
                </p>
              </div>

              {/* Card 3: Tokens Sold */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tokens Sold / Allocated</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatUnits(tokensSold, 18)}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">DBBPT</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Of {formatUnits(auctionState.tokenAmount, 18)} DBBPT auctioned
                </div>
              </div>

            </div>

            {/* ReflectiveToken Fee Exemption Config */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ReflectiveToken Fee Exemption Manager
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Because ReflectiveToken has an active 5% transfer fee, standard claims from the auction would lose 5% of tokens. To enable a 0% claim fee, the token contract can temporarily register the Auction contract address as its "Staking Contract".
              </p>

              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Auction Address:</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-gray-100 select-all">{auctionAddress}</span>
                </div>
                <div className="flex flex-col gap-2 text-sm pt-2 border-t border-blue-100 dark:border-blue-900/20">
                  <label className="text-gray-700 dark:text-gray-300 font-medium">
                    Original Staking Contract Address:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={originalStakingAddress}
                      onChange={(e) => setOriginalStakingAddress(e.target.value)}
                      placeholder="0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822 (auto-filled)"
                      className="flex-1 px-3 py-2 font-mono text-xs bg-white dark:bg-slate-950 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {originalStakingAddress && ethers.isAddress(originalStakingAddress) && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 self-center">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Valid address
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ℹ️ This should be automatically filled with the FlexibleTieredStaking contract address from your network.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {/* NEW: Modern Fee Exemption Toggle */}
                <button
                  onClick={handleToggleAuctionFeeExemption}
                  disabled={isTxPending || !isOwner}
                  className={`px-4 py-3 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                    isAuctionExcluded 
                      ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/50' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {isAuctionExcluded ? 'Auction is Fee-Exempt ✓' : 'Exclude Auction from Fees'}
                </button>

                {/* Legacy buttons - kept for backwards compatibility */}
                <button
                  onClick={handleExcludeAuction}
                  disabled={isTxPending || !isOwner}
                  className="px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 opacity-60"
                  title="Legacy method - use 'Exclude Auction from Fees' instead"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  (Legacy) Set Staking
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-2">
                <button
                  onClick={handleRestoreStaking}
                  disabled={isTxPending || !isOwner || !originalStakingAddress || !ethers.isAddress(originalStakingAddress)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 opacity-60"
                  title="Legacy method to restore staking contract"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  (Legacy) Restore Staking Contract
                </button>
                {!ethers.isAddress(originalStakingAddress) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Enter a valid staking contract address above to enable restore button
                  </p>
                )}
              </div>

              {/* Info box explaining the fee exemption */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">Fee Exemption Strategy:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li><strong>Before funding:</strong> Click "Exclude Auction from Fees" (exempts auction from 5% transfer fee)</li>
                      <li><strong>Fund auction:</strong> Transfer tokens with 0% fee</li>
                      <li><strong>During/after auction:</strong> Keep exemption active so bidders can claim with 0% fee</li>
                      <li><strong>Optional:</strong> After all claims complete, you can toggle off exemption</li>
                    </ol>
                    <p className="mt-2 text-blue-700 dark:text-blue-400">
                      Status: {isAuctionExcluded ? '✅ Auction is fee-exempt' : '⚠️ Auction will incur 5% fees on transfers'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden">
                {/* Hidden legacy section - keeping old buttons for reference but hidden */}
                <button
                  onClick={handleExcludeAuction}
                  disabled={isTxPending || !isOwner}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Exclude Auction (Set Staking Contract)
                </button>
                <button
                  onClick={handleRestoreStaking}
                  disabled={isTxPending || !isOwner}
                  className="px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Restore Staking Contract
                </button>
              </div>
              {!isOwner && account && (
                <p className="text-xs text-rose-500 mt-2 flex items-center gap-1 justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ReflectiveToken owner permissions required to execute exclusions.
                </p>
              )}
            </div>

            {/* Activity Logs (Bids & Claims) */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Auction Activity
                </h3>
                <button
                  onClick={fetchBiddingHistory}
                  disabled={isHistoryLoading}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {isHistoryLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bids Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Bids ({bidHistory.length})
                    </h4>
                    {bidHistory.length > 0 ? (
                      <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead className="bg-gray-50 dark:bg-slate-950">
                            <tr className="text-gray-500 dark:text-gray-400 font-semibold text-xs">
                              <th className="py-2 px-3">Bidder</th>
                              <th className="py-2 px-3">Block</th>
                              <th className="py-2 px-3 text-right">Amount</th>
                              <th className="py-2 px-3 text-right">Tx</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bidHistory.map((bid, index) => (
                              <tr key={index} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-900/50">
                                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-gray-100">
                                  {bid.bidder.substring(0, 6)}...{bid.bidder.substring(38)}
                                </td>
                                <td className="py-2 px-3 text-gray-500 text-xs">
                                  #{bid.blockNumber}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white text-xs">
                                  {formatUnits(BigInt(bid.amount), currencyMeta.decimals)} {currencyMeta.symbol}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <a
                                    href={`https://sepolia.basescan.org/tx/${bid.txHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center text-blue-600 hover:underline text-xs"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-center py-4 text-xs border border-gray-200 dark:border-gray-800 rounded-lg">
                        No bids yet
                      </p>
                    )}
                  </div>

                  {/* Claims Section */}
                  {auctionState.isFinalized && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Claims ({claimHistory.length})
                      </h4>
                      {claimHistory.length > 0 ? (
                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-green-50 dark:bg-green-950/20">
                              <tr className="text-gray-500 dark:text-gray-400 font-semibold text-xs">
                                <th className="py-2 px-3">Claimer</th>
                                <th className="py-2 px-3">Block</th>
                                <th className="py-2 px-3 text-right">Tokens</th>
                                <th className="py-2 px-3 text-right">Tx</th>
                              </tr>
                            </thead>
                            <tbody>
                              {claimHistory.map((claim, index) => (
                                <tr key={index} className="border-t border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-950/10">
                                  <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-gray-100">
                                    {claim.claimer.substring(0, 6)}...{claim.claimer.substring(38)}
                                  </td>
                                  <td className="py-2 px-3 text-gray-500 text-xs">
                                    #{claim.blockNumber}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold text-green-700 dark:text-green-400 text-xs">
                                    {formatUnits(BigInt(claim.tokensReceived), 18)} DBBPT
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <a
                                      href={`https://sepolia.basescan.org/tx/${claim.txHash}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center text-blue-600 hover:underline text-xs"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 text-center py-4 text-xs border border-gray-200 dark:border-gray-800 rounded-lg">
                          No claims yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Admin control actions & test simulator */}
          <div className="space-y-6">
            
            {/* Owner Control Actions Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Sliders className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                Owner Administrative Operations
              </h3>

              <div className="space-y-4">
                
                {/* Status indicator info */}
                <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contract Owner:</span>
                    <span className="font-mono text-gray-900 dark:text-gray-100 select-all">
                      {auctionState.ownerAddress.substring(0, 8)}...{auctionState.ownerAddress.substring(auctionState.ownerAddress.length - 6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">User Wallet Role:</span>
                    {isOwner ? (
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Owner Account
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Non-Owner
                      </span>
                    )}
                  </div>
                </div>

                {/* Button: Fund Auction with DBBPT */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleFundAuction}
                    disabled={isTxPending || !isOwner}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    Fund Auction (1.5M DBBPT)
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Transfer 1,500,000 DBBPT tokens from your wallet to the auction contract.
                  </p>
                </div>

                {/* Button: End Early */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleEndEarly}
                    disabled={isTxPending || !isOwner || auctionState.isEnded}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    End Auction Early
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Freezes further bidding. Allows finalization based on current raising contributions.
                  </p>
                </div>

                {/* Button: Finalize */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleFinalize}
                    disabled={
                      isTxPending ||
                      !isOwner ||
                      auctionState.isFinalized ||
                      (!auctionState.isEnded && currentBlock < Number(auctionState.endBlock))
                    }
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Finalize Auction
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Calculates clearing price, transfers raised splits (33.33% / 66.67%), and returns unsold tokens back to the owner.
                  </p>
                </div>

                {/* Button: Cancel */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleCancelAuction}
                    disabled={isTxPending || !isOwner || auctionState.isCanceled || auctionState.isFinalized}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Auction
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Terminates the raising and opens 100% refund claims for all contributors.
                  </p>
                </div>

                {/* Button: Withdraw Unsold */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleWithdrawUnsold}
                    disabled={isTxPending || !isOwner || !auctionState.isCanceled}
                    className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Withdraw Unsold Tokens
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Recovers all DBBPT tokens from the auction contract (only valid when canceled).
                  </p>
                </div>

              </div>
            </div>

            {/* Bidder Claim Controls */}
            {auctionState.isFinalized && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Bidder Token Claims
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  Auction is finalized. Bidders can now claim their DBBPT token allocations (0% fee).
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleClaimTokens}
                    disabled={isTxPending}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-5 h-5" />
                    Claim My Tokens
                  </button>

                  <div className="p-3 bg-white/60 dark:bg-slate-950/60 rounded-lg border border-green-200 dark:border-green-900/30">
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      <strong>How it works:</strong>
                    </p>
                    <ol className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-4 list-decimal space-y-0.5">
                      <li>Click "Claim My Tokens"</li>
                      <li>Confirm transaction in wallet</li>
                      <li>Receive DBBPT at clearing price</li>
                      <li>No 5% fee (auction is exempt!)</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Refund Claims (if canceled) */}
            {auctionState.isCanceled && (
              <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  Auction Canceled - Refund Available
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  This auction was canceled. All bidders can claim 100% refunds.
                </p>

                <button
                  onClick={handleClaimRefund}
                  disabled={isTxPending}
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  Claim Refund (100%)
                </button>
              </div>
            )}

            {/* Bidding Simulator & Tester (Sepolia / Localhost) */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Play className="w-5 h-5 text-indigo-600" />
                Interactive Bidding Simulator
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Test contract execution on Sepolia Testnet or Localhost. Submits a bid of currency to the auction.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                    Contribution Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="w-full pl-8 pr-16 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="absolute right-3 top-2.5 text-gray-500 font-semibold text-xs">
                      {currencyMeta.symbol}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleBidSimulator}
                  disabled={isTxPending || auctionState.isEnded || auctionState.isCanceled}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Approve & Submit Bid
                </button>

                {/* Mint Mock USDC Button (for localhost testing) */}
                {chainId === 31337 && (
                  <button
                    onClick={handleMintMockUSDC}
                    disabled={isTxPending}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow transition-colors flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    Mint 100k Mock {currencyMeta.symbol} (Localhost Only)
                  </button>
                )}
              </div>
            </div>

            {/* Split & Recipients Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm text-xs space-y-3">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-gray-400" />
                Contract Config Details
              </h4>
              
              <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">DBBPT Token:</span>
                  <span className="font-mono text-gray-900 dark:text-gray-200 select-all">
                    {auctionState.tokenAddress.substring(0, 8)}...{auctionState.tokenAddress.substring(auctionState.tokenAddress.length - 6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Raise Currency:</span>
                  <span className="font-mono text-gray-900 dark:text-gray-200 select-all">
                    {auctionState.currencyAddress.substring(0, 8)}...{auctionState.currencyAddress.substring(auctionState.currencyAddress.length - 6)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-800/50 pt-2">
                  <span className="text-gray-500">Funds Recipient (2/3 Split):</span>
                  <span className="font-mono text-gray-900 dark:text-gray-200 select-all">
                    {auctionState.fundsRecipient.substring(0, 8)}...{auctionState.fundsRecipient.substring(auctionState.fundsRecipient.length - 6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Liquidity Recipient (1/3 Split):</span>
                  <span className="font-mono text-gray-900 dark:text-gray-200 select-all">
                    {auctionState.liquidityRecipient.substring(0, 8)}...{auctionState.liquidityRecipient.substring(auctionState.liquidityRecipient.length - 6)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {!auctionState && !isLoadingState && (
        <div className="space-y-6">
          {/* Empty state hint */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center shadow-sm">
            <HelpCircle className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">No Auction Loaded</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto text-sm">
              Enter a valid <span className="font-semibold">ContinuousClearingAuction</span> contract address above and click
              &nbsp;<span className="font-semibold">Load Contract</span>. Or use the&nbsp;
              <span className="text-indigo-500 font-semibold">Developer Sandbox</span>&nbsp;below to deploy one on a testnet.
            </p>
          </div>

          {/* ───── Developer Sandbox ───── */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Developer Sandbox</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Testnet / Localhost Only — deploys using your connected wallet</p>
                </div>
              </div>
              {chainId === 8453 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 px-3 py-1 rounded-full">
                  <XCircle className="w-3.5 h-3.5" /> Mainnet — Blocked
                </span>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Step 1: Mock USDC */}
              <div className="bg-white/80 dark:bg-gray-900/60 border border-indigo-100 dark:border-indigo-800/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Deploy Mock Currency (MockERC20)</h4>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Deploys a mintable ERC-20 with 1 billion initial supply sent to your wallet, ideal for testing bids as the raising currency.
                </p>
                {sandboxCurrencyAddr && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 break-all select-all">{sandboxCurrencyAddr}</span>
                    <button onClick={() => navigator.clipboard.writeText(sandboxCurrencyAddr)} className="ml-auto text-gray-400 hover:text-gray-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleDeployMockUSDC}
                  disabled={isDeploying || !signer || chainId === 8453}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {isDeploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isDeploying ? 'Deploying…' : 'Deploy Mock USDC'}
                </button>
              </div>

              {/* Step 2: Auction Config */}
              <div className="bg-white/80 dark:bg-gray-900/60 border border-indigo-100 dark:border-indigo-800/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Configure & Deploy Auction</h4>
                </div>

                <div className="space-y-2.5">
                  {/* Token Address */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">DBBPT Token Address</label>
                    <input
                      type="text"
                      value={sandboxTokenAddr}
                      onChange={(e) => setSandboxTokenAddr(e.target.value)}
                      placeholder="0x... (ERC-20 token to auction)"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Currency Address */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Raising Currency Address</label>
                    <input
                      type="text"
                      value={sandboxCurrencyAddr}
                      onChange={(e) => setSandboxCurrencyAddr(e.target.value)}
                      placeholder="0x... (auto-filled from Step 1)"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Token Amount & Floor Price */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Token Amount</label>
                      <input
                        type="number"
                        value={sandboxTokenAmount}
                        onChange={(e) => setSandboxTokenAmount(e.target.value)}
                        placeholder="1500000"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Floor Price</label>
                      <input
                        type="number"
                        value={sandboxFloorPrice}
                        onChange={(e) => setSandboxFloorPrice(e.target.value)}
                        placeholder="0.1"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Start Delay & Duration */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Start Delay (blocks)</label>
                      <input
                        type="number"
                        value={sandboxStartDelay}
                        onChange={(e) => setSandboxStartDelay(e.target.value)}
                        placeholder="5"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Duration (blocks)</label>
                      <input
                        type="number"
                        value={sandboxDuration}
                        onChange={(e) => setSandboxDuration(e.target.value)}
                        placeholder="500"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Funds Recipient */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Funds Recipient (2/3 split)</label>
                    <input
                      type="text"
                      value={sandboxFundsRecipient}
                      onChange={(e) => setSandboxFundsRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Liquidity Recipient */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Liquidity Recipient (1/3 split)</label>
                    <input
                      type="text"
                      value={sandboxLiquidityRecipient}
                      onChange={(e) => setSandboxLiquidityRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Owner */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Contract Owner</label>
                    <input
                      type="text"
                      value={sandboxOwner}
                      onChange={(e) => setSandboxOwner(e.target.value)}
                      placeholder="0x... (your connected wallet)"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleDeployAuction}
                  disabled={isDeploying || !signer || chainId === 8453}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {isDeploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {isDeploying ? 'Deploying…' : 'Deploy Auction Contract'}
                </button>

                {/* Load deployed address */}
                {deployedAuctionAddr && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 break-all select-all">{deployedAuctionAddr}</span>
                      <button onClick={() => navigator.clipboard.writeText(deployedAuctionAddr)} className="ml-auto text-gray-400 hover:text-gray-600">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={handleLoadDeployedAuction}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" /> Load Deployed Auction
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Deploy log */}
            {deployLog.length > 0 && (
              <div className="mx-6 mb-6 bg-gray-900 dark:bg-black border border-gray-700 rounded-xl p-4 font-mono text-xs text-gray-300 space-y-1 max-h-40 overflow-y-auto">
                {deployLog.map((line, i) => (
                  <div key={i} className={line.startsWith('[') && line.includes('✅') ? 'text-emerald-400' : line.includes('❌') ? 'text-rose-400' : 'text-gray-400'}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
