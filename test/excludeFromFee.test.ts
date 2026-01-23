import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("ReflectiveToken - exclude/include behavior", function () {
  let token: Contract;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const AMOUNT = ethers.parseEther("250000"); // 250k tokens

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    const [Gateway, MockRouterFactory, MockOracleFactory, Token] = await Promise.all([
      ethers.getContractFactory("ArweaveGateway"),
      ethers.getContractFactory("MockUniswapRouter"),
      ethers.getContractFactory("MockPriceOracle"),
      ethers.getContractFactory("ReflectiveToken"),
    ]);

    const [gatewayInstance, mockRouterInstance, mockOracleInstance, tokenInstance] = await Promise.all([
      Gateway.deploy(),
      MockRouterFactory.deploy(),
      MockOracleFactory.deploy(),
      Token.deploy(),
    ]);

    await Promise.all([
      gatewayInstance.waitForDeployment(),
      mockRouterInstance.waitForDeployment(),
      mockOracleInstance.waitForDeployment(),
      tokenInstance.waitForDeployment(),
    ]);

    token = tokenInstance;

    // initialize with mocks
    await token.initialize(
      await mockRouterInstance.getAddress(),
      owner.address,
      ethers.ZeroAddress,
      await gatewayInstance.getAddress(),
      await mockOracleInstance.getAddress()
    );

    // sanity checks
    expect(await token.debugOwner()).to.equal(owner.address);

    // Transfer 250k from owner (excluded) to addr1 (non-excluded) -> fees apply
    const tx = await token.transfer(addr1.address, AMOUNT);
    await tx.wait();
  });

  it("recipient gets amount minus fees and excluding converts rOwned->tOwned", async () => {
    const totalFee = await token.totalFee();
    const feeAmount = (AMOUNT * BigInt(await totalFee)) / BigInt(10000);
    const expectedReceived = AMOUNT - feeAmount;

    const bal = await token.balanceOf(addr1.address);
    expect(bal).to.equal(expectedReceived);

    // Check debug reflection pre-exclude
    const dbgBefore = await token.debugReflection(addr1.address);
    // should have rOwned > 0, tOwned == 0, isExcluded == false
    expect(dbgBefore.tOwned).to.equal(0);
    expect(dbgBefore.isExcluded).to.equal(false);
    expect(dbgBefore.rOwned).to.be.gt(0);

    // Debug before exclusion
    const dbgBeforeTx = await token.debugReflection(addr1.address);
    console.log("DBG BEFORE exclude -> rOwned:", dbgBeforeTx.rOwned.toString(), "tOwned:", dbgBeforeTx.tOwned.toString(), "isExcluded:", dbgBeforeTx.isExcluded);
    const calc = await token.tokenFromReflection(dbgBeforeTx.rOwned);
    console.log("tokenFromReflection(rOwned) =>", calc.toString());

    // Exclude addr1
    const txExclude = await token.excludeFromFee(addr1.address, true);
    const rcpt = await txExclude.wait();
    console.log("Exclude tx events:", rcpt.events?.map((e:any)=>e.event + ':' + JSON.stringify(e.args)).join('\n'));

    // After exclusion, balanceOf should remain the same
    const balAfter = await token.balanceOf(addr1.address);
    expect(balAfter).to.equal(expectedReceived);

    const dbgAfter = await token.debugReflection(addr1.address);
    console.log("DBG AFTER exclude -> rOwned:", dbgAfter.rOwned.toString(), "tOwned:", dbgAfter.tOwned.toString(), "isExcluded:", dbgAfter.isExcluded);

    expect(dbgAfter.isExcluded).to.equal(true);
    // tOwned should now equal expectedReceived
    expect(dbgAfter.tOwned).to.equal(expectedReceived);
    // rOwned should be zeroed
    expect(dbgAfter.rOwned).to.equal(0);
  });

  it("including back converts tOwned->rOwned and balances remain consistent", async () => {
    const totalFee = await token.totalFee();
    const feeAmount = (AMOUNT * BigInt(await totalFee)) / BigInt(10000);
    const expectedReceived = AMOUNT - feeAmount;

    // Exclude then include
    await token.excludeFromFee(addr1.address, true);
    await token.excludeFromFee(addr1.address, false);

    const dbgFinal = await token.debugReflection(addr1.address);
    expect(dbgFinal.isExcluded).to.equal(false);
    // tOwned should be zero
    expect(dbgFinal.tOwned).to.equal(0);
    // rOwned should be > 0 and tokenFromReflection(rOwned) equals expectedReceived
    const recovered = await token.tokenFromReflection(dbgFinal.rOwned);
    // allow 1 wei tolerance
    expect(recovered).to.be.closeTo(expectedReceived, 1n);

    const balFinal = await token.balanceOf(addr1.address);
    expect(balFinal).to.equal(expectedReceived);
  });

  it("excluded account can transfer out using _tOwned", async () => {
    const totalFee = await token.totalFee();
    const feeAmount = (AMOUNT * BigInt(await totalFee)) / BigInt(10000);
    const expectedReceived = AMOUNT - feeAmount;

    // Exclude addr1
    await token.excludeFromFee(addr1.address, true);

    // Transfer 100 tokens from addr1 (excluded) to addr2
    const transferAmount = ethers.parseEther("100");
    // connect as addr1
    const tokenFromAddr1 = token.connect(addr1);

    const tx = await tokenFromAddr1.transfer(addr2.address, transferAmount);
    await tx.wait();

    // Check addr2 got tokens (fees apply when fromExcluded && to not excluded -> fees apply because to non-excluded)
    const bal2 = await token.balanceOf(addr2.address);
    // fees will be applied (5% by default) so received should be transferAmount - fee
    const tf = await token.totalFee();
    const fee = (transferAmount * BigInt(tf)) / BigInt(10000);
    const received = transferAmount - fee;
    expect(bal2).to.equal(received);

    // addr1 balance should have decreased accordingly
    const bal1 = await token.balanceOf(addr1.address);
    expect(bal1).to.equal(expectedReceived - transferAmount);
  });
});
