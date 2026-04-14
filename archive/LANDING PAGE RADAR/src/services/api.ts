// API client para conectar com api.snelabs.space
// Mantém a UI intacta, mas conecta com backend real

const API_BASE = '/api'; // Rewrite no vercel.json redireciona para api.snelabs.space

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LicenseInfo {
  tokenId: string;
  plan: '30D' | '365D';
  expiryTimestamp: number;
  isLifetime: boolean;
  activationCode?: string;
}

export interface DownloadToken {
  token: string;
  expiresAt: number;
}

// SIWE Authentication
export const getAuthNonce = async (address: string): Promise<string> => {
  const response = await fetch(`${API_BASE}/auth/nonce?address=${address}`);
  if (!response.ok) throw new Error('Failed to get nonce');
  const data = await response.json();
  return data.nonce;
};

export const verifyAuthSignature = async (message: string, signature: string): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Importante para cookies HttpOnly
    body: JSON.stringify({ message, signature })
  });
  return response.json();
};

// License Management
export const getUserLicenses = async (): Promise<LicenseInfo[]> => {
  const response = await fetch(`${API_BASE}/licenses/me`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to get licenses');
  const data = await response.json();
  return data.licenses || [];
};

// Download System (Token-based)
export const getDownloadToken = async (platform: 'win' | 'mac' = 'win'): Promise<DownloadToken> => {
  const response = await fetch(`${API_BASE}/download-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ platform })
  });

  if (!response.ok) {
    throw new Error('Download not authorized or rate limited');
  }

  return response.json();
};

export const downloadFile = (token: string) => {
  // Abre o download via API (que faz redirect para storage assinado)
  window.open(`${API_BASE}/download/${token}`, '_blank');
};

// Admin Panel (só para wallets autorizadas)
export const getAdminStats = async () => {
  const response = await fetch(`${API_BASE}/admin/licenses`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Admin access denied');
  return response.json();
};

export const revokeLicense = async (tokenId: string) => {
  const response = await fetch(`${API_BASE}/admin/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tokenId })
  });
  return response.json();
};
