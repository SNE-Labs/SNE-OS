require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

function buildNetworkConfig(envKey, chainId) {
  const url = process.env[envKey];
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!url || !privateKey) {
    return undefined;
  }

  return {
    url,
    chainId,
    accounts: [privateKey],
  };
}

const optionalNetworks = {};
for (const [key, envKey, chainId] of [
  ["ethereum", "ETHEREUM_RPC_URL", 1],
  ["arbitrum-sepolia", "ARBITRUM_SEPOLIA_RPC_URL", 421614],
  ["arbitrum", "ARBITRUM_RPC_URL", 42161],
  ["optimism", "OPTIMISM_RPC_URL", 10],
  ["polygon", "POLYGON_RPC_URL", 137],
  ["base", "BASE_RPC_URL", 8453],
  ["scroll", "SCROLL_RPC_URL", 534352],
]) {
  const config = buildNetworkConfig(envKey, chainId);
  if (config) {
    optionalNetworks[key] = config;
  }
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    ...optionalNetworks,
  },
};
