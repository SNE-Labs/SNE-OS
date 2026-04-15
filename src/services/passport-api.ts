import type { Address } from '../types/passport';
import type {
  LookupResult,
  BalanceResponse,
  GasResponse,
  PassportOverviewIdentity,
  PassportIdentityCheckpoint,
  PassportLinkInitResponse,
  PassportProfileInput,
} from '../types/passport';
import { apiGet, apiPost, apiPut } from '@/lib/api/http';

/**
 * Cliente para API do SNE Scroll Passport
 * Segue o contract definido em API_CONTRACT.md
 */

// Direct RPC calls to Scroll network (no backend API needed)
const SCROLL_RPC_URL = 'https://sepolia-rpc.scroll.io';

/**
 * RPC call to Scroll network
 */
async function rpcCall(method: string, params: any[] = []): Promise<any> {
  const response = await fetch(SCROLL_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

/**
 * Busca dados de um endereço (licenças, keys, boxes)
 */
export async function lookupAddress(address: string): Promise<LookupResult> {
  try {
    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Get basic on-chain data
    const balanceHex = await rpcCall('eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(balanceHex);
    const balanceEth = Number(balanceWei) / 1e18;

    const txCountHex = await rpcCall('eth_getTransactionCount', [address, 'latest']);
    const txCount = parseInt(txCountHex, 16);
    const code = await rpcCall('eth_getCode', [address, 'latest']);

    const hasCode = code !== '0x';
    const hasActivity = txCount > 0 || balanceWei > 0n;

    // For now, return empty arrays since we don't have real SNE contracts deployed
    // This represents the actual state: no SNE licenses/keys/boxes exist yet
    const licenses = [];
    const keys = [];
    const boxes = [];

    const assertions = [
      {
        id: 'wallet-address',
        label: 'Address resolved',
        status: 'present' as const,
        source: 'rpc' as const,
        value: address,
      },
      {
        id: 'onchain-activity',
        label: 'On-chain activity',
        status: hasActivity ? ('present' as const) : ('missing' as const),
        source: 'derived' as const,
        value: `${txCount} tx`,
      },
      {
        id: 'account-type',
        label: 'Account type',
        status: 'present' as const,
        source: 'rpc' as const,
        value: hasCode ? 'contract' : 'wallet',
      },
      {
        id: 'sne-licenses',
        label: 'SNE identity assertions',
        status: licenses.length > 0 ? ('present' as const) : ('missing' as const),
        source: 'on-chain' as const,
        value: `${licenses.length}`,
      },
    ];

    // Future: Check specific SNE contract addresses for real licenses
    // const sneLicenseContract = '0x...'; // SNE License NFT contract
    // const sneKeyContract = '0x...'; // SNE Key contract
    // const sneBoxContract = '0x...'; // SNE Box contract

    return {
      licenses,
      keys,
      boxes,
      identity: {
        address: address as Address,
        accountType: hasCode ? 'contract' : 'wallet',
        txCount,
        balanceEth: balanceEth.toFixed(6),
        checkedAt: new Date().toISOString(),
        hasActivity,
        hasCode,
      },
      assertions,
      pou: {
        nodesPublic: 0 // No real POU system yet
      },
      metadata: {
        cached: false,
        source: 'rpc',
      }
    };

  } catch (error) {
    console.error('Lookup error:', error);
    throw new Error(`Failed to lookup address: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verifica acesso de uma licença específica
 */
export async function checkLicense(nodeId: string): Promise<{ access: boolean; status: string }> {
  try {
    // Validate nodeId format
    if (!nodeId.match(/^0x[a-fA-F0-9]{1,40}$/)) {
      throw new Error('Invalid node ID format');
    }

    // Check if address has code (is contract) or balance
    const code = await rpcCall('eth_getCode', [nodeId, 'latest']);
    const balanceHex = await rpcCall('eth_getBalance', [nodeId, 'latest']);
    const balanceWei = BigInt(balanceHex);

    // Consider active if has code or balance > 0
    const hasActivity = code !== '0x' || balanceWei > 0n;
    const status = hasActivity ? 'active' : 'revoked';

    return {
      access: hasActivity,
      status: status
    };

  } catch (error) {
    console.error('License check error:', error);
    throw new Error(`Failed to check license: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Busca balance de um endereço
 */
export async function getBalance(address: Address): Promise<BalanceResponse> {
  try {
    // Get ETH balance
    const balanceHex = await rpcCall('eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(balanceHex);
    const balanceEth = Number(balanceWei) / 1e18;

    // For now, only return ETH balance (ERC-20 tokens would require contract calls)
    return {
      address: address,
      eth: {
        value: balanceWei.toString(),
        formatted: `${balanceEth.toFixed(6)} ETH`,
      },
      tokens: [], // Would need to scan for ERC-20 transfers
      metadata: {
        cached: false,
        source: 'scroll-rpc',
      },
    };

  } catch (error) {
    console.error('Balance check error:', error);
    throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Busca preço atual de gas
 */
export async function getGasPrice(): Promise<GasResponse> {
  try {
    // Get current gas price from Scroll RPC
    const gasPriceHex = await rpcCall('eth_gasPrice', []);
    const gasPriceWei = BigInt(gasPriceHex);
    const gasPriceGwei = Number(gasPriceWei) / 1e9;

    return {
      gasPrice: gasPriceWei.toString(),
      gasPriceFormatted: `${gasPriceGwei.toFixed(2)} Gwei`,
      estimatedFee: '0.001', // Would need more complex calculation
      lastUpdated: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Gas price error:', error);
    // Fallback values
    return {
      gasPrice: '20000000000', // 20 gwei in wei
      gasPriceFormatted: '20.00 Gwei',
      estimatedFee: '0.001',
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function getPassportOverview(address?: string | null): Promise<{
  connected: boolean;
  status: { label: string; tone: 'active' | 'success' | 'warning' | 'pending' };
  profile: LookupResult | null;
  linked_accounts?: Array<{
    network: { key?: string; label?: string; family?: string } | string;
    address: string;
    primary?: boolean;
    status?: string;
    account_type?: string;
  }>;
  network_scope?: Array<{
    network: { key?: string; label?: string; family?: string } | string;
    link_strategy?: string;
    enabled?: boolean;
  }>;
  surface: {
    address: string | null;
    capital: string;
    gas: string;
  };
  inventory: Array<{ label: string; value: string }>;
}> {
  const query = address ? `?address=${encodeURIComponent(address)}` : '';
  return apiGet(`/api/passport/overview${query}`);
}

export async function getPassportIdentity(): Promise<PassportIdentityCheckpoint> {
  return apiGet('/api/passport/me');
}

export async function getPassportProfile(identityId: string): Promise<PassportOverviewIdentity> {
  return apiGet(`/api/passport/profile/${encodeURIComponent(identityId)}`);
}

export async function updatePassportProfile(payload: PassportProfileInput): Promise<PassportIdentityCheckpoint> {
  return apiPut('/api/passport/profile', payload);
}

export async function initPassportWalletLink(candidateAddress: string): Promise<PassportLinkInitResponse> {
  return apiPost('/api/passport/link/init', { candidateAddress });
}

export async function confirmPassportWalletLink(
  requestId: string,
  currentWalletSignature: string,
  candidateWalletSignature: string
): Promise<PassportIdentityCheckpoint> {
  return apiPost('/api/passport/link/confirm', {
    requestId,
    currentWalletSignature,
    candidateWalletSignature,
  });
}
