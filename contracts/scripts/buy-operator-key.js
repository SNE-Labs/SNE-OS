async function main() {
  const { ethers } = require("hardhat");
  const [signer] = await ethers.getSigners();

  const requiredEnv = [
    "KEYSALE_ADDRESS",
    "BUY_AMOUNT",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const keySale = await ethers.getContractAt(
    [
      "function buyOperatorKey(uint256 amount) external",
      "function operatorPrice() external view returns (uint256)",
      "function operatorKey() external view returns (address)",
      "function operatorKeyId() external view returns (uint256)",
    ],
    process.env.KEYSALE_ADDRESS
  );

  const operatorKeyAddress = await keySale.operatorKey();
  const operatorKeyId = await keySale.operatorKeyId();
  const operatorPrice = await keySale.operatorPrice();
  const buyAmount = BigInt(process.env.BUY_AMOUNT);

  const operatorKey = await ethers.getContractAt(
    [
      "function balanceOf(address account, uint256 id) external view returns (uint256)",
    ],
    operatorKeyAddress
  );

  const tx = await keySale.connect(signer).buyOperatorKey(buyAmount);
  await tx.wait();

  const balance = await operatorKey.balanceOf(signer.address, operatorKeyId);

  console.log(
    JSON.stringify(
      {
        signer: signer.address,
        keySale: process.env.KEYSALE_ADDRESS,
        operatorKey: operatorKeyAddress,
        operatorKeyId: operatorKeyId.toString(),
        operatorPrice: operatorPrice.toString(),
        buyAmount: buyAmount.toString(),
        balance: balance.toString(),
        txHash: tx.hash,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
