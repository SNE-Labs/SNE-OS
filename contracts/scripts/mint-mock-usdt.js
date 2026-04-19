async function main() {
  const { ethers } = require("hardhat");
  const [signer] = await ethers.getSigners();

  const requiredEnv = [
    "MOCK_USDT_ADDRESS",
    "MINT_TO",
    "MINT_AMOUNT",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const mockUsdt = await ethers.getContractAt(
    [
      "function mint(address to, uint256 amount) external",
      "function balanceOf(address account) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
    ],
    process.env.MOCK_USDT_ADDRESS
  );

  const mintTo = process.env.MINT_TO;
  const mintAmount = BigInt(process.env.MINT_AMOUNT);

  const tx = await mockUsdt.connect(signer).mint(mintTo, mintAmount);
  await tx.wait();

  const balance = await mockUsdt.balanceOf(mintTo);
  const decimals = await mockUsdt.decimals();

  console.log(
    JSON.stringify(
      {
        signer: signer.address,
        mockUsdt: process.env.MOCK_USDT_ADDRESS,
        mintTo,
        mintAmount: mintAmount.toString(),
        balance: balance.toString(),
        decimals: decimals.toString(),
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
