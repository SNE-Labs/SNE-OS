import { MobilePageShell, SurfaceCard, Badge, ListItem, MobileButton } from '../../components/mobile';
import { Activity, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export function MobileStatus() {
  const services = [
    { name: 'API Gateway', status: 'operational', uptime: '99.9%', icon: <Activity className="w-4 h-4" /> },
    { name: 'Indexer', status: 'operational', uptime: '100%', icon: <CheckCircle className="w-4 h-4" /> },
    { name: 'Relayer', status: 'degraded', uptime: '98.7%', icon: <AlertTriangle className="w-4 h-4" /> },
    { name: 'Edge Nodes', status: 'operational', uptime: '99.8%', icon: <Activity className="w-4 h-4" /> },
    { name: 'Vault', status: 'operational', uptime: '100%', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'operational': return 'success';
      case 'degraded': return 'warning';
      case 'down': return 'danger';
      default: return 'neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return '✓';
      case 'degraded': return '⚠';
      case 'down': return '✗';
      default: return '?';
    }
  };

  return (
    <MobilePageShell
      title="Status"
      subtitle="Monitoramento do sistema"
      showContext={true}
    >
      <SurfaceCard variant="elevated">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="w-6 h-6 text-[var(--success)]" />
          <div>
            <h3 className="text-[var(--text-1)]">Sistema Operacional</h3>
            <p className="text-sm text-[var(--text-2)]">Todos os serviços funcionando</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--success)]">99.9%</div>
            <div className="text-xs text-[var(--text-2)]">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--accent-orange)]">5</div>
            <div className="text-xs text-[var(--text-2)]">Serviços</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--info)]">1</div>
            <div className="text-xs text-[var(--text-2)]">Degradado</div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard padding="none">
        <div className="p-4 border-b border-[var(--stroke-1)]">
          <h3 className="text-[var(--text-1)]">Serviços Individuais</h3>
        </div>
        {services.map((service, index) => (
          <ListItem
            key={index}
            title={service.name}
            subtitle={`${service.uptime} uptime`}
            icon={service.icon}
            badge={{
              label: `${getStatusIcon(service.status)} ${service.status.charAt(0).toUpperCase() + service.status.slice(1)}`,
              variant: getStatusVariant(service.status) as any
            }}
          />
        ))}
      </SurfaceCard>

      <SurfaceCard padding="none">
        <div className="p-4 border-b border-[var(--stroke-1)]">
          <h3 className="text-[var(--text-1)]">Incidentes Recentes</h3>
        </div>
        <div className="p-4">
          <div className="bg-[var(--bg-2)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="success" size="sm">Resolvido</Badge>
              <span className="text-xs text-[var(--text-3)]">15 Jan</span>
            </div>
            <h4 className="text-[var(--text-1)] text-sm mb-1">Relayer com delays</h4>
            <p className="text-xs text-[var(--text-2)]">Duração: 2h 34m</p>
          </div>
        </div>
      </SurfaceCard>

      <MobileButton variant="secondary" className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        Atualizar Status
      </MobileButton>
    </MobilePageShell>
  );
}