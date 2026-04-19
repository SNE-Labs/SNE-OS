type TronRequestMethod = 'tron_requestAccounts';

type TronLinkProvider = {
  ready?: boolean;
  request?: (payload: { method: TronRequestMethod }) => Promise<unknown>;
};

type TronContractTransfer = {
  send: (options?: Record<string, unknown>) => Promise<string>;
};

type TronContractInstance = {
  transfer: (to: string, amount: string) => TronContractTransfer;
};

type TronContractFactory = {
  at: (address: string) => Promise<TronContractInstance>;
};

type TronWebLike = {
  defaultAddress?: {
    base58?: string;
    hex?: string;
  };
  contract: () => TronContractFactory;
};

type TronWindow = Window & {
  tronLink?: TronLinkProvider;
  tronWeb?: TronWebLike;
};

function getTronWindow(): TronWindow {
  return window as TronWindow;
}

function resolveInjectedAddress(): string | null {
  return getTronWindow().tronWeb?.defaultAddress?.base58?.trim() || null;
}

function normalizeTxHash(value: string): string {
  const candidate = value.trim();
  return candidate.startsWith('0x') ? candidate.slice(2) : candidate;
}

export function decimalToUnits(value: string, decimals: number): string {
  const candidate = value.trim();
  if (!candidate) {
    throw new Error('Valor de pagamento ausente.');
  }

  const negative = candidate.startsWith('-');
  if (negative) {
    throw new Error('Valor de pagamento inválido.');
  }

  const [wholePartRaw, fractionPartRaw = ''] = candidate.split('.');
  const wholePart = wholePartRaw || '0';
  const sanitizedWhole = wholePart.replace(/^0+(?=\d)/, '') || '0';
  const sanitizedFraction = fractionPartRaw.replace(/[^0-9]/g, '');

  if (sanitizedFraction.length > decimals && /[1-9]/.test(sanitizedFraction.slice(decimals))) {
    throw new Error('Valor com casas decimais acima do permitido.');
  }

  const paddedFraction = sanitizedFraction.slice(0, decimals).padEnd(decimals, '0');
  const combined = `${sanitizedWhole}${paddedFraction}`.replace(/^0+(?=\d)/, '') || '0';
  return BigInt(combined).toString();
}

export async function connectTronWallet(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('TronLink não está disponível neste ambiente.');
  }

  const tronWindow = getTronWindow();
  if (!tronWindow.tronLink && !tronWindow.tronWeb) {
    throw new Error('TronLink não detectado. Instale ou desbloqueie a extensão.');
  }

  if (tronWindow.tronLink?.request) {
    await tronWindow.tronLink.request({ method: 'tron_requestAccounts' });
  }

  const address = resolveInjectedAddress();
  if (!address) {
    throw new Error('Não foi possível obter a wallet Tron conectada.');
  }

  return address;
}

export function isTronLinkAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const tronWindow = getTronWindow();
  return Boolean(tronWindow.tronLink || tronWindow.tronWeb);
}

export function getConnectedTronAddress(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return resolveInjectedAddress();
}

export async function sendUsdtTransfer(params: {
  contractAddress: string;
  to: string;
  amountUnits: string;
  expectedFromAddress?: string | null;
}): Promise<{ buyerAddress: string; txHash: string }> {
  const buyerAddress = await connectTronWallet();
  const expectedFromAddress = params.expectedFromAddress?.trim();
  if (expectedFromAddress && buyerAddress !== expectedFromAddress) {
    throw new Error(`A wallet Tron conectada não corresponde à buyer wallet vinculada (${expectedFromAddress}).`);
  }

  const tronWindow = getTronWindow();
  const contractFactory = tronWindow.tronWeb?.contract;
  if (!contractFactory) {
    throw new Error('TronWeb não foi injetado pela wallet.');
  }

  const contract = await contractFactory().at(params.contractAddress);
  const txHash = await contract.transfer(params.to, params.amountUnits).send({
    feeLimit: 100_000_000,
    shouldPollResponse: false,
  });

  const normalizedTxHash = normalizeTxHash(txHash);
  if (!normalizedTxHash) {
    throw new Error('A transação Tron não retornou txHash.');
  }

  return {
    buyerAddress,
    txHash: normalizedTxHash,
  };
}
