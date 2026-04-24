import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import {
  Activity,
  ArrowUpRight,
  CircleDot,
  Clock3,
  KeyRound,
  Link2,
  RefreshCw,
  Shield,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { FieldSurface } from '../components/field/FieldSurface';
import { WalletConnect } from '../components/passport/WalletConnect';
import { OperatorCheckoutCard } from '../components/keys/OperatorCheckoutCard';
import { useOperatorCockpit } from '../../hooks/useKeysData';
import { formatAddress } from '@/utils/format';
import type { OperatorCockpitTimelineEvent } from '@/services/keys-api';

type Tone = 'accent' | 'success' | 'warning' | 'neutral' | 'danger';

const toneStyles: Record<Tone, { color: string; bg: string; border: string }> = {
  accent: { color: 'var(--accent-orange)', bg: 'rgba(255,140,66,0.09)', border: 'rgba(255,140,66,0.22)' },
  success: { color: 'var(--ok-green)', bg: 'rgba(50,213,131,0.08)', border: 'rgba(50,213,131,0.18)' },
  warning: { color: 'var(--warn-amber)', bg: 'rgba(255,176,32,0.08)', border: 'rgba(255,176,32,0.18)' },
  danger: { color: 'var(--danger-red)', bg: 'rgba(255,99,99,0.08)', border: 'rgba(255,99,99,0.18)' },
  neutral: { color: 'var(--text-2)', bg: 'rgba(255,255,255,0.035)', border: 'rgba(255,255,255,0.08)' },
};

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

function roleTone(role?: string | null): Tone {
  if (role === 'owner' || role === 'delegate') return 'success';
  if (role === 'discovery') return 'warning';
  return 'neutral';
}

function eventTone(status?: string | null): Tone {
  if (status === 'complete') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'pending') return 'accent';
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

function asText(value: unknown, fallback = '--') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const style = toneStyles[tone];
  return (
    <span
      className="inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
      style={{ color: style.color, backgroundColor: style.bg, borderColor: style.border }}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  label,
  icon: Icon,
  children,
  right,
}: {
  title: string;
  label?: string;
  icon?: LucideIcon;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <FieldSurface
      as="section"
      motif="sovereign-key"
      density="compact"
      surface="panel"
      className="rounded-lg border p-3"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
        borderColor: 'rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
              style={{ color: 'var(--accent-orange)', backgroundColor: 'rgba(255,140,66,0.08)', borderColor: 'rgba(255,140,66,0.16)' }}
            >
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <div className="min-w-0">
            {label ? (
              <div className="mb-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                {label}
              </div>
            ) : null}
            <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
              {title}
            </div>
          </div>
        </div>
        {right}
      </div>
      {children}
    </FieldSurface>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="border-b pb-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="mb-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="text-sm font-medium break-words" style={{ color: toneStyles[tone].color }}>
        {value}
      </div>
    </div>
  );
}

function StatusRow({ label, value, tone = 'neutral' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</div>
      <div className="text-right text-sm font-medium break-all" style={{ color: toneStyles[tone].color }}>{value}</div>
    </div>
  );
}

function resolveActionCopy(state?: string) {
  if (state === 'connect_wallet') return 'Conecte uma wallet para abrir o cockpit com sessão.';
  if (state === 'contracts_unconfigured') return 'A camada soberana precisa de contratos configurados antes de operar.';
  if (state === 'indexer_degraded') return 'A leitura de entitlement está degradada. Revalidar evita estado incorreto.';
  if (state === 'continue_checkout') return 'Existe uma ActivationOrder aberta esperando a próxima etapa.';
  if (state === 'continue_activation') return 'O pagamento já avançou. Falta concluir ou revisar a ativação.';
  if (state === 'configure_delegate') return 'A owner segura o Key, mas nenhuma wallet operacional foi delegada.';
  if (state === 'operator_ready') return 'A sessão já opera na classe Operator.';
  return 'A wallet ainda está em discovery. O próximo passo é resolver o Operator Key.';
}

