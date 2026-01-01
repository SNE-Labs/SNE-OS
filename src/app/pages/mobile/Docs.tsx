export function MobileDocs() {
  return (
    <div className="mobile-docs">
      <div className="mobile-docs-header">
        <h1 className="mobile-docs-title">Documentação</h1>
        <p className="mobile-docs-subtitle">Guia completo do SNE OS</p>
      </div>

      <div className="mobile-docs-content">
        <div className="mobile-docs-section">
          <h2 className="mobile-docs-section-title">Introdução</h2>
          <p className="mobile-docs-text">
            O SNE OS é uma plataforma de análise de mercado que integra dados
            on-chain e off-chain para fornecer insights avançados sobre criptoativos.
          </p>
        </div>

        <div className="mobile-docs-section">
          <h2 className="mobile-docs-section-title">Principais Recursos</h2>
          <div className="mobile-docs-features">
            <div className="mobile-docs-feature">
              <h4>SNE Radar</h4>
              <p>Análise de mercado em tempo real</p>
            </div>
            <div className="mobile-docs-feature">
              <h4>SNE Vault</h4>
              <p>Segurança física para chaves privadas</p>
            </div>
            <div className="mobile-docs-feature">
              <h4>SNE Pass</h4>
              <p>Sistema de licenças baseado em NFT</p>
            </div>
          </div>
        </div>

        <div className="mobile-docs-section">
          <h2 className="mobile-docs-section-title">API</h2>
          <p className="mobile-docs-text">
            Acesse nossa API REST completa para integrar dados SNE em sua aplicação.
          </p>
          <div className="mobile-docs-code">
            <code>GET /api/v1/market/data</code>
          </div>
        </div>

        <div className="mobile-docs-section">
          <h2 className="mobile-docs-section-title">Suporte</h2>
          <p className="mobile-docs-text">
            Entre em contato conosco para suporte técnico e dúvidas sobre a plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}

// Mobile styles
const docsStyles = `
  .mobile-docs {
    padding: 16px;
    padding-bottom: 100px;
  }

  .mobile-docs-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .mobile-docs-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-docs-subtitle {
    font-size: 16px;
    color: var(--text-3, #666);
    margin: 8px 0 0 0;
  }

  .mobile-docs-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .mobile-docs-section {
    background: var(--bg-2, #f5f5f5);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-docs-section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 12px 0;
  }

  .mobile-docs-text {
    font-size: 14px;
    color: var(--text-2, #333);
    line-height: 1.5;
    margin: 0;
  }

  .mobile-docs-features {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mobile-docs-feature {
    background: var(--bg-3, #fff);
    border-radius: 8px;
    padding: 16px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-docs-feature h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 8px 0;
  }

  .mobile-docs-feature p {
    font-size: 14px;
    color: var(--text-3, #666);
    margin: 0;
  }

  .mobile-docs-code {
    background: var(--bg-3, #fff);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--stroke-1, #e0e0e0);
    margin-top: 12px;
  }

  .mobile-docs-code code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    color: var(--text-1, #000);
  }
`;

// Styles are handled by global CSS
