const fs = require("fs");
const path = require("path");

async function main() {
  const { ethers, network, artifacts } = require("hardhat");
  const [deployer] = await ethers.getSigners();

  const requiredEnv = [
    "TREASURY_ADDRESS",
    "OPERATOR_KEY_URI",
    "OPERATOR_PRICE",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const ownerAddress = process.env.OWNER_ADDRESS || deployer.address;
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  const operatorKeyUri = process.env.OPERATOR_KEY_URI;
  const operatorPrice = BigInt(process.env.OPERATOR_PRICE);

  const mockUsdtFactory = await ethers.getContractFactory("MockUSDT");
  const mockUsdt = await mockUsdtFactory.deploy();
  await mockUsdt.waitForDeployment();

  const operatorKeyFactory = await ethers.getContractFactory("OperatorKey");
  const operatorKey = await operatorKeyFactory.deploy(operatorKeyUri, deployer.address);
  await operatorKey.waitForDeployment();

  const keySaleFactory = await ethers.getContractFactory("KeySale");
  const keySale = await keySaleFactory.deploy(
    await mockUsdt.getAddress(),
    await operatorKey.getAddress(),
    treasuryAddress,
    operatorPrice,
    deployer.address
  );
  await keySale.waitForDeployment();

  const delegationRegistryFactory = await ethers.getContractFactory("DelegationRegistry");
  const delegationRegistry = await delegationRegistryFactory.deploy(await operatorKey.getAddress());
  await delegationRegistry.waitForDeployment();

  const saleControllerTx = await operatorKey.setSaleController(await keySale.getAddress());
  await saleControllerTx.wait();

  if (ownerAddress.toLowerCase() !== deployer.address.toLowerCase()) {
    const transferOperatorOwnershipTx = await operatorKey.transferOwnership(ownerAddress);
    await transferOperatorOwnershipTx.wait();

    const transferSaleOwnershipTx = await keySale.transferOwnership(ownerAddress);
    await transferSaleOwnershipTx.wait();
  }

  const mockUsdtArtifact = await artifacts.readArtifact("MockUSDT");
  const operatorKeyArtifact = await artifacts.readArtifact("OperatorKey");
  const keySaleArtifact = await artifacts.readArtifact("KeySale");
  const delegationRegistryArtifact = await artifacts.readArtifact("DelegationRegistry");

  const deployment = {
    network: network.name,
    variant: "mock-usdt",
    deployer: deployer.address,
    mockUsdt: await mockUsdt.getAddress(),
    operatorKey: await operatorKey.getAddress(),
    keySale: await keySale.getAddress(),
    delegationRegistry: await delegationRegistry.getAddress(),
    usdt: await mockUsdt.getAddress(),
    treasury: treasuryAddress,
    owner: ownerAddress,
    operatorPrice: operatorPrice.toString(),
    operatorKeyUri,
    abis: {
      mockUsdt: mockUsdtArtifact.abi,
      operatorKey: operatorKeyArtifact.abi,
      keySale: keySaleArtifact.abi,
      delegationRegistry: delegationRegistryArtifact.abi,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.mock.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
