export type PersistedSnapshot<T> = {
  savedAt: number;
  data: T;
};

export function readPersistedSnapshot<T>(key: string): PersistedSnapshot<T> | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as PersistedSnapshot<T>;
    if (!parsed || typeof parsed.savedAt !== 'number' || parsed.data == null) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

export function writePersistedSnapshot<T>(key: string, data: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        data,
      } satisfies PersistedSnapshot<T>)
    );
  } catch {
    // Ignore persistence failures to avoid breaking render flow.
  }
}
