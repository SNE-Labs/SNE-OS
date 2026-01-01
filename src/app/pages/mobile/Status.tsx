export function MobileStatus() {
  const services = [
    { name: 'API Gateway', status: 'operational', uptime: '99.9%' },
    { name: 'Indexer', status: 'operational', uptime: '100%' },
    { name: 'Relayer', status: 'degraded', uptime: '98.7%' },
    { name: 'Edge Nodes', status: 'operational', uptime: '99.8%' },
    { name: 'Vault', status: 'operational', uptime: '100%' },
  ];

  return (
    <div className="mobile-status">
      <div className="mobile-status-header">
        <h1 className="mobile-status-title">Status</h1>
        <p className="mobile-status-subtitle">Monitoramento do sistema</p>
      </div>

      <div className="mobile-status-overview">
        <div className="mobile-status-card">
          <div className="mobile-status-indicator operational"></div>
          <div>
            <h3 className="mobile-status-card-title">Sistema Operacional</h3>
            <p className="mobile-status-card-text">Todos os serviços funcionando</p>
          </div>
        </div>
      </div>

      <div className="mobile-services">
        <h3 className="mobile-section-title">Serviços</h3>
        <div className="mobile-services-list">
          {services.map((service, index) => (
            <div key={index} className="mobile-service-item">
              <div className="mobile-service-info">
                <span className="mobile-service-name">{service.name}</span>
                <div className={`mobile-service-status ${service.status}`}>
                  {service.status === 'operational' ? '✓' : '⚠'}
                  {service.status}
                </div>
              </div>
              <div className="mobile-service-metrics">
                <span className="mobile-service-uptime">{service.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mobile-incidents">
        <h3 className="mobile-section-title">Incidentes Recentes</h3>
        <div className="mobile-incidents-list">
          <div className="mobile-incident-item">
            <div className="mobile-incident-header">
              <span className="mobile-incident-date">15 Jan</span>
              <span className="mobile-incident-status resolved">Resolvido</span>
            </div>
            <p className="mobile-incident-title">Relayer com delays</p>
            <p className="mobile-incident-duration">Duração: 2h 34m</p>
          </div>

          <div className="mobile-incident-item">
            <div className="mobile-incident-header">
              <span className="mobile-incident-date">10 Jan</span>
              <span className="mobile-incident-status completed">Concluído</span>
            </div>
            <p className="mobile-incident-title">Manutenção programada</p>
            <p className="mobile-incident-duration">Duração: 30m</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile styles
const statusStyles = `
  .mobile-status {
    padding: 16px;
    padding-bottom: 100px;
  }

  .mobile-status-header {
    margin-bottom: 24px;
  }

  .mobile-status-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-status-subtitle {
    font-size: 16px;
    color: var(--text-3, #666);
    margin: 8px 0 0 0;
  }

  .mobile-status-overview {
    margin-bottom: 32px;
  }

  .mobile-status-card {
    background: var(--bg-2, #f5f5f5);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid var(--stroke-1, #e0e0e0);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mobile-status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .mobile-status-indicator.operational {
    background: var(--ok-green, #10b981);
  }

  .mobile-status-card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 4px 0;
  }

  .mobile-status-card-text {
    font-size: 14px;
    color: var(--text-3, #666);
    margin: 0;
  }

  .mobile-section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 16px 0;
  }

  .mobile-services-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-service-item {
    background: var(--bg-2, #f5f5f5);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--stroke-1, #e0e0e0);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mobile-service-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-service-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1, #000);
  }

  .mobile-service-status {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 10px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .mobile-service-status.operational {
    background: var(--ok-green, #10b981);
    color: white;
  }

  .mobile-service-status.degraded {
    background: var(--warn-amber, #f59e0b);
    color: white;
  }

  .mobile-service-metrics {
    text-align: right;
  }

  .mobile-service-uptime {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1, #000);
    font-family: monospace;
  }

  .mobile-incidents {
    margin-top: 32px;
  }

  .mobile-incidents-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-incident-item {
    background: var(--bg-2, #f5f5f5);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-incident-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .mobile-incident-date {
    font-size: 12px;
    color: var(--text-3, #666);
    font-family: monospace;
  }

  .mobile-incident-status {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .mobile-incident-status.resolved,
  .mobile-incident-status.completed {
    background: var(--ok-green, #10b981);
    color: white;
  }

  .mobile-incident-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 4px 0;
  }

  .mobile-incident-duration {
    font-size: 12px;
    color: var(--text-3, #666);
    margin: 0;
  }
`;

// Styles are handled by global CSS
