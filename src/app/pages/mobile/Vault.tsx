import { MobilePageShell, SurfaceCard, Badge, ListItem, MobileButton } from '../../components/mobile';
import { Shield, Zap, Lock, ExternalLink } from 'lucide-react';

export function MobileVault() {
  return (
    <MobilePageShell
      title="Vault"
      subtitle="Soberania física"
      statusPill={{ label: 'EM DESENVOLVIMENTO', variant: 'warning' }}
      showContext={true}
    >
      <SurfaceCard variant="warning">
        <div className="text-center mb-4">
          <Shield className="w-12 h-12 text-[var(--warning)] mx-auto mb-2" />
          <h3 className="text-[var(--text-1)] mb-1">Em Desenvolvimento</h3>
          <p className="text-sm text-[var(--text-2)]">
            O SNE Vault está sendo desenvolvido para fornecer soberania física
            completa para suas chaves e dados.
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-4">
          <h3 className="text-[var(--text-1)] mb-1">Arquitetura de Segurança</h3>
          <p className="text-sm text-[var(--text-2)]">3 camadas de proteção física</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[var(--bg-2)] rounded-lg">
            <Lock className="w-5 h-5 text-[var(--accent-orange)]" />
            <div>
              <div className="text-[var(--text-1)] font-medium">Hardware Seguro</div>
              <div className="text-xs text-[var(--text-2)]">TPM/TEE para proteção máxima</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[var(--bg-2)] rounded-lg">
            <Zap className="w-5 h-5 text-[var(--success)]" />
            <div>
              <div className="text-[var(--text-1)] font-medium">Proof of Uptime</div>
              <div className="text-xs text-[var(--text-2)]">Verificação contínua de integridade</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[var(--bg-2)] rounded-lg">
            <Shield className="w-5 h-5 text-[var(--info)]" />
            <div>
              <div className="text-[var(--text-1)] font-medium">Zero Trust</div>
              <div className="text-xs text-[var(--text-2)]">Arquitetura zero-knowledge</div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-4">
          <h3 className="text-[var(--text-1)] mb-1">Status da Rede</h3>
          <p className="text-sm text-[var(--text-2)]">Nodes ativos e métricas</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-[var(--accent-orange)]">247</div>
            <div className="text-xs text-[var(--text-2)]">Nodes Ativos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-[var(--success)]">99.97%</div>
            <div className="text-xs text-[var(--text-2)]">Uptime</div>
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-3">
        <MobileButton variant="primary" className="w-full">
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver Documentação
        </MobileButton>

        <MobileButton variant="secondary" className="w-full">
          Entrar na Waitlist
        </MobileButton>
      </div>
    </MobilePageShell>
  );
}

