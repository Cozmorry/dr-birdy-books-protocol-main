import { expect } from "chai";
import { ethers } from "hardhat";

describe("Performance Test", function () {
  it("Should run basic test without console.log overhead", async function () {
    const [owner] = await ethers.getSigners();
    expect(owner.address).to.be.a("string");
  });

  it("Should deploy contracts in parallel", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy contracts in parallel
    const [MockOracle, MockRouter] = await Promise.all([
      ethers.getContractFactory("MockPriceOracle"),
      ethers.getContractFactory("MockUniswapRouter"),
    ]);

    const [mockOracleInstance, mockRouterInstance] = await Promise.all([
      MockOracle.deploy(),
      MockRouter.deploy(),
    ]);

    await Promise.all([
      mockOracleInstance.waitForDeployment(),
      mockRouterInstance.waitForDeployment(),
    ]);

    expect(await mockOracleInstance.getAddress()).to.be.a("string");
    expect(await mockRouterInstance.getAddress()).to.be.a("string");
  });
});
