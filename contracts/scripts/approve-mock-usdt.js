async function main() {
  const { ethers } = require("hardhat");
  const [signer] = await ethers.getSigners();

  const requiredEnv = [
    "MOCK_USDT_ADDRESS",
    "KEYSALE_ADDRESS",
    "APPROVE_AMOUNT",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const mockUsdt = await ethers.getContractAt(
    [
      "function approve(address spender, uint256 value) external returns (bool)",
      "function allowance(address owner, address spender) external view returns (uint256)",
    ],
    process.env.MOCK_USDT_ADDRESS
  );

  const keySaleAddress = process.env.KEYSALE_ADDRESS;
  const approveAmount = BigInt(process.env.APPROVE_AMOUNT);

  const tx = await mockUsdt.connect(signer).approve(keySaleAddress, approveAmount);
  await tx.wait();

  const allowance = await mockUsdt.allowance(signer.address, keySaleAddress);

  console.log(
    JSON.stringify(
      {
        signer: signer.address,
        mockUsdt: process.env.MOCK_USDT_ADDRESS,
        keySale: keySaleAddress,
        approveAmount: approveAmount.toString(),
        allowance: allowance.toString(),
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
