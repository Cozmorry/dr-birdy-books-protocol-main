/**
 * @notice Dr. Birdy Books Timelock: Delays sensitive operations (e.g., minting, upgrades)
 *         to protect users from malicious admin actions.
 * @dev Min delay: 24 hours. Part of the Dr. Birdy Books Protocol.
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ImprovedTimelock {
    address public admin;
    uint256 public delay;
    mapping(bytes32 => bool) public queuedTransactions;

    // Reentrancy guard
    bool private _locked;

    uint256 public constant MIN_DELAY = 24 hours;
    uint256 public constant GRACE_PERIOD = 14 days;

    event ExecuteTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 executeTime
    );

    event QueueTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 executeTime
    );

    event CancelTransaction(bytes32 indexed txHash);

    error NotAdmin();
    error AlreadyQueued();
    error ExecuteTimeTooSoon();
    error NotQueued();
    error TimestampNotReached();
    error TimestampStale();
    error ReentrancyGuard();

    modifier nonReentrant() {
        if (_locked) revert ReentrancyGuard();
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address _admin, uint256 _delay) {
        require(_admin != address(0), "Timelock: zero address admin");
        require(_delay >= MIN_DELAY, "Timelock: delay too short");
        admin = _admin;
        delay = _delay;
    }

    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 executeTime
    ) external returns (bytes32) {
        if (msg.sender != admin) revert NotAdmin();
        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, executeTime)
        );
        if (queuedTransactions[txHash]) revert AlreadyQueued();
        if (executeTime < block.timestamp + delay) revert ExecuteTimeTooSoon();

        queuedTransactions[txHash] = true;

        emit QueueTransaction(
            txHash,
            target,
            value,
            signature,
            data,
            executeTime
        );
        return txHash;
    }

    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 executeTime
    ) external payable nonReentrant returns (bytes memory) {
        if (msg.sender != admin) revert NotAdmin();
        require(target != address(0), "Invalid target address");
        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, executeTime)
        );
        if (!queuedTransactions[txHash]) revert NotQueued();
        if (block.timestamp < executeTime) revert TimestampNotReached();
        if (block.timestamp > executeTime + GRACE_PERIOD)
            revert TimestampStale();

        queuedTransactions[txHash] = false;

        bytes memory callData;
        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodeWithSignature(signature, data);
        }

        (bool success, bytes memory returnData) = target.call{value: value}(
            callData
        );
        require(success, "Timelock: transaction failed");

        emit ExecuteTransaction(
            txHash,
            target,
            value,
            signature,
            data,
            executeTime
        );

        return returnData;
    }

    function cancelTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 executeTime
    ) external {
        if (msg.sender != admin) revert NotAdmin();
        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, executeTime)
        );
        if (!queuedTransactions[txHash]) revert NotQueued();
        queuedTransactions[txHash] = false;
        emit CancelTransaction(txHash);
    }

    function getTxHash(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 executeTime
    ) external pure returns (bytes32) {
        return
            keccak256(abi.encode(target, value, signature, data, executeTime));
    }
}
