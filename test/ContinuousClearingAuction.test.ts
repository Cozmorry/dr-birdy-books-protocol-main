import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("ContinuousClearingAuction", function () {
  let token: any;
  let currency: any;
  let auction: any;
  
  let owner: any;
  let bidder1: any;
  let bidder2: any;
  let fundsRecipient: any;
  let liquidityRecipient: any;

  const TOKEN_AMOUNT = ethers.parseEther("1500000"); // 1.5M DBBPT
  const FLOOR_PRICE = ethers.parseUnits("1", 5); // $0.10 in 6-decimal currency units (e.g. USDC)
  const START_DELAY = 1;
  const END_DELAY = 100;

  beforeEach(async () => {
    [owner, bidder1, bidder2, fundsRecipient, liquidityRecipient] = await ethers.getSigners();

    // Deploy ReflectiveToken as our auction token
    const TokenFactory = await ethers.getContractFactory("ReflectiveToken");
    const GatewayFactory = await ethers.getContractFactory("ArweaveGateway");
    const RouterFactory = await ethers.getContractFactory("MockUniswapRouter");
    const OracleFactory = await ethers.getContractFactory("MockPriceOracle");

    const gateway = await GatewayFactory.deploy();
    const router = await RouterFactory.deploy();
    const oracle = await OracleFactory.deploy();
    token = await TokenFactory.deploy();

    await gateway.waitForDeployment();
    await router.waitForDeployment();
    await oracle.waitForDeployment();
    await token.waitForDeployment();

    // Initialize ReflectiveToken
    await token.initialize(
      await router.getAddress(),
      owner.address,
      ethers.ZeroAddress,
      await gateway.getAddress(),
      await oracle.getAddress()
    );

    // Deploy MockERC20 as our raising currency (6 decimals like USDC)
    const CurrencyFactory = await ethers.getContractFactory("MockERC20");
    currency = await CurrencyFactory.deploy("USD Coin", "USDC", ethers.parseUnits("1000000", 6));
    await currency.waitForDeployment();

    // Fund bidders with currency
    await currency.mint(bidder1.address, ethers.parseUnits("200000", 6));
    await currency.mint(bidder2.address, ethers.parseUnits("200000", 6));

    // Deploy the Auction contract
    const startBlock = (await ethers.provider.getBlockNumber()) + START_DELAY;
    const endBlock = startBlock + END_DELAY;

    const AuctionFactory = await ethers.getContractFactory("ContinuousClearingAuction");
    auction = await AuctionFactory.deploy(
      await token.getAddress(),
      await currency.getAddress(),
      TOKEN_AMOUNT,
      FLOOR_PRICE,
      startBlock,
      endBlock,
      fundsRecipient.address,
      liquidityRecipient.address,
      owner.address
    );
    await auction.waitForDeployment();

    // Set the auction contract as the staking contract in ReflectiveToken to enable fee-free transfers
    await token.setStakingContract(await auction.getAddress());

    // Transfer the 1.5M DBBPT tokens to the auction contract
    await token.transfer(await auction.getAddress(), TOKEN_AMOUNT);

    // Move blocks to start of auction
    await ethers.provider.send("evm_mine", []);
  });

  it("should initialize with correct parameters", async function () {
    expect(await auction.token()).to.equal(await token.getAddress());
    expect(await auction.currency()).to.equal(await currency.getAddress());
    expect(await auction.tokenAmount()).to.equal(TOKEN_AMOUNT);
    expect(await auction.floorPrice()).to.equal(FLOOR_PRICE);
    expect(await auction.fundsRecipient()).to.equal(fundsRecipient.address);
    expect(await auction.liquidityRecipient()).to.equal(liquidityRecipient.address);
  });

  it("should allow bidding", async function () {
    const bidAmount = ethers.parseUnits("50000", 6);
    await currency.connect(bidder1).approve(await auction.getAddress(), bidAmount);
    
    await expect(auction.connect(bidder1).bid(bidAmount))
      .to.emit(auction, "BidSubmitted")
      .withArgs(bidder1.address, bidAmount);

    expect(await auction.currencyContributed(bidder1.address)).to.equal(bidAmount);
    expect(await auction.totalCurrencyContributed()).to.equal(bidAmount);
  });

  it("should enforce floor price protection and calculate correct clearing price", async function () {
    // Bidder 1 bids $50k
    // Bidder 2 bids $100k
    // Total raised = $150k (hits $150k target perfectly!)
    // Clearing price should be: $150k / 1.5M tokens = $0.10 = 100,000 (which equals FLOOR_PRICE)
    const bid1 = ethers.parseUnits("50000", 6);
    const bid2 = ethers.parseUnits("100000", 6);

    await currency.connect(bidder1).approve(await auction.getAddress(), bid1);
    await currency.connect(bidder2).approve(await auction.getAddress(), bid2);

    await auction.connect(bidder1).bid(bid1);
    await auction.connect(bidder2).bid(bid2);

    // End auction early by owner
    await auction.connect(owner).endAuctionEarly();
    
    // Finalize
    await expect(auction.connect(owner).finalize())
      .to.emit(auction, "AuctionFinalized")
      .withArgs(FLOOR_PRICE, bid1 + bid2, TOKEN_AMOUNT);

    expect(await auction.clearingPrice()).to.equal(FLOOR_PRICE);
    expect(await auction.totalTokensSold()).to.equal(TOKEN_AMOUNT);

    // Verify fund split: 1/3 to liquidity ($50k), 2/3 to funds ($100k)
    expect(await currency.balanceOf(liquidityRecipient.address)).to.equal(ethers.parseUnits("50000", 6));
    expect(await currency.balanceOf(fundsRecipient.address)).to.equal(ethers.parseUnits("100000", 6));

    // Bidders claim tokens at $0.10 clearing price
    // Bidder 1 gets 50k / 0.10 = 500k DBBPT
    // Bidder 2 gets 100k / 0.10 = 1M DBBPT
    await auction.connect(bidder1).claimTokens();
    await auction.connect(bidder2).claimTokens();

    expect(await token.balanceOf(bidder1.address)).to.equal(ethers.parseEther("500000"));
    expect(await token.balanceOf(bidder2.address)).to.equal(ethers.parseEther("1000000"));
  });

  it("should calculate higher clearing price if bids exceed target", async function () {
    // Bidder 1 bids $150k
    // Bidder 2 bids $150k
    // Total raised = $300k
    // Clearing price should be: $300k / 1.5M tokens = $0.20 = 200,000 (USDC units)
    const bid1 = ethers.parseUnits("150000", 6);
    const bid2 = ethers.parseUnits("150000", 6);

    await currency.connect(bidder1).approve(await auction.getAddress(), bid1);
    await currency.connect(bidder2).approve(await auction.getAddress(), bid2);

    await auction.connect(bidder1).bid(bid1);
    await auction.connect(bidder2).bid(bid2);

    await auction.connect(owner).endAuctionEarly();
    await auction.connect(owner).finalize();

    const expectedPrice = ethers.parseUnits("2", 5); // $0.20
    expect(await auction.clearingPrice()).to.equal(expectedPrice);
    expect(await auction.totalTokensSold()).to.equal(TOKEN_AMOUNT);

    // Bidder 1 gets 150k / 0.20 = 750k DBBPT
    await auction.connect(bidder1).claimTokens();
    expect(await token.balanceOf(bidder1.address)).to.equal(ethers.parseEther("750000"));
  });

  it("should return unsold tokens to owner if raised currency is below target at floor price", async function () {
    // Total raise is only $75k
    // Clearing price defaults to FLOOR_PRICE ($0.10)
    // Sold tokens = $75k / $0.10 = 750k DBBPT
    // Unsold tokens returned to owner = 1.5M - 750k = 750k DBBPT
    const bid1 = ethers.parseUnits("75000", 6);

    await currency.connect(bidder1).approve(await auction.getAddress(), bid1);
    await auction.connect(bidder1).bid(bid1);

    const ownerBalBefore = await token.balanceOf(owner.address);

    await auction.connect(owner).endAuctionEarly();
    await auction.connect(owner).finalize();

    expect(await auction.clearingPrice()).to.equal(FLOOR_PRICE);
    expect(await auction.totalTokensSold()).to.equal(ethers.parseEther("750000"));

    // Owner gets back 750k DBBPT unsold tokens
    const ownerBalAfter = await token.balanceOf(owner.address);
    expect(ownerBalAfter - ownerBalBefore).to.equal(ethers.parseEther("750000"));
  });

  it("should allow cancellation and refunds", async function () {
    const bidAmount = ethers.parseUnits("50000", 6);
    await currency.connect(bidder1).approve(await auction.getAddress(), bidAmount);
    await auction.connect(bidder1).bid(bidAmount);

    // Cancel auction by owner
    await expect(auction.connect(owner).cancelAuction())
      .to.emit(auction, "AuctionCanceled");

    // Bidder claims refund
    const balBefore = await currency.balanceOf(bidder1.address);
    await expect(auction.connect(bidder1).claimRefund())
      .to.emit(auction, "RefundClaimed")
      .withArgs(bidder1.address, bidAmount);

    expect(await currency.balanceOf(bidder1.address)).to.equal(balBefore + bidAmount);

    // Owner withdraws DBBPT tokens back
    const tokenBalBefore = await token.balanceOf(owner.address);
    await auction.connect(owner).withdrawUnsoldTokens();
    expect(await token.balanceOf(owner.address)).to.equal(tokenBalBefore + TOKEN_AMOUNT);
  });
});
