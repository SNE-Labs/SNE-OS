import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Link2, PenSquare, RefreshCcw, Wallet } from 'lucide-react';
import { isAddress } from 'viem';

import { useConfirmPassportWalletLink, useInitPassportWalletLink } from '@/hooks/usePassportData';
import { formatAddress } from '@/utils/format';
import type { PassportLinkInitResponse } from '@/types/passport';

type PassportWalletLinkPanelProps = {
  currentAddress?: string;
  onLinked?: () => void;
};

type LinkStep = 'idle' | 'requested' | 'current-signed' | 'candidate-signed' | 'completed';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereumProvider(): EthereumProvider {
  const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!provider) {
    throw new Error('Nenhuma wallet Web3 foi encontrada neste navegador.');
  }
  return provider;
}

async function getActiveWalletAddress(): Promise<string> {
  const provider = getEthereumProvider();
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error('Nenhuma conta ativa foi retornada pela wallet.');
  }
  return accounts[0].toLowerCase();
}

async function signWithExpectedWallet(expectedAddress: string, message: string): Promise<string> {
  const provider = getEthereumProvider();
  const activeAddress = await getActiveWalletAddress();
  const normalizedExpected = expectedAddress.toLowerCase();

  if (activeAddress !== normalizedExpected) {
    throw new Error(`Selecione ${formatAddress(expectedAddress)} na wallet antes de assinar.`);
  }

  return provider.request({
    method: 'personal_sign',
    params: [message, activeAddress],
  }) as Promise<string>;
}

function getStepState(
  linkRequest: PassportLinkInitResponse | null,
  currentWalletSignature: string | null,
  candidateWalletSignature: string | null,
  success: boolean
): LinkStep {
  if (success) return 'completed';
  if (candidateWalletSignature) return 'candidate-signed';
  if (currentWalletSignature) return 'current-signed';
  if (linkRequest) return 'requested';
  return 'idle';
}

