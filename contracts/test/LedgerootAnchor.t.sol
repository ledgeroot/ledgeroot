// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LedgerootAnchor} from "../src/LedgerootAnchor.sol";

contract LedgerootAnchorTest is Test {
    LedgerootAnchor internal anchor;

    function setUp() public {
        anchor = new LedgerootAnchor();
    }

    function test_AnchorUpdatesRootBackPointerAndEpoch() public {
        bytes32 first = bytes32(uint256(1));
        bytes32 second = bytes32(uint256(2));

        assertEq(anchor.latestRoot(), bytes32(0));
        assertEq(anchor.previousRoot(), bytes32(0));
        assertEq(anchor.lastEpoch(), 0);

        anchor.anchor(first);
        assertEq(anchor.latestRoot(), first);
        assertEq(anchor.previousRoot(), bytes32(0));
        assertEq(anchor.lastEpoch(), 1);

        anchor.anchor(second);
        assertEq(anchor.latestRoot(), second);
        assertEq(anchor.previousRoot(), first);
        assertEq(anchor.lastEpoch(), 2);
    }
}
