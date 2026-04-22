import { useQuery } from '@tanstack/react-query';
import { keysApi } from '../services/keys-api';

export function useKeysOverview(address: string | null) {
  return useQuery({
    queryKey: ['keys', 'overview', address],
    queryFn: () => keysApi.getOverview(address),
    enabled: address === null || address.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useOperatorCockpit(address: string | null) {
  return useQuery({
    queryKey: ['keys', 'operator-cockpit', address],
    queryFn: () => keysApi.getOperatorCockpit(address),
    enabled: address === null || address.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}
