// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LedgerootAnchor
/// @notice Anchors the epoch Merkle root of Ledgeroot audit receipts on-chain.
///         Each anchor stores only a 32-byte root plus a back-pointer to the
///         previous root, so every receipt in the epoch is verifiable offline
///         by any third party.
contract LedgerootAnchor {
    /// @notice The most recently anchored Merkle root.
    bytes32 public latestRoot;

    /// @notice The previous root (back-pointer for the root hash chain).
    bytes32 public previousRoot;

    /// @notice Monotonic epoch counter; doubles as the anchor sequence number.
    uint256 public lastEpoch;

    event Anchored(uint256 indexed epoch, bytes32 root, bytes32 previousRoot);

    function anchor(bytes32 root) external {
        previousRoot = latestRoot;
        latestRoot = root;
        unchecked {
            ++lastEpoch;
        }
        emit Anchored(lastEpoch, root, previousRoot);
    }
}
