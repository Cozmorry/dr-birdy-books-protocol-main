import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ContinuousClearingAuction, SimpleMockUSDC } from "../typechain-types";

describe("ContinuousClearingAuction", function () {
  let auction: ContinuousClearingAuction;
  let token: SimpleMockUSDC; // Using mock ERC20 for token instead of complex ReflectiveToken
  let currency: SimpleMockUSDC;
  let owner: SignerWithAddress;
  let fundsRecipient: SignerWithAddress;
  let liquidityRecipient: SignerWithAddress;
  let bidder1: SignerWithAddress;
  let bidder2: SignerWithAddress;
  let bidder3: SignerWithAddress;

  const TOKEN_AMOUNT = ethers.parseEther("1500000"); // 1.5M DBBPT
  const FLOOR_PRICE = ethers.parseUnits("0.1", 6); // 0.1 USDC per DBBPT
  const BID_AMOUNT_1 = ethers.parseUnits("50000", 6); // 50k USDC
  const BID_AMOUNT_2 = ethers.parseUnits("30000", 6); // 30k USDC
  const BID_AMOUNT_3 = ethers.parseUnits("20000", 6); // 20k USDC

  beforeEach(async function () {
    [owner, fundsRecipient, liquidityRecipient, bidder1, bidder2, bidder3] = await ethers.getSigners();

    // Deploy SimpleMockUSDC for currency
    const MockUSDCFactory = await ethers.getContractFactory("SimpleMockUSDC");
    currency = await MockUSDCFactory.deploy();
    await currency.waitForDeployment();

    // Deploy SimpleMockUSDC for token (simpler than ReflectiveToken for testing)
    token = await MockUSDCFactory.deploy();
    await token.waitForDeployment();

    // Get current block
    const currentBlock = await ethers.provider.getBlockNumber();
    const START_BLOCK = currentBlock + 5;
    const END_BLOCK = START_BLOCK + 100;

    // Deploy ContinuousClearingAuction
    const AuctionFactory = await ethers.getContractFactory("ContinuousClearingAuction");
    auction = await AuctionFactory.deploy(
      await token.getAddress(),
      await currency.getAddress(),
      TOKEN_AMOUNT,
      FLOOR_PRICE,
      START_BLOCK,
      END_BLOCK,
      fundsRecipient.address,
      liquidityRecipient.address,
      owner.address
    );
    await auction.waitForDeployment();

    // Mint tokens to auction contract (simulating funding)
    await token.mint(await auction.getAddress(), TOKEN_AMOUNT);

    // Mint USDC to bidders
    await currency.mint(bidder1.address, ethers.parseUnits("100000", 6));
    await currency.mint(bidder2.address, ethers.parseUnits("100000", 6));
    await currency.mint(bidder3.address, ethers.parseUnits("100000", 6));

    // Approve auction to spend USDC
    await currency.connect(bidder1).approve(await auction.getAddress(), ethers.MaxUint256);
    await currency.connect(bidder2).approve(await auction.getAddress(), ethers.MaxUint256);
    await currency.connect(bidder3).approve(await auction.getAddress(), ethers.MaxUint256);

    // Mine blocks to reach start block
    for (let i = 0; i < 5; i++) {
      await ethers.provider.send("evm_mine", []);
    }
  });

  describe("Deployment", function () {
    it("Should set the correct token and currency addresses", async function () {
      expect(await auction.token()).to.equal(await token.getAddress());
      expect(await auction.currency()).to.equal(await currency.getAddress());
    });

    it("Should set the correct auction parameters", async function () {
      expect(await auction.tokenAmount()).to.equal(TOKEN_AMOUNT);
      expect(await auction.floorPrice()).to.equal(FLOOR_PRICE);
      expect(await auction.fundsRecipient()).to.equal(fundsRecipient.address);
      expect(await auction.liquidityRecipient()).to.equal(liquidityRecipient.address);
    });

    it("Should set the correct owner", async function () {
      expect(await auction.owner()).to.equal(owner.address);
    });

    it("Should be funded with correct amount of DBBPT", async function () {
      const balance = await token.balanceOf(await auction.getAddress());
      expect(balance).to.equal(TOKEN_AMOUNT);
    });
  });

  describe("Bidding", function () {
    it("Should allow bidders to place bids", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      expect(await auction.currencyContributed(bidder1.address)).to.equal(BID_AMOUNT_1);
      expect(await auction.totalCurrencyContributed()).to.equal(BID_AMOUNT_1);
    });

    it("Should allow multiple bids from the same bidder", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(bidder1).bid(ethers.parseUnits("10000", 6));
      
      const expectedTotal = BID_AMOUNT_1 + ethers.parseUnits("10000", 6);
      expect(await auction.currencyContributed(bidder1.address)).to.equal(expectedTotal);
    });

    it("Should allow multiple bidders", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(bidder2).bid(BID_AMOUNT_2);
      await auction.connect(bidder3).bid(BID_AMOUNT_3);

      const expectedTotal = BID_AMOUNT_1 + BID_AMOUNT_2 + BID_AMOUNT_3;
      expect(await auction.totalCurrencyContributed()).to.equal(expectedTotal);
    });

    it("Should emit BidSubmitted event", async function () {
      await expect(auction.connect(bidder1).bid(BID_AMOUNT_1))
        .to.emit(auction, "BidSubmitted")
        .withArgs(bidder1.address, BID_AMOUNT_1);
    });

    it("Should revert if bid amount is 0", async function () {
      await expect(auction.connect(bidder1).bid(0))
        .to.be.revertedWith("Bid amount must be greater than 0");
    });

    it("Should revert if auction has ended", async function () {
      await auction.connect(owner).endAuctionEarly();
      await expect(auction.connect(bidder1).bid(BID_AMOUNT_1))
        .to.be.revertedWith("Auction has ended or is canceled");
    });
  });

  describe("Early Finalization", function () {
    it("Should allow owner to end auction early", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(owner).endAuctionEarly();
      
      expect(await auction.isEnded()).to.be.true;
    });

    it("Should emit AuctionEndedEarly event", async function () {
      await expect(auction.connect(owner).endAuctionEarly())
        .to.emit(auction, "AuctionEndedEarly");
    });

    it("Should prevent bidding after early end", async function () {
      await auction.connect(owner).endAuctionEarly();
      
      await expect(auction.connect(bidder1).bid(BID_AMOUNT_1))
        .to.be.revertedWith("Auction has ended or is canceled");
    });

    it("Should allow finalization after early end", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(owner).endAuctionEarly();
      await auction.connect(owner).finalize();
      
      expect(await auction.isFinalized()).to.be.true;
    });

    it("Should revert if non-owner tries to end early", async function () {
      await expect(auction.connect(bidder1).endAuctionEarly())
        .to.be.revertedWithCustomError(auction, "OwnableUnauthorizedAccount");
    });
  });

  describe("Cancellation", function () {
    it("Should allow owner to cancel auction", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(owner).cancelAuction();
      
      expect(await auction.isCanceled()).to.be.true;
      expect(await auction.isEnded()).to.be.true;
    });

    it("Should emit AuctionCanceled event", async function () {
      await expect(auction.connect(owner).cancelAuction())
        .to.emit(auction, "AuctionCanceled");
    });

    it("Should allow bidders to claim 100% refund after cancellation", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(owner).cancelAuction();

      const balanceBefore = await currency.balanceOf(bidder1.address);
      await auction.connect(bidder1).claimRefund();
      const balanceAfter = await currency.balanceOf(bidder1.address);

      expect(balanceAfter - balanceBefore).to.equal(BID_AMOUNT_1);
    });

    it("Should prevent double refund claims", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(owner).cancelAuction();

      await auction.connect(bidder1).claimRefund();
      
      await expect(auction.connect(bidder1).claimRefund())
        .to.be.revertedWith("Refund already claimed");
    });

    it("Should allow owner to withdraw all tokens after cancellation", async function () {
      await auction.connect(owner).cancelAuction();

      const balanceBefore = await token.balanceOf(owner.address);
      await auction.connect(owner).withdrawUnsoldTokens();
      const balanceAfter = await token.balanceOf(owner.address);

      expect(balanceAfter - balanceBefore).to.equal(TOKEN_AMOUNT);
    });

    it("Should revert if non-owner tries to cancel", async function () {
      await expect(auction.connect(bidder1).cancelAuction())
        .to.be.revertedWithCustomError(auction, "OwnableUnauthorizedAccount");
    });
  });

  describe("Finalization", function () {
    it("Should correctly calculate clearing price above floor", async function () {
      const totalBid = BID_AMOUNT_1 + BID_AMOUNT_2 + BID_AMOUNT_3; // 100k USDC
      
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(bidder2).bid(BID_AMOUNT_2);
      await auction.connect(bidder3).bid(BID_AMOUNT_3);
      
      await auction.connect(owner).endAuctionEarly();
      await auction.connect(owner).finalize();

      // Clearing Price = (100,000 USDC * 1e18) / 1,500,000 DBBPT = 0.0666... USDC per DBBPT
      // This is below floor price (0.1), so should use floor price
      expect(await auction.clearingPrice()).to.equal(FLOOR_PRICE);
    });

    it("Should correctly split funds (2/3 + 1/3)", async function () {
      const totalBid = BID_AMOUNT_1 + BID_AMOUNT_2; // 80k USDC
      
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(bidder2).bid(BID_AMOUNT_2);
      
      await auction.connect(owner).endAuctionEarly();

      const fundsBalanceBefore = await currency.balanceOf(fundsRecipient.address);
      const liquidityBalanceBefore = await currency.balanceOf(liquidityRecipient.address);

      await auction.connect(owner).finalize();

      const fundsBalanceAfter = await currency.balanceOf(fundsRecipient.address);
      const liquidityBalanceAfter = await currency.balanceOf(liquidityRecipient.address);

      const liquidityShare = totalBid / 3n; // 1/3
      const fundsShare = totalBid - liquidityShare; // 2/3

      expect(liquidityBalanceAfter - liquidityBalanceBefore).to.equal(liquidityShare);
      expect(fundsBalanceAfter - fundsBalanceBefore).to.equal(fundsShare);
    });

    it("Should return unsold tokens to owner", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1); // 50k USDC
      
      await auction.connect(owner).endAuctionEarly();

      const ownerBalanceBefore = await token.balanceOf(owner.address);
      await auction.connect(owner).finalize();
      const ownerBalanceAfter = await token.balanceOf(owner.address);

      // At floor price (0.1 USDC), 50k USDC buys 500k DBBPT
      // So 1,000,000 DBBPT should be returned (1,500,000 - 500,000)
      const expectedUnsold = ethers.parseEther("1000000");
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedUnsold);
    });

    it("Should emit AuctionFinalized event", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(owner).endAuctionEarly();

      await expect(auction.connect(owner).finalize())
        .to.emit(auction, "AuctionFinalized");
    });

    it("Should revert if finalized twice", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1);
      await auction.connect(owner).endAuctionEarly();
      await auction.connect(owner).finalize();

      await expect(auction.connect(owner).finalize())
        .to.be.revertedWith("Auction already finalized");
    });

    it("Should revert if auction is canceled", async function () {
      await auction.connect(owner).cancelAuction();

      await expect(auction.connect(owner).finalize())
        .to.be.revertedWith("Auction is canceled");
    });
  });

  describe("Token Claims", function () {
    beforeEach(async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1); // 50k USDC
      await auction.connect(bidder2).bid(BID_AMOUNT_2); // 30k USDC
      await auction.connect(owner).endAuctionEarly();
      await auction.connect(owner).finalize();
    });

    it("Should allow bidders to claim tokens", async function () {
      const balanceBefore = await token.balanceOf(bidder1.address);
      await auction.connect(bidder1).claimTokens();
      const balanceAfter = await token.balanceOf(bidder1.address);

      // 50k USDC at floor price (0.1) = 500k DBBPT
      const expectedTokens = ethers.parseEther("500000");
      expect(balanceAfter - balanceBefore).to.equal(expectedTokens);
    });

    it("Should transfer tokens with 0% fee", async function () {
      // Using mock ERC20 which has no fees, just verify exact amount transfer
      await auction.connect(bidder1).claimTokens();
      
      const balance = await token.balanceOf(bidder1.address);
      const expectedTokens = ethers.parseEther("500000");
      
      // Should receive exact amount (mock token has no fees)
      expect(balance).to.equal(expectedTokens);
    });

    it("Should emit TokensClaimed event", async function () {
      await expect(auction.connect(bidder1).claimTokens())
        .to.emit(auction, "TokensClaimed")
        .withArgs(bidder1.address, ethers.parseEther("500000"));
    });

    it("Should prevent double claims", async function () {
      await auction.connect(bidder1).claimTokens();
      
      await expect(auction.connect(bidder1).claimTokens())
        .to.be.revertedWith("Tokens already claimed");
    });

    it("Should revert if no contribution was made", async function () {
      await expect(auction.connect(bidder3).claimTokens())
        .to.be.revertedWith("No contribution made");
    });

    it("Should revert if auction not finalized", async function () {
      // Deploy new auction
      const currentBlock = await ethers.provider.getBlockNumber();
      const AuctionFactory = await ethers.getContractFactory("ContinuousClearingAuction");
      const newAuction = await AuctionFactory.deploy(
        await token.getAddress(),
        await currency.getAddress(),
        TOKEN_AMOUNT,
        FLOOR_PRICE,
        currentBlock + 5,
        currentBlock + 105,
        fundsRecipient.address,
        liquidityRecipient.address,
        owner.address
      );
      
      await expect(newAuction.connect(bidder1).claimTokens())
        .to.be.revertedWith("Auction not finalized yet");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero bids (no bids placed)", async function () {
      await auction.connect(owner).endAuctionEarly();
      await auction.connect(owner).finalize();

      expect(await auction.clearingPrice()).to.equal(FLOOR_PRICE);
      expect(await auction.totalTokensSold()).to.equal(0);
    });

    it("Should handle all tokens sold (clearing price above floor)", async function () {
      // Bid enough to exceed floor price
      const hugeBid = ethers.parseUnits("200000", 6); // 200k USDC
      await currency.mint(bidder1.address, hugeBid);
      await currency.connect(bidder1).approve(await auction.getAddress(), hugeBid);
      
      await auction.connect(bidder1).bid(hugeBid);
      await auction.connect(owner).endAuctionEarly();
      await auction.connect(owner).finalize();

      // 200k / 1.5M = 0.1333 USDC per DBBPT (above floor)
      expect(await auction.totalTokensSold()).to.equal(TOKEN_AMOUNT);
    });

    it("Should handle partial token sale (clearing price at floor)", async function () {
      await auction.connect(bidder1).bid(BID_AMOUNT_1); // 50k USDC
      await auction.connect(owner).endAuctionEarly();
      await auction.connect(owner).finalize();

      // At floor price (0.1), only 500k tokens sold
      const expectedSold = ethers.parseEther("500000");
      expect(await auction.totalTokensSold()).to.equal(expectedSold);
    });
  });
});
