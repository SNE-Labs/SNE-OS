import { useMemo, useState } from 'react';
import { CheckCircle2, LogOut, QrCode, Smartphone, Wallet } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { formatAddress } from '../../../utils/format';
import { type ConnectMethod, useAuth } from '@/lib/auth/AuthProvider';

type WalletConnectProps = {
  showConnectButton?: boolean;
  showDisconnectButton?: boolean;
};

function methodIcon(method: ConnectMethod) {
  return method === 'walletconnect' ? QrCode : Wallet;
}

function methodMeta(method: ConnectMethod, isMobile: boolean) {
  if (method === 'walletconnect') {
    return {
      title: isMobile ? 'WalletConnect' : 'WalletConnect QR',
      note: isMobile ? 'Abre sua wallet via deep link ou app switch.' : 'Exibe QR code para escanear com a wallet.',
    };
  }

  return {
    title: isMobile ? 'Wallet do navegador' : 'Extensão',
    note: 'MetaMask, Rabby, Brave Wallet e outras wallets injetadas.',
  };
}

function sortConnectionOptions(options: typeof useAuth extends () => infer T ? T extends { connectionOptions: infer O } ? O : never : never, isMobile: boolean) {
  const preferredOrder: ConnectMethod[] = isMobile ? ['walletconnect', 'injected'] : ['injected', 'walletconnect'];
  return [...options].sort((left, right) => preferredOrder.indexOf(left.id) - preferredOrder.indexOf(right.id));
}

export function WalletConnect({
  showConnectButton = false,
  showDisconnectButton = false,
}: WalletConnectProps) {
  const isMobile = useIsMobile();
  const { address, isConnected, isAuthenticated, connect, logout, connectionOptions } = useAuth();

  const [open, setOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<ConnectMethod | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableOptions = useMemo(
    () => sortConnectionOptions(connectionOptions, isMobile),
    [connectionOptions, isMobile]
  );

  const handleLogout = async () => {
    await logout();
  };

  const runConnect = async (method: ConnectMethod) => {
    setPendingMethod(method);
    setErrorMessage(null);

    try {
      await connect(method);
      setOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao conectar carteira.');
    } finally {
      setPendingMethod(null);
    }
  };

  const handlePrimaryAction = async () => {
    if (availableOptions.length === 0) {
      setErrorMessage('Nenhum método de conexão está disponível nesta superfície.');
      return;
    }

    if (availableOptions.length === 1) {
      await runConnect(availableOptions[0].id);
      return;
    }

    setOpen(true);
  };

  if (isAuthenticated && isConnected && address) {
    if (!showDisconnectButton && !showConnectButton) {
      return null;
    }

    return (
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-2)',
            borderColor: 'var(--stroke-1)',
            borderWidth: '1px',
          }}
        >
          <div className="relative">
            <Wallet className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
            <CheckCircle2 className="w-3 h-3 absolute -top-1 -right-1" style={{ color: 'var(--accent-orange)' }} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span
              style={{
                color: 'var(--text-1)',
                fontSize: '0.9rem',
                fontWeight: 600,
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              {formatAddress(address)}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              Sessão autenticada
            </span>
          </div>
        </div>
        {showDisconnectButton ? (
          <button
            onClick={() => void handleLogout()}
            className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <LogOut className="w-4 h-4" />
            Desconectar
          </button>
        ) : null}
      </div>
    );
  }

  if (!showConnectButton) {
    return null;
  }

  const TriggerButton = (
    <button
      onClick={() => void handlePrimaryAction()}
      className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
      style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
    >
      {isMobile ? <Smartphone className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
      {isConnected ? 'Assinar entrada' : isMobile ? 'Abrir carteira' : 'Conectar carteira'}
    </button>
  );

  const optionsBody = (
    <div className="space-y-3">
      {availableOptions.map((option) => {
        const Icon = methodIcon(option.id);
        const meta = methodMeta(option.id, isMobile);
        const isPending = pendingMethod === option.id;
        const isRecommended = availableOptions[0]?.id === option.id;

        return (
          <button
            key={option.id}
            onClick={() => void runConnect(option.id)}
            disabled={Boolean(pendingMethod)}
            className="w-full rounded-2xl p-4 text-left transition-colors"
            style={{
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              opacity: pendingMethod && !isPending ? 0.6 : 1,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'rgba(255,140,66,0.10)', color: 'var(--accent-orange)' }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium" style={{ color: 'var(--text-1)' }}>
                      {meta.title}
                    </div>
                    {isRecommended ? (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                        style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}
                      >
                        recomendado
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                    {option.description}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                    {meta.note}
                  </div>
                </div>
              </div>
              {isPending ? (
                <span className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                  abrindo
                </span>
              ) : null}
            </div>
          </button>
        );
      })}

      {errorMessage ? (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: '1px', borderColor: 'rgba(239,68,68,0.18)', color: 'var(--text-2)' }}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {TriggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent
            className="border-[var(--stroke-1)] bg-[var(--bg-1)]"
            style={{ borderColor: 'var(--stroke-1)', backgroundColor: 'var(--bg-1)' }}
          >
            <DrawerHeader>
              <DrawerTitle style={{ color: 'var(--text-1)' }}>Conectar carteira</DrawerTitle>
              <DrawerDescription style={{ color: 'var(--text-2)' }}>
                No mobile, priorize WalletConnect para abrir MetaMask, Rainbow, Trust e outras wallets por deep link. Se houver wallet no navegador, você pode conectar direto.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-5 space-y-3">
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{ backgroundColor: 'rgba(255,140,66,0.08)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.18)', color: 'var(--text-2)' }}
              >
                O fluxo continua no app da sua wallet e volta para o SNE OS para assinar a entrada.
              </div>
              {optionsBody}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {TriggerButton}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[520px]"
          style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-1)' }}>Conectar carteira</DialogTitle>
            <DialogDescription style={{ color: 'var(--text-2)' }}>
              No desktop, use extensão se a wallet estiver neste navegador. Para outra wallet ou celular, use WalletConnect e escaneie o QR code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}
            >
              Extensão atende melhor o fluxo local. WalletConnect atende melhor quando a wallet está em outro dispositivo.
            </div>
            {optionsBody}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
