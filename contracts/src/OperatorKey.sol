// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @title OperatorKey
/// @notice ERC-1155 contract that represents sovereign access classes for the SNE ecosystem.
/// @dev V1 only uses tokenId = 1 for the Operator class.
contract OperatorKey is ERC1155, Ownable {
    uint256 public constant OPERATOR_KEY_ID = 1;

    address public saleController;

    error NotSaleController();
    error InvalidSaleController();

    event SaleControllerUpdated(address indexed previousController, address indexed nextController);
    event OperatorMinted(address indexed to, uint256 amount);

    constructor(string memory baseUri, address initialOwner) ERC1155(baseUri) Ownable(initialOwner) {}

    modifier onlySaleController() {
        if (msg.sender != saleController) revert NotSaleController();
        _;
    }

    function setSaleController(address nextSaleController) external onlyOwner {
        if (nextSaleController == address(0)) revert InvalidSaleController();

        address previousController = saleController;
        saleController = nextSaleController;

        emit SaleControllerUpdated(previousController, nextSaleController);
    }

    function mintOperator(address to, uint256 amount) external onlySaleController {
        _mint(to, OPERATOR_KEY_ID, amount, "");
        emit OperatorMinted(to, amount);
    }
}
