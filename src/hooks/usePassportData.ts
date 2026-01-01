import { useQuery } from '@tanstack/react-query';
import { lookupAddress, getBalance, getGasPrice, getProducts, checkLicense } from '../services/passport-api';
import { useAccount, useBalance as useWagmiBalance } from 'wagmi';
import type { Address } from '../types/passport';

/**
 * Hooks para buscar dados do Passport API usando TanStack Query
 * Cache automático com TTLs configurados
 */

/**
 * Busca dados de um endereço (licenças, keys, boxes)
 * TTL: 5 minutos
 */
export function useLookupAddress(address: string | null) {
  return useQuery({
    queryKey: ['lookup', address],
    queryFn: () => lookupAddress(address!),
    enabled: !!address && address.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antigo cacheTime)
  });
}

/**
 * Busca balance de um endereço
 * TTL: 5 minutos
 */
export function useBalance(address: Address | null) {
  return useQuery({
    queryKey: ['balance', address],
    queryFn: () => getBalance(address!),
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Busca balance da wallet conectada usando Wagmi diretamente
 * (mais eficiente que API para wallet própria)
 */
export function useConnectedBalance() {
  const { address } = useAccount();
  const { data: balance, isLoading, error } = useWagmiBalance({
    address: address || undefined,
  });

  return {
    data: balance ? {
      address: address!,
      eth: {
        value: balance.value.toString(),
        formatted: `${Number(balance.formatted).toFixed(4)} ${balance.symbol}`,
      },
      tokens: [],
      metadata: {
        cached: false,
        source: 'wagmi',
      },
    } : null,
    isLoading,
    error,
  };
}

/**
 * Busca preço de gas
 * TTL: 30 segundos (muito volátil)
 */
export function useGasPrice() {
  return useQuery({
    queryKey: ['gasPrice'],
    queryFn: () => getGasPrice(),
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 30 * 1000, // Refetch a cada 30s
  });
}

/**
 * Busca produtos disponíveis
 * TTL: 30 minutos (dados menos voláteis)
 */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    retry: 2, // Retry 2 vezes (total 3 tentativas)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    // Não refetch automático em caso de erro persistente
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Refetch quando conexão restabelecida
  });
}

/**
 * Verifica acesso de uma licença
 * TTL: 1 minuto
 */
export function useCheckLicense(nodeId: string | null) {
  return useQuery({
    queryKey: ['checkLicense', nodeId],
    queryFn: () => checkLicense(nodeId!),
    enabled: !!nodeId,
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000,
  });
}


