import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Eye, Lock, Plus, Server, Shield, Trash2, Wallet } from 'lucide-react';

import { Badge, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { useCreateSecretItem, useDeleteSecretItem, useSecretItems, useSecretsOverview } from '../../../hooks/useSecretsData';
import { formatAddress } from '@/utils/format';
import { createEncryptedSecretEnvelope, decryptSecretItem, type DecryptedSecret, type SecretDraft, type SecretVaultId } from '../../../services/storage/secretsCrypto';
import { secretsApi, type SecretItemSummary } from '../../../services/secrets-api';

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
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function prettyVaultLabel(vaultId: string): string {
  if (vaultId === 'api_keys') return 'API Keys';
  if (vaultId === 'secure_notes') return 'Notas';
  if (vaultId === 'recovery_material') return 'Recuperação';
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

export function MobileSecrets() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const overviewQuery = useSecretsOverview(isConnected && address ? address : null);
  const itemsQuery = useSecretItems(Boolean(isConnected && address));
  const createMutation = useCreateSecretItem();
  const deleteMutation = useDeleteSecretItem();

  const [composer, setComposer] = useState<ComposerState>(INITIAL_COMPOSER);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [revealPassphrase, setRevealPassphrase] = useState('');
  const [revealTarget, setRevealTarget] = useState<SecretItemSummary | null>(null);
  const [revealResult, setRevealResult] = useState<DecryptedSecret | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealPending, setRevealPending] = useState(false);

  const overview = overviewQuery.data;
  const items = itemsQuery.data?.items?.length ? itemsQuery.data.items : overview?.items ?? [];
  const canDelete = Boolean(itemsQuery.data?.configured);

  function updateComposer(field: keyof ComposerState, value: string) {
    setComposer((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!address) {
      setComposerError('Conecte uma carteira antes de criar um item.');
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
      setComposerError(error instanceof Error ? error.message : 'Falha ao cifrar o item.');
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
      setRevealError(error instanceof Error ? error.message : 'Falha ao descriptografar o envelope.');
    } finally {
      setRevealPending(false);
    }
  }

  return (
    <MobilePageShell
      title="Secrets"
      subtitle="Passwords, notes e recovery material sob criptografia no cliente."
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
                ? 'Surface cifrada carregada para esta sessão.'
                : 'Conecte uma carteira para desbloquear Secrets.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Inventory</div>
            <div className="text-[var(--text-1)]">{overview?.item_count ?? 0} item(s)</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Sync</div>
            <div className="text-[var(--text-1)]">{overview?.sync.configured ? overview.sync.backend : 'Somente neste dispositivo'}</div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
          <Plus className="w-4 h-4 text-[var(--accent-orange)]" />
          <span>Compose</span>
        </div>

        <form onSubmit={handleCreateSecret} className="space-y-3">
          <select
            value={composer.vault_id}
            onChange={(event) => updateComposer('vault_id', event.target.value)}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
          >
            <option value="passwords">Passwords</option>
            <option value="api_keys">API Keys</option>
            <option value="secure_notes">Secure Notes</option>
            <option value="recovery_material">Recovery Material</option>
          </select>

          <input
            value={composer.label}
            onChange={(event) => updateComposer('label', event.target.value)}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
            placeholder="Label"
          />
          <input
            value={composer.login}
            onChange={(event) => updateComposer('login', event.target.value)}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
            placeholder="Login / username"
          />
          <input
            value={composer.url}
            onChange={(event) => updateComposer('url', event.target.value)}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
            placeholder="URL / contexto"
          />
          <input
            type="password"
            value={composer.secret}
            onChange={(event) => updateComposer('secret', event.target.value)}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
            placeholder="Secret"
          />
          <textarea
            value={composer.note}
            onChange={(event) => updateComposer('note', event.target.value)}
            rows={3}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none resize-none"
            placeholder="Secure note"
          />
          <input
            type="password"
            value={composer.passphrase}
            onChange={(event) => updateComposer('passphrase', event.target.value)}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
            placeholder="Unlock passphrase"
          />

          {composerError ? <div className="text-sm text-amber-500">{composerError}</div> : null}

          <MobileButton type="submit" className="w-full" disabled={createMutation.isPending || !isConnected}>
            <Plus className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Encrypting...' : 'Encrypt & Store'}
          </MobileButton>
        </form>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
          <Server className="w-4 h-4 text-[var(--accent-orange)]" />
          <span>Surface</span>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Storage</div>
            <div className="text-[var(--text-1)]">{overview?.storage.backend ?? '--'}</div>
            <div className="text-sm text-[var(--text-2)] mt-1">{overview?.storage.detail}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Policy</div>
            <div className="text-sm text-[var(--text-2)]">
              Servidor sem plaintext, exportação apenas como ciphertext e custódia do usuário.
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--text-1)]">Vaults</h3>
          <Badge variant="neutral" size="sm">
            {overview?.vaults.length ?? 0}
          </Badge>
        </div>

        <div className="space-y-3">
          {(overview?.vaults ?? []).map((vault) => (
            <div key={vault.id} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="text-[var(--text-1)]">{vault.label}</div>
                <Badge variant={vault.count > 0 ? 'orange' : 'neutral'} size="sm">{vault.count}</Badge>
              </div>
              <div className="text-sm text-[var(--text-2)]">{vault.detail}</div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
          <Eye className="w-4 h-4 text-[var(--accent-orange)]" />
          <span>Unlock</span>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={revealPassphrase}
            onChange={(event) => setRevealPassphrase(event.target.value)}
            className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
            placeholder="Unlock passphrase"
          />

          {revealTarget ? (
            <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
              <div className="text-[var(--text-1)] mb-1">{revealTarget.label}</div>
              <div className="text-sm text-[var(--text-2)]">
                {prettyVaultLabel(revealTarget.vault_id)} · {revealTarget.kind}
              </div>
            </div>
          ) : null}

          {revealError ? <div className="text-sm text-amber-500">{revealError}</div> : null}

          {revealResult ? (
            <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 space-y-2">
              {revealResult.login ? <div className="text-sm text-[var(--text-2)]">login: {revealResult.login}</div> : null}
              {revealResult.url ? <div className="text-sm text-[var(--text-2)] break-all">url: {revealResult.url}</div> : null}
              <div className="text-sm text-[var(--text-2)] break-all">secret: {revealResult.secret}</div>
              {revealResult.note ? <div className="text-sm text-[var(--text-2)] whitespace-pre-wrap">note: {revealResult.note}</div> : null}
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
          <Shield className="w-4 h-4 text-[var(--accent-orange)]" />
          <span>Inventory</span>
        </div>

        <div className="space-y-3 mb-4">
          {items.length ? items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0">
                  <div className="text-[var(--text-1)] break-words">{item.label}</div>
                  <div className="text-sm text-[var(--text-2)]">
                    {prettyVaultLabel(item.vault_id)} · {item.kind} · {formatRelativeTimestamp(item.updated_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReveal(item)}
                    disabled={revealPending}
                    className="text-[var(--text-3)]"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canDelete ? (
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-[var(--text-3)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
              <div className="flex items-center gap-2 text-[var(--text-1)] mb-1">
                <Lock className="w-4 h-4 text-[var(--accent-orange)]" />
                <span>Nenhum item carregado</span>
              </div>
              <div className="text-sm text-[var(--text-2)]">
                A criação e o unlock já rodam no cliente. Falta apenas popular o cofre.
              </div>
            </div>
          )}
        </div>

        <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/vault')}>
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Abrir Vault
        </MobileButton>
      </SurfaceCard>
    </MobilePageShell>
  );
}
