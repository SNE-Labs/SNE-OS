import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { secretsApi, type CreateSecretPayload } from '../services/secrets-api';

export function useSecretsOverview(address: string | null) {
  return useQuery({
    queryKey: ['secrets', 'overview', address],
    queryFn: () => secretsApi.getOverview(address),
    enabled: address === null || address.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useSecretItems(enabled: boolean, vaultId?: string | null) {
  return useQuery({
    queryKey: ['secrets', 'items', vaultId ?? 'all'],
    queryFn: () => secretsApi.getItems(vaultId),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useDeleteSecretItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => secretsApi.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] });
    },
  });
}

export function useCreateSecretItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSecretPayload) => secretsApi.createItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] });
    },
  });
}
