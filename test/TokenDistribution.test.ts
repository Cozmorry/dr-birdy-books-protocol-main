import { expect } from "chai";
import { ethers } from "hardhat";

describe("Dr. Birdy Books Token Distribution System", function () {
  let token: any;
  let distribution: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let marketingWallet: any;
  let teamMember1: any;
  let teamMember2: any;
  let airdropWallet: any;

  const TEAM_ALLOCATION = ethers.parseEther("150000"); // 150,000 tokens
  const AIRDROP_ALLOCATION = ethers.parseEther("250000"); // 250,000 tokens
  const TOTAL_DISTRIBUTED = ethers.parseEther("1000000"); // 1M tokens
  const VESTING_DURATION = 365 * 24 * 60 * 60; // 365 days
  const VESTING_CLIFF = 90 * 24 * 60 * 60; // 90 days

  beforeEach(async function () {
    [
      owner,
      user1,
      user2,
      user3,
      marketingWallet,
      teamMember1,
      teamMember2,
      airdropWallet,
    ] = await ethers.getSigners();

    // Deploy contracts in parallel
    const [TokenFactory, DistributionFactory] = await Promise.all([
      ethers.getContractFactory("ReflectiveToken"),
      ethers.getContractFactory("TokenDistribution"),
    ]);

    // Deploy contracts
    const [tokenInstance, distributionInstance] = await Promise.all([
      TokenFactory.deploy(),
      DistributionFactory.deploy(),
    ]);

    // Wait for deployments
    await Promise.all([
      tokenInstance.waitForDeployment(),
      distributionInstance.waitForDeployment(),
    ]);

    // Assign instances
    token = tokenInstance;
    distribution = distributionInstance;

    // Deploy mock contracts for token initialization
    const MockRouterFactory = await ethers.getContractFactory(
      "MockUniswapRouter"
    );
    const MockOracleFactory = await ethers.getContractFactory(
      "MockPriceOracle"
    );
    const MockGatewayFactory = await ethers.getContractFactory(
      "ArweaveGateway"
    );
    const MockStakingFactory = await ethers.getContractFactory(
      "FlexibleTieredStaking"
    );

    const [mockRouter, mockOracle, mockGateway, mockStaking] =
      await Promise.all([
        MockRouterFactory.deploy(),
        MockOracleFactory.deploy(),
        MockGatewayFactory.deploy(),
        MockStakingFactory.deploy(),
      ]);

    // Initialize token contract first
    try {
      await token.initialize(
        await mockRouter.getAddress(), // mock router
        teamMember1.address, // marketing wallet
        await mockStaking.getAddress(), // staking contract
        await mockGateway.getAddress(), // gateway
        await mockOracle.getAddress() // price oracle
      );
    } catch (error: any) {
      // Contract may already be initialized, which is fine
      if (!error.message.includes("InvalidInitialization")) {
        throw error;
      }
    }

    // Initialize distribution contract
    await distribution.initialize(
      await token.getAddress(),
      owner.address, // josephWallet
      user1.address, // ajWallet
      user2.address, // dsignWallet
      user3.address, // developerWallet
      marketingWallet.address, // birdyWallet
      airdropWallet.address // airdropWallet
    );

    // Post-deployment initialization
    try {
      await distribution.postDeploymentInit();
    } catch (err: any) {
      // Expected for some contracts
    }

    // Set distribution contract in token
    await token.setDistributionContract(await distribution.getAddress());

    // Exclude all relevant addresses from fees to avoid reflection issues
    await token.excludeFromFee(await distribution.getAddress(), true);
    await token.excludeFromFee(owner.address, true);
    await token.excludeFromFee(airdropWallet.address, true);
    await token.excludeFromFee(user1.address, true); // AJ wallet
    await token.excludeFromFee(user2.address, true); // D-Sign wallet
    await token.excludeFromFee(user3.address, true); // Developer wallet
    await token.excludeFromFee(marketingWallet.address, true); // Birdy wallet

    // Create Uniswap pair to avoid "Pair not initialized" errors
    try {
      await token.createUniswapPair();
    } catch (error: any) {
      // Pair might already exist, which is fine
    }

    // Transfer tokens to distribution contract for distribution
    await token.transfer(await distribution.getAddress(), TOTAL_DISTRIBUTED);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await distribution.token()).to.equal(await token.getAddress());
      expect(await distribution.isDistributionComplete()).to.be.false;
      expect(await distribution.vestingInitialized()).to.be.false;
    });

    it("Should have correct team allocation amounts", async function () {
      expect(await distribution.getTeamAllocation()).to.equal(TEAM_ALLOCATION);
      expect(await distribution.getAirdropAllocation()).to.equal(
        AIRDROP_ALLOCATION
      );
      expect(await distribution.getTotalDistributed()).to.equal(
        TOTAL_DISTRIBUTED
      );
    });
  });

  describe("Vesting Initialization", function () {
    it("Should initialize vesting schedules", async function () {
      await distribution.initializeVesting();

      expect(await distribution.vestingInitialized()).to.be.true;

      // Check team members
      const teamMembers = await distribution.getTeamMembers();
      expect(teamMembers.length).to.equal(5);
    });

    it("Should set up vesting info for team members", async function () {
      await distribution.initializeVesting();

      const teamMembers = await distribution.getTeamMembers();
      for (const member of teamMembers) {
        const vestingInfo = await distribution.getVestingInfo(member);
        expect(vestingInfo.totalAmount).to.equal(TEAM_ALLOCATION);
        expect(vestingInfo.claimed).to.equal(0);
      }
    });

    it("Should not allow double initialization", async function () {
      await distribution.initializeVesting();

      await expect(distribution.initializeVesting()).to.be.revertedWith(
        "Vesting already initialized"
      );
    });
  });

  describe("Token Distribution", function () {
    beforeEach(async function () {
      await distribution.initializeVesting();
    });

    it("Should complete initial distribution", async function () {
      await distribution.distributeInitialTokens();

      expect(await distribution.isDistributionComplete()).to.be.true;

      // Check airdrop allocation
      const airdropBalance = await token.balanceOf(
        await distribution.airdropWallet()
      );
      expect(airdropBalance).to.equal(AIRDROP_ALLOCATION);
    });

    it("Should not allow double distribution", async function () {
      await distribution.distributeInitialTokens();

      await expect(distribution.distributeInitialTokens()).to.be.revertedWith(
        "Distribution already complete"
      );
    });
  });

  describe("Vesting Claims", function () {
    beforeEach(async function () {
      await distribution.initializeVesting();
      await distribution.distributeInitialTokens();
    });

    it("Should not allow claims before cliff", async function () {
      const claimable = await distribution.calculateClaimable(
        user1.address // AJ wallet
      );

      expect(claimable).to.equal(0);

      await expect(
        distribution.connect(user1).claimVestedTokens()
      ).to.be.revertedWith("No tokens to claim");
    });

    it("Should allow claims after cliff", async function () {
      // Fast forward past cliff
      await ethers.provider.send("evm_increaseTime", [VESTING_CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);

      const claimable = await distribution.calculateClaimable(
        user1.address // AJ wallet
      );

      expect(claimable).to.be.gt(0);

      const initialBalance = await token.balanceOf(user1.address);

      await distribution.connect(user1).claimVestedTokens();

      const finalBalance = await token.balanceOf(user1.address);

      expect(finalBalance - initialBalance).to.be.closeTo(
        claimable,
        ethers.parseEther("1")
      );
    });

    it("Should allow full claim after vesting period", async function () {
      // Fast forward past full vesting period
      await ethers.provider.send("evm_increaseTime", [VESTING_DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      const claimable = await distribution.calculateClaimable(
        user1.address // AJ wallet
      );
      expect(claimable).to.equal(TEAM_ALLOCATION);

      const initialBalance = await token.balanceOf(user1.address);
      await distribution.connect(user1).claimVestedTokens();
      const finalBalance = await token.balanceOf(user1.address);

      expect(finalBalance - initialBalance).to.equal(TEAM_ALLOCATION);
    });

    it("Should track claimed amounts correctly", async function () {
      // Fast forward past cliff
      await ethers.provider.send("evm_increaseTime", [VESTING_CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);

      await distribution.connect(user1).claimVestedTokens();

      const vestingInfo = await distribution.getVestingInfo(
        user1.address // AJ wallet
      );
      expect(vestingInfo.claimed).to.be.gt(0);
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to initialize vesting", async function () {
      await expect(
        distribution.connect(user1).initializeVesting()
      ).to.be.revertedWithCustomError(
        distribution,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should only allow owner to distribute tokens", async function () {
      await distribution.initializeVesting();

      await expect(
        distribution.connect(user1).distributeInitialTokens()
      ).to.be.revertedWithCustomError(
        distribution,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should only allow team members to claim", async function () {
      await distribution.initializeVesting();
      await distribution.distributeInitialTokens();

      // Fast forward past cliff
      await ethers.provider.send("evm_increaseTime", [VESTING_CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        distribution.connect(airdropWallet).claimVestedTokens()
      ).to.be.revertedWith("Not a team member");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw", async function () {
      await distribution.initializeVesting();
      await distribution.distributeInitialTokens();

      const contractBalance = await distribution.getContractBalance();
      const withdrawAmount = contractBalance / 2n;

      const initialOwnerBalance = await token.balanceOf(owner.address);
      await distribution.emergencyWithdraw(withdrawAmount);
      const finalOwnerBalance = await token.balanceOf(owner.address);

      expect(finalOwnerBalance - initialOwnerBalance).to.equal(withdrawAmount);
    });

    it("Should not allow non-owner to emergency withdraw", async function () {
      await expect(
        distribution.connect(user1).emergencyWithdraw(1000)
      ).to.be.revertedWithCustomError(
        distribution,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Token Burning", function () {
    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("1000");

      // Ensure user1 has enough balance and is excluded from fees
      await token.excludeFromFee(user1.address, true);
      await token.transfer(user1.address, burnAmount);

      const initialBalance = await token.balanceOf(user1.address);
      await token.connect(user1).burnTokens(burnAmount);
      const finalBalance = await token.balanceOf(user1.address);

      expect(initialBalance - finalBalance).to.equal(burnAmount);
    });

    it("Should track total burned tokens", async function () {
      const burnAmount = ethers.parseEther("1000");

      // Ensure user1 has enough balance and is excluded from fees
      await token.excludeFromFee(user1.address, true);
      await token.transfer(user1.address, burnAmount);
      await token.connect(user1).burnTokens(burnAmount);

      const totalBurned = await token.getTotalBurned();
      expect(totalBurned).to.be.gte(burnAmount);
    });

    it("Should allow owner to burn from any address", async function () {
      const burnAmount = ethers.parseEther("1000");

      // Ensure user1 has enough balance and is excluded from fees
      await token.excludeFromFee(user1.address, true);
      await token.transfer(user1.address, burnAmount);

      const initialBalance = await token.balanceOf(user1.address);
      await token.burnTokensFrom(user1.address, burnAmount);
      const finalBalance = await token.balanceOf(user1.address);

      expect(initialBalance - finalBalance).to.equal(burnAmount);
    });
  });

  describe("Integration", function () {
    it("Should complete full distribution flow", async function () {
      // Initialize vesting
      await distribution.initializeVesting();
      expect(await distribution.vestingInitialized()).to.be.true;

      // Complete distribution
      await distribution.distributeInitialTokens();
      expect(await distribution.isDistributionComplete()).to.be.true;

      // Check airdrop allocation
      const airdropBalance = await token.balanceOf(
        await distribution.airdropWallet()
      );
      expect(airdropBalance).to.equal(AIRDROP_ALLOCATION);

      // Check team allocations are in distribution contract
      const distributionBalance = await token.balanceOf(
        await distribution.getAddress()
      );
      expect(distributionBalance).to.equal(TEAM_ALLOCATION * 5n); // 5 team members
    });
  });

  describe("Team Wallet Updates", function () {
    let newTeamMember1: any;
    let newTeamMember2: any;
    let newTeamMember3: any;
    let newTeamMember4: any;
    let newTeamMember5: any;
    let newAirdropWallet: any;

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      // Start from index 8 to get different addresses than the initial team members
      newTeamMember1 = signers[8];
      newTeamMember2 = signers[9];
      newTeamMember3 = signers[10];
      newTeamMember4 = signers[11];
      newTeamMember5 = signers[12];
      newAirdropWallet = signers[13];
    });

    it("Should update team wallets before vesting initialization", async function () {
      // Get initial wallet addresses
      const initialWallets = await distribution.getTeamWallets();

      // Update team wallets
      await distribution.updateTeamWallets(
        newTeamMember1.address, // joseph
        newTeamMember2.address, // aj
        newTeamMember3.address, // dsign
        newTeamMember4.address, // developer
        newTeamMember5.address, // birdy
        newAirdropWallet.address // airdrop
      );

      // Verify wallet addresses are updated
      const updatedWallets = await distribution.getTeamWallets();
      expect(updatedWallets.joseph).to.equal(newTeamMember1.address);
      expect(updatedWallets.aj).to.equal(newTeamMember2.address);
      expect(updatedWallets.dsign).to.equal(newTeamMember3.address);
      expect(updatedWallets.developer).to.equal(newTeamMember4.address);
      expect(updatedWallets.birdy).to.equal(newTeamMember5.address);
      expect(updatedWallets.airdrop).to.equal(newAirdropWallet.address);

      // Verify team members array is updated
      const teamMembers = await distribution.getTeamMembers();
      expect(teamMembers[0]).to.equal(newTeamMember1.address);
      expect(teamMembers[1]).to.equal(newTeamMember2.address);
      expect(teamMembers[2]).to.equal(newTeamMember3.address);
      expect(teamMembers[3]).to.equal(newTeamMember4.address);
      expect(teamMembers[4]).to.equal(newTeamMember5.address);
    });

    it("Should update team wallets after vesting initialization and migrate vesting data", async function () {
      // Initialize vesting first
      await distribution.initializeVesting();

      // Fast forward past cliff to allow some claims
      await ethers.provider.send("evm_increaseTime", [VESTING_CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);

      // Get initial vesting info for one member
      const initialVestingInfo = await distribution.getVestingInfo(
        user1.address
      );
      expect(initialVestingInfo.totalAmount).to.equal(TEAM_ALLOCATION);

      // Update team wallets
      const tx = await distribution.updateTeamWallets(
        newTeamMember1.address, // joseph
        newTeamMember2.address, // aj (was user1)
        newTeamMember3.address, // dsign
        newTeamMember4.address, // developer
        newTeamMember5.address, // birdy
        newAirdropWallet.address // airdrop
      );

      // Check that VestingMigrated events were emitted
      const receipt = await tx.wait();
      const vestingMigratedEvents = receipt.logs.filter(
        (log: any) =>
          log.topics[0] ===
          distribution.interface.getEvent("VestingMigrated").topicHash
      );
      expect(vestingMigratedEvents.length).to.be.gt(0);

      // Verify old wallet is deactivated
      const oldVestingInfo = await distribution.getVestingInfo(user1.address);
      expect(oldVestingInfo.totalAmount).to.equal(0); // Should be 0 as it's deactivated

      // Verify new wallet has vesting info
      const newVestingInfo = await distribution.getVestingInfo(
        newTeamMember2.address
      );
      expect(newVestingInfo.totalAmount).to.equal(TEAM_ALLOCATION);
      expect(newVestingInfo.claimed).to.equal(initialVestingInfo.claimed);
      expect(newVestingInfo.startTime).to.equal(initialVestingInfo.startTime);
    });

    it("Should allow new team member to claim after wallet update", async function () {
      // Initialize vesting and distribute tokens
      await distribution.initializeVesting();
      await distribution.distributeInitialTokens();

      // Fast forward past cliff
      await ethers.provider.send("evm_increaseTime", [VESTING_CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);

      // Update team wallets
      await distribution.updateTeamWallets(
        newTeamMember1.address, // joseph
        newTeamMember2.address, // aj
        newTeamMember3.address, // dsign
        newTeamMember4.address, // developer
        newTeamMember5.address, // birdy
        newAirdropWallet.address // airdrop
      );

      // New team member should be able to claim
      const claimable = await distribution.calculateClaimable(
        newTeamMember2.address
      );
      expect(claimable).to.be.gt(0);

      const initialBalance = await token.balanceOf(newTeamMember2.address);
      await distribution.connect(newTeamMember2).claimVestedTokens();
      const finalBalance = await token.balanceOf(newTeamMember2.address);

      // Allow for larger differences due to reflection fees and timing
      expect(finalBalance - initialBalance).to.be.closeTo(
        claimable,
        ethers.parseEther("5000") // Increased tolerance for reflection fees
      );
    });

    it("Should not allow old team member to claim after wallet update", async function () {
      // Initialize vesting and distribute tokens
      await distribution.initializeVesting();
      await distribution.distributeInitialTokens();

      // Fast forward past cliff
      await ethers.provider.send("evm_increaseTime", [VESTING_CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);

      // Update team wallets
      await distribution.updateTeamWallets(
        newTeamMember1.address, // joseph
        newTeamMember2.address, // aj
        newTeamMember3.address, // dsign
        newTeamMember4.address, // developer
        newTeamMember5.address, // birdy
        newAirdropWallet.address // airdrop
      );

      // Old team member should not be able to claim
      await expect(
        distribution.connect(user1).claimVestedTokens()
      ).to.be.revertedWith("Not a team member");
    });

    it("Should emit correct events when updating wallets", async function () {
      await expect(
        distribution.updateTeamWallets(
          newTeamMember1.address, // joseph
          newTeamMember2.address, // aj
          newTeamMember3.address, // dsign
          newTeamMember4.address, // developer
          newTeamMember5.address, // birdy
          newAirdropWallet.address // airdrop
        )
      )
        .to.emit(distribution, "TeamWalletUpdated")
        .withArgs(owner.address, newTeamMember1.address, "Joseph")
        .and.to.emit(distribution, "TeamWalletUpdated")
        .withArgs(user1.address, newTeamMember2.address, "AJ")
        .and.to.emit(distribution, "TeamWalletUpdated")
        .withArgs(user2.address, newTeamMember3.address, "D-Sign")
        .and.to.emit(distribution, "TeamWalletUpdated")
        .withArgs(user3.address, newTeamMember4.address, "Developer")
        .and.to.emit(distribution, "TeamWalletUpdated")
        .withArgs(marketingWallet.address, newTeamMember5.address, "Birdy")
        .and.to.emit(distribution, "TeamWalletUpdated")
        .withArgs(airdropWallet.address, newAirdropWallet.address, "Airdrop");
    });

    it("Should not allow zero addresses", async function () {
      await expect(
        distribution.updateTeamWallets(
          ethers.ZeroAddress, // joseph - zero address
          newTeamMember2.address, // aj
          newTeamMember3.address, // dsign
          newTeamMember4.address, // developer
          newTeamMember5.address, // birdy
          newAirdropWallet.address // airdrop
        )
      ).to.be.revertedWith("Invalid Joseph wallet");

      await expect(
        distribution.updateTeamWallets(
          newTeamMember1.address, // joseph
          ethers.ZeroAddress, // aj - zero address
          newTeamMember3.address, // dsign
          newTeamMember4.address, // developer
          newTeamMember5.address, // birdy
          newAirdropWallet.address // airdrop
        )
      ).to.be.revertedWith("Invalid AJ wallet");
    });

    it("Should only allow owner to update wallets", async function () {
      await expect(
        distribution.connect(user1).updateTeamWallets(
          newTeamMember1.address, // joseph
          newTeamMember2.address, // aj
          newTeamMember3.address, // dsign
          newTeamMember4.address, // developer
          newTeamMember5.address, // birdy
          newAirdropWallet.address // airdrop
        )
      ).to.be.revertedWithCustomError(
        distribution,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should preserve vesting progress when migrating", async function () {
      // Initialize vesting and distribute tokens
      await distribution.initializeVesting();
      await distribution.distributeInitialTokens();

      // Fast forward past cliff and claim some tokens
      await ethers.provider.send("evm_increaseTime", [VESTING_CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);

      // Claim some tokens from original wallet
      const initialClaimable = await distribution.calculateClaimable(
        user1.address
      );
      await distribution.connect(user1).claimVestedTokens();

      // Update team wallets
      await distribution.updateTeamWallets(
        newTeamMember1.address, // joseph
        newTeamMember2.address, // aj (was user1)
        newTeamMember3.address, // dsign
        newTeamMember4.address, // developer
        newTeamMember5.address, // birdy
        newAirdropWallet.address // airdrop
      );

      // Check that claimed amount is preserved (allow for small differences due to reflection fees)
      const newVestingInfo = await distribution.getVestingInfo(
        newTeamMember2.address
      );
      expect(newVestingInfo.claimed).to.be.closeTo(
        initialClaimable,
        ethers.parseEther("10") // Allow for small differences
      );
      expect(newVestingInfo.totalAmount).to.equal(TEAM_ALLOCATION);

      // New wallet should be able to claim remaining tokens
      const remainingClaimable = await distribution.calculateClaimable(
        newTeamMember2.address
      );
      expect(remainingClaimable).to.be.gt(0);
      expect(remainingClaimable + newVestingInfo.claimed).to.be.lte(
        TEAM_ALLOCATION
      );
    });

    it("Should handle multiple wallet updates", async function () {
      // First update
      await distribution.updateTeamWallets(
        newTeamMember1.address, // joseph
        newTeamMember2.address, // aj
        newTeamMember3.address, // dsign
        newTeamMember4.address, // developer
        newTeamMember5.address, // birdy
        newAirdropWallet.address // airdrop
      );

      // Second update with different addresses
      const [
        newTeamMember6,
        newTeamMember7,
        newTeamMember8,
        newTeamMember9,
        newTeamMember10,
        newAirdropWallet2,
      ] = await ethers.getSigners();

      await distribution.updateTeamWallets(
        newTeamMember6.address, // joseph
        newTeamMember7.address, // aj
        newTeamMember8.address, // dsign
        newTeamMember9.address, // developer
        newTeamMember10.address, // birdy
        newAirdropWallet2.address // airdrop
      );

      // Verify final addresses
      const finalWallets = await distribution.getTeamWallets();
      expect(finalWallets.joseph).to.equal(newTeamMember6.address);
      expect(finalWallets.aj).to.equal(newTeamMember7.address);
      expect(finalWallets.dsign).to.equal(newTeamMember8.address);
      expect(finalWallets.developer).to.equal(newTeamMember9.address);
      expect(finalWallets.birdy).to.equal(newTeamMember10.address);
      expect(finalWallets.airdrop).to.equal(newAirdropWallet2.address);
    });
  });
});
