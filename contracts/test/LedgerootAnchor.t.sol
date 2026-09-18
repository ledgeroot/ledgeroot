// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LedgerootAnchor} from "../src/LedgerootAnchor.sol";

contract LedgerootAnchorTest is Test {
    LedgerootAnchor internal anchor;

    address internal owner;
    address internal stranger;

    function setUp() public {
        owner = makeAddr("owner");
        stranger = makeAddr("stranger");
        anchor = new LedgerootAnchor(owner);
    }

    function test_AnchorUpdatesRootBackPointerAndEpoch() public {
        bytes32 first = bytes32(uint256(1));
        bytes32 second = bytes32(uint256(2));

        assertEq(anchor.latestRoot(), bytes32(0));
        assertEq(anchor.previousRoot(), bytes32(0));
        assertEq(anchor.lastEpoch(), 0);

        vm.prank(owner);
        anchor.anchor(first);
        assertEq(anchor.latestRoot(), first);
        assertEq(anchor.previousRoot(), bytes32(0));
        assertEq(anchor.lastEpoch(), 1);

        vm.prank(owner);
        anchor.anchor(second);
        assertEq(anchor.latestRoot(), second);
        assertEq(anchor.previousRoot(), first);
        assertEq(anchor.lastEpoch(), 2);
    }

    function test_OwnerIsRecorded() public view {
        assertEq(anchor.owner(), owner);
    }

    function test_RevertWhen_NonOwnerAnchors() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(LedgerootAnchor.NotOwner.selector, stranger));
        anchor.anchor(bytes32(uint256(1)));
    }

    function test_RevertWhen_NonOwnerDisplacesAnAnchoredRoot() public {
        bytes32 honest = bytes32(uint256(1));
        vm.prank(owner);
        anchor.anchor(honest);

        bytes32 forged = bytes32(uint256(0xBAD));
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(LedgerootAnchor.NotOwner.selector, stranger));
        anchor.anchor(forged);

        // The attack leaves no trace: neither the root nor the counter moved.
        assertEq(anchor.latestRoot(), honest);
        assertEq(anchor.lastEpoch(), 1);
    }

    function test_RevertWhen_DeployedWithoutOwner() public {
        vm.expectRevert(LedgerootAnchor.ZeroOwner.selector);
        new LedgerootAnchor(address(0));
    }
}