export function PassportWalletLinkPanel({ currentAddress, onLinked }: PassportWalletLinkPanelProps) {
  const initMutation = useInitPassportWalletLink();
  const confirmMutation = useConfirmPassportWalletLink();

  const [candidateAddress, setCandidateAddress] = useState('');
  const [linkRequest, setLinkRequest] = useState<PassportLinkInitResponse | null>(null);
  const [currentWalletSignature, setCurrentWalletSignature] = useState<string | null>(null);
  const [candidateWalletSignature, setCandidateWalletSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const stepState = useMemo(
    () => getStepState(linkRequest, currentWalletSignature, candidateWalletSignature, Boolean(successMessage)),
    [candidateWalletSignature, currentWalletSignature, linkRequest, successMessage]
  );

  const isBusy = initMutation.isPending || confirmMutation.isPending;

  const resetFlow = () => {
    setLinkRequest(null);
    setCurrentWalletSignature(null);
    setCandidateWalletSignature(null);
    setError(null);
    setSuccessMessage(null);
  };

  const startLinkRequest = async () => {
    if (!currentAddress) {
      setError('Conecte a carteira principal antes de iniciar um novo vínculo.');
      return;
    }

    const candidate = candidateAddress.trim();
    if (!candidate) {
      setError('Informe o endereço da carteira que será vinculada.');
      return;
    }
    if (!isAddress(candidate)) {
      setError('Endereço candidato inválido.');
      return;
    }
    if (candidate.toLowerCase() === currentAddress.toLowerCase()) {
      setError('A carteira candidata deve ser diferente da carteira autenticada.');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      const request = await initMutation.mutateAsync(candidate);
      setLinkRequest(request);
      setCurrentWalletSignature(null);
      setCandidateWalletSignature(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao iniciar o vínculo da nova carteira.');
    }
  };

  const signCurrentWallet = async () => {
    if (!currentAddress || !linkRequest) return;

    try {
      setError(null);
      const signature = await signWithExpectedWallet(currentAddress, linkRequest.current_wallet_message);
      setCurrentWalletSignature(signature);
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : 'Falha ao assinar com a carteira atual.');
    }
  };

  const signCandidateWallet = async () => {
    if (!linkRequest) return;

    try {
      setError(null);
      const signature = await signWithExpectedWallet(linkRequest.candidate_address, linkRequest.candidate_wallet_message);
      setCandidateWalletSignature(signature);
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : 'Falha ao assinar com a carteira candidata.');
    }
  };

  const confirmLink = async () => {
    if (!linkRequest || !currentWalletSignature || !candidateWalletSignature) {
      setError('As duas assinaturas são obrigatórias para concluir o vínculo.');
      return;
    }

    try {
      setError(null);
      await confirmMutation.mutateAsync({
        requestId: linkRequest.request_id,
        currentWalletSignature,
        candidateWalletSignature,
      });
      setSuccessMessage(`A carteira ${formatAddress(linkRequest.candidate_address)} agora faz parte do mesmo Passport.`);
      setCandidateAddress('');
      setLinkRequest(null);
      setCurrentWalletSignature(null);
      setCandidateWalletSignature(null);
      onLinked?.();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Falha ao confirmar o vínculo da nova carteira.');
    }
  };

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
            Vincular nova carteira
          </div>
          <div className="text-sm max-w-2xl" style={{ color: 'var(--text-2)' }}>
            O vínculo não cria outro identity id. Ele adiciona uma nova wallet ao checkpoint atual depois de duas provas de posse.
          </div>
        </div>
        <button
          onClick={resetFlow}
          className="px-3 py-2 rounded-lg inline-flex items-center gap-2 text-sm"
          style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <RefreshCcw className="w-4 h-4" />
          Reiniciar fluxo
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.85fr)] gap-4">
        <div className="space-y-4">
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <label className="text-[11px] uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-3)' }}>
              Carteira a vincular
            </label>
            <input
              type="text"
              value={candidateAddress}
              onChange={(event) => {
                setCandidateAddress(event.target.value);
                if (linkRequest || currentWalletSignature || candidateWalletSignature || successMessage) {
                  resetFlow();
                } else {
                  setError(null);
                  setSuccessMessage(null);
                }
              }}
              placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              className="w-full rounded-lg px-4 py-3 font-mono text-sm"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
            />
            <div className="flex flex-wrap gap-3 mt-3">
              <button
                onClick={startLinkRequest}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
              >
                <Link2 className="w-4 h-4" />
                Gerar desafio
              </button>
              <div className="text-sm self-center" style={{ color: 'var(--text-3)' }}>
                Comece com a wallet autenticada. Depois troque a conta ativa na extensão para a wallet nova e assine a segunda prova.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={signCurrentWallet}
              disabled={!linkRequest || isBusy}
              className="rounded-lg p-4 text-left disabled:opacity-50"
              style={{ backgroundColor: stepState === 'current-signed' || stepState === 'candidate-signed' || stepState === 'completed' ? 'rgba(255,140,66,0.12)' : 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <PenSquare className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                {currentWalletSignature ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} /> : null}
              </div>
              <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>1. Aprovar vínculo</div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                Assine com {currentAddress ? formatAddress(currentAddress) : 'a carteira atual do Passport'} para autorizar a entrada.
              </div>
            </button>

            <button
              onClick={signCandidateWallet}
              disabled={!linkRequest || !currentWalletSignature || isBusy}
              className="rounded-lg p-4 text-left disabled:opacity-50"
              style={{ backgroundColor: stepState === 'candidate-signed' || stepState === 'completed' ? 'rgba(255,140,66,0.12)' : 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <Wallet className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                {candidateWalletSignature ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} /> : null}
              </div>
              <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>2. Confirmar posse</div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                Troque a conta ativa da extensão para {linkRequest ? formatAddress(linkRequest.candidate_address) : 'a carteira nova'} e assine.
              </div>
            </button>

            <button
              onClick={confirmLink}
              disabled={!currentWalletSignature || !candidateWalletSignature || isBusy}
              className="rounded-lg p-4 text-left disabled:opacity-50"
              style={{ backgroundColor: stepState === 'completed' ? 'rgba(255,140,66,0.12)' : 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              </div>
              <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>3. Fechar vínculo</div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                O backend valida as duas assinaturas. Se a wallet nova já estiver ligada a outro Passport, o vínculo é recusado.
              </div>
            </button>
          </div>
        </div>

        <div
          className="rounded-lg p-4 space-y-4"
          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-3)' }}>
              Estado do fluxo
            </div>
            <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
              {stepState === 'idle' && 'Pronto para iniciar'}
              {stepState === 'requested' && 'Desafio gerado'}
              {stepState === 'current-signed' && 'Aprovação da carteira atual registrada'}
              {stepState === 'candidate-signed' && 'Duas assinaturas coletadas'}
              {stepState === 'completed' && 'Carteira vinculada'}
            </div>
          </div>

          <div
            className="rounded-lg p-4 space-y-3 text-sm"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}
          >
            <div>
              <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
                Wallet atual
              </span>
              {currentAddress ? formatAddress(currentAddress) : 'Sessão atual não resolvida'}
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
                Wallet candidata
              </span>
              {linkRequest
                ? formatAddress(linkRequest.candidate_address)
                : isAddress(candidateAddress.trim())
                  ? formatAddress(candidateAddress.trim())
                  : candidateAddress.trim() || 'Aguardando endereço'}
            </div>
            <div>
              No mesmo navegador, troque a conta ativa dentro da wallet antes da etapa 2. Se a wallet nova estiver em outro dispositivo, faça essa segunda assinatura lá e volte para concluir.
            </div>
          </div>

          {linkRequest ? (
            <div className="space-y-3 text-sm" style={{ color: 'var(--text-2)' }}>
              <div>
                <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
                  Pedido
                </span>
                {linkRequest.request_id}
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
                  Carteira candidata
                </span>
                {formatAddress(linkRequest.candidate_address)}
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>
                  Expira em
                </span>
                {new Date(linkRequest.expires_at).toLocaleString('pt-BR')}
              </div>
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
              Gere o desafio primeiro. A partir daí o painel mostra o pedido, a carteira candidata e o prazo de expiração.
            </div>
          )}

          {error ? (
            <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(208, 76, 55, 0.12)', color: 'var(--danger-red)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--text-1)' }}>
              <CheckCircle2 className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-orange)' }} />
              <span className="text-sm">{successMessage}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
