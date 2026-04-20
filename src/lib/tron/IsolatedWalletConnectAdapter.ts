import {
  Adapter,
  AdapterState,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletDisconnectionError,
  WalletNotFoundError,
  WalletReadyState,
  WalletSignMessageError,
  WalletSignTransactionError,
  WalletWindowClosedError,
  type AdapterName,
  type SignedTransaction,
  type Transaction,
} from '@tronweb3/tronwallet-abstract-adapter';
import {
  WalletConnectChainID,
  WalletConnectWallet,
  type WalletConnectAdapterConfig,
} from '@tronweb3/walletconnect-tron';
import { UniversalProvider } from '@walletconnect/universal-provider';
import type { SignClientTypes } from '@walletconnect/types';

type WalletConnectSessionStatus = {
  address: string;
};

type PatchedWalletConnectWallet = WalletConnectWallet & {
  provider?: UniversalProvider;
  providerPromise?: Promise<UniversalProvider> | null;
  _client?: unknown;
  _options: SignClientTypes.Options;
  _session?: {
    topic?: string;
    namespaces?: Record<
      string,
      {
        accounts?: string[];
        methods?: string[];
      }
    >;
  };
};

type ConnectOptions = {
  onUri?: (uri: string) => void;
};

export type IsolatedWalletConnectAdapterConfig = WalletConnectAdapterConfig & {
  customStoragePrefix: string;
};

const WALLET_CONNECT_NAME = 'WalletConnect' as AdapterName<'WalletConnect'>;
const WALLET_CONNECT_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="18" fill="#3b99fc"/>' +
      '<path d="M18 26c7.8-7.2 20.2-7.2 28 0l1.7 1.6a2 2 0 010 2.9l-3.8 3.7a1 1 0 01-1.4 0l-2.4-2.4c-4.5-4.1-11.7-4.1-16.2 0L21.5 34a1 1 0 01-1.4 0l-3.8-3.7a2 2 0 010-2.9L18 26zm36.7 6.9l3.4 3.3a2 2 0 010 2.9L42.8 54.4a2 2 0 01-2.8 0l-5.9-5.7a1.5 1.5 0 00-2.2 0L26 54.4a2 2 0 01-2.8 0L7.9 39.1a2 2 0 010-2.9l3.4-3.3a2 2 0 012.8 0L29.3 47a1.5 1.5 0 002.1 0l15.5-14.1a2 2 0 012.8 0z" fill="#fff"/>' +
    '</svg>'
  );

const REQUIRED_TRON_METHODS = ['tron_signTransaction', 'tron_signMessage'];

function resolveWalletConnectChainId(network: WalletConnectAdapterConfig['network']) {
  const mapped = WalletConnectChainID[network as keyof typeof WalletConnectChainID];
  if (mapped) return mapped;
  if (network.startsWith('tron:')) return network;
  return `tron:${network}`;
}

function createWalletConnectWallet(
  config: IsolatedWalletConnectAdapterConfig
): PatchedWalletConnectWallet {
  const wallet = new WalletConnectWallet({
    ...config,
    network: resolveWalletConnectChainId(config.network),
  }) as PatchedWalletConnectWallet;

  wallet.getProvider = async function getIsolatedProvider() {
    if (this.provider) return this.provider;
    if (!this.providerPromise) {
      const options = this._options ?? {};
      const projectId = options.projectId;
      if (!projectId) {
        throw new Error('[WalletConnectWallet] projectId is required to initialize UniversalProvider');
      }

      this.providerPromise = UniversalProvider.init({
        projectId,
        logger: options.logger,
        relayUrl: options.relayUrl,
        metadata: options.metadata,
        storage: (options as SignClientTypes.Options & { storage?: unknown }).storage,
        storageOptions: (options as SignClientTypes.Options & { storageOptions?: unknown }).storageOptions,
        customStoragePrefix: config.customStoragePrefix,
      }).catch((error) => {
        this.providerPromise = null;
        throw error;
      });
    }

    const provider = await this.providerPromise;
    this.provider = provider;
    this._client = provider.client;
    return provider;
  };

  return wallet;
}

export class IsolatedWalletConnectAdapter extends Adapter<'WalletConnect'> {
  name = WALLET_CONNECT_NAME;
  url = 'https://walletconnect.org';
  icon = WALLET_CONNECT_ICON;

  private _readyState = WalletReadyState.Found;
  private _state = AdapterState.Disconnect;
  private _connecting = false;
  private _wallet: PatchedWalletConnectWallet | null = null;
  private _address: string | null = null;
  private readonly _config: IsolatedWalletConnectAdapterConfig;

  constructor(config: IsolatedWalletConnectAdapterConfig) {
    super();

    if (!config || typeof config !== 'object') {
      throw new Error('[WalletConnectAdapter] config is required.');
    }

    if (!config.options) {
      throw new Error('[WalletConnectAdapter] config.options is required.');
    }

    this._config = { ...config };
  }

