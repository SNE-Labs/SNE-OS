import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, KeyRound, Shield, Smartphone, Wallet } from 'lucide-react';

import { MobileButton, MobilePageShell, SurfaceCard, Badge } from '../../components/mobile';
import { useKeysOverview } from '../../../hooks/useKeysData';
import { formatAddress } from '@/utils/format';

export function MobileKeys() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const overviewQuery = useKeysOverview(isConnected && address ? address : null);
  const overview = overviewQuery.data;

  return (
    <MobilePageShell
      title="Keys"
      subtitle="Acesso, bindings e dispositivos da conta."
      showContext
    >
      <SurfaceCard>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent-orange-dim)] text-[var(--accent-orange)] flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[var(--text-1)] mb-1">
              {overview?.surface.address ? formatAddress(overview.surface.address) : 'Carteira não conectada'}
            </div>
            <p className="text-sm text-[var(--text-2)]">
              {overview?.connected
                ? 'Surface de acesso carregada para esta sessão.'
                : 'Conecte uma carteira para carregar grants e bindings.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Nível</div>
            <div className="text-[var(--text-1)]">{overview?.surface.access_level ?? '--'}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Fonte</div>
            <div className="text-[var(--text-1)]">{overview?.surface.source ?? '--'}</div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--text-1)]">Sinais</h3>
          <Badge variant="neutral" size="sm">
            {overview?.signals.length ?? 0}
          </Badge>
        </div>

        <div className="space-y-3">
          {(overview?.signals ?? []).map((signal) => (
            <div
              key={signal.title}
              className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3"
            >
              <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">{signal.title}</div>
              <div className="text-[var(--text-1)] mb-1">{signal.value}</div>
              <div className="text-sm text-[var(--text-2)]">{signal.detail}</div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="flex items-center gap-2 mb-2 text-[var(--text-1)]">
              <Shield className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Grants</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              {overview?.grants.length
                ? `${overview.grants.length} grant(s) ativos carregados.`
                : 'Nenhum grant ativo carregado para esta conta.'}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="flex items-center gap-2 mb-2 text-[var(--text-1)]">
              <KeyRound className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Bindings</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              {overview?.bindings.length
                ? `${overview.bindings.length} binding(s) disponíveis.`
                : 'Nenhuma credencial portátil vinculada ainda.'}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="flex items-center gap-2 mb-2 text-[var(--text-1)]">
              <Smartphone className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Devices</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              {overview?.devices.length
                ? `${overview.devices.length} dispositivo(s) confiável(is) carregado(s).`
                : 'Nenhum dispositivo confiável registrado para esta conta.'}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-3">
          <h3 className="text-[var(--text-1)] mb-1">Fronteiras</h3>
          <p className="text-sm text-[var(--text-2)]">
            Keys concede acesso. Passport prova identidade.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[var(--text-1)] mb-1">Grants</div>
            <div className="text-sm text-[var(--text-2)]">
              {overview?.boundary.grants ?? 'Licenças e grants definem o que esta conta pode acessar.'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[var(--text-1)] mb-1">Devices</div>
            <div className="text-sm text-[var(--text-2)]">
              {overview?.boundary.devices ?? 'Devices e bindings representam a camada portátil de confiança.'}
            </div>
          </div>
        </div>

        <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/pass')}>
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Abrir Passport
        </MobileButton>
      </SurfaceCard>
    </MobilePageShell>
  );
}
