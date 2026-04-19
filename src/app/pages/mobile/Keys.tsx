import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, KeyRound, Shield, Smartphone, Wallet } from 'lucide-react';

import { MobileButton, MobilePageShell, SurfaceCard, Badge } from '../../components/mobile';
import { useKeysOverview } from '../../../hooks/useKeysData';
import { useKeysEntitlement } from '../../../hooks/useKeysEntitlement';
import { formatAddress } from '@/utils/format';
import { OperatorCheckoutCard } from '../../components/keys/OperatorCheckoutCard';

export function MobileKeys() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const overviewQuery = useKeysOverview(isConnected && address ? address : null);
  const entitlementQuery = useKeysEntitlement(isConnected && address ? address : null);
  const overview = overviewQuery.data;
  const entitlement = entitlementQuery.data;
  const isOwnerSession =
    Boolean(entitlement?.wallet) &&
    Boolean(entitlement?.ownerWallet) &&
    entitlement!.wallet!.toLowerCase() === entitlement!.ownerWallet!.toLowerCase();
  const isDelegateSession =
    Boolean(entitlement?.wallet) &&
    Boolean(entitlement?.delegateWallet) &&
    entitlement!.wallet!.toLowerCase() === entitlement!.delegateWallet!.toLowerCase();
  const accessLevel = entitlement?.accessClass === 'operator' ? 'Operator' : isConnected ? 'Discovery' : '--';
  const sourceLabel = entitlement?.source ?? overview?.surface.source ?? '--';
  const feePolicyLabel = entitlement?.feePolicy?.label ?? (entitlement?.feeTier === 'operator_discount' ? 'Operator discount' : 'Standard');
  const accessSummary = !isConnected
    ? 'Conecte uma carteira para resolver posse, delegação e classe de acesso.'
    : entitlementQuery.isLoading
      ? 'Resolvendo entitlement soberano para esta carteira.'
      : entitlement?.effectiveAccess
        ? isDelegateSession
          ? `Operator ativo por delegação de ${formatAddress(entitlement.ownerWallet)}.`
          : isOwnerSession && entitlement.delegateWallet
            ? `Operator ativo por posse direta. Delegate ativa para ${formatAddress(entitlement.delegateWallet)}.`
          : 'Operator ativo por posse direta.'
        : 'Sem Operator Key efetivo nesta sessão.';

  return (
    <MobilePageShell
      title="Keys"
      subtitle="Acesso, vínculos e dispositivos da conta."
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
                ? 'Superfície de acesso carregada para esta sessão.'
                : 'Conecte uma carteira para carregar licenças e vínculos.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Nível</div>
            <div className="text-[var(--text-1)]">{accessLevel}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Fonte</div>
            <div className="text-[var(--text-1)]">{sourceLabel}</div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--text-1)]">Entitlement</h3>
          <Badge variant={entitlement?.effectiveAccess ? 'success' : 'neutral'} size="sm">
            {entitlement?.effectiveAccess ? 'operator' : 'discovery'}
          </Badge>
        </div>

        <div className="text-sm text-[var(--text-2)] mb-4">
          {accessSummary}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Owner</div>
            <div className="text-[var(--text-1)] break-all">
              {entitlement?.ownerWallet ? formatAddress(entitlement.ownerWallet) : '--'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Delegate</div>
            <div className="text-[var(--text-1)] break-all">
              {entitlement?.delegateWallet ? formatAddress(entitlement.delegateWallet) : entitlement?.effectiveAccess ? 'Posse direta' : '--'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Fee tier</div>
            <div className="text-[var(--text-1)]">{feePolicyLabel}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Contratos</div>
            <div className="text-[var(--text-1)]">{entitlement?.contractsConfigured ? 'Configurados' : 'Pendentes'}</div>
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
              <span>Licenças</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              {overview?.grants.length
                ? `${overview.grants.length} licença(s) ativas carregadas.`
                : 'Nenhuma licença ativa carregada para esta conta.'}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="flex items-center gap-2 mb-2 text-[var(--text-1)]">
              <KeyRound className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Vínculos</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              {overview?.bindings.length
                ? `${overview.bindings.length} vínculo(s) disponíveis.`
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
        <OperatorCheckoutCard effectiveAccess={Boolean(entitlement?.effectiveAccess)} />
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
            <div className="text-[var(--text-1)] mb-1">Licenças</div>
            <div className="text-sm text-[var(--text-2)]">
              {entitlement?.effectiveAccess
                ? 'A posse atual ou a delegação válida do Operator Key define a classe de acesso desta wallet.'
                : overview?.boundary.grants ?? 'Licenças definem o que esta conta pode acessar.'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[var(--text-1)] mb-1">Devices</div>
            <div className="text-sm text-[var(--text-2)]">
              {isDelegateSession
                ? 'A wallet operacional delegada usa a classe Operator enquanto a owner wallet continuar segurando o Key.'
                : isOwnerSession && entitlement?.delegateWallet
                  ? `Esta owner wallet mantém a posse do Key e delega operação para ${formatAddress(entitlement.delegateWallet)}.`
                : overview?.boundary.devices ?? 'Dispositivos e vínculos representam a camada portátil de confiança.'}
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
