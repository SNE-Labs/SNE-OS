import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Activity, ArrowUpRight, CircleDot, KeyRound, Link2, RefreshCw, Shield, Wallet } from 'lucide-react';

import { MobileButton, MobilePageShell, SurfaceCard, Badge } from '../../components/mobile';
import { useOperatorCockpit } from '../../../hooks/useKeysData';
import { formatAddress } from '@/utils/format';
import { OperatorCheckoutCard } from '../../components/keys/OperatorCheckoutCard';

type MobileBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'orange';

function compactAddress(value?: string | null) {
  return value ? formatAddress(value) : '--';
}

function compactHash(value?: string | null) {
  if (!value) return '--';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function roleLabel(role?: string | null) {
  if (role === 'owner') return 'Owner';
  if (role === 'delegate') return 'Delegate';
  if (role === 'discovery') return 'Discovery';
  return 'Anonymous';
}

function roleVariant(role?: string | null): MobileBadgeVariant {
  if (role === 'owner' || role === 'delegate') return 'success';
  if (role === 'discovery') return 'warning';
  return 'neutral';
}

function eventVariant(status?: string | null): MobileBadgeVariant {
  if (status === 'complete') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'pending') return 'orange';
  return 'neutral';
}

function formatTimestamp(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function nextActionCopy(state?: string) {
  if (state === 'connect_wallet') return 'Conecte uma wallet para resolver a sessão.';
  if (state === 'continue_checkout') return 'Existe uma ordem aberta aguardando próxima etapa.';
  if (state === 'continue_activation') return 'Pagamento ou mint já avançou. Revise a ativação.';
  if (state === 'configure_delegate') return 'A owner segura o Key, mas a operação ainda não foi delegada.';
  if (state === 'operator_ready') return 'A sessão já opera com classe Operator.';
  if (state === 'indexer_degraded') return 'A leitura de entitlement precisa ser revalidada.';
  if (state === 'contracts_unconfigured') return 'Contratos soberanos ainda não estão configurados.';
  return 'A wallet segue em discovery até resolver o Operator Key.';
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke-1)] py-3 last:border-b-0">
      <div className="text-sm text-[var(--text-2)]">{label}</div>
      <div className="text-right text-sm text-[var(--text-1)] break-all">{value}</div>
    </div>
  );
}

function Stat({ label, value, variant = 'neutral' }: { label: string; value: React.ReactNode; variant?: MobileBadgeVariant }) {
  return (
    <div className="rounded-xl border border-[var(--stroke-1)] bg-[var(--bg-2)] p-3">
      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">{label}</div>
      <div className="text-sm text-[var(--text-1)] break-words">
        {typeof value === 'string' ? value : value}
      </div>
      <div className="mt-2">
        <Badge variant={variant} size="sm">{label}</Badge>
      </div>
    </div>
  );
}

