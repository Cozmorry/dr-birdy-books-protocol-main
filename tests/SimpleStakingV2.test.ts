import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleStakingV2", function () {
  let token: any;
  let staking: any;
  let owner: any;
  let user: any;

  const STAKE_AMOUNT = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("Mock Token", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    await token.transfer(await user.getAddress(), STAKE_AMOUNT);

    const Staking = await ethers.getContractFactory("SimpleStakingV2");
    staking = await Staking.deploy(await token.getAddress());
    await staking.waitForDeployment();
  });

  it("should initialize with the correct staking token", async function () {
    expect(await staking.stakingToken()).to.equal(await token.getAddress());
  });

  it("should stake tokens and update user balance", async function () {
    await token.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
    await expect(staking.connect(user).stake(STAKE_AMOUNT))
      .to.emit(staking, "Staked")
      .withArgs(await user.getAddress(), STAKE_AMOUNT);

    expect(await staking.getStakedAmount(await user.getAddress())).to.equal(STAKE_AMOUNT);
    expect(await token.balanceOf(await staking.getAddress())).to.equal(STAKE_AMOUNT);
  });

  it("should revert when staking zero tokens", async function () {
    await expect(staking.connect(user).stake(0)).to.be.revertedWith("Cannot stake zero");
  });

  it("should unstake tokens and return them to the user", async function () {
    await token.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
    await staking.connect(user).stake(STAKE_AMOUNT);

    await expect(staking.connect(user).unstake(STAKE_AMOUNT))
      .to.emit(staking, "Unstaked")
      .withArgs(await user.getAddress(), STAKE_AMOUNT);

    expect(await staking.getStakedAmount(await user.getAddress())).to.equal(0);
    expect(await token.balanceOf(await user.getAddress())).to.equal(STAKE_AMOUNT);
  });

  it("should revert when unstaking more than staked", async function () {
    await token.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
    await staking.connect(user).stake(STAKE_AMOUNT / 2n);
    await expect(staking.connect(user).unstake(STAKE_AMOUNT)).to.be.revertedWith("Insufficient staked");
  });
});
