async function main() {
  const { ethers } = require("hardhat");
  const [signer] = await ethers.getSigners();

  const requiredEnv = [
    "DELEGATION_REGISTRY_ADDRESS",
    "DELEGATE_ADDRESS",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const delegationRegistry = await ethers.getContractAt(
    [
      "function setDelegate(address delegate) external",
      "function delegateOf(address owner) external view returns (address)",
      "function ownerOfDelegate(address delegate) external view returns (address)",
      "function hasEffectiveOperatorAccess(address wallet) external view returns (bool)",
      "function effectiveOwner(address wallet) external view returns (address)",
    ],
    process.env.DELEGATION_REGISTRY_ADDRESS
  );

  const delegateAddress = process.env.DELEGATE_ADDRESS;
  const tx = await delegationRegistry.connect(signer).setDelegate(delegateAddress);
  await tx.wait();

  const delegateOf = await delegationRegistry.delegateOf(signer.address);
  const ownerOfDelegate = await delegationRegistry.ownerOfDelegate(delegateAddress);
  const delegateAccess = await delegationRegistry.hasEffectiveOperatorAccess(delegateAddress);
  const delegateOwner = await delegationRegistry.effectiveOwner(delegateAddress);

  console.log(
    JSON.stringify(
      {
        signer: signer.address,
        delegationRegistry: process.env.DELEGATION_REGISTRY_ADDRESS,
        delegateAddress,
        delegateOf,
        ownerOfDelegate,
        delegateAccess,
        delegateOwner,
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
