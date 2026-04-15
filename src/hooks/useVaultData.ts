import { useQuery } from '@tanstack/react-query';
import { readPersistedSnapshot, writePersistedSnapshot } from '../lib/querySnapshot';
import { vaultApi } from '../services/vault-api';

export function getVaultSnapshotKey(address: string | null) {
  return `sne:query:vault:v2:${address ?? 'anonymous'}`;
}

export function useVaultOverview(address: string | null) {
  const snapshotKey = getVaultSnapshotKey(address);
  const persistedSnapshot = readPersistedSnapshot(snapshotKey);
  const hydratedSnapshot = persistedSnapshot?.data ? vaultApi.hydrateOverview(persistedSnapshot.data) : undefined;

  return useQuery({
    queryKey: ['vault', 'overview', address],
    queryFn: async () => {
      const payload = await vaultApi.getOverview(address);
      writePersistedSnapshot(snapshotKey, payload);
      return payload;
    },
    enabled: address == null || address.length > 0,
    initialData: hydratedSnapshot,
    initialDataUpdatedAt: persistedSnapshot?.savedAt,
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
