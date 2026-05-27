import { expect } from "chai";
import { ethers } from "hardhat";

describe("TreasuryYieldStrategy", function () {
  let token: any;
  let strategy: any;
  let stakingMock: any;
  let router: any;
  let owner: any;
  let user: any;

  const DEPOSIT_AMOUNT = ethers.parseEther("50");
  const INITIAL_SUPPLY = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("Mock Token", "MCK", INITIAL_SUPPLY);
    await token.waitForDeployment();

    const Router = await ethers.getContractFactory("MockUniswapRouter");
    router = await Router.deploy();
    await router.waitForDeployment();

    const Strategy = await ethers.getContractFactory("TreasuryYieldStrategy");
    strategy = await Strategy.deploy(await token.getAddress(), await router.getAddress(), await owner.getAddress());
    await strategy.waitForDeployment();

    const StakingMock = await ethers.getContractFactory("MockStakingContract");
    stakingMock = await StakingMock.deploy(await token.getAddress());
    await stakingMock.waitForDeployment();

    await token.transfer(await stakingMock.getAddress(), DEPOSIT_AMOUNT);
    await stakingMock.connect(user).approveStrategy(await strategy.getAddress(), DEPOSIT_AMOUNT);
  });

  it("should initialize with the correct token", async function () {
    expect(await strategy.token()).to.equal(await token.getAddress());
  });

  it("should allow the owner to set the staking contract once", async function () {
    await expect(strategy.setStakingContract(await stakingMock.getAddress()))
      .to.not.be.reverted;

    expect(await strategy.stakingContract()).to.equal(await stakingMock.getAddress());

    await expect(strategy.setStakingContract(user.getAddress()))
      .to.be.revertedWith("Staking contract already set");
  });

  it("should revert when a non-owner tries to set the staking contract", async function () {
    await expect(strategy.connect(user).setStakingContract(await stakingMock.getAddress()))
      .to.be.revertedWithCustomError(strategy, "OwnableUnauthorizedAccount")
      .withArgs(await user.getAddress());
  });

  it("should allow deposits from the configured staking contract", async function () {
    await strategy.setStakingContract(await stakingMock.getAddress());

    await expect(stakingMock.callDeposit(await strategy.getAddress(), DEPOSIT_AMOUNT))
      .to.not.be.reverted;

    const [deposited, burned, balance, active] = await strategy.getStats();
    expect(deposited).to.equal(DEPOSIT_AMOUNT);
    expect(burned).to.equal(0);
    expect(balance).to.equal(DEPOSIT_AMOUNT);
    expect(active).to.equal(true);
  });

  it("should allow withdrawals to the staking contract", async function () {
    await strategy.setStakingContract(await stakingMock.getAddress());
    await stakingMock.callDeposit(await strategy.getAddress(), DEPOSIT_AMOUNT);

    await expect(stakingMock.callWithdraw(await strategy.getAddress(), DEPOSIT_AMOUNT))
      .to.not.be.reverted;

    expect(await token.balanceOf(await stakingMock.getAddress())).to.equal(DEPOSIT_AMOUNT);
  });

  it("should reject deposits from non-staking callers", async function () {
    await expect(strategy.deposit(DEPOSIT_AMOUNT)).to.be.revertedWith("Only staking contract can deposit");
  });

  it("should reject withdrawals from non-staking callers", async function () {
    await expect(strategy.withdraw(DEPOSIT_AMOUNT)).to.be.revertedWith("Only staking contract can withdraw");
  });

  it("should allow the owner to pause and resume the strategy", async function () {
    await expect(strategy.pause()).to.emit(strategy, "StrategyPaused");
    expect(await strategy.isActive()).to.equal(false);

    await expect(strategy.resume()).to.emit(strategy, "StrategyResumed");
    expect(await strategy.isActive()).to.equal(true);
  });

  it("should allow the owner to update auto-buyback settings", async function () {
    await expect(strategy.setAutoBuybackEnabled(false))
      .to.emit(strategy, "AutoBuybackToggled")
      .withArgs(false);

    expect(await strategy.autoBuybackEnabled()).to.equal(false);
  });

  it("should allow the owner to update the minimum buyback amount", async function () {
    await expect(strategy.setMinBuybackAmount(ethers.parseEther("1")))
      .to.emit(strategy, "MinBuybackAmountUpdated")
      .withArgs(ethers.parseEther("1"));

    expect(await strategy.minBuybackAmount()).to.equal(ethers.parseEther("1"));
  });

  it("should reject invalid min buyback amounts", async function () {
    await expect(strategy.setMinBuybackAmount(0)).to.be.revertedWith("Amount must be greater than 0");
  });

  it("should allow the owner to update the Uniswap router", async function () {
    const RouterFactory = await ethers.getContractFactory("MockUniswapRouter");
    const newRouter = await RouterFactory.deploy();
    await newRouter.waitForDeployment();

    await expect(strategy.setUniswapRouter(await newRouter.getAddress()))
      .to.emit(strategy, "UniswapRouterUpdated")
      .withArgs(await newRouter.getAddress());

    expect(await strategy.uniswapRouter()).to.equal(await newRouter.getAddress());
  });

  it("should reject an invalid Uniswap router address", async function () {
    await expect(strategy.setUniswapRouter(ethers.ZeroAddress)).to.be.revertedWith("Invalid router address");
  });

  it("should return the configured yield rate and status", async function () {
    expect(await strategy.getYieldRate()).to.equal(await strategy.estimatedAPY());
    const [isActive, isSafe] = await strategy.getStatus();
    expect(isActive).to.equal(true);
    expect(isSafe).to.equal(false);
  });
});
