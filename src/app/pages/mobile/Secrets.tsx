import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, Eye, FileText, Lock, Plus, Search, Shield, Trash2, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge, EmptyState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import {
  useCreateSecretItem,
  useDeleteSecretItem,
  useSecretItems,
  useSecretsOverview,
  useUpdateSecretItem,
} from '../../../hooks/useSecretsData';
import { WalletConnect } from '../../components/passport/WalletConnect';
import {
  createEncryptedSecretEnvelope,
  createEncryptedSecureNoteEnvelope,
  decryptSecretItem,
  decryptSecureNote,
  type DecryptedSecret,
  type SecretDraft,
  type SecretVaultId,
} from '../../../services/storage/secretsCrypto';
import { secretsApi, type SecretItemSummary } from '../../../services/secrets-api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatAddress } from '@/utils/format';

type NoteDraftState = {
  id: string | null;
  title: string;
  body: string;
};

type StructuredComposerState = {
  vault_id: Exclude<SecretVaultId, 'secure_notes'>;
  label: string;
  secret: string;
  login: string;
  url: string;
  note: string;
};

const NEW_NOTE_ID = '__new_secure_note__';

const INITIAL_NOTE_DRAFT: NoteDraftState = {
  id: null,
  title: '',
  body: '',
};

const INITIAL_STRUCTURED_COMPOSER: StructuredComposerState = {
  vault_id: 'passwords',
  label: '',
  secret: '',
  login: '',
  url: '',
  note: '',
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
  if (vaultId === 'recovery_material') return 'Recovery';
  if (vaultId === 'secure_notes') return 'Notes';
  return 'Passwords';
}

function notePreview(item: SecretItemSummary): string {
  const preview = item.metadata?.preview;
  return typeof preview === 'string' && preview.trim()
    ? preview
    : 'Secure note pronta para abrir.';
}

