import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Eye,
  FileText,
  KeyRound,
  Lock,
  Plus,
  Save,
  Search,
  Server,
  Shield,
  Trash2,
  Wallet,
} from 'lucide-react';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { WalletConnect } from '../components/passport/WalletConnect';
import {
  useCreateSecretItem,
  useDeleteSecretItem,
  useSecretItems,
  useSecretsOverview,
  useUpdateSecretItem,
} from '../../hooks/useSecretsData';
import { usePassportIdentity } from '../../hooks/usePassportData';
import { formatAddress } from '@/utils/format';
import {
  createEncryptedSecretEnvelope,
  createEncryptedSecureNoteEnvelope,
  decryptSecretItem,
  decryptSecureNote,
  type DecryptedSecret,
  type SecretDraft,
  type SecretVaultId,
} from '../../services/storage/secretsCrypto';
import { secretsApi, type SecretItemSummary } from '../../services/secrets-api';
import { useAuth } from '@/lib/auth/AuthProvider';

type StructuredComposerState = {
  vault_id: Exclude<SecretVaultId, 'secure_notes'>;
  label: string;
  login: string;
  url: string;
  secret: string;
  note: string;
};

type NoteDraftState = {
  id: string | null;
  title: string;
  body: string;
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
  login: '',
  url: '',
  secret: '',
  note: '',
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
  if (vaultId === 'secure_notes') return 'Secure Notes';
  if (vaultId === 'recovery_material') return 'Recovery Material';
  return 'Passwords';
}

function localizeSyncMode(value?: string | null): string {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (!normalized) return '--';
  if (normalized === 'local-first') return 'Somente neste dispositivo';
  if (normalized === 'client-side-encrypted') return 'Cifrado no cliente';
  if (normalized === 'disabled') return 'Desativado';
  return value || '--';
}

function notePreview(item: SecretItemSummary): string {
  return item.label === 'Locked note'
    ? 'Conteúdo e título ficam ocultos até o unlock local.'
    : 'Nota segura pronta para abrir nesta identidade.';
}

function fieldStyle() {
  return {
    backgroundColor: 'var(--bg-2)',
    borderWidth: '1px',
    borderColor: 'var(--stroke-1)',
    color: 'var(--text-1)',
  } as const;
}