function OperatorState({ cockpit, isFetching, onRefresh }: { cockpit: NonNullable<ReturnType<typeof useOperatorCockpit>['data']>; isFetching: boolean; onRefresh: () => void }) {
  const entitlement = cockpit.entitlement;
  const active = Boolean(entitlement.effectiveAccess);
  const role = cockpit.session.role;
  const title = active
    ? role === 'delegate'
      ? 'Operator ativo por delegação'
      : 'Operator pronto'
    : cockpit.session.address
      ? 'Discovery ativo'
      : 'Sessão não conectada';
  const summary = active
    ? role === 'delegate'
      ? `Esta wallet opera por delegação de ${compactAddress(entitlement.ownerWallet)}.`
      : entitlement.delegateWallet
        ? `A owner segura o Key e delega operação para ${compactAddress(entitlement.delegateWallet)}.`
        : 'A wallet da sessão segura o Operator Key diretamente.'
    : cockpit.session.address
      ? 'Sem Operator Key efetivo para esta sessão. O cockpit mantém checkout, contratos e indexer visíveis.'
      : 'Conecte uma wallet para resolver posse, delegação e próximos passos.';

  return (
    <Panel
      title={title}
      label="Operator state"
      icon={Shield}
      right={<Badge tone={active ? 'success' : cockpit.session.address ? 'warning' : 'neutral'}>{active ? 'operator' : cockpit.session.address ? 'discovery' : 'offline'}</Badge>}
    >
      <div className="mb-5 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
        {summary}
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric label="Wallet" value={compactAddress(cockpit.session.address)} tone={cockpit.session.address ? 'success' : 'neutral'} />
        <Metric label="Role" value={roleLabel(role)} tone={roleTone(role)} />
        <Metric label="Fee tier" value={entitlement.feePolicy?.label ?? entitlement.feeTier ?? '--'} tone={active ? 'success' : 'neutral'} />
        <Metric label="Source" value={entitlement.source ?? '--'} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <WalletConnect />
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          disabled={isFetching}
          style={{ color: 'var(--text-1)', borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Revalidar
        </button>
      </div>
    </Panel>
  );
}

function AccessGraph({ cockpit }: { cockpit: NonNullable<ReturnType<typeof useOperatorCockpit>['data']> }) {
  const owner = cockpit.entitlement.ownerWallet;
  const delegate = cockpit.entitlement.delegateWallet;
  const session = cockpit.session.address;
  const active = Boolean(cockpit.entitlement.effectiveAccess);

  return (
    <Panel title="Owner, Key e Delegate" label="Access graph" icon={Link2}>
      <div className="space-y-3">
        <GraphNode label="Owner wallet" value={compactAddress(owner)} tone={owner ? 'success' : 'neutral'} />
        <GraphLink label={active ? 'holds Operator Key' : 'Operator Key não resolvido'} tone={active ? 'success' : 'warning'} />
        <GraphNode label="Operator Key" value={active ? 'token id 1' : '--'} tone={active ? 'success' : 'neutral'} />
        <GraphLink label={delegate ? 'delegates operation' : 'sem delegate'} tone={delegate ? 'accent' : 'neutral'} />
        <GraphNode label="Delegate wallet" value={delegate ? compactAddress(delegate) : 'Posse direta ou pendente'} tone={delegate ? 'accent' : 'neutral'} />
        <GraphLink label="active session" tone={session ? roleTone(cockpit.session.role) : 'neutral'} />
        <GraphNode label="Session wallet" value={compactAddress(session)} tone={session ? roleTone(cockpit.session.role) : 'neutral'} />
      </div>
    </Panel>
  );
}

function GraphNode({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className="rounded-lg border px-3 py-3" style={{ backgroundColor: style.bg, borderColor: style.border }}>
      <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="mt-1 text-sm font-medium break-all" style={{ color: style.color }}>{value}</div>
    </div>
  );
}

function GraphLink({ label, tone }: { label: string; tone: Tone }) {
  return (
    <div className="flex items-center gap-3 px-3">
      <div className="h-6 w-px" style={{ backgroundColor: toneStyles[tone].border }} />
      <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: toneStyles[tone].color }}>{label}</div>
    </div>
  );
}

