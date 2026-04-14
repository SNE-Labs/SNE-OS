import { useMemo, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Eye, KeyRound, Lock, Plus, Server, Shield, Trash2, Wallet } from 'lucide-react';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useCreateSecretItem, useDeleteSecretItem, useSecretItems, useSecretsOverview } from '../../hooks/useSecretsData';
import { formatAddress } from '@/utils/format';
import { createEncryptedSecretEnvelope, decryptSecretItem, type SecretDraft, type SecretVaultId, type DecryptedSecret } from '../../services/storage/secretsCrypto';
import { secretsApi, type SecretItemSummary } from '../../services/secrets-api';
import { resolveModuleState } from '../../lib/moduleState';

type ComposerState = {
  vault_id: SecretVaultId;
  label: string;
  login: string;
  url: string;
  secret: string;
  note: string;
  passphrase: string;
};

const INITIAL_COMPOSER: ComposerState = {
  vault_id: 'passwords',
  label: '',
  login: '',
  url: '',
  secret: '',
  note: '',
  passphrase: '',
};

function formatRelativeTimestamp(value?: string | null): string {
  if (!value) return '--';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return '--';

  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.round(hours / 24);
  return `${days}d atrás`;
}

function prettyVaultLabel(vaultId: string): string {
  if (vaultId === 'api_keys') return 'API Keys';
  if (vaultId === 'secure_notes') return 'Notas seguras';
  if (vaultId === 'recovery_material') return 'Material de recuperação';
  return 'Senhas';
}

function localizeSyncMode(value?: string | null): string {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (!normalized) return '--';
  if (normalized === 'local-first') return 'Somente neste dispositivo';
  if (normalized === 'client-side-encrypted') return 'Cifrado no dispositivo';
  if (normalized === 'disabled') return 'Desativado';
  return value || '--';
}

function fieldStyle() {
  return {
    backgroundColor: 'var(--bg-2)',
    borderWidth: '1px',
    borderColor: 'var(--stroke-1)',
    color: 'var(--text-1)',
  } as const;
}

function inputClassName(multiline = false) {
  return multiline
    ? 'w-full rounded-lg px-3 py-3 text-sm outline-none resize-none'
    : 'w-full rounded-lg px-3 py-2.5 text-sm outline-none';
}