  private ensureTronSession(wallet: PatchedWalletConnectWallet, address: string) {
    const session = wallet._session ?? wallet.provider?.session;
    const tronNamespace = session?.namespaces?.tron;
    const accounts = tronNamespace?.accounts ?? [];
    const methods = tronNamespace?.methods ?? [];
    const expectedAccount = `${resolveWalletConnectChainId(this._config.network)}:${address}`;
    const hasExpectedAccount = accounts.includes(expectedAccount);
    const hasRequiredMethods = REQUIRED_TRON_METHODS.every((method) => methods.includes(method));

    if (hasExpectedAccount && hasRequiredMethods) {
      return;
    }

    void wallet.disconnect().catch(() => undefined);
    throw new WalletConnectionError(
      'A wallet aprovada no WalletConnect nao abriu uma sessao Tron Mainnet valida. Escaneie o QR com uma wallet Tron compativel ou tente TronLink.'
    );
  }

  private readonly _disconnected = () => {
    const wallet = this._wallet;
    if (!wallet) return;

    wallet.off('disconnect', this._disconnected);
    wallet.off('accountsChanged', this._accountsChanged);
    this._address = null;
    this._state = AdapterState.Disconnect;
    this.emit('disconnect');
    this.emit('stateChanged', this._state);
  };

  private readonly _accountsChanged = (accounts: string[]) => {
    const previousAddress = this.address;
    this._address = accounts[0] || '';
    this.emit('accountsChanged', this.address || '', previousAddress || '');
  };

  get address() {
    return this._address;
  }

  get readyState() {
    return this._readyState;
  }

  get state() {
    return this._state;
  }

  get connecting() {
    return this._connecting;
  }

  async connect(options?: Record<string, unknown>) {
    try {
      if (this.connected || this.connecting) return;
      if (this.state === AdapterState.NotFound) {
        throw new WalletNotFoundError();
      }

      this._connecting = true;
      const { onUri } = (options as ConnectOptions | undefined) ?? {};

      if (!this._wallet) {
        this._wallet = createWalletConnectWallet(this._config);
      }

      let address = '';
      try {
        ({ address } = await this._wallet.connect(onUri ? { onUri } : undefined));
        this.ensureTronSession(this._wallet, address);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? '');
        if (message === 'User closed the connection modal') {
          throw new WalletWindowClosedError();
        }
        throw new WalletConnectionError(message, error);
      }

      this._wallet.on('disconnect', this._disconnected);
      this._wallet.on('accountsChanged', this._accountsChanged);
      this._address = address || '';
      this._state = AdapterState.Connected;
      this.emit('stateChanged', this._state);
      this.emit('connect', address);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect() {
    if (this.state === AdapterState.NotFound || !this.connected) {
      return;
    }

    const wallet = this._wallet;
    if (wallet) {
      wallet.off('disconnect', this._disconnected);
      wallet.off('accountsChanged', this._accountsChanged);
      this._address = null;
      try {
        await wallet.disconnect();
      } catch (error) {
        this.emit('error', new WalletDisconnectionError(error instanceof Error ? error.message : String(error ?? ''), error));
      }
    }

    this._state = AdapterState.Disconnect;
    this.emit('disconnect');
    this.emit('stateChanged', this._state);
  }

  async signTransaction(transaction: Transaction): Promise<SignedTransaction> {
    if (this.state !== AdapterState.Connected) {
      throw new WalletDisconnectedError();
    }

    try {
      const wallet = this._wallet;
      if (!wallet) {
        throw new WalletDisconnectedError();
      }

      try {
        return (await wallet.signTransaction(transaction)) as SignedTransaction;
      } catch (error) {
        throw new WalletSignTransactionError(error instanceof Error ? error.message : String(error ?? ''), error);
      }
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async signMessage(message: string) {
    try {
      if (this.state !== AdapterState.Connected) {
        throw new WalletDisconnectedError();
      }

      const wallet = this._wallet;
      if (!wallet) {
        throw new WalletDisconnectedError();
      }

      try {
        return await wallet.signMessage(message);
      } catch (error) {
        throw new WalletSignMessageError(error instanceof Error ? error.message : String(error ?? ''), error);
      }
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async getConnectionStatus(): Promise<WalletConnectSessionStatus> {
    if (!this._wallet || !this.connected) {
      return { address: '' };
    }

    try {
      const status = (await this._wallet.checkConnectStatus()) as WalletConnectSessionStatus;
      if (status.address) {
        this.ensureTronSession(this._wallet, status.address);
      }
      return status;
    } catch {
      this._address = null;
      this._state = AdapterState.Disconnect;
      return { address: '' };
    }
  }
}
