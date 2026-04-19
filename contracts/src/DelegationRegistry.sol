// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./OperatorKey.sol";

/// @title DelegationRegistry
/// @notice Registry for owner -> delegate relationships used by SNE Keys.
/// @dev V1 semantics are 1:1. A delegate is only valid while the owner still holds the key.
contract DelegationRegistry {
    OperatorKey public immutable operatorKey;
    uint256 public immutable operatorKeyId;

    mapping(address => address) public delegateOf;
    mapping(address => address) public ownerOfDelegate;

    error InvalidOperatorKey();
    error NoOperatorKey();
    error InvalidDelegate();
    error DelegateAlreadyAssigned();
    error NoDelegateAssigned();

    event DelegateSet(address indexed owner, address indexed delegate);
    event DelegateCleared(address indexed owner, address indexed delegate);

    constructor(address operatorKeyAddress) {
        if (operatorKeyAddress == address(0)) revert InvalidOperatorKey();
        operatorKey = OperatorKey(operatorKeyAddress);
        operatorKeyId = operatorKey.OPERATOR_KEY_ID();
    }

    function setDelegate(address delegate) external {
        if (!_hasOperatorKey(msg.sender)) revert NoOperatorKey();
        if (delegate == address(0) || delegate == msg.sender) revert InvalidDelegate();

        address currentOwner = ownerOfDelegate[delegate];
        if (currentOwner != address(0) && currentOwner != msg.sender) {
            revert DelegateAlreadyAssigned();
        }

        _clearDelegate(msg.sender);

        delegateOf[msg.sender] = delegate;
        ownerOfDelegate[delegate] = msg.sender;

        emit DelegateSet(msg.sender, delegate);
    }

    function clearDelegate() external {
        if (delegateOf[msg.sender] == address(0)) revert NoDelegateAssigned();
        _clearDelegate(msg.sender);
    }

    function effectiveOwner(address wallet) external view returns (address) {
        if (_hasOperatorKey(wallet)) {
            return wallet;
        }

        address owner = ownerOfDelegate[wallet];
        if (owner == address(0)) {
            return address(0);
        }

        if (delegateOf[owner] != wallet) {
            return address(0);
        }

        if (!_hasOperatorKey(owner)) {
            return address(0);
        }

        return owner;
    }

    function hasEffectiveOperatorAccess(address wallet) external view returns (bool) {
        if (_hasOperatorKey(wallet)) {
            return true;
        }

        address owner = ownerOfDelegate[wallet];
        if (owner == address(0)) {
            return false;
        }

        return delegateOf[owner] == wallet && _hasOperatorKey(owner);
    }

    function _clearDelegate(address owner) internal {
        address previousDelegate = delegateOf[owner];
        if (previousDelegate == address(0)) {
            return;
        }

        delegateOf[owner] = address(0);
        ownerOfDelegate[previousDelegate] = address(0);

        emit DelegateCleared(owner, previousDelegate);
    }

    function _hasOperatorKey(address wallet) internal view returns (bool) {
        return operatorKey.balanceOf(wallet, operatorKeyId) > 0;
    }
}
