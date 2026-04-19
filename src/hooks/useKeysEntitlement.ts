import { useQuery } from '@tanstack/react-query';

import { keysApi } from '../services/keys-api';

export function useKeysEntitlement(address: string | null) {
  return useQuery({
    queryKey: ['keys', 'entitlement', address],
    queryFn: () => keysApi.getEntitlement(address),
    enabled: address === null || address.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}
