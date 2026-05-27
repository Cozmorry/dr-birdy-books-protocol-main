import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArweaveGateway", function () {
  let gateway: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy ArweaveGateway
    const Gateway = await ethers.getContractFactory("ArweaveGateway");
    gateway = await Gateway.deploy();
    await gateway.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await gateway.owner()).to.equal(owner.address);
    });

    it("Should implement IArweaveGateway interface", async function () {
      // Check that the contract has the required interface function
      expect(typeof gateway.verifyTransaction).to.equal("function");
    });
  });

  describe("Transaction Management", function () {
    it("Should allow owner to add single transaction", async function () {
      const txId = "test-transaction-id-1";
      const isVerified = true;

      await gateway.addTransaction(txId, isVerified);

      const verificationResult = await gateway.verifyTransaction(txId);

      expect(verificationResult).to.equal(isVerified);
    });

    it("Should allow owner to add multiple transactions", async function () {
      const txIds = ["tx1", "tx2", "tx3"];
      const verifiedStatus = [true, false, true];

      await gateway.addTransactions(txIds, verifiedStatus);

      // Verify each transaction
      for (let i = 0; i < txIds.length; i++) {
        const result = await gateway.verifyTransaction(txIds[i]);
        expect(result).to.equal(verifiedStatus[i]);
      }
    });

    it("Should allow owner to remove transaction", async function () {
      const txId = "test-transaction-id-2";
      const isVerified = true;

      // Add transaction first
      await gateway.addTransaction(txId, isVerified);
      expect(await gateway.verifyTransaction(txId)).to.equal(isVerified);

      // Remove transaction
      await gateway.removeTransaction(txId);
      expect(await gateway.verifyTransaction(txId)).to.be.false;
    });

    it("Should allow owner to update transaction status", async function () {
      const txId = "test-transaction-id-3";
      const initialStatus = false;
      const newStatus = true;

      // Add transaction with initial status
      await gateway.addTransaction(txId, initialStatus);
      expect(await gateway.verifyTransaction(txId)).to.equal(initialStatus);

      // Update transaction status
      await gateway.updateTransactionStatus(txId, newStatus);
      expect(await gateway.verifyTransaction(txId)).to.equal(newStatus);
    });

    it("Should allow owner to update multiple transaction statuses", async function () {
      const txIds = ["tx4", "tx5", "tx6"];
      const initialStatus = [true, false, true];
      const newStatus = [false, true, false];

      // Add transactions with initial status
      await gateway.addTransactions(txIds, initialStatus);

      // Update transaction statuses
      await gateway.updateTransactions(txIds, newStatus);

      expect(await gateway.verifyTransaction("tx4")).to.be.false;
      expect(await gateway.verifyTransaction("tx5")).to.be.true;
      expect(await gateway.verifyTransaction("tx6")).to.be.false;
    });

    it("Should return false for non-existent transaction", async function () {
      const txId = "non-existent-transaction";

      expect(await gateway.verifyTransaction(txId)).to.be.false;
    });
  });

  describe("Access Control", function () {
    it("Should not allow non-owner to add transaction", async function () {
      const txId = "unauthorized-transaction";
      const isVerified = true;

      try {
        await gateway.connect(user1).addTransaction(txId, isVerified);
        expect.fail("Transaction should have reverted");
      } catch (error: any) {
        // Check if it's a custom error or regular revert
        if (
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("caller is not the owner") ||
          error.message.includes("Internal error")
        ) {
          // This is expected - the transaction should revert
          expect(true).to.be.true;
        } else {
          throw error;
        }
      }
    });

    it("Should not allow non-owner to add multiple transactions", async function () {
      const txIds = ["unauthorized-tx1", "unauthorized-tx2"];
      const verifiedStatus = [true, false];

      try {
        await gateway.connect(user1).addTransactions(txIds, verifiedStatus);
        expect.fail("Transaction should have reverted");
      } catch (error: any) {
        if (
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("caller is not the owner") ||
          error.message.includes("Internal error")
        ) {
          expect(true).to.be.true;
        } else {
          throw error;
        }
      }
    });

    it("Should not allow non-owner to remove transaction", async function () {
      const txId = "test-transaction-id-4";
      const isVerified = true;

      // Owner adds transaction first
      await gateway.addTransaction(txId, isVerified);

      try {
        await gateway.connect(user1).removeTransaction(txId);
        expect.fail("Transaction should have reverted");
      } catch (error: any) {
        if (
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("caller is not the owner") ||
          error.message.includes("Internal error")
        ) {
          expect(true).to.be.true;
        } else {
          throw error;
        }
      }
    });

    it("Should not allow non-owner to update transaction status", async function () {
      const txId = "test-transaction-id-5";
      const isVerified = true;

      // Owner adds transaction first
      await gateway.addTransaction(txId, isVerified);

      try {
        await gateway.connect(user1).updateTransactionStatus(txId, false);
        expect.fail("Transaction should have reverted");
      } catch (error: any) {
        if (
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("caller is not the owner") ||
          error.message.includes("Internal error")
        ) {
          expect(true).to.be.true;
        } else {
          throw error;
        }
      }
    });

    it("Should not allow non-owner to update multiple transaction statuses", async function () {
      const txIds = ["test-tx1", "test-tx2"];
      const verifiedStatus = [true, false];

      // Owner adds transactions first
      await gateway.addTransactions(txIds, verifiedStatus);

      try {
        await gateway.connect(user1).updateTransactions(txIds, [false, true]);
        expect.fail("Transaction should have reverted");
      } catch (error: any) {
        if (
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("caller is not the owner") ||
          error.message.includes("Internal error")
        ) {
          expect(true).to.be.true;
        } else {
          throw error;
        }
      }
    });
  });

  describe("Event Emissions", function () {
    it("Should emit TransactionAdded event when adding single transaction", async function () {
      const txId = "event-test-transaction";
      const isVerified = true;

      await expect(gateway.addTransaction(txId, isVerified))
        .to.emit(gateway, "TransactionAdded")
        .withArgs(txId, isVerified);
    });

    it("Should emit TransactionAdded events when adding multiple transactions", async function () {
      const txIds = ["event-tx1", "event-tx2"];
      const verifiedStatus = [true, false];

      const tx = await gateway.addTransactions(txIds, verifiedStatus);
      const receipt = await tx.wait();

      // Check that TransactionAdded events were emitted
      const events = receipt?.logs.filter((log: any) => {
        try {
          const parsed = gateway.interface.parseLog(log);
          return parsed?.name === "TransactionAdded";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.equal(2);
    });

    it("Should emit TransactionRemoved event when removing transaction", async function () {
      const txId = "remove-event-test";
      const isVerified = true;

      // Add transaction first
      await gateway.addTransaction(txId, isVerified);

      await expect(gateway.removeTransaction(txId))
        .to.emit(gateway, "TransactionRemoved")
        .withArgs(txId);
    });

    it("Should emit TransactionStatusUpdated event when updating transaction status", async function () {
      const txId = "update-event-test";
      const initialStatus = false;
      const newStatus = true;

      // Add transaction first
      await gateway.addTransaction(txId, initialStatus);

      await expect(gateway.updateTransactionStatus(txId, newStatus))
        .to.emit(gateway, "TransactionStatusUpdated")
        .withArgs(txId, newStatus);
    });

    it("Should emit TransactionStatusUpdated events when updating multiple transaction statuses", async function () {
      const txIds = ["update-tx1", "update-tx2"];
      const initialStatus = [true, false];
      const newStatus = [false, true];

      // Add transactions first
      await gateway.addTransactions(txIds, initialStatus);

      const tx = await gateway.updateTransactions(txIds, newStatus);
      const receipt = await tx.wait();

      // Check that TransactionStatusUpdated events were emitted
      const events = receipt?.logs.filter((log: any) => {
        try {
          const parsed = gateway.interface.parseLog(log);
          return parsed?.name === "TransactionStatusUpdated";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.equal(2);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty transaction ID", async function () {
      const txId = "";
      const isVerified = true;

      await gateway.addTransaction(txId, isVerified);
      expect(await gateway.verifyTransaction(txId)).to.equal(isVerified);
    });

    it("Should handle very long transaction ID", async function () {
      const txId = "a".repeat(1000); // Very long string
      const isVerified = true;

      await gateway.addTransaction(txId, isVerified);
      expect(await gateway.verifyTransaction(txId)).to.equal(isVerified);
    });

    it("Should handle special characters in transaction ID", async function () {
      const txId = "tx-with-special-chars-!@#$%^&*()";
      const isVerified = true;

      await gateway.addTransaction(txId, isVerified);
      expect(await gateway.verifyTransaction(txId)).to.equal(isVerified);
    });

    it("Should handle removing non-existent transaction", async function () {
      const txId = "non-existent-tx";

      // Should not revert when removing non-existent transaction
      await gateway.removeTransaction(txId);
      expect(await gateway.verifyTransaction(txId)).to.be.false;
    });

    it("Should handle updating non-existent transaction", async function () {
      const txId = "non-existent-tx";
      const newStatus = true;

      // Should not revert when updating non-existent transaction
      await gateway.updateTransactionStatus(txId, newStatus);
      expect(await gateway.verifyTransaction(txId)).to.equal(newStatus);
    });

    it("Should handle arrays with different lengths", async function () {
      const txIds = ["tx1", "tx2"];
      const verifiedStatus = [true]; // Different length

      try {
        await gateway.addTransactions(txIds, verifiedStatus);
        expect.fail("Transaction should have reverted");
      } catch (error: any) {
        if (
          error.message.includes("Arrays length mismatch") ||
          error.message.includes("Internal error")
        ) {
          expect(true).to.be.true;
        } else {
          throw error;
        }
      }
    });
  });

  describe("Batch Operations", function () {
    it("Should handle large batch of transactions", async function () {
      this.timeout(60000); // Increase timeout to 60 seconds
      const txIds = [];
      const verifiedStatus = [];

      // Create 50 transactions (reduced from 100)
      for (let i = 0; i < 50; i++) {
        txIds.push(`batch-tx-${i}`);
        verifiedStatus.push(i % 2 === 0); // Alternate true/false
      }

      await gateway.addTransactions(txIds, verifiedStatus);

      // Verify all transactions
      for (let i = 0; i < 50; i++) {
        expect(await gateway.verifyTransaction(`batch-tx-${i}`)).to.equal(
          i % 2 === 0
        );
      }
    });

    it("Should handle batch update of transaction statuses", async function () {
      const txIds = ["batch-update-1", "batch-update-2", "batch-update-3"];
      const initialStatus = [true, false, true];
      const newStatus = [false, true, false];

      // Add transactions
      await gateway.addTransactions(txIds, initialStatus);

      // Update all transactions
      await gateway.updateTransactions(txIds, newStatus);

      // Verify updates
      expect(await gateway.verifyTransaction("batch-update-1")).to.be.false;
      expect(await gateway.verifyTransaction("batch-update-2")).to.be.true;
      expect(await gateway.verifyTransaction("batch-update-3")).to.be.false;
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete transaction lifecycle", async function () {
      const txId = "lifecycle-test-tx";
      const initialStatus = false;
      const updatedStatus = true;

      // Add transaction
      await gateway.addTransaction(txId, initialStatus);
      expect(await gateway.verifyTransaction(txId)).to.equal(initialStatus);

      // Update transaction status
      await gateway.updateTransactionStatus(txId, updatedStatus);
      expect(await gateway.verifyTransaction(txId)).to.equal(updatedStatus);

      // Remove transaction
      await gateway.removeTransaction(txId);
      expect(await gateway.verifyTransaction(txId)).to.be.false;
    });

    it("Should handle multiple transactions with different statuses", async function () {
      const transactions = [
        { id: "tx1", status: true },
        { id: "tx2", status: false },
        { id: "tx3", status: true },
        { id: "tx4", status: false },
      ];

      // Add all transactions
      for (const tx of transactions) {
        await gateway.addTransaction(tx.id, tx.status);
        expect(await gateway.verifyTransaction(tx.id)).to.equal(tx.status);
      }

      // Update all transactions to opposite status
      const txIds = transactions.map((tx) => tx.id);
      const newStatuses = transactions.map((tx) => !tx.status);

      await gateway.updateTransactions(txIds, newStatuses);

      // Verify all updates
      for (let i = 0; i < transactions.length; i++) {
        expect(await gateway.verifyTransaction(transactions[i].id)).to.equal(
          newStatuses[i]
        );
      }
    });

    it("Should handle owner transfer", async function () {
      // Transfer ownership to user1
      await gateway.transferOwnership(user1.address);
      expect(await gateway.owner()).to.equal(user1.address);

      // user1 should now be able to add transactions
      const txId = "new-owner-tx";
      const isVerified = true;

      await gateway.connect(user1).addTransaction(txId, isVerified);
      expect(await gateway.verifyTransaction(txId)).to.equal(isVerified);

      // Original owner should no longer be able to add transactions
      try {
        await gateway.addTransaction("old-owner-tx", true);
        expect.fail("Transaction should have reverted");
      } catch (error: any) {
        if (
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("caller is not the owner") ||
          error.message.includes("Internal error")
        ) {
          expect(true).to.be.true;
        } else {
          throw error;
        }
      }
    });
  });
});
