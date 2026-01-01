import { useAccount } from 'wagmi';

export function MobilePass() {
  const { address, isConnected } = useAccount();

  return (
    <div className="mobile-pass">
      <div className="mobile-pass-header">
        <h1 className="mobile-pass-title">Pass</h1>
        <p className="mobile-pass-subtitle">Sistema de licenças SNE</p>
        {isConnected && address && (
          <div className="mobile-wallet-status">
            <div className="mobile-wallet-connected">
              <span className="mobile-wallet-dot">🟢</span>
              <span className="mobile-wallet-address">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-pass-content">
        <div className="mobile-card">
          <h3 className="mobile-card-title">Licenças On-chain</h3>
          <p className="mobile-card-text">
            Sistema de licenças baseado em NFTs na Scroll L2 para acesso aos serviços SNE.
            {isConnected ? ' Conectado e pronto para uso.' : ' Conecte sua wallet para acessar.'}
          </p>
        </div>

        <div className="mobile-features">
          <div className="mobile-feature">
            <div className="mobile-feature-icon">🔑</div>
            <h4>Licenças NFT</h4>
            <p>ERC-721 na blockchain</p>
          </div>
          <div className="mobile-feature">
            <div className="mobile-feature-icon">🔒</div>
            <h4>Revogação</h4>
            <p>Controle total de acesso</p>
          </div>
          <div className="mobile-feature">
            <div className="mobile-feature-icon">🔄</div>
            <h4>Rotation</h4>
            <p>Chaves transitórias</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile styles
const passStyles = `
  .mobile-pass {
    padding: 16px;
    padding-bottom: 100px;
  }

  .mobile-pass-header {
    margin-bottom: 24px;
  }

  .mobile-pass-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-pass-subtitle {
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

  .mobile-wallet-connected {
    display: flex;
    align-items: center;
    background: var(--ok-green, #10b981);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
  }

  .mobile-wallet-dot {
    margin-right: 8px;
  }

  .mobile-wallet-address {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = passStyles;
  document.head.appendChild(styleSheet);
}