export function MobileSecrets() {
  const navigate = useNavigate();
  const { address, isAuthenticated } = useAuth();
  const overviewQuery = useSecretsOverview(isAuthenticated && address ? address : null);
  const itemsQuery = useSecretItems(Boolean(isAuthenticated), null, address ?? null);
  const createMutation = useCreateSecretItem();
  const updateMutation = useUpdateSecretItem();
  const deleteMutation = useDeleteSecretItem();

  const [search, setSearch] = useState('');
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteDraftState>(INITIAL_NOTE_DRAFT);
  const [noteDirty, setNoteDirty] = useState(false);
  const [noteSaveError, setNoteSaveError] = useState<string | null>(null);
  const [structuredComposer, setStructuredComposer] = useState<StructuredComposerState>(INITIAL_STRUCTURED_COMPOSER);
  const [structuredError, setStructuredError] = useState<string | null>(null);
  const [revealTarget, setRevealTarget] = useState<SecretItemSummary | null>(null);
  const [revealResult, setRevealResult] = useState<DecryptedSecret | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);

  const overview = overviewQuery.data;
  const ownerKey = overview?.owner?.key ?? null;
  const items = itemsQuery.data?.items ?? [];
  const notes = useMemo(
    () => items.filter((item) => item.vault_id === 'secure_notes'),
    [items]
  );
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((item) => item.label.toLowerCase().includes(query) || notePreview(item).toLowerCase().includes(query));
  }, [notes, search]);
  const otherItems = useMemo(
    () => items.filter((item) => item.vault_id !== 'secure_notes'),
    [items]
  );

  useEffect(() => {
    if (selectedNoteId || !notes.length) return;
    setSelectedNoteId(notes[0].id);
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (!unlockPassphrase || !ownerKey || !selectedNoteId || selectedNoteId === NEW_NOTE_ID) return;
    const selected = notes.find((item) => item.id === selectedNoteId);
    if (!selected) return;

    let active = true;

    async function loadNote() {
      try {
        const fullItem = await secretsApi.getItem(selected.id);
        const decrypted = await decryptSecureNote(ownerKey, unlockPassphrase, fullItem);
        if (!active) return;
        setNoteDraft({ id: fullItem.id, title: decrypted.title, body: decrypted.body });
        setNoteDirty(false);
        setNoteSaveError(null);
      } catch (error) {
        if (!active) return;
        setUnlockError(error instanceof Error ? error.message : 'Falha ao desbloquear a nota.');
      }
    }

    void loadNote();
    return () => {
      active = false;
    };
  }, [notes, ownerKey, selectedNoteId, unlockPassphrase]);

  useEffect(() => {
    if (!unlockPassphrase || !ownerKey || !noteDirty) return;
    if (!noteDraft.title.trim() && !noteDraft.body.trim()) return;

    const timer = window.setTimeout(async () => {
      try {
        setNoteSaveError(null);
        const payload = await createEncryptedSecureNoteEnvelope(ownerKey, {
          id: noteDraft.id ?? undefined,
          title: noteDraft.title.trim() || 'Untitled note',
          body: noteDraft.body,
          passphrase: unlockPassphrase,
        });

        const saved = noteDraft.id
          ? await updateMutation.mutateAsync({ itemId: noteDraft.id, payload })
          : await createMutation.mutateAsync(payload);

        setNoteDraft((current) => ({ ...current, id: saved.id, title: saved.label }));
        setSelectedNoteId(saved.id);
        setNoteDirty(false);
      } catch (error) {
        setNoteSaveError(error instanceof Error ? error.message : 'Falha ao salvar a nota.');
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [createMutation, noteDirty, noteDraft.body, noteDraft.id, noteDraft.title, ownerKey, unlockPassphrase, updateMutation]);

  async function handleUnlock() {
    if (!ownerKey || !unlockInput.trim()) {
      setUnlockError('Informe a passphrase de unlock.');
      return;
    }

    try {
      if (notes.length) {
        const candidate = notes.find((item) => item.id === selectedNoteId) ?? notes[0];
        const fullItem = await secretsApi.getItem(candidate.id);
        await decryptSecureNote(ownerKey, unlockInput, fullItem);
      }

      setUnlockPassphrase(unlockInput);
      setUnlockError(null);
      if (!selectedNoteId && !notes.length) {
        setSelectedNoteId(NEW_NOTE_ID);
      }
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : 'Falha ao validar a passphrase.');
    }
  }

  async function handleCreateStructuredItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerKey || !unlockPassphrase.trim()) {
      setStructuredError('Desbloqueie a sessão antes de criar outros itens cifrados.');
      return;
    }
    if (!structuredComposer.label.trim() || !structuredComposer.secret.trim()) {
      setStructuredError('Label e secret são obrigatórios.');
      return;
    }

    try {
      setStructuredError(null);
      const draft: SecretDraft = {
        vault_id: structuredComposer.vault_id,
        label: structuredComposer.label,
        secret: structuredComposer.secret,
        login: structuredComposer.login,
        url: structuredComposer.url,
        note: structuredComposer.note,
        passphrase: unlockPassphrase,
      };
      const payload = await createEncryptedSecretEnvelope(ownerKey, draft);
      await createMutation.mutateAsync(payload);
      setStructuredComposer(INITIAL_STRUCTURED_COMPOSER);
    } catch (error) {
      setStructuredError(error instanceof Error ? error.message : 'Falha ao guardar item cifrado.');
    }
  }

  async function handleReveal(item: SecretItemSummary) {
    if (!ownerKey || !unlockPassphrase.trim()) {
      setRevealError('Desbloqueie a sessão antes de abrir um envelope.');
      return;
    }

    try {
      setRevealTarget(item);
      setRevealError(null);
      const fullItem = await secretsApi.getItem(item.id);
      const decrypted = await decryptSecretItem(ownerKey, unlockPassphrase, fullItem);
      setRevealResult(decrypted);
    } catch (error) {
      setRevealError(error instanceof Error ? error.message : 'Falha ao abrir o envelope.');
    }
  }

  return (
    <MobilePageShell
      title="Secrets"
      subtitle="Workspace de secure notes com unlock local e autosave."
      showContext
    >
      {!isAuthenticated ? (
        <>
          <SurfaceCard variant="elevated">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent-orange-dim)] text-[var(--accent-orange)] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[var(--text-1)] mb-1">Autentique sua sessão</div>
                <p className="text-sm text-[var(--text-2)]">
                  Secrets agora usa a identidade autenticada como owner lógico do conteúdo seguro.
                </p>
              </div>
            </div>

            <WalletConnect showConnectButton connectButtonLabel="Abrir Secrets" fullWidth />
          </SurfaceCard>
        </>
      ) : (
        <>
          <SurfaceCard variant="elevated">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent-orange-dim)] text-[var(--accent-orange)] flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[var(--text-1)] mb-1">
                  {overview?.surface.address ? formatAddress(overview.surface.address) : 'Sessão ativa'}
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  {notes.length} secure notes, owner {overview?.owner?.type === 'identity' ? 'por identidade' : 'por wallet'}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Owner</div>
                <div className="text-[var(--text-1)] break-all">{ownerKey ?? '--'}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Storage</div>
                <div className="text-[var(--text-1)]">{overview?.storage.backend ?? '--'}</div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Lock className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Unlock</span>
            </div>

            {!unlockPassphrase ? (
              <div className="space-y-3">
                <input
                  type="password"
                  value={unlockInput}
                  onChange={(event) => setUnlockInput(event.target.value)}
                  className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-4 py-3 text-[var(--text-1)] outline-none"
                  placeholder="Passphrase de unlock"
                />
                {unlockError ? <div className="text-sm text-amber-500">{unlockError}</div> : null}
                <MobileButton className="w-full" onClick={() => void handleUnlock()}>
                  Desbloquear workspace
                </MobileButton>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-[var(--text-2)]">
                  Sessão local desbloqueada. A passphrase permanece apenas em memória.
                </div>
                <MobileButton
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setUnlockPassphrase('');
                    setUnlockInput('');
                    setRevealResult(null);
                    setRevealTarget(null);
                  }}
                >
                  Bloquear novamente
                </MobileButton>
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[var(--text-1)]">
                <FileText className="w-4 h-4 text-[var(--accent-orange)]" />
                <span>Notes</span>
              </div>
              <MobileButton variant="secondary" className="px-3 py-2" onClick={() => {
                setSelectedNoteId(NEW_NOTE_ID);
                setNoteDraft(INITIAL_NOTE_DRAFT);
                setNoteDirty(false);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova
              </MobileButton>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] pl-10 pr-3 py-3 text-[var(--text-1)] outline-none"
                placeholder="Buscar notas"
              />
            </div>

            <div className="space-y-3">
              {filteredNotes.length ? filteredNotes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedNoteId(item.id)}
                  className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[var(--text-1)]">{item.label}</div>
                    <Badge variant="neutral" size="sm">{formatRelativeTimestamp(item.updated_at)}</Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)]">{notePreview(item)}</div>
                </button>
              )) : (
                <EmptyState
                  title="Nenhuma secure note"
                  description="Crie a primeira nota segura desta identidade."
                />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[var(--text-1)]">Editor</div>
              <Badge variant={noteDirty ? 'orange' : 'neutral'} size="sm">
                {noteDirty ? 'pendente' : 'ok'}
              </Badge>
            </div>

            {!unlockPassphrase ? (
              <div className="text-sm text-[var(--text-2)]">
                Desbloqueie primeiro para abrir e editar as notas.
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={noteDraft.title}
                  onChange={(event) => {
                    setNoteDraft((current) => ({ ...current, title: event.target.value }));
                    setNoteDirty(true);
                  }}
                  className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-4 py-3 text-[var(--text-1)] outline-none"
                  placeholder="Título da nota"
                />
                <textarea
                  value={noteDraft.body}
                  onChange={(event) => {
                    setNoteDraft((current) => ({ ...current, body: event.target.value }));
                    setNoteDirty(true);
                  }}
                  rows={9}
                  className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-4 py-3 text-[var(--text-1)] outline-none resize-none"
                  placeholder="Conteúdo seguro da nota"
                />
                {noteSaveError ? <div className="text-sm text-amber-500">{noteSaveError}</div> : null}
                <MobileButton
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (noteDraft.id) {
                      deleteMutation.mutate(noteDraft.id);
                      setNoteDraft(INITIAL_NOTE_DRAFT);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover nota
                </MobileButton>
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Plus className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Quick Capture</span>
            </div>

            <form onSubmit={handleCreateStructuredItem} className="space-y-3">
              <select
                value={structuredComposer.vault_id}
                onChange={(event) => setStructuredComposer((current) => ({ ...current, vault_id: event.target.value as StructuredComposerState['vault_id'] }))}
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
              >
                <option value="passwords">Passwords</option>
                <option value="api_keys">API Keys</option>
                <option value="recovery_material">Recovery Material</option>
              </select>
              <input
                value={structuredComposer.label}
                onChange={(event) => setStructuredComposer((current) => ({ ...current, label: event.target.value }))}
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
                placeholder="Label"
              />
              <input
                type="password"
                value={structuredComposer.secret}
                onChange={(event) => setStructuredComposer((current) => ({ ...current, secret: event.target.value }))}
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
                placeholder="Secret"
              />
              <input
                value={structuredComposer.login}
                onChange={(event) => setStructuredComposer((current) => ({ ...current, login: event.target.value }))}
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
                placeholder="Login"
              />
              <input
                value={structuredComposer.url}
                onChange={(event) => setStructuredComposer((current) => ({ ...current, url: event.target.value }))}
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none"
                placeholder="URL / contexto"
              />
              <textarea
                value={structuredComposer.note}
                onChange={(event) => setStructuredComposer((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 text-[var(--text-1)] outline-none resize-none"
                placeholder="Contexto"
              />
              {structuredError ? <div className="text-sm text-amber-500">{structuredError}</div> : null}
              <MobileButton type="submit" className="w-full">
                Guardar item cifrado
              </MobileButton>
            </form>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[var(--text-1)]">
                <Eye className="w-4 h-4 text-[var(--accent-orange)]" />
                <span>Other Envelopes</span>
              </div>
              <Badge variant="neutral" size="sm">{otherItems.length}</Badge>
            </div>

            <div className="space-y-3">
              {otherItems.length ? otherItems.map((item) => (
                <div key={item.id} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <div className="text-[var(--text-1)] break-words">{item.label}</div>
                      <div className="text-sm text-[var(--text-2)]">
                        {prettyVaultLabel(item.vault_id)} · {formatRelativeTimestamp(item.updated_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void handleReveal(item)} className="text-[var(--text-3)]">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(item.id)} className="text-[var(--text-3)]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-[var(--text-2)]">Nenhum outro envelope além das notes.</div>
              )}

              {revealTarget ? (
                <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 space-y-2">
                  <div className="text-[var(--text-1)]">{revealTarget.label}</div>
                  {revealError ? <div className="text-sm text-amber-500">{revealError}</div> : null}
                  {revealResult ? (
                    <>
                      {revealResult.login ? <div className="text-sm text-[var(--text-2)]">login: {revealResult.login}</div> : null}
                      {revealResult.url ? <div className="text-sm text-[var(--text-2)] break-all">url: {revealResult.url}</div> : null}
                      <div className="text-sm text-[var(--text-2)] break-all">secret: {revealResult.secret}</div>
                      {revealResult.note ? <div className="text-sm text-[var(--text-2)] whitespace-pre-wrap">note: {revealResult.note}</div> : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </SurfaceCard>

          <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/vault')}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Abrir Vault
          </MobileButton>
        </>
      )}
    </MobilePageShell>
  );
}