export function Secrets() {
  const { address, isConnected } = useAccount();
  const overviewQuery = useSecretsOverview(isConnected && address ? address : null);
  const itemsQuery = useSecretItems(Boolean(isConnected && address));
  const createMutation = useCreateSecretItem();
  const deleteMutation = useDeleteSecretItem();

  const [composer, setComposer] = useState<ComposerState>(INITIAL_COMPOSER);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [revealTarget, setRevealTarget] = useState<SecretItemSummary | null>(null);
  const [revealPassphrase, setRevealPassphrase] = useState('');
  const [revealResult, setRevealResult] = useState<DecryptedSecret | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealPending, setRevealPending] = useState(false);

  const overview = overviewQuery.data;
  const moduleState = resolveModuleState({
    isConnected,
    isLoading: overviewQuery.isLoading,
    isError: overviewQuery.isError,
    data: overview,
  });

  const visibleItems = useMemo<SecretItemSummary[]>(
    () => (itemsQuery.data?.items?.length ? itemsQuery.data.items : overview?.items ?? []),
    [itemsQuery.data?.items, overview?.items]
  );

  const recentItems = useMemo<SecretItemSummary[]>(
    () => (overview?.recent_items?.length ? overview.recent_items : visibleItems.slice(0, 3)),
    [overview?.recent_items, visibleItems]
  );

  const canDelete = Boolean(itemsQuery.data?.configured);

  function updateComposer(field: keyof ComposerState, value: string) {
    setComposer((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!address) {
      setComposerError('Conecte uma carteira antes de criar um envelope cifrado.');
      return;
    }

    if (!composer.label.trim() || !composer.secret.trim() || !composer.passphrase.trim()) {
      setComposerError('Label, secret e passphrase são obrigatórios.');
      return;
    }

    setComposerError(null);

    try {
      const draft: SecretDraft = {
        vault_id: composer.vault_id,
        label: composer.label,
        login: composer.login,
        url: composer.url,
        secret: composer.secret,
        note: composer.note,
        passphrase: composer.passphrase,
      };
      const payload = await createEncryptedSecretEnvelope(address, draft);
      await createMutation.mutateAsync(payload);
      setComposer(INITIAL_COMPOSER);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar envelope cifrado.';
      setComposerError(message);
    }
  }

  async function handleReveal(item: SecretItemSummary) {
    if (!address) {
      setRevealError('Conecte uma carteira antes de desbloquear um item.');
      return;
    }
    if (!revealPassphrase.trim()) {
      setRevealError('Informe a passphrase de unlock.');
      return;
    }

    setRevealTarget(item);
    setRevealPending(true);
    setRevealError(null);
    setRevealResult(null);

    try {
      const fullItem = await secretsApi.getItem(item.id);
      const decrypted = await decryptSecretItem(address, revealPassphrase, fullItem);
      setRevealResult(decrypted);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao descriptografar o envelope.';
      setRevealError(message);
    } finally {
      setRevealPending(false);
    }
  }

  return (
    <div className="flex flex-1">
      <div className="flex-1 px-6 py-6 overflow-y-auto xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">
          <section
            className="rounded-xl p-5"
            style={{
              background: 'radial-gradient(circle at top left, rgba(255,140,66,0.16), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.03))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[0.7fr_0.3fr] gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Secrets</div>
                </div>

                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  Passwords, notes e material sensível.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  Secrets mantém credenciais, notas seguras e recovery material sob criptografia no cliente. O backend só enxerga ciphertext, metadata e estado de sync.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Inventory</div>
                    <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{overview?.item_count ?? 0} item(s)</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.vaults?.length ?? 0} vaults visíveis, {overview?.access.session_bound ? 'sessão habilitada' : 'leitura local'}.
                    </div>
                  </div>

                  <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Sync</div>
                    <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                      {overview?.sync.configured ? overview.sync.backend : 'Somente neste dispositivo'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.sync.detail ?? 'Sync criptografado ainda não configurado.'}
                    </div>
                  </div>

                  <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Última alteração</div>
                    <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{formatRelativeTimestamp(overview?.updated_at)}</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.capabilities.client_side_encryption_required ? 'Cliente cifra antes de persistir.' : 'Criptografia do cliente pendente.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4 min-w-0" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold mb-1 break-all" style={{ color: 'var(--text-1)' }}>
                      {overview?.surface.address ? formatAddress(overview.surface.address) : 'Conecte sua carteira'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.connected ? 'Surface cifrada carregada para esta sessão.' : 'Conecte uma carteira para desbloquear a camada de Secrets.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <WalletConnect />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Storage</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{overview?.storage.backend ?? '--'}</div>
                    </div>
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Modo</div>
                      <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>{localizeSyncMode(overview?.surface.mode)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-5">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
              {moduleState === 'disconnected' ? (
                <ModuleStateCard
                  tone="disconnected"
                  title="Conecte uma carteira"
                  description="Secrets precisa de uma sessão conectada para compor e sincronizar envelopes cifrados."
                />
              ) : moduleState === 'loading' ? (
                <ModuleStateCard
                  tone="loading"
                  title="Preparando Secrets"
                  description="Resolvendo storage, política de sync e inventário cifrado da sessão."
                />
              ) : moduleState === 'error' ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar Secrets"
                  description="A surface cifrada não pôde ser resolvida agora."
                  actionLabel="Tentar novamente"
                  onAction={() => overviewQuery.refetch()}
                />
              ) : (
              <form onSubmit={handleCreateSecret}>
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Compose Encrypted Item
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Vault</div>
                  <select
                    value={composer.vault_id}
                    onChange={(event) => updateComposer('vault_id', event.target.value)}
                    className={inputClassName()}
                    style={fieldStyle()}
                  >
                    <option value="passwords">Passwords</option>
                    <option value="api_keys">API Keys</option>
                    <option value="secure_notes">Secure Notes</option>
                    <option value="recovery_material">Recovery Material</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Label</div>
                  <input
                    value={composer.label}
                    onChange={(event) => updateComposer('label', event.target.value)}
                    className={inputClassName()}
                    style={fieldStyle()}
                    placeholder="Ex.: Binance login"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Login / Username</div>
                  <input
                    value={composer.login}
                    onChange={(event) => updateComposer('login', event.target.value)}
                    className={inputClassName()}
                    style={fieldStyle()}
                    placeholder="email ou username"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>URL / Contexto</div>
                  <input
                    value={composer.url}
                    onChange={(event) => updateComposer('url', event.target.value)}
                    className={inputClassName()}
                    style={fieldStyle()}
                    placeholder="https://..."
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Secret</div>
                  <input
                    type="password"
                    value={composer.secret}
                    onChange={(event) => updateComposer('secret', event.target.value)}
                    className={inputClassName()}
                    style={fieldStyle()}
                    placeholder="valor sensível"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Secure Note</div>
                  <textarea
                    value={composer.note}
                    onChange={(event) => updateComposer('note', event.target.value)}
                    className={inputClassName(true)}
                    style={fieldStyle()}
                    rows={4}
                    placeholder="notas adicionais, recovery hints, contexto operacional"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Unlock Passphrase</div>
                  <input
                    type="password"
                    value={composer.passphrase}
                    onChange={(event) => updateComposer('passphrase', event.target.value)}
                    className={inputClassName()}
                    style={fieldStyle()}
                    placeholder="usada para derivar a chave mestre local"
                  />
                </label>
              </div>

              {composerError ? (
                <div className="mt-4 text-sm" style={{ color: '#f59e0b' }}>
                  {composerError}
                </div>
              ) : null}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    O payload é cifrado no browser. O backend recebe apenas envelope, metadata e timestamps.
                  </div>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || !isConnected}
                    className="rounded-lg px-4 py-3 inline-flex items-center gap-2 text-sm font-medium"
                    style={{ backgroundColor: 'var(--accent-orange)', color: 'white' }}
                  >
                    <Plus className="w-4 h-4" />
                    {createMutation.isPending ? 'Encrypting...' : 'Encrypt & Store'}
                  </button>
                </div>
              </form>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Unlock Preview
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        {revealTarget ? revealTarget.label : 'Selecione um item'}
                      </div>
                    </div>
                    <div className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
                      {revealTarget ? `${prettyVaultLabel(revealTarget.vault_id)} · ${revealTarget.kind}` : 'Escolha um envelope no índice abaixo e informe a passphrase.'}
                    </div>
                    <input
                      type="password"
                      value={revealPassphrase}
                      onChange={(event) => setRevealPassphrase(event.target.value)}
                      className={inputClassName()}
                      style={fieldStyle()}
                      placeholder="passphrase de unlock"
                    />
                  </div>

                  {revealError ? (
                    <div className="text-sm" style={{ color: '#f59e0b' }}>{revealError}</div>
                  ) : null}

                  {revealResult ? (
                    <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      {revealResult.login ? <div className="text-sm" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>login:</span> {revealResult.login}</div> : null}
                      {revealResult.url ? <div className="text-sm break-all" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>url:</span> {revealResult.url}</div> : null}
                      <div className="text-sm break-all" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>secret:</span> {revealResult.secret}</div>
                      {revealResult.note ? <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>note:</span> {revealResult.note}</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Superfície de Sync
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Backend</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.sync.detail ?? 'Sync remoto ainda não configurado.'}
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Policy</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Servidor sem plaintext, exportação apenas como ciphertext e custódia do usuário.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Últimos Envelopes
                </div>
                <div className="space-y-3">
                  {recentItems.length ? recentItems.map((item) => (
                    <div key={item.id} className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>{item.label}</div>
                        <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>{prettyVaultLabel(item.vault_id)}</div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        {item.kind} · {formatRelativeTimestamp(item.updated_at)}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        Nenhum envelope cifrado disponível ainda.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Inventory Index
                </div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  O índice lista metadata e timestamps. O conteúdo permanece cifrado no cliente.
                </div>
              </div>
              <button
                onClick={() => window.location.assign('/vault')}
                className="text-sm font-medium inline-flex items-center gap-2"
                style={{ color: 'var(--text-2)' }}
              >
                Abrir Vault
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {visibleItems.length ? visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl p-4 flex items-start justify-between gap-4"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>{item.label}</div>
                    </div>
                    <div className="text-sm break-words" style={{ color: 'var(--text-2)' }}>
                      {prettyVaultLabel(item.vault_id)} · {item.kind} · {formatRelativeTimestamp(item.updated_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReveal(item)}
                      disabled={revealPending}
                      className="rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}
                    >
                      <Eye className="w-4 h-4" />
                      Reveal
                    </button>
                    {canDelete ? (
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm"
                        style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </button>
                    ) : (
                      <div className="text-xs uppercase whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                        readonly
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      Nenhum item carregado
                    </div>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    A escrita e o unlock já rodam no cliente. Falta apenas popular o cofre com os primeiros itens.
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
