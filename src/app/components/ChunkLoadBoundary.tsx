import { Component, type ErrorInfo, type ReactNode } from 'react';

import { isRecoverableChunkError, reloadForChunkError } from '../utils/lazyRoute';

type ChunkLoadBoundaryProps = {
  children: ReactNode;
};

type ChunkLoadBoundaryState = {
  failed: boolean;
};

export class ChunkLoadBoundary extends Component<ChunkLoadBoundaryProps, ChunkLoadBoundaryState> {
  state: ChunkLoadBoundaryState = {
    failed: false,
  };

  static getDerivedStateFromError(error: unknown) {
    if (isRecoverableChunkError(error)) {
      return { failed: true };
    }

    return null;
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    if (reloadForChunkError(error)) {
      return;
    }

    console.error('Falha ao carregar módulo da aplicação.', error, errorInfo);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <div
          className="max-w-md rounded-[28px] border p-6 text-center"
          style={{
            backgroundColor: 'var(--bg-2)',
            borderColor: 'var(--stroke-1)',
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            Atualização necessária
          </div>
          <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            Uma nova versão do SNE OS foi publicada e este módulo precisa recarregar os assets atuais.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-full px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-orange)', color: '#080a10' }}
          >
            Recarregar interface
          </button>
        </div>
      </div>
    );
  }
}
