/**
 * Utilitários para formatação de valores
 */

/**
 * Formata um número grande (ex: 1000000 -> "1M")
 */
export function formatLargeNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(4);
}

/**
 * Formata um valor de token com decimais apropriados
 */
export function formatTokenValue(value: string | number, decimals: number = 18, maxDecimals: number = 4): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  const divisor = Math.pow(10, decimals);
  const formatted = num / divisor;

  // Se for muito pequeno, mostrar mais decimais
  if (formatted < 0.0001) {
    return formatted.toFixed(6);
  }

  // Se for menor que 1, mostrar 4 decimais
  if (formatted < 1) {
    return formatted.toFixed(maxDecimals);
  }

  // Se for maior que 1, mostrar 2 decimais
  return formatted.toFixed(2);
}

/**
 * Formata um endereço Ethereum (ex: 0x1234...5678)
 */
export function formatAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!address || address.length < startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Verifica se um token é spam baseado em heurísticas
 */
export function isSpamToken(token: {
  balance: string;
  formatted: string;
  transfers?: number;
}): boolean {
  const balance = parseFloat(token.formatted);

  // Heurística: balance muito baixo E poucos transfers
  if (balance < 0.01 && (token.transfers === undefined || token.transfers < 3)) {
    return true;
  }

  return false;
}
