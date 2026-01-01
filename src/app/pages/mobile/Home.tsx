export function MobileHome() {
  return (
    <div className="mobile-home">
      <div className="mobile-home-header">
        <h1 className="mobile-home-title">SNE OS</h1>
        <p className="mobile-home-subtitle">Plataforma de análise de mercado</p>
      </div>

      <div className="mobile-home-content">
        <div className="mobile-card">
          <h3 className="mobile-card-title">Bem-vindo ao SNE OS</h3>
          <p className="mobile-card-text">
            Plataforma completa para análise de mercado com integração ao ecossistema SNE.
          </p>
        </div>

        <div className="mobile-features">
          <div className="mobile-feature">
            <div className="mobile-feature-icon">📊</div>
            <h4>Análise de Mercado</h4>
            <p>Dados em tempo real</p>
          </div>
          <div className="mobile-feature">
            <div className="mobile-feature-icon">🔐</div>
            <h4>SNE Vault</h4>
            <p>Segurança física</p>
          </div>
          <div className="mobile-feature">
            <div className="mobile-feature-icon">⚡</div>
            <h4>SNE Pass</h4>
            <p>Licenças on-chain</p>
          </div>
          <div className="mobile-feature">
            <div className="mobile-feature-icon">📈</div>
            <h4>Trading</h4>
            <p>Sinais avançados</p>
          </div>
        </div>

        <div className="mobile-cta">
          <p className="mobile-cta-text">
            Navegue pelas abas abaixo para explorar todas as funcionalidades.
          </p>
        </div>
      </div>
    </div>
  );
}

// Mobile styles
const homeStyles = `
  .mobile-home {
    padding: 16px;
    padding-bottom: 100px;
  }

  .mobile-home-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .mobile-home-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-home-subtitle {
    font-size: 16px;
    color: var(--text-3, #666);
    margin: 8px 0 0 0;
  }

  .mobile-card {
    background: var(--bg-2, #f5f5f5);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 12px 0;
  }

  .mobile-card-text {
    font-size: 14px;
    color: var(--text-2, #333);
    line-height: 1.5;
    margin: 0;
  }

  .mobile-features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }

  .mobile-feature {
    background: var(--bg-2, #f5f5f5);
    border-radius: 8px;
    padding: 16px;
    border: 1px solid var(--stroke-1, #e0e0e0);
    text-align: center;
  }

  .mobile-feature-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .mobile-feature h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 4px 0;
  }

  .mobile-feature p {
    font-size: 12px;
    color: var(--text-3, #666);
    margin: 0;
  }

  .mobile-cta {
    text-align: center;
  }

  .mobile-cta-text {
    font-size: 14px;
    color: var(--text-3, #666);
    margin: 0;
  }
`;

// Styles are handled by global CSS
