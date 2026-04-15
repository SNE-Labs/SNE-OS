import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readPersistedSnapshot, writePersistedSnapshot } from '../lib/querySnapshot';
import {
  lookupAddress,
  getBalance,
  getGasPrice,
  checkLicense,
  getPassportOverview,
  getPassportIdentity,
  getPassportProfile,
  updatePassportProfile,
  initPassportWalletLink,
  confirmPassportWalletLink,
} from '../services/passport-api';
import { useAccount, useBalance as useWagmiBalance } from 'wagmi';
import type { Address, PassportProfileInput } from '../types/passport';

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

export function usePassportOverview(address: string | null) {
  const snapshotKey = `sne:query:passport:overview:${address ?? 'anonymous'}`;
  const persistedSnapshot = readPersistedSnapshot(snapshotKey);

  return useQuery({
    queryKey: ['passport', 'overview', address],
    queryFn: async () => {
      const payload = await getPassportOverview(address);
      writePersistedSnapshot(snapshotKey, payload);
      return payload;
    },
    enabled: address === null || address.length > 0,
    initialData: persistedSnapshot?.data,
    initialDataUpdatedAt: persistedSnapshot?.savedAt,
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function usePassportIdentity(enabled = true) {
  const snapshotKey = 'sne:query:passport:identity';
  const persistedSnapshot = readPersistedSnapshot(snapshotKey);

  return useQuery({
    queryKey: ['passport', 'identity'],
    queryFn: async () => {
      const payload = await getPassportIdentity();
      writePersistedSnapshot(snapshotKey, payload);
      return payload;
    },
    enabled,
    initialData: persistedSnapshot?.data,
    initialDataUpdatedAt: persistedSnapshot?.savedAt,
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function usePassportPublicProfile(identityId: string | null) {
  const snapshotKey = `sne:query:passport:profile:${identityId ?? 'anonymous'}`;
  const persistedSnapshot = readPersistedSnapshot(snapshotKey);

  return useQuery({
    queryKey: ['passport', 'profile', identityId],
    queryFn: async () => {
      const payload = await getPassportProfile(identityId!);
      writePersistedSnapshot(snapshotKey, payload);
      return payload;
    },
    enabled: Boolean(identityId && identityId.length > 0),
    initialData: persistedSnapshot?.data,
    initialDataUpdatedAt: persistedSnapshot?.savedAt,
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useInitPassportWalletLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidateAddress: string) => initPassportWalletLink(candidateAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passport', 'identity'] });
    },
  });
}

export function useUpdatePassportProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PassportProfileInput) => updatePassportProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passport', 'identity'] });
      queryClient.invalidateQueries({ queryKey: ['passport', 'overview'] });
    },
  });
}

export function useConfirmPassportWalletLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      currentWalletSignature,
      candidateWalletSignature,
    }: {
      requestId: string;
      currentWalletSignature: string;
      candidateWalletSignature: string;
    }) => confirmPassportWalletLink(requestId, currentWalletSignature, candidateWalletSignature),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passport', 'identity'] });
      queryClient.invalidateQueries({ queryKey: ['passport', 'overview'] });
    },
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
