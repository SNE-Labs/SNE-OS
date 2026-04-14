import { useQuery } from '@tanstack/react-query';
import { readPersistedSnapshot, writePersistedSnapshot } from '../lib/querySnapshot';
import { vaultApi } from '../services/vault-api';

export function useVaultOverview(address: string | null) {
  const snapshotKey = `sne:query:vault:${address ?? 'anonymous'}`;
  const persistedSnapshot = readPersistedSnapshot(snapshotKey);

  return useQuery({
    queryKey: ['vault', 'overview', address],
    queryFn: async () => {
      const payload = await vaultApi.getOverview(address);
      writePersistedSnapshot(snapshotKey, payload);
      return payload;
    },
    enabled: address == null || address.length > 0,
    initialData: persistedSnapshot?.data,
    initialDataUpdatedAt: persistedSnapshot?.savedAt,
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
