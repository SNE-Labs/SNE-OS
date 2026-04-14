// Hook para download seguro do executável
// Sistema de token one-time para evitar burlar

import { useState } from 'react';
import { getDownloadToken, downloadFile } from '../services/api';

type DownloadState = 'idle' | 'requesting' | 'downloading' | 'error';

export const useDownload = () => {
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [error, setError] = useState<string>('');

  const downloadExecutable = async (platform: 'win' | 'mac' = 'win') => {
    try {
      setDownloadState('requesting');
      setError('');

      // 1. Get one-time token from backend
      const { token } = await getDownloadToken(platform);

      // 2. Use token to download (backend validates and redirects)
      setDownloadState('downloading');
      downloadFile(token);

      // Reset state after successful download initiation
      setTimeout(() => setDownloadState('idle'), 2000);

    } catch (err) {
      setDownloadState('error');
      setError(err instanceof Error ? err.message : 'Download failed');
      setTimeout(() => setDownloadState('idle'), 3000);
    }
  };

  return {
    downloadState,
    error,
    downloadExecutable,
    isDownloading: downloadState === 'requesting' || downloadState === 'downloading'
  };
};