function NextActionRail({ cockpit, onNavigate }: { cockpit: NonNullable<ReturnType<typeof useOperatorCockpit>['data']>; onNavigate: (href: string) => void }) {
  const action = cockpit.nextAction;
  const tone: Tone = action.priority === 'high' ? 'accent' : action.state === 'operator_ready' ? 'success' : 'neutral';
  return (
    <Panel title="Próximo passo" label="Action rail" icon={ArrowUpRight} right={<Badge tone={tone}>{action.state}</Badge>}>
      <div className="mb-2 text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
        {action.label}
      </div>
      <div className="mb-5 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
        {resolveActionCopy(action.state)}
      </div>
      {action.orderId ? (
        <div className="mb-4 rounded-lg border px-3 py-2 text-sm" style={{ color: 'var(--text-2)', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.025)' }}>
          Order {compactHash(action.orderId)}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onNavigate(action.href)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
        style={{ color: toneStyles[tone].color, backgroundColor: toneStyles[tone].bg, borderColor: toneStyles[tone].border }}
      >
        {action.label}
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </Panel>
  );
}

function Timeline({ events }: { events: OperatorCockpitTimelineEvent[] }) {
  return (
    <Panel title="Eventos de acesso" label="Timeline" icon={Clock3} right={<Badge tone="neutral">{events.length}</Badge>}>
      {events.length ? (
        <div className="space-y-0">
          {events.map((event, index) => {
            const tone = eventTone(event.status);
            return (
              <div key={`${event.kind}-${index}`} className="grid grid-cols-[18px_minmax(0,1fr)_150px] gap-3 border-b py-3 last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="pt-1">
                  <CircleDot className="h-4 w-4" style={{ color: toneStyles[tone].color }} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{event.label}</div>
                    <Badge tone={tone}>{event.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm break-words" style={{ color: 'var(--text-2)' }}>
                    {event.txHash ? compactHash(event.txHash) : event.detail ?? event.kind}
                  </div>
                </div>
                <div className="text-right text-xs" style={{ color: 'var(--text-3)' }}>
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm" style={{ color: 'var(--text-2)' }}>Nenhum evento privado carregado para esta sessão.</div>
      )}
    </Panel>
  );
}

function ContractsTable({ cockpit }: { cockpit: NonNullable<ReturnType<typeof useOperatorCockpit>['data']> }) {
  const contracts = cockpit.contracts;
  const rows = [
    { label: 'OperatorKey', value: contracts.operatorKey, state: contracts.operatorKey ? 'configured' : 'missing', tone: contracts.operatorKey ? 'success' : 'warning' as Tone },
    { label: 'KeySale', value: contracts.keySale, state: contracts.keySalePaused === true ? 'paused' : contracts.keySale ? 'unpaused' : 'missing', tone: contracts.keySalePaused === true ? 'warning' : contracts.keySale ? 'success' : 'warning' as Tone },
    { label: 'DelegationRegistry', value: contracts.delegationRegistry, state: contracts.delegationRegistry ? 'configured' : 'missing', tone: contracts.delegationRegistry ? 'success' : 'warning' as Tone },
    { label: 'USDT', value: contracts.usdt, state: contracts.usdt ? 'active' : 'missing', tone: contracts.usdt ? 'success' : 'warning' as Tone },
    { label: 'Treasury', value: contracts.treasury, state: contracts.treasury ? 'active' : 'missing', tone: contracts.treasury ? 'success' : 'warning' as Tone },
  ];

  return (
    <Panel title="Contratos soberanos" label="Contract state" icon={KeyRound} right={<Badge tone={contracts.configured ? 'success' : 'warning'}>{contracts.network}</Badge>}>
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[170px_minmax(0,1fr)_116px] items-center gap-3 border-b px-3 py-3 last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{row.label}</div>
            <div className="font-mono text-xs break-all" style={{ color: 'var(--text-2)' }}>{row.value ?? '--'}</div>
            <div className="text-right"><Badge tone={row.tone}>{row.state}</Badge></div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Metric label="Preço Operator" value={contracts.operatorPriceDisplay ?? cockpit.checkout.price.amount + ' ' + cockpit.checkout.price.asset} tone="accent" />
        <Metric label="Sale controller" value={compactAddress(contracts.saleController)} />
        <Metric label="Bloco lido" value={contracts.latestBlock ?? cockpit.indexer.lastIndexedBlock ?? '--'} />
        <Metric label="Manifest" value={contracts.manifestNetwork ?? contracts.source} />
      </div>
      {contracts.error ? (
        <div className="mt-4 rounded-lg border px-3 py-3 text-sm" style={{ color: 'var(--warn-amber)', borderColor: 'rgba(255,176,32,0.18)', backgroundColor: 'rgba(255,176,32,0.07)' }}>
          {contracts.error}
        </div>
      ) : null}
    </Panel>
  );
}

function OrdersTable({ cockpit }: { cockpit: NonNullable<ReturnType<typeof useOperatorCockpit>['data']> }) {
  const orders = cockpit.checkout.recentOrders.slice(0, 4);
  return (
    <Panel title="Checkout e ativação" label="Orders" icon={Activity} right={<Badge tone={cockpit.checkout.pendingOrder ? 'accent' : 'neutral'}>{cockpit.checkout.pendingOrder ? 'pending' : 'idle'}</Badge>}>
      {orders.length ? (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {orders.map((order) => (
            <div key={asText(order.id)} className="grid grid-cols-[minmax(0,1fr)_130px_130px_130px] items-center gap-3 border-b px-3 py-3 last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="min-w-0">
                <div className="font-mono text-xs" style={{ color: 'var(--text-1)' }}>{compactHash(asText(order.id))}</div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{formatTimestamp(asText(order.updatedAt, ''))}</div>
              </div>
              <div><Badge tone={asText(order.status) === 'activated' ? 'success' : 'accent'}>{asText(order.status)}</Badge></div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>{asText((order.payment as Record<string, unknown> | undefined)?.txHash) !== '--' ? 'confirmed' : '--'}</div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>{asText((order.activation as Record<string, unknown> | undefined)?.state)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
          Nenhuma ordem privada carregada para esta sessão. O checkout continua disponível pelo launcher abaixo quando a wallet estiver autenticada.
        </div>
      )}
      <div className="mt-4">
        <OperatorCheckoutCard effectiveAccess={Boolean(cockpit.entitlement.effectiveAccess)} />
      </div>
    </Panel>
  );
}

export function Keys() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const cockpitQuery = useOperatorCockpit(isConnected && address ? address : null);
  const cockpit = cockpitQuery.data;

  const headerMetrics = useMemo(() => {
    if (!cockpit) return [];
    return [
      { label: 'Role', value: roleLabel(cockpit.session.role), tone: roleTone(cockpit.session.role) },
      { label: 'Indexer', value: cockpit.indexer.healthy ? 'healthy' : 'degraded', tone: cockpit.indexer.healthy ? 'success' : 'warning' },
      { label: 'Bloco', value: cockpit.indexer.lastIndexedBlock ?? '--', tone: 'neutral' as Tone },
      { label: 'Fee', value: cockpit.entitlement.feePolicy?.label ?? cockpit.entitlement.feeTier ?? '--', tone: cockpit.entitlement.effectiveAccess ? 'success' : 'neutral' },
    ];
  }, [cockpit]);

  if (cockpitQuery.isLoading && !cockpit) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-2)' }}>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Carregando Operator Cockpit...
        </div>
      </div>
    );
  }

  if (!cockpit) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <Panel title="Operator Cockpit indisponível" icon={Shield}>
          <div className="mb-4 text-sm" style={{ color: 'var(--text-2)' }}>
            A camada de Keys não respondeu agora.
          </div>
          <button
            type="button"
            onClick={() => cockpitQuery.refetch()}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ color: 'var(--accent-orange)', borderColor: 'rgba(255,140,66,0.18)', backgroundColor: 'rgba(255,140,66,0.08)' }}
          >
            Tentar novamente
          </button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="sne-mosaic-page flex-1 overflow-y-auto px-6 py-5 xl:px-8">
        <div className="mx-auto max-w-[1560px] space-y-4">
          <FieldSurface
            as="header"
            motif="sovereign-key"
            density="compact"
            surface="strip"
            className="rounded-[28px] px-5 py-5"
            style={{
              background: 'linear-gradient(135deg, rgba(102,164,242,0.07), rgba(255,140,66,0.035), rgba(255,255,255,0.012))',
              borderWidth: '1px',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--accent-orange)' }}>
                    Operator Cockpit
                  </div>
                  <Badge tone={cockpit.contracts.configured ? 'success' : 'warning'}>{cockpit.contracts.network}</Badge>
                  <Badge tone={cockpit.indexer.healthy ? 'success' : 'warning'}>{cockpit.indexer.healthy ? 'indexer healthy' : 'indexer degraded'}</Badge>
                </div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-1)' }}>
                  Keys como centro operacional do acesso soberano.
                </h1>
                <div className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  Posse, delegação, fee tier, checkout, ativação e indexer em uma leitura única.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {headerMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.025)' }}>
                    <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{metric.label}</div>
                    <div className="mt-1 text-sm font-medium" style={{ color: toneStyles[metric.tone as Tone].color }}>{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </FieldSurface>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <OperatorState cockpit={cockpit} isFetching={cockpitQuery.isFetching} onRefresh={() => void cockpitQuery.refetch()} />
              <Timeline events={cockpit.timeline} />
              <ContractsTable cockpit={cockpit} />
              <OrdersTable cockpit={cockpit} />
            </div>

            <aside className="space-y-3 xl:sticky xl:top-5">
              <NextActionRail cockpit={cockpit} onNavigate={navigate} />
              <AccessGraph cockpit={cockpit} />
              <Panel title="Indexer e leitura" label="Health" icon={Activity} right={<Badge tone={cockpit.indexer.healthy ? 'success' : 'warning'}>{cockpit.indexer.mode}</Badge>}>
                <StatusRow label="Fonte" value={cockpit.indexer.source} />
                <StatusRow label="Último bloco" value={cockpit.indexer.lastIndexedBlock ?? '--'} />
                <StatusRow label="Checked at" value={formatTimestamp(cockpit.entitlement.checkedAt)} />
                <StatusRow label="Contratos" value={cockpit.entitlement.contractsConfigured ? 'configurados' : 'pendentes'} tone={cockpit.entitlement.contractsConfigured ? 'success' : 'warning'} />
                {cockpit.entitlement.error ? (
                  <div className="mt-3 rounded-lg border px-3 py-3 text-sm" style={{ color: 'var(--warn-amber)', borderColor: 'rgba(255,176,32,0.18)', backgroundColor: 'rgba(255,176,32,0.07)' }}>
                    {cockpit.entitlement.error}
                  </div>
                ) : null}
              </Panel>
              <Panel title="Passport continua a prova" label="Boundary" icon={Wallet}>
                <div className="mb-4 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  Passport prova identidade e continuidade. Keys concede classe de acesso e fee tier.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/pass')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
                  style={{ color: 'var(--text-1)', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.10)' }}
                >
                  Abrir Passport
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </Panel>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
