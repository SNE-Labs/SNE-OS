// Frontend Configuration
// Copy to config.ts and fill with your values

export const config = {
  // WalletConnect Project ID (get from https://cloud.walletconnect.com/)
  walletConnectProjectId: 'your_project_id_here',

  // API URLs
  apiBase: import.meta.env.PROD
    ? '/api'  // Vercel rewrite handles this
    : 'http://localhost:5000/api',  // Development

  // App Info
  appName: 'SNE Radar',
  appUrl: 'https://your-domain.com',

  // Contract Addresses
  contracts: {
    licenseRegistry: '0x...', // SNELicenseRegistry address on Scroll
  },

  // Chain IDs
  chains: {
    scroll: 534352, // Scroll mainnet
    scrollSepolia: 534351, // Scroll testnet
  }
};
