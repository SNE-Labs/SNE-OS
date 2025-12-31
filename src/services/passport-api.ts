import type { Address } from '../types/passport';
import type { LookupResult, BalanceResponse, GasResponse, ProductsResponse, ErrorResponse } from '../types/passport';

/**
 * Cliente para API do SNE Scroll Passport
 * Segue o contract definido em API_CONTRACT.md
 */

const API_BASE =
  (import.meta.env?.VITE_PASSPORT_API_URL as string | undefined) ?? 'https://pass.snelabs.space/api';

/**
 * Retry strategy: 3 tentativas com exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Não retryar em erros client-side
      if (response.status === 400 || response.status === 401 ||
          response.status === 403 || response.status === 404) {
        return response;
      }

      // Retryar em erros server-side e rate limits
      if (response.ok || (response.status >= 500 && response.status < 600)) {
        return response;
      }

      // Rate limit - respeitar Retry-After
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Busca dados de um endereço (licenças, keys, boxes)
 */
export async function lookupAddress(address: string): Promise<LookupResult> {
  const url = `${API_BASE}/sne/lookup?addr=${encodeURIComponent(address)}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || error.error);
  }

  return await response.json();
}

/**
 * Verifica acesso de uma licença específica
 */
export async function checkLicense(nodeId: string): Promise<{ access: boolean; status: string }> {
  const url = `${API_BASE}/sne/check?node=${encodeURIComponent(nodeId)}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || error.error);
  }

  return await response.json();
}

/**
 * Busca balance de um endereço
 */
export async function getBalance(address: Address): Promise<BalanceResponse> {
  const url = `${API_BASE}/balance?addr=${encodeURIComponent(address)}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || error.error);
  }

  return await response.json();
}

/**
 * Busca preço atual de gas
 */
export async function getGasPrice(): Promise<GasResponse> {
  const url = `${API_BASE}/gas`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || error.error);
  }

  return await response.json();
}

/**
 * Busca produtos disponíveis
 */
export async function getProducts(): Promise<ProductsResponse> {
  const url = `${API_BASE}/sne/products`;

  try {
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      // Tentar parsear erro, mas não falhar se não conseguir
      try {
        const error: ErrorResponse = await response.json();
        throw new Error(error.message || error.error || `HTTP ${response.status}`);
      } catch (parseError) {
        throw new Error(`Erro ao buscar produtos: HTTP ${response.status}`);
      }
    }

    const data = await response.json();

    // Validar estrutura básica
    if (!data || !Array.isArray(data.products)) {
      throw new Error('Resposta da API em formato inválido');
    }

    return data;
  } catch (error) {
    // Log do erro para debugging (apenas em dev)
    if (import.meta.env.DEV) {
      console.error('[Passport API] Erro ao buscar produtos:', error);
    }

    // Re-throw para que o hook possa tratar
    throw error;
  }
}
