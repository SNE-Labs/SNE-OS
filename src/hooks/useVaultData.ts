import { useQuery } from '@tanstack/react-query';
import { vaultApi } from '../services/vault-api';

export function useVaultOverview(address: string | null) {
  return useQuery({
    queryKey: ['vault', 'overview', address],
    queryFn: () => vaultApi.getOverview(address),
    enabled: address === null || address.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}
