import { TronWeb } from 'tronweb';

import type { SignedTransaction, Transaction } from '@tronweb3/tronwallet-abstract-adapter';

function normalizeTxHash(value: string): string {
  const candidate = value.trim();
  return candidate.startsWith('0x') ? candidate.slice(2) : candidate;
}

function createTronWebClient(rpcUrl?: string | null) {
  return new TronWeb({
    fullHost: rpcUrl?.trim() || 'https://api.trongrid.io',
  });
}

export function isTronAddress(address?: string | null): boolean {
  const candidate = address?.trim();
  if (!candidate) return false;
  return TronWeb.isAddress(candidate);
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

export async function buildUsdtTransferTransaction(params: {
  contractAddress: string;
  to: string;
  amountUnits: string;
  ownerAddress: string;
  rpcUrl?: string | null;
}): Promise<Transaction> {
  const tronWeb = createTronWebClient(params.rpcUrl);
  const transactionWrapper = await tronWeb.transactionBuilder.triggerSmartContract(
    params.contractAddress,
    'transfer(address,uint256)',
    {
      feeLimit: 100_000_000,
      callValue: 0,
    },
    [
      { type: 'address', value: params.to },
      { type: 'uint256', value: params.amountUnits },
    ],
    params.ownerAddress
  );

  if (!transactionWrapper?.result?.result || !transactionWrapper.transaction) {
    throw new Error(transactionWrapper?.result?.message || transactionWrapper?.Error || 'Falha ao montar a transação TRC-20.');
  }

  return transactionWrapper.transaction;
}

export async function broadcastSignedTransaction(params: {
  signedTransaction: SignedTransaction;
  rpcUrl?: string | null;
}): Promise<{ txHash: string }> {
  const tronWeb = createTronWebClient(params.rpcUrl);
  const response = await tronWeb.trx.sendRawTransaction(params.signedTransaction as SignedTransaction);

  if (!response?.result) {
    throw new Error(response?.code || response?.message || 'Falha ao transmitir a transação Tron.');
  }

  const txHash = normalizeTxHash(response.txid || params.signedTransaction.txID || '');
  if (!txHash) {
    throw new Error('A transação Tron não retornou txHash.');
  }

  return { txHash };
}
