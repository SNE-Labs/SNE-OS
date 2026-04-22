import { useQuery } from '@tanstack/react-query';

import { readPersistedSnapshot, writePersistedSnapshot } from '@/lib/querySnapshot';
import { intelApi, type IntelPostsResponse } from '@/services/intel-api';

const INTEL_POSTS_SNAPSHOT_KEY = 'sne:query:intel-posts:index';

export function useIntelPosts(limit = 48) {
  const snapshotKey = `${INTEL_POSTS_SNAPSHOT_KEY}:${limit}`;
  const persistedSnapshot = readPersistedSnapshot<IntelPostsResponse>(snapshotKey);

  return useQuery({
    queryKey: ['intel-posts', 'index', limit],
    queryFn: async () => {
      const payload = await intelApi.getPosts({ limit });
      writePersistedSnapshot(snapshotKey, payload);
      return payload;
    },
    initialData: persistedSnapshot?.data,
    initialDataUpdatedAt: persistedSnapshot?.savedAt,
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const payload = query.state.data;
      if (payload?.refreshing || payload?.stale || !payload?.items?.length) {
        return 5 * 1000;
      }
      return 60 * 1000;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
