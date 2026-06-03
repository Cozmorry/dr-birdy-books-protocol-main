import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy MockERC20 (USDC)
  console.log("Deploying MockERC20 (USDC)...");
  const CurrencyFactory = await ethers.getContractFactory("MockERC20");
  // Mint 1,000,000 tokens of USDC to deployer
  const currency = await CurrencyFactory.deploy("USD Coin", "USDC", ethers.parseEther("1000000"));
  await currency.waitForDeployment();
  const currencyAddress = await currency.getAddress();
  console.log("MockERC20 (USDC) deployed to:", currencyAddress);

  // 2. Prepare parameters for ContinuousClearingAuction
  const tokenAddress = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // ReflectiveToken proxy on Base Sepolia
  const tokenAmount = ethers.parseEther("1500000"); // 1.5M DBBPT
  const floorPrice = ethers.parseEther("0.1"); // $0.10 in 18-decimal currency units

  const currentBlock = await ethers.provider.getBlockNumber();
  const startBlock = currentBlock + 5; // Starts in 5 blocks
  const endBlock = startBlock + 10000; // Lasts 10,000 blocks (~5.5 hours)

  const fundsRecipient = deployer.address;
  const liquidityRecipient = deployer.address;
  const owner = deployer.address;

  console.log("Auction Parameters:");
  console.log("- Token (DBBPT):", tokenAddress);
  console.log("- Currency (USDC):", currencyAddress);
  console.log("- Token Amount:", ethers.formatEther(tokenAmount));
  console.log("- Floor Price:", ethers.formatEther(floorPrice));
  console.log("- Start Block:", startBlock);
  console.log("- End Block:", endBlock);
  console.log("- Funds Recipient:", fundsRecipient);
  console.log("- Liquidity Recipient:", liquidityRecipient);

  // 3. Deploy ContinuousClearingAuction
  console.log("Deploying ContinuousClearingAuction...");
  const AuctionFactory = await ethers.getContractFactory("ContinuousClearingAuction");
  const auction = await AuctionFactory.deploy(
    tokenAddress,
    currencyAddress,
    tokenAmount,
    floorPrice,
    startBlock,
    endBlock,
    fundsRecipient,
    liquidityRecipient,
    owner
  );
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("ContinuousClearingAuction deployed to:", auctionAddress);

  // 4. Funding the Auction contract with DBBPT (only if deployer has DBBPT on Base Sepolia)
  console.log("\n=== DEPLOYMENT COMPLETED ===");
  console.log("Copy these addresses to your settings or environment variables:");
  console.log(`REACT_APP_AUCTION_ADDRESS=${auctionAddress}`);
  console.log(`REACT_APP_CURRENCY_ADDRESS=${currencyAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
