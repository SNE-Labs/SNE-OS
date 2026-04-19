import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_STORAGE_KEY = 'sne:chunk-reload:last';
const RELOAD_WINDOW_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Failed to load module script/i,
  /Expected a JavaScript-or-Wasm module script/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Loading chunk .* failed/i,
  /Unable to preload CSS/i,
  /Lazy route export .* unavailable/i,
];

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

export function isRecoverableChunkError(error: unknown) {
  const message = errorMessage(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function reloadForChunkError(error: unknown) {
  if (!isRecoverableChunkError(error) || typeof window === 'undefined') {
    return false;
  }

  const routeKey = `${window.location.pathname}${window.location.search}`;
  const now = Date.now();

  try {
    const previous = JSON.parse(window.sessionStorage.getItem(RELOAD_STORAGE_KEY) || 'null') as
      | { routeKey?: string; at?: number }
      | null;

    if (previous?.routeKey === routeKey && typeof previous.at === 'number' && now - previous.at < RELOAD_WINDOW_MS) {
      return false;
    }

    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, JSON.stringify({ routeKey, at: now }));
  } catch {
    // Session storage may be unavailable in restricted browser contexts.
  }

  window.location.reload();
  return true;
}

export function handleVitePreloadError(event: Event) {
  const preloadEvent = event as CustomEvent<unknown> & { payload?: unknown };
  const payload = preloadEvent.detail ?? preloadEvent.payload ?? event;

  if (!isRecoverableChunkError(payload)) {
    return;
  }

  event.preventDefault();
  reloadForChunkError(payload);
}

export function lazyRoute<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await loader();
    } catch (error) {
      if (reloadForChunkError(error)) {
        return await new Promise<{ default: T }>(() => {});
      }

      throw error;
    }
  });
}

export function pickLazyExport<T extends ComponentType<any>>(
  module: Record<string, unknown> | undefined,
  exportName: string
): { default: T } {
  const candidate = module?.[exportName];

  if (!candidate) {
    throw new Error(`Lazy route export "${exportName}" unavailable`);
  }

  return { default: candidate as T };
}
