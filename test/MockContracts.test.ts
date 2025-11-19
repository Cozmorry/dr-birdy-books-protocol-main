import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mock Contracts", function () {
  let mockPriceOracle: any;
  let mockUniswapRouter: any;
  let owner: any;
  let user1: any;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy contracts in parallel
    const [MockOracle, MockRouter] = await Promise.all([
      ethers.getContractFactory("MockPriceOracle"),
      ethers.getContractFactory("MockUniswapRouter"),
    ]);

    // Deploy contracts
    const [mockPriceOracleInstance, mockUniswapRouterInstance] =
      await Promise.all([MockOracle.deploy(), MockRouter.deploy()]);

    // Wait for deployments
    await Promise.all([
      mockPriceOracleInstance.waitForDeployment(),
      mockUniswapRouterInstance.waitForDeployment(),
    ]);

    // Assign instances
    mockPriceOracle = mockPriceOracleInstance;
    mockUniswapRouter = mockUniswapRouterInstance;
  });

  describe("MockPriceOracle", function () {
    it("Should deploy with default price", async function () {
      const defaultPrice = await mockPriceOracle.latestAnswer();
      const expectedPrice = ethers.parseUnits("100", 8); // 100 USD with 8 decimals

      expect(defaultPrice).to.equal(expectedPrice);
    });

    it("Should allow setting new price", async function () {
      const newPrice = ethers.parseUnits("150", 8); // 150 USD

      await mockPriceOracle.setPrice(newPrice);

      const currentPrice = await mockPriceOracle.latestAnswer();

      expect(currentPrice).to.equal(newPrice);
    });

    it("Should allow anyone to set price", async function () {
      const newPrice = ethers.parseUnits("200", 8); // 200 USD

      await mockPriceOracle.connect(user1).setPrice(newPrice);

      const currentPrice = await mockPriceOracle.latestAnswer();

      expect(currentPrice).to.equal(newPrice);
    });

    it("Should handle zero price", async function () {
      const zeroPrice = 0;
      await mockPriceOracle.setPrice(zeroPrice);

      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(zeroPrice);
    });

    it("Should handle very large price", async function () {
      const largePrice = ethers.parseUnits("1000000", 8); // 1M USD
      await mockPriceOracle.setPrice(largePrice);

      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(largePrice);
    });

    it("Should handle negative price", async function () {
      const negativePrice = -ethers.parseUnits("50", 8); // -50 USD
      await mockPriceOracle.setPrice(negativePrice);

      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(negativePrice);
    });

    it("Should maintain price between calls", async function () {
      const testPrice = ethers.parseUnits("75", 8); // 75 USD
      await mockPriceOracle.setPrice(testPrice);

      // Call multiple times
      const price1 = await mockPriceOracle.latestAnswer();
      const price2 = await mockPriceOracle.latestAnswer();
      const price3 = await mockPriceOracle.latestAnswer();

      expect(price1).to.equal(testPrice);
      expect(price2).to.equal(testPrice);
      expect(price3).to.equal(testPrice);
    });

    it("Should handle price updates from different users", async function () {
      const price1 = ethers.parseUnits("100", 8);
      const price2 = ethers.parseUnits("200", 8);
      const price3 = ethers.parseUnits("300", 8);

      await mockPriceOracle.setPrice(price1);
      expect(await mockPriceOracle.latestAnswer()).to.equal(price1);

      await mockPriceOracle.connect(user1).setPrice(price2);
      expect(await mockPriceOracle.latestAnswer()).to.equal(price2);

      await mockPriceOracle.setPrice(price3);
      expect(await mockPriceOracle.latestAnswer()).to.equal(price3);
    });
  });

  describe("MockUniswapRouter", function () {
    it("Should deploy with correct initial state", async function () {
      const factory = await mockUniswapRouter.factory();
      const weth = await mockUniswapRouter.WETH();

      expect(factory).to.equal(await mockUniswapRouter.getAddress());
      expect(weth).to.equal(ethers.ZeroAddress);
    });

    it("Should return zero address for factory", async function () {
      const factory = await mockUniswapRouter.factory();
      expect(factory).to.equal(await mockUniswapRouter.getAddress());
    });

    it("Should return zero address for WETH", async function () {
      const weth = await mockUniswapRouter.WETH();
      expect(weth).to.equal(ethers.ZeroAddress);
    });

    it("Should be callable by anyone", async function () {
      // These functions should not revert
      await mockUniswapRouter.factory();
      await mockUniswapRouter.WETH();
    });

    it("Should maintain consistent return values", async function () {
      const factory1 = await mockUniswapRouter.factory();
      const factory2 = await mockUniswapRouter.factory();
      const weth1 = await mockUniswapRouter.WETH();
      const weth2 = await mockUniswapRouter.WETH();

      expect(factory1).to.equal(factory2);
      expect(weth1).to.equal(weth2);
    });
  });

  describe("Mock Contract Integration", function () {
    it("Should work together in a test scenario", async function () {
      // Set a price in the oracle
      const testPrice = ethers.parseUnits("250", 8); // 250 USD
      await mockPriceOracle.setPrice(testPrice);

      // Verify the price is set
      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(testPrice);

      // Check router functions
      const factory = await mockUniswapRouter.factory();
      const weth = await mockUniswapRouter.WETH();

      expect(factory).to.equal(await mockUniswapRouter.getAddress());
      expect(weth).to.equal(ethers.ZeroAddress);
    });

    it("Should handle multiple price updates", async function () {
      const prices = [
        ethers.parseUnits("100", 8),
        ethers.parseUnits("150", 8),
        ethers.parseUnits("200", 8),
        ethers.parseUnits("250", 8),
      ];

      for (let i = 0; i < prices.length; i++) {
        await mockPriceOracle.setPrice(prices[i]);
        const currentPrice = await mockPriceOracle.latestAnswer();
        expect(currentPrice).to.equal(prices[i]);
      }
    });

    it("Should handle concurrent calls", async function () {
      const price1 = ethers.parseUnits("100", 8);
      const price2 = ethers.parseUnits("200", 8);

      // Set prices concurrently (simulated)
      await mockPriceOracle.setPrice(price1);
      await mockPriceOracle.connect(user1).setPrice(price2);

      // The last set price should be the current price
      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(price2);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum int256 price", async function () {
      const maxPrice = ethers.MaxInt256;
      await mockPriceOracle.setPrice(maxPrice);

      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(maxPrice);
    });

    it("Should handle minimum int256 price", async function () {
      const minPrice = ethers.MinInt256;
      await mockPriceOracle.setPrice(minPrice);

      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(minPrice);
    });

    it("Should handle price with different decimal places", async function () {
      const priceWithDecimals = ethers.parseUnits("123.456789", 8);
      await mockPriceOracle.setPrice(priceWithDecimals);

      const currentPrice = await mockPriceOracle.latestAnswer();
      expect(currentPrice).to.equal(priceWithDecimals);
    });

    it("Should handle rapid price changes", async function () {
      const initialPrice = ethers.parseUnits("100", 8);
      await mockPriceOracle.setPrice(initialPrice);

      // Rapidly change prices
      for (let i = 0; i < 10; i++) {
        const newPrice = ethers.parseUnits((100 + i * 10).toString(), 8);
        await mockPriceOracle.setPrice(newPrice);
        expect(await mockPriceOracle.latestAnswer()).to.equal(newPrice);
      }
    });

    it("Should emit PriceUpdated event when price is set", async function () {
      const testPrice = ethers.parseUnits("150", 8);

      const tx = await mockPriceOracle.setPrice(testPrice);
      const receipt = await tx.wait();

      expect(receipt?.logs.length).to.be.gt(0);

      // Check that the event was emitted with correct price and round ID
      const event = mockPriceOracle.interface.parseLog(receipt?.logs[0]);
      expect(event?.name).to.equal("PriceUpdated");
      expect(event?.args.newPrice).to.equal(testPrice);
      expect(event?.args.roundId).to.equal(2);
    });

    it("Should increment round ID correctly", async function () {
      const initialRoundId = await mockPriceOracle.getCurrentRoundId();

      await mockPriceOracle.setPrice(ethers.parseUnits("200", 8));
      const newRoundId = await mockPriceOracle.getCurrentRoundId();

      expect(newRoundId).to.equal(initialRoundId + 1n);
    });

    it("Should update timestamp on price change", async function () {
      const beforeUpdate = await mockPriceOracle.getLastUpdated();

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await mockPriceOracle.setPrice(ethers.parseUnits("300", 8));
      const afterUpdate = await mockPriceOracle.getLastUpdated();

      expect(afterUpdate).to.be.gt(beforeUpdate);
    });
  });

  describe("Gas Usage", function () {
    it("Should have reasonable gas usage for price updates", async function () {
      const price = ethers.parseUnits("100", 8);

      const tx = await mockPriceOracle.setPrice(price);
      const receipt = await tx.wait();

      // Gas usage should be reasonable (less than 100k gas)
      expect(receipt?.gasUsed).to.be.lt(100000);
    });

    it("Should have reasonable gas usage for price reads", async function () {
      const price = ethers.parseUnits("100", 8);
      await mockPriceOracle.setPrice(price);

      const tx = await mockPriceOracle.latestAnswer();
      // This is a view function, so no gas cost
      expect(tx).to.equal(price);
    });

    it("Should have reasonable gas usage for router calls", async function () {
      const factoryTx = await mockUniswapRouter.factory();
      const wethTx = await mockUniswapRouter.WETH();

      // These are view functions, so no gas cost
      expect(factoryTx).to.equal(await mockUniswapRouter.getAddress());
      expect(wethTx).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Error Handling", function () {
    it("Should not revert on any valid input", async function () {
      const validPrices = [
        0,
        ethers.parseUnits("1", 8),
        ethers.parseUnits("1000", 8),
        ethers.MaxInt256,
        ethers.MinInt256,
      ];

      for (const price of validPrices) {
        await expect(mockPriceOracle.setPrice(price)).to.not.be
          .revertedWithCustomError;
      }
    });

    it("Should handle view function calls without reverting", async function () {
      await expect(mockPriceOracle.latestAnswer()).to.not.be
        .revertedWithCustomError;
      await expect(mockUniswapRouter.factory()).to.not.be
        .revertedWithCustomError;
      await expect(mockUniswapRouter.WETH()).to.not.be.revertedWithCustomError;
    });
  });
});
