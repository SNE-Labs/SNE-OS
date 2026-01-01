export function MobilePass() {
  return (
    <div className="mobile-pass">
      <div className="mobile-pass-header">
        <h1 className="mobile-pass-title">Pass</h1>
        <p className="mobile-pass-subtitle">Sistema de licenças SNE</p>
      </div>

      <div className="mobile-pass-content">
        <div className="mobile-card">
          <h3 className="mobile-card-title">Licenças On-chain</h3>
          <p className="mobile-card-text">
            Sistema de licenças baseado em NFTs na Scroll L2 para acesso aos serviços SNE.
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

// Styles are handled by global CSS
