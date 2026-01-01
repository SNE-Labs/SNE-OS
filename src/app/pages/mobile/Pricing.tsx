// Versão mobile simplificada do Pricing
export function MobilePricing() {
  return (
    <div className="mobile-pricing">
      <div className="mobile-pricing-header">
        <h1 className="mobile-pricing-title">Planos</h1>
        <p className="mobile-pricing-subtitle">Acesso ao SNE OS</p>
      </div>

      <div className="mobile-pricing-content">
        <div className="mobile-pricing-card">
          <div className="mobile-pricing-card-header">
            <h3 className="mobile-pricing-card-title">Free</h3>
            <span className="mobile-pricing-card-price">$0</span>
          </div>
          <ul className="mobile-pricing-features">
            <li>Dados básicos</li>
            <li>Interface web</li>
            <li>Suporte documentação</li>
          </ul>
          <button className="mobile-pricing-button">Começar</button>
        </div>

        <div className="mobile-pricing-card mobile-pricing-card-pro">
          <div className="mobile-pricing-card-header">
            <h3 className="mobile-pricing-card-title">Pro</h3>
            <span className="mobile-pricing-card-price">$29/mês</span>
          </div>
          <ul className="mobile-pricing-features">
            <li>API completa</li>
            <li>Analytics avançados</li>
            <li>Integração SNE Vault</li>
            <li>Suporte prioritário</li>
          </ul>
          <button className="mobile-pricing-button mobile-pricing-button-pro">Selecionar Pro</button>
        </div>

        <div className="mobile-pricing-card">
          <div className="mobile-pricing-card-header">
            <h3 className="mobile-pricing-card-title">Enterprise</h3>
            <span className="mobile-pricing-card-price">Custom</span>
          </div>
          <ul className="mobile-pricing-features">
            <li>Soluções personalizadas</li>
            <li>Nós dedicados</li>
            <li>SLAs customizados</li>
            <li>Suporte dedicado</li>
          </ul>
          <button className="mobile-pricing-button">Contato</button>
        </div>
      </div>
    </div>
  );
}

// Mobile styles
const pricingStyles = `
  .mobile-pricing {
    padding: 16px;
    padding-bottom: 100px;
  }

  .mobile-pricing-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .mobile-pricing-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-pricing-subtitle {
    font-size: 16px;
    color: var(--text-3, #666);
    margin: 8px 0 0 0;
  }

  .mobile-pricing-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mobile-pricing-card {
    background: var(--bg-2, #f5f5f5);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-pricing-card-pro {
    border-color: var(--accent-orange, #ff6b35);
    border-width: 2px;
  }

  .mobile-pricing-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .mobile-pricing-card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-pricing-card-price {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
  }

  .mobile-pricing-features {
    list-style: none;
    padding: 0;
    margin: 0 0 20px 0;
  }

  .mobile-pricing-features li {
    font-size: 14px;
    color: var(--text-2, #333);
    margin-bottom: 8px;
    padding-left: 16px;
    position: relative;
  }

  .mobile-pricing-features li:before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--ok-green, #10b981);
    font-weight: 600;
  }

  .mobile-pricing-button {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--stroke-1, #e0e0e0);
    background: var(--bg-3, #fff);
    color: var(--text-1, #000);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .mobile-pricing-button-pro {
    background: var(--accent-orange, #ff6b35);
    color: #ffffff;
    border-color: var(--accent-orange, #ff6b35);
  }
`;

// Styles are handled by global CSS
