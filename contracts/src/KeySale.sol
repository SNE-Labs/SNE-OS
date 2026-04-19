// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./OperatorKey.sol";

/// @title KeySale
/// @notice Primary sale contract for the Operator Key using USDT.
contract KeySale is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    OperatorKey public immutable operatorKey;
    uint256 public immutable operatorKeyId;

    address public treasury;
    uint256 public operatorPrice;
    bool public paused;

    error SalePaused();
    error InvalidTreasury();
    error InvalidPrice();
    error InvalidAddress();
    error InvalidAmount();

    event OperatorKeyPurchased(address indexed buyer, uint256 indexed tokenId, uint256 amount, uint256 unitPrice);
    event TreasuryUpdated(address indexed previousTreasury, address indexed nextTreasury);
    event OperatorPriceUpdated(uint256 previousPrice, uint256 nextPrice);
    event PauseUpdated(bool paused);

    constructor(
        address usdtAddress,
        address operatorKeyAddress,
        address initialTreasury,
        uint256 initialOperatorPrice,
        address initialOwner
    ) Ownable(initialOwner) {
        if (usdtAddress == address(0) || operatorKeyAddress == address(0)) revert InvalidAddress();
        if (initialTreasury == address(0)) revert InvalidTreasury();
        if (initialOperatorPrice == 0) revert InvalidPrice();

        usdt = IERC20(usdtAddress);
        operatorKey = OperatorKey(operatorKeyAddress);
        operatorKeyId = operatorKey.OPERATOR_KEY_ID();
        treasury = initialTreasury;
        operatorPrice = initialOperatorPrice;
    }

    function buyOperatorKey(uint256 amount) external {
        if (paused) revert SalePaused();
        if (amount == 0) revert InvalidAmount();

        uint256 totalCost = operatorPrice * amount;
        usdt.safeTransferFrom(msg.sender, treasury, totalCost);
        operatorKey.mintOperator(msg.sender, amount);

        emit OperatorKeyPurchased(msg.sender, operatorKeyId, amount, operatorPrice);
    }

    function setTreasury(address nextTreasury) external onlyOwner {
        if (nextTreasury == address(0)) revert InvalidTreasury();

        address previousTreasury = treasury;
        treasury = nextTreasury;

        emit TreasuryUpdated(previousTreasury, nextTreasury);
    }

    function setOperatorPrice(uint256 nextPrice) external onlyOwner {
        if (nextPrice == 0) revert InvalidPrice();

        uint256 previousPrice = operatorPrice;
        operatorPrice = nextPrice;

        emit OperatorPriceUpdated(previousPrice, nextPrice);
    }

    function setPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
        emit PauseUpdated(nextPaused);
    }
}