export function Secrets() {
  const { address, isAuthenticated } = useAuth();
  const overviewQuery = useSecretsOverview(isAuthenticated && address ? address : null);
  const passportIdentityQuery = usePassportIdentity(isAuthenticated);
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
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [structuredComposer, setStructuredComposer] = useState<StructuredComposerState>(INITIAL_STRUCTURED_COMPOSER);
  const [structuredError, setStructuredError] = useState<string | null>(null);
  const [revealTarget, setRevealTarget] = useState<SecretItemSummary | null>(null);
  const [revealResult, setRevealResult] = useState<DecryptedSecret | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealPending, setRevealPending] = useState(false);

  const overview = overviewQuery.data;
  const ownerKey =
    overview?.owner?.key ??
    passportIdentityQuery.data?.identity_id ??
    address ??
    null;
  const allItems = itemsQuery.data?.items ?? [];

  const secureNotes = useMemo(
    () =>
      allItems
        .filter((item) => item.vault_id === 'secure_notes')
        .sort((left, right) => `${right.updated_at || ''}`.localeCompare(`${left.updated_at || ''}`)),
    [allItems]
  );

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return secureNotes;
    return secureNotes.filter((item) => {
      const title = item.label.toLowerCase();
      const preview = notePreview(item).toLowerCase();
      return title.includes(query) || preview.includes(query);
    });
  }, [search, secureNotes]);

  const nonNoteItems = useMemo(
    () => allItems.filter((item) => item.vault_id !== 'secure_notes'),
    [allItems]
  );

  useEffect(() => {
    if (selectedNoteId) return;
    if (!secureNotes.length) return;
    setSelectedNoteId(secureNotes[0].id);
  }, [secureNotes, selectedNoteId]);

  useEffect(() => {
    if (!unlockPassphrase || !ownerKey) return;
    if (!selectedNoteId || selectedNoteId === NEW_NOTE_ID) {
      setNoteDraft((current) => (current.id ? INITIAL_NOTE_DRAFT : current));
      return;
    }

    const selected = secureNotes.find((item) => item.id === selectedNoteId);
    if (!selected) return;

    let active = true;

    async function loadSelectedNote() {
      try {
        const fullItem = await secretsApi.getItem(selected.id);
        const decrypted = await decryptSecureNote(ownerKey, unlockPassphrase, fullItem);
        if (!active) return;
        setNoteDraft({
          id: fullItem.id,
          title: decrypted.title,
          body: decrypted.body,
        });
        setNoteDirty(false);
        setNoteSaveError(null);
      } catch (error) {
        if (!active) return;
        setUnlockError(error instanceof Error ? error.message : 'Falha ao desbloquear a nota.');
      }
    }

    void loadSelectedNote();

    return () => {
      active = false;
    };
  }, [ownerKey, selectedNoteId, secureNotes, unlockPassphrase]);

  useEffect(() => {
    if (!unlockPassphrase || !ownerKey || !isAuthenticated || !address) return;
    if (!noteDirty) return;
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

        setNoteDraft((current) => ({
          ...current,
          id: saved.id,
        }));
        setSelectedNoteId(saved.id);
        setNoteDirty(false);
        setLastSavedAt(new Date().toISOString());
      } catch (error) {
        setNoteSaveError(error instanceof Error ? error.message : 'Falha ao salvar a nota.');
      }
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    address,
    createMutation,
    isAuthenticated,
    noteDirty,
    noteDraft.body,
    noteDraft.id,
    noteDraft.title,
    ownerKey,
    unlockPassphrase,
    updateMutation,
  ]);

  async function handleUnlock() {
    if (!ownerKey) {
      setUnlockError('Secrets ainda não possui um owner key resolvido para esta sessão.');
      return;
    }
    if (!unlockInput.trim()) {
      setUnlockError('Informe a passphrase de unlock.');
      return;
    }

    try {
      if (secureNotes.length) {
        const candidate = secureNotes.find((item) => item.id === selectedNoteId) ?? secureNotes[0];
        const fullItem = await secretsApi.getItem(candidate.id);
        await decryptSecureNote(ownerKey, unlockInput, fullItem);
      }

      setUnlockPassphrase(unlockInput);
      setUnlockError(null);

      if (!selectedNoteId && !secureNotes.length) {
        setSelectedNoteId(NEW_NOTE_ID);
        setNoteDraft(INITIAL_NOTE_DRAFT);
      }
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : 'Falha ao validar a passphrase.');
    }
  }

  function handleNewNote() {
    setSelectedNoteId(NEW_NOTE_ID);
    setNoteDraft(INITIAL_NOTE_DRAFT);
    setNoteDirty(false);
    setNoteSaveError(null);
  }

  async function handleDeleteSelectedNote() {
    if (!noteDraft.id) {
      setNoteDraft(INITIAL_NOTE_DRAFT);
      setSelectedNoteId(secureNotes[0]?.id ?? null);
      return;
    }

    const confirmed = window.confirm('Remover esta nota segura?');
    if (!confirmed) return;

    await deleteMutation.mutateAsync(noteDraft.id);
    const nextNote = secureNotes.find((item) => item.id !== noteDraft.id);
    setSelectedNoteId(nextNote?.id ?? null);
    setNoteDraft(INITIAL_NOTE_DRAFT);
    setNoteDirty(false);
    setRevealResult(null);
    setRevealTarget(null);
  }

  async function handleCreateStructuredItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ownerKey || !unlockPassphrase.trim()) {
      setStructuredError('Desbloqueie a sessão antes de guardar outros itens cifrados.');
      return;
    }

    if (!structuredComposer.label.trim() || !structuredComposer.secret.trim()) {
      setStructuredError('Label e secret continuam obrigatórios para itens estruturados.');
      return;
    }

    try {
      setStructuredError(null);
      const draft: SecretDraft = {
        vault_id: structuredComposer.vault_id,
        label: structuredComposer.label,
        login: structuredComposer.login,
        url: structuredComposer.url,
        secret: structuredComposer.secret,
        note: structuredComposer.note,
        passphrase: unlockPassphrase,
      };
      const payload = await createEncryptedSecretEnvelope(ownerKey, draft);
      await createMutation.mutateAsync(payload);
      setStructuredComposer(INITIAL_STRUCTURED_COMPOSER);
    } catch (error) {
      setStructuredError(error instanceof Error ? error.message : 'Falha ao criar item cifrado.');
    }
  }

  async function handleReveal(item: SecretItemSummary) {
    if (!ownerKey || !unlockPassphrase.trim()) {
      setRevealError('Desbloqueie a sessão antes de abrir um envelope.');
      return;
    }

    setRevealTarget(item);
    setRevealPending(true);
    setRevealError(null);
    setRevealResult(null);

    try {
      const fullItem = await secretsApi.getItem(item.id);
      const decrypted = await decryptSecretItem(ownerKey, unlockPassphrase, fullItem);
      setRevealResult(decrypted);
    } catch (error) {
      setRevealError(error instanceof Error ? error.message : 'Falha ao descriptografar o envelope.');
    } finally {
      setRevealPending(false);
    }
  }

  const noteSaveState = noteSaveError
    ? noteSaveError
    : noteDirty
      ? 'Alterações pendentes'
      : lastSavedAt
        ? `Salvo ${formatRelativeTimestamp(lastSavedAt)}`
        : 'Pronto';

  return (
    <div className="flex flex-1">
      <div className="flex-1 px-6 py-6 overflow-y-auto xl:px-8">
        <div className="mx-auto max-w-[1520px] space-y-5">
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
                  Secure Notes com fluxo contínuo, não formulário técnico.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  Toda nota continua cifrada no cliente, mas a UX agora é de editor simples: unlock uma vez, abrir, escrever e deixar o autosave cuidar do resto.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Notas</div>
                    <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{secureNotes.length}</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      secure notes resolvidas para o mesmo owner key da identidade.
                    </div>
                  </div>

                  <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Owner</div>
                    <div className="font-semibold mb-1 break-all" style={{ color: 'var(--text-1)' }}>
                      {ownerKey ?? '--'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.owner?.type === 'identity' ? 'Persistindo por identity checkpoint.' : 'Fallback por wallet.'}
                    </div>
                  </div>

                  <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Modo</div>
                    <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                      {localizeSyncMode(overview?.surface.mode)}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.storage.configured ? 'Ciphertext persistido no storage configurado.' : 'Storage ainda indisponível.'}
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
                      {isAuthenticated ? 'Sessão autenticada. O unlock local controla leitura e escrita.' : 'Secrets agora exige sessão autenticada para ser consistente com o usuário.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <WalletConnect
                    showConnectButton
                    showDisconnectButton
                    connectButtonLabel="Abrir Secrets com SIWE"
                    fullWidth
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Storage</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{overview?.storage.backend ?? '--'}</div>
                    </div>
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Sync</div>
                      <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>{overview?.sync.backend ?? '--'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {!isAuthenticated ? (
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
              <ModuleStateCard
                tone="disconnected"
                title="Autentique a sessão"
                description="Secrets agora usa a identidade autenticada como owner lógico do workspace seguro. Conecte e assine SIWE para abrir suas notas."
              />
            </div>
          ) : overviewQuery.isLoading ? (
            <ModuleStateCard
              tone="loading"
              title="Preparando workspace seguro"
              description="Resolvendo owner key, storage, sync e inventário cifrado."
            />
          ) : overviewQuery.isError ? (
            <ModuleStateCard
              tone="error"
              title="Falha ao carregar Secrets"
              description="A superfície segura não pôde ser resolvida agora."
              actionLabel="Tentar novamente"
              onAction={() => overviewQuery.refetch()}
            />
          ) : (
            <>
              <section className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5">
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Secure Notes
                    </div>
                    <button
                      onClick={handleNewNote}
                      className="rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                    >
                      <Plus className="w-4 h-4" />
                      Nova
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar notas"
                      className="w-full rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none"
                      style={fieldStyle()}
                    />
                  </div>

                  <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                    {filteredNotes.length ? filteredNotes.map((item) => {
                      const active = item.id === selectedNoteId;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedNoteId(item.id)}
                          className="w-full rounded-xl p-4 text-left"
                          style={{
                            backgroundColor: active ? 'rgba(255,140,66,0.12)' : 'var(--bg-3)',
                            borderWidth: '1px',
                            borderColor: active ? 'rgba(255,140,66,0.24)' : 'var(--stroke-1)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>{item.label}</div>
                            <div className="text-[11px] uppercase whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                              {formatRelativeTimestamp(item.updated_at)}
                            </div>
                          </div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            {notePreview(item)}
                          </div>
                        </button>
                      );
                    }) : (
                      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Nenhuma nota encontrada</div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Crie a primeira secure note ou ajuste o filtro.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Editor Seguro
                      </div>
                      <div className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                        Uma passphrase por sessão local. Depois disso, o fluxo é abrir, escrever e autosalvar.
                      </div>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wide"
                      style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      {noteSaveState}
                    </div>
                  </div>

                  {!unlockPassphrase ? (
                    <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}>
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Desbloqueie a sessão</div>
                          <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                            A passphrase fica só em memória local. O backend continua recebendo apenas envelope cifrado.
                          </div>
                        </div>
                      </div>

                      <input
                        type="password"
                        value={unlockInput}
                        onChange={(event) => setUnlockInput(event.target.value)}
                        className="w-full rounded-lg px-3 py-3 text-sm outline-none"
                        style={fieldStyle()}
                        placeholder="Passphrase de unlock"
                      />

                      {unlockError ? (
                        <div className="text-sm" style={{ color: '#f59e0b' }}>{unlockError}</div>
                      ) : null}

                      <button
                        onClick={() => void handleUnlock()}
                        className="rounded-lg px-4 py-3 inline-flex items-center gap-2 text-sm font-medium"
                        style={{ backgroundColor: 'var(--accent-orange)', color: '#fff' }}
                      >
                        <Shield className="w-4 h-4" />
                        Desbloquear workspace
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Session unlock ativo para este owner.
                        </div>
                        <button
                          onClick={() => {
                            setUnlockPassphrase('');
                            setUnlockInput('');
                            setUnlockError(null);
                            setRevealResult(null);
                            setRevealTarget(null);
                          }}
                          className="rounded-lg px-3 py-2 text-sm"
                          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                        >
                          Bloquear
                        </button>
                      </div>

                      <input
                        value={noteDraft.title}
                        onChange={(event) => {
                          setNoteDraft((current) => ({ ...current, title: event.target.value }));
                          setNoteDirty(true);
                        }}
                        className="w-full rounded-lg px-4 py-3 text-xl font-semibold outline-none"
                        style={fieldStyle()}
                        placeholder="Título da nota"
                      />

                      <textarea
                        value={noteDraft.body}
                        onChange={(event) => {
                          setNoteDraft((current) => ({ ...current, body: event.target.value }));
                          setNoteDirty(true);
                        }}
                        rows={18}
                        className="w-full rounded-lg px-4 py-4 text-sm outline-none resize-none"
                        style={fieldStyle()}
                        placeholder="Escreva aqui. Cada alteração gera um novo envelope cifrado por autosave."
                      />

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                          <Save className="w-4 h-4" />
                          {noteDraft.body ? 'Autosave cifra titulo e corpo antes de persistir' : 'Sem conteúdo ainda'}
                        </div>
                        <button
                          onClick={() => void handleDeleteSelectedNote()}
                          className="rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm"
                          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover nota
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Quick Capture para outros cofres
                    </div>
                  </div>

                  <form onSubmit={handleCreateStructuredItem} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={structuredComposer.vault_id}
                        onChange={(event) => setStructuredComposer((current) => ({ ...current, vault_id: event.target.value as StructuredComposerState['vault_id'] }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={fieldStyle()}
                      >
                        <option value="passwords">Passwords</option>
                        <option value="api_keys">API Keys</option>
                        <option value="recovery_material">Recovery Material</option>
                      </select>

                      <input
                        value={structuredComposer.label}
                        onChange={(event) => setStructuredComposer((current) => ({ ...current, label: event.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={fieldStyle()}
                        placeholder="Label"
                      />

                      <input
                        value={structuredComposer.login}
                        onChange={(event) => setStructuredComposer((current) => ({ ...current, login: event.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={fieldStyle()}
                        placeholder="Login / username"
                      />

                      <input
                        value={structuredComposer.url}
                        onChange={(event) => setStructuredComposer((current) => ({ ...current, url: event.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={fieldStyle()}
                        placeholder="URL / contexto"
                      />

                      <input
                        type="password"
                        value={structuredComposer.secret}
                        onChange={(event) => setStructuredComposer((current) => ({ ...current, secret: event.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none md:col-span-2"
                        style={fieldStyle()}
                        placeholder="Secret"
                      />
                    </div>

                    <textarea
                      value={structuredComposer.note}
                      onChange={(event) => setStructuredComposer((current) => ({ ...current, note: event.target.value }))}
                      rows={4}
                      className="w-full rounded-lg px-3 py-3 text-sm outline-none resize-none"
                      style={fieldStyle()}
                      placeholder="Contexto operacional, recovery hints ou observações"
                    />

                    {structuredError ? (
                      <div className="text-sm" style={{ color: '#f59e0b' }}>{structuredError}</div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="rounded-lg px-4 py-3 inline-flex items-center gap-2 text-sm font-medium"
                      style={{ backgroundColor: 'var(--accent-orange)', color: '#fff' }}
                    >
                      <Plus className="w-4 h-4" />
                      Guardar item cifrado
                    </button>
                  </form>
                </div>

                <div className="space-y-5">
                  <div
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Server className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Surface de armazenamento
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Storage</div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>{overview?.storage.detail}</div>
                      </div>
                      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Policy</div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Sem plaintext server-side, exportação ciphertext-only e custódia do usuário.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Outros envelopes cifrados
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

                    <div className="space-y-3 mb-4">
                      {nonNoteItems.length ? nonNoteItems.map((item) => (
                        <div key={item.id} className="rounded-lg p-4 flex items-start justify-between gap-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                          <div className="min-w-0">
                            <div className="font-semibold break-words mb-1" style={{ color: 'var(--text-1)' }}>{item.label}</div>
                            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                              {prettyVaultLabel(item.vault_id)} · {item.kind} · {formatRelativeTimestamp(item.updated_at)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => void handleReveal(item)}
                              disabled={revealPending}
                              className="rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm"
                              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}
                            >
                              <Eye className="w-4 h-4" />
                              Reveal
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                              className="rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm"
                              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Remover
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Nenhum item estruturado além das secure notes.
                          </div>
                        </div>
                      )}
                    </div>

                    {revealTarget ? (
                      <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {revealTarget.label}
                          </div>
                        </div>
                        {revealError ? <div className="text-sm" style={{ color: '#f59e0b' }}>{revealError}</div> : null}
                        {revealResult ? (
                          <>
                            {revealResult.login ? <div className="text-sm" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>login:</span> {revealResult.login}</div> : null}
                            {revealResult.url ? <div className="text-sm break-all" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>url:</span> {revealResult.url}</div> : null}
                            <div className="text-sm break-all" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>secret:</span> {revealResult.secret}</div>
                            {revealResult.note ? <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>note:</span> {revealResult.note}</div> : null}
                          </>
                        ) : (
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            {revealPending ? 'Descriptografando envelope...' : 'Pronto para revelar com a passphrase já desbloqueada.'}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
