import { MobilePageShell, SurfaceCard, MobileButton, ListItem } from '../../components/mobile';
import { BarChart3, Shield, Key, TrendingUp } from 'lucide-react';

export function MobileHome() {
  return (
    <MobilePageShell
      title="SNE OS"
      subtitle="Plataforma de análise de mercado"
    >
      <SurfaceCard>
        <div className="mb-4">
          <h3 className="text-[var(--text-1)] mb-1">Bem-vindo ao SNE OS</h3>
          <p className="text-sm text-[var(--text-2)]">
            Plataforma completa para análise de mercado com integração ao ecossistema SNE.
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard padding="none">
        <div className="p-4 border-b border-[var(--stroke-1)]">
          <h3 className="text-[var(--text-1)]">Funcionalidades</h3>
        </div>
        <ListItem
          title="Análise de Mercado"
          subtitle="Dados em tempo real"
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <ListItem
          title="SNE Vault"
          subtitle="Segurança física"
          icon={<Shield className="w-5 h-5" />}
        />
        <ListItem
          title="SNE Pass"
          subtitle="Licenças on-chain"
          icon={<Key className="w-5 h-5" />}
        />
        <ListItem
          title="Trading"
          subtitle="Sinais avançados"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </SurfaceCard>

      <MobileButton variant="primary" className="w-full">
        Explorar Funcionalidades
      </MobileButton>
    </MobilePageShell>
  );
}

