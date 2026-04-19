async function main() {
  const { ethers } = require("hardhat");
  const [signer] = await ethers.getSigners();

  const requiredEnv = [
    "DELEGATION_REGISTRY_ADDRESS",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const delegationRegistry = await ethers.getContractAt(
    [
      "function clearDelegate() external",
      "function delegateOf(address owner) external view returns (address)",
    ],
    process.env.DELEGATION_REGISTRY_ADDRESS
  );

  const tx = await delegationRegistry.connect(signer).clearDelegate();
  await tx.wait();

  const delegateOf = await delegationRegistry.delegateOf(signer.address);

  console.log(
    JSON.stringify(
      {
        signer: signer.address,
        delegationRegistry: process.env.DELEGATION_REGISTRY_ADDRESS,
        delegateOf,
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
