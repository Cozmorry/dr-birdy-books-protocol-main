/**
 * @notice Dr. Birdy Books Arweave Gateway: Permanently stores critical protocol data (e.g., book metadata, NFT assets, user records)
 *         on Arweave via irreversible transactions.
 * @dev Uses Arweave's permaweb to ensure data availability. Interfaces with Bundlr for cost-efficient uploads.
 *      Part of the Dr. Birdy Books Protocol.
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// 1. Define the interface FIRST
interface IArweaveGateway {
    function verifyTransaction(string calldata txId) external view returns (bool);
}

// 2. Implement the interface in the contract
contract ArweaveGateway is Ownable, IArweaveGateway {
    // Mapping to store verified Arweave transaction IDs
    mapping(string => bool) private _verifiedTransactions;

    // Events
    event TransactionAdded(string txId, bool isVerified);
    event TransactionRemoved(string txId);
    event TransactionStatusUpdated(string txId, bool isVerified);

    // Constructor to initialize Ownable with the deployer as owner
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Verifies if an Arweave transaction is valid
     * @param txId The Arweave transaction ID to verify
     * @return bool True if the transaction is verified
     */
    function verifyTransaction(string calldata txId) public view override returns (bool) {
        return _verifiedTransactions[txId];
    }

    // Rest of your existing functions (addTransaction, removeTransaction, etc.)
    function addTransaction(string calldata txId, bool isVerified) external onlyOwner {
        _verifiedTransactions[txId] = isVerified;
        emit TransactionAdded(txId, isVerified);
    }

    function addTransactions(string[] calldata txIds, bool[] calldata verifiedStatus) external onlyOwner {
        require(txIds.length == verifiedStatus.length, "Arrays length mismatch");
        for (uint256 i = 0; i < txIds.length; i++) {
            _verifiedTransactions[txIds[i]] = verifiedStatus[i];
            emit TransactionAdded(txIds[i], verifiedStatus[i]);
        }
    }

    function removeTransaction(string calldata txId) external onlyOwner {
        delete _verifiedTransactions[txId];
        emit TransactionRemoved(txId);
    }

    function updateTransactionStatus(string calldata txId, bool newStatus) external onlyOwner {
        _verifiedTransactions[txId] = newStatus;
        emit TransactionStatusUpdated(txId, newStatus);
    }

    function updateTransactions(string[] calldata txIds, bool[] calldata newStatus) external onlyOwner {
        require(txIds.length == newStatus.length, "Arrays length mismatch");
        for (uint256 i = 0; i < txIds.length; i++) {
            _verifiedTransactions[txIds[i]] = newStatus[i];
            emit TransactionStatusUpdated(txIds[i], newStatus[i]);
        }
    }
}