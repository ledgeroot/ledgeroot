// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LedgerootAnchor
/// @notice Anchors the epoch Merkle root of Ledgeroot audit receipts on-chain.
///         Each anchor stores only a 32-byte root plus a back-pointer to the
///         previous root, so every receipt in the epoch is verifiable offline
///         by any third party.
/// @dev Writes are restricted to the owner. An open `anchor()` would let anyone
///      overwrite `latestRoot`, which makes "this root is on chain" mean only
///      "somebody anchored something here": an attacker could publish a forged
///      root under this contract's address, or displace the honest one so that
///      valid receipts verify as tampered.
contract LedgerootAnchor {
    /// @notice The account allowed to submit roots.
    address public owner;

    /// @notice The most recently anchored Merkle root.
    bytes32 public latestRoot;

    /// @notice The previous root (back-pointer for the root hash chain).
    bytes32 public previousRoot;

    /// @notice Monotonic epoch counter; doubles as the anchor sequence number.
    uint256 public lastEpoch;

    event Anchored(uint256 indexed epoch, bytes32 root, bytes32 previousRoot);

    /// @notice Thrown when a caller other than `owner` tries to anchor.
    error NotOwner(address caller);

    /// @notice Thrown when the contract would be deployed with no owner.
    error ZeroOwner();

    constructor(address initialOwner) {
        // Without an owner nothing could ever be anchored, and there is no way
        // back, so refuse the deployment rather than brick it.
        if (initialOwner == address(0)) revert ZeroOwner();
        owner = initialOwner;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    function anchor(bytes32 root) external onlyOwner {
        previousRoot = latestRoot;
        latestRoot = root;
        unchecked {
            ++lastEpoch;
        }
        emit Anchored(lastEpoch, root, previousRoot);
    }
}