export function MobileKeys() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const cockpitQuery = useOperatorCockpit(isConnected && address ? address : null);
  const cockpit = cockpitQuery.data;
  const entitlement = cockpit?.entitlement;
  const active = Boolean(entitlement?.effectiveAccess);
  const role = cockpit?.session.role;
  const statusVariant: MobileBadgeVariant = active ? 'success' : cockpit?.session.address ? 'warning' : 'neutral';

  const stateTitle = active
    ? role === 'delegate'
      ? 'Operator Delegate'
      : 'Operator Ready'
    : cockpit?.session.address
      ? 'Discovery'
      : 'Wallet Off';

  const stateSummary = active
    ? role === 'delegate'
      ? `Operando por delegação de ${compactAddress(entitlement?.ownerWallet)}.`
      : entitlement?.delegateWallet
        ? `Owner com delegate ativo em ${compactAddress(entitlement.delegateWallet)}.`
        : 'Operator Key resolvido por posse direta.'
    : cockpit?.session.address
      ? 'Sem Operator Key efetivo nesta sessão.'
      : 'Conecte uma wallet para abrir o cockpit.';

  return (
    <MobilePageShell
      title="Keys"
      subtitle="Operator Cockpit"
      showContext
      statusPill={{ label: cockpit?.indexer.healthy ? 'indexer healthy' : 'indexer pending', variant: cockpit?.indexer.healthy ? 'success' : 'warning' }}
      action={
        <button
          type="button"
          onClick={() => void cockpitQuery.refetch()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)]"
          aria-label="Revalidar Keys"
        >
          <RefreshCw className={`h-4 w-4 ${cockpitQuery.isFetching ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {cockpitQuery.isLoading && !cockpit ? (
        <SurfaceCard>
          <div className="flex items-center gap-3 text-sm text-[var(--text-2)]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando Operator Cockpit...
          </div>
        </SurfaceCard>
      ) : null}

      {cockpit ? (
        <>
          <SurfaceCard>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-orange-dim)] text-[var(--accent-orange)]">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="mb-1 text-xl font-semibold text-[var(--text-1)]">{stateTitle}</div>
                  <p className="text-sm leading-6 text-[var(--text-2)]">{stateSummary}</p>
                </div>
              </div>
              <Badge variant={statusVariant} size="sm">{active ? 'operator' : cockpit.session.address ? 'discovery' : 'offline'}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Role" value={roleLabel(role)} variant={roleVariant(role)} />
              <Stat label="Fee" value={entitlement?.feePolicy?.label ?? entitlement?.feeTier ?? '--'} variant={active ? 'success' : 'neutral'} />
              <Stat label="Wallet" value={compactAddress(cockpit.session.address)} variant={cockpit.session.address ? 'success' : 'neutral'} />
              <Stat label="Source" value={entitlement?.source ?? '--'} />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[var(--text-1)]">
                <ArrowUpRight className="h-4 w-4 text-[var(--accent-orange)]" />
                <span>Próxima ação</span>
              </div>
              <Badge variant={cockpit.nextAction.priority === 'high' ? 'orange' : 'neutral'} size="sm">
                {cockpit.nextAction.state}
              </Badge>
            </div>
            <div className="mb-2 text-lg font-semibold text-[var(--text-1)]">{cockpit.nextAction.label}</div>
            <p className="mb-4 text-sm leading-6 text-[var(--text-2)]">{nextActionCopy(cockpit.nextAction.state)}</p>
            {cockpit.nextAction.orderId ? (
              <div className="mb-4 rounded-xl border border-[var(--stroke-1)] bg-[var(--bg-2)] px-3 py-2 text-sm text-[var(--text-2)]">
                Order {compactHash(cockpit.nextAction.orderId)}
              </div>
            ) : null}
            <MobileButton className="w-full" onClick={() => navigate(cockpit.nextAction.href)}>
              {cockpit.nextAction.label}
              <ArrowUpRight className="h-4 w-4" />
            </MobileButton>
          </SurfaceCard>

          <SurfaceCard>
            <div className="mb-4 flex items-center gap-2 text-[var(--text-1)]">
              <Link2 className="h-4 w-4 text-[var(--accent-orange)]" />
              <span>Access Graph</span>
            </div>
            <div className="space-y-3">
              <GraphStep label="Owner" value={compactAddress(entitlement?.ownerWallet)} variant={entitlement?.ownerWallet ? 'success' : 'neutral'} />
              <GraphLine label={active ? 'holds Operator Key' : 'key não resolvido'} />
              <GraphStep label="Operator Key" value={active ? 'token id 1' : '--'} variant={active ? 'success' : 'neutral'} />
              <GraphLine label={entitlement?.delegateWallet ? 'delegates' : 'sem delegate'} />
              <GraphStep label="Delegate" value={entitlement?.delegateWallet ? compactAddress(entitlement.delegateWallet) : 'Posse direta ou pendente'} variant={entitlement?.delegateWallet ? 'orange' : 'neutral'} />
              <GraphLine label="session" />
              <GraphStep label="Wallet atual" value={compactAddress(cockpit.session.address)} variant={roleVariant(role)} />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--text-1)]">
                <Activity className="h-4 w-4 text-[var(--accent-orange)]" />
                <span>Timeline</span>
              </div>
              <Badge variant="neutral" size="sm">{cockpit.timeline.length}</Badge>
            </div>
            <div className="space-y-0">
              {cockpit.timeline.slice(-6).map((event, index) => (
                <div key={`${event.kind}-${index}`} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3 border-b border-[var(--stroke-1)] py-3 last:border-b-0">
                  <CircleDot className="mt-1 h-4 w-4 text-[var(--accent-orange)]" />
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <div className="text-sm text-[var(--text-1)]">{event.label}</div>
                      <Badge variant={eventVariant(event.status)} size="sm">{event.status}</Badge>
                    </div>
                    <div className="text-xs text-[var(--text-3)]">{formatTimestamp(event.timestamp)}</div>
                    <div className="mt-1 text-sm break-words text-[var(--text-2)]">
                      {event.txHash ? compactHash(event.txHash) : event.detail ?? event.kind}
                    </div>
                  </div>
                </div>
              ))}
              {cockpit.timeline.length === 0 ? (
                <div className="text-sm text-[var(--text-2)]">Nenhum evento privado carregado.</div>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--text-1)]">
                <KeyRound className="h-4 w-4 text-[var(--accent-orange)]" />
                <span>Contratos</span>
              </div>
              <Badge variant={cockpit.contracts.configured ? 'success' : 'warning'} size="sm">
                {cockpit.contracts.network}
              </Badge>
            </div>
            <InfoRow label="OperatorKey" value={compactAddress(cockpit.contracts.operatorKey)} />
            <InfoRow label="KeySale" value={compactAddress(cockpit.contracts.keySale)} />
            <InfoRow label="Delegation" value={compactAddress(cockpit.contracts.delegationRegistry)} />
            <InfoRow label="Preço" value={cockpit.contracts.operatorPriceDisplay ?? `${cockpit.checkout.price.amount} ${cockpit.checkout.price.asset}`} />
            <InfoRow label="Sale" value={cockpit.contracts.keySalePaused ? 'paused' : cockpit.contracts.keySale ? 'unpaused' : '--'} />
            <InfoRow label="Bloco" value={cockpit.contracts.latestBlock ?? cockpit.indexer.lastIndexedBlock ?? '--'} />
          </SurfaceCard>

          <OperatorCheckoutCard effectiveAccess={active} />

          <SurfaceCard>
            <div className="mb-3 flex items-center gap-2 text-[var(--text-1)]">
              <Wallet className="h-4 w-4 text-[var(--accent-orange)]" />
              <span>Boundary</span>
            </div>
            <p className="mb-4 text-sm leading-6 text-[var(--text-2)]">
              Passport prova identidade e continuidade. Keys concede classe de acesso e fee tier.
            </p>
            <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/pass')}>
              Abrir Passport
              <ArrowUpRight className="h-4 w-4" />
            </MobileButton>
          </SurfaceCard>
        </>
      ) : cockpitQuery.isError ? (
        <SurfaceCard>
          <div className="mb-3 text-[var(--text-1)]">Operator Cockpit indisponível</div>
          <p className="mb-4 text-sm text-[var(--text-2)]">A camada de Keys não respondeu agora.</p>
          <MobileButton variant="secondary" onClick={() => void cockpitQuery.refetch()}>
            Tentar novamente
          </MobileButton>
        </SurfaceCard>
      ) : null}
    </MobilePageShell>
  );
}

function GraphStep({ label, value, variant }: { label: string; value: string; variant: MobileBadgeVariant }) {
  return (
    <div className="rounded-xl border border-[var(--stroke-1)] bg-[var(--bg-2)] p-3">
      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">{label}</div>
      <div className="mb-2 text-sm text-[var(--text-1)] break-all">{value}</div>
      <Badge variant={variant} size="sm">{label}</Badge>
    </div>
  );
}

function GraphLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-3">
      <div className="h-5 w-px bg-[var(--stroke-2)]" />
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">{label}</div>
    </div>
  );
}
