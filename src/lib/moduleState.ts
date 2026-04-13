export type ModuleUiState = 'loading' | 'disconnected' | 'error' | 'empty' | 'ready';

type ResolveModuleStateInput<T> = {
  isConnected?: boolean;
  allowDisconnectedRead?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  data?: T | null;
  isEmpty?: (data: T) => boolean;
};

export function resolveModuleState<T>({
  isConnected = true,
  allowDisconnectedRead = false,
  isLoading = false,
  isError = false,
  data,
  isEmpty,
}: ResolveModuleStateInput<T>): ModuleUiState {
  if (!isConnected && !allowDisconnectedRead) return 'disconnected';
  if (isLoading && !data) return 'loading';
  if (isError && !data) return 'error';
  if (data && isEmpty?.(data)) return 'empty';
  return 'ready';
}
