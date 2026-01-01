export function MobileVault() {
  return (
    <div className="mobile-vault">
      <div className="mobile-vault-header">
        <h1 className="mobile-vault-title">Vault</h1>
        <p className="mobile-vault-subtitle">Soberania física em desenvolvimento</p>
        <div className="mobile-coming-soon">
          <span>🚧 Em desenvolvimento</span>
        </div>
      </div>

      <div className="mobile-vault-content">
        <div className="mobile-card">
          <h3 className="mobile-card-title">Em Desenvolvimento</h3>
          <p className="mobile-card-text">
            O SNE Vault está sendo desenvolvido para fornecer soberania física
            completa para suas chaves e dados.
          </p>
        </div>

        <div className="mobile-features">
          <div className="mobile-feature">
            <div className="mobile-feature-icon">🔐</div>
            <h4>Hardware Seguro</h4>
            <p>TPM/TEE para proteção máxima</p>
          </div>
          <div className="mobile-feature">
            <div className="mobile-feature-icon">⚡</div>
            <h4>Proof of Uptime</h4>
            <p>Verificação contínua de integridade</p>
          </div>
          <div className="mobile-feature">
            <div className="mobile-feature-icon">🛡️</div>
            <h4>Zero Trust</h4>
            <p>Arquitetura zero-knowledge</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile styles
const vaultStyles = `
  .mobile-vault {
    padding: 16px;
    padding-bottom: 100px;
  }

  .mobile-vault-header {
    margin-bottom: 24px;
  }

  .mobile-vault-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-vault-subtitle {
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
    grid-template-columns: 1fr;
    gap: 16px;
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
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 4px 0;
  }

  .mobile-feature p {
    font-size: 14px;
    color: var(--text-3, #666);
    margin: 0;
  }

  .mobile-wallet-status {
    margin-top: 12px;
  }

  .mobile-wallet-balance {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-2, #f5f5f5);
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-balance-label {
    font-size: 14px;
    color: var(--text-2, #333);
    font-weight: 500;
  }

  .mobile-balance-value {
    font-size: 14px;
    color: var(--text-1, #000);
    font-weight: 600;
    font-family: 'Monaco', 'Menlo', monospace;
  }
`;

// Styles are handled by global CSS
