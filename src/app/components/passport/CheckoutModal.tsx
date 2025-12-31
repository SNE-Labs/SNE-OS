import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useAccount, useBalance as useWagmiBalance } from 'wagmi';
import { useGasPrice } from '../../../hooks/usePassportData';
import { Wallet, Zap, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import type { Product } from '../../../types/passport';
import { formatTokenValue, formatAddress } from '../../../utils/format';
import { parseEther } from 'viem';

interface CheckoutModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de checkout para compra de produtos
 * Mostra balance, gas estimate e permite confirmar compra
 */
export function CheckoutModal({ product, open, onOpenChange }: CheckoutModalProps) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useWagmiBalance({ address: address || undefined });
  const { data: gasPrice } = useGasPrice();
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!open) {
      setIsProcessing(false);
      setTxHash(null);
      setError(null);
    }
  }, [open]);

  // Gas estimate (simplificado - assumindo ~100k gas para compra)
  const estimatedGas = gasPrice ? BigInt(100000) * BigInt(gasPrice.gasPrice) : null;
  const estimatedGasFormatted = estimatedGas
    ? formatTokenValue(estimatedGas.toString(), 18, 6)
    : '—';

  // Preço do produto em wei
  const productPriceWei = product?.priceETH ? parseEther(product.priceETH) : null;

  // Verificar se tem balance suficiente
  const hasEnoughBalance = balance && productPriceWei
    ? balance.value >= productPriceWei + (estimatedGas || BigInt(0))
    : false;

  // TODO: Implementar writeContract quando contratos estiverem disponíveis
  const handleConfirmPurchase = async () => {
    if (!product || !isConnected || !address) {
      setError('Wallet não conectada');
      return;
    }

    if (!hasEnoughBalance) {
      setError('Balance insuficiente para esta compra');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Implementar chamada real ao contrato
      // Por enquanto, simula uma transação
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular hash de transação
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      setTxHash(mockTxHash);

      // TODO: Quando contratos estiverem disponíveis:
      // const { writeContract } = useWriteContract();
      // const hash = await writeContract({
      //   address: product.contractAddress as `0x${string}`,
      //   abi: [...],
      //   functionName: 'purchase',
      //   value: productPriceWei,
      // });
      // setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar compra');
      setIsProcessing(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={{ backgroundColor: 'var(--sne-surface-1)', borderColor: 'var(--border)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--sne-text-primary)' }}>
            Confirmar Compra
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--sne-text-secondary)' }}>
            Revise os detalhes antes de confirmar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Produto */}
          <div className="p-4 rounded border" style={{ backgroundColor: 'var(--sne-bg)', borderColor: 'var(--border)' }}>
            <h4 style={{ color: 'var(--sne-text-primary)', fontWeight: 600, marginBottom: 8 }}>
              {product.title}
            </h4>
            {product.features && product.features.length > 0 && (
              <div className="mb-3">
                <div style={{ color: 'var(--sne-text-secondary)', fontSize: '0.85rem', marginBottom: 4 }}>
                  <strong>Características:</strong>
                </div>
                <ul className="space-y-1" style={{ paddingLeft: 20 }}>
                  {product.features.map((feature, idx) => (
                    <li key={idx} style={{ color: 'var(--sne-text-secondary)', fontSize: '0.85rem', listStyleType: 'disc' }}>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Balance */}
          {isConnected && address ? (
            <div className="p-3 rounded border" style={{ backgroundColor: 'var(--sne-bg)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" style={{ color: 'var(--sne-accent)' }} />
                  <span style={{ color: 'var(--sne-text-secondary)', fontSize: '0.9rem' }}>
                    Seu Balance
                  </span>
                </div>
                <span style={{ color: 'var(--sne-text-primary)', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
                  {balance ? formatTokenValue(balance.value.toString(), 18, 4) : '—'} ETH
                </span>
              </div>
              <div style={{ color: 'var(--sne-text-secondary)', fontSize: '0.75rem' }}>
                {formatAddress(address)}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded border" style={{ backgroundColor: 'var(--sne-bg)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{ color: 'var(--sne-critical)' }} />
                <span style={{ color: 'var(--sne-text-secondary)', fontSize: '0.9rem' }}>
                  Conecte sua wallet para continuar
                </span>
              </div>
            </div>
          )}

          {/* Resumo de Preços */}
          <div className="p-3 rounded border" style={{ backgroundColor: 'var(--sne-bg)', borderColor: 'var(--border)' }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--sne-text-secondary)', fontSize: '0.9rem' }}>Produto</span>
                <span style={{ color: 'var(--sne-text-primary)', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
                  {product.priceETH ? `${product.priceETH} ETH` : `$${product.priceUSD}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: 'var(--sne-text-secondary)' }} />
                  <span style={{ color: 'var(--sne-text-secondary)', fontSize: '0.9rem' }}>Gas (estimado)</span>
                </div>
                <span style={{ color: 'var(--sne-text-secondary)', fontSize: '0.9rem', fontFamily: 'var(--font-family-mono)' }}>
                  {gasPrice ? estimatedGasFormatted : <Skeleton className="h-4 w-16 inline-block" />} ETH
                </span>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--sne-text-primary)', fontWeight: 600 }}>Total</span>
                  <span style={{ color: 'var(--sne-accent)', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-family-mono)' }}>
                    {product.priceETH && estimatedGas
                      ? `${(Number(product.priceETH) + Number(estimatedGasFormatted)).toFixed(6)} ETH`
                      : product.priceETH || `$${product.priceUSD}`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso de Balance Insuficiente */}
          {isConnected && !hasEnoughBalance && balance && (
            <div className="p-3 rounded border flex items-center gap-2" style={{ backgroundColor: 'var(--sne-surface-elevated)', borderColor: 'var(--sne-critical)' }}>
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--sne-critical)' }} />
              <span style={{ color: 'var(--sne-critical)', fontSize: '0.85rem' }}>
                Balance insuficiente. Você precisa de mais ETH para esta compra.
              </span>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="p-3 rounded border flex items-center gap-2" style={{ backgroundColor: 'var(--sne-surface-elevated)', borderColor: 'var(--sne-critical)' }}>
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--sne-critical)' }} />
              <span style={{ color: 'var(--sne-critical)', fontSize: '0.85rem' }}>
                {error}
              </span>
            </div>
          )}

          {/* Status da Transação */}
          {txHash && (
            <div className="p-3 rounded border" style={{ backgroundColor: 'var(--sne-bg)', borderColor: 'var(--sne-accent)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--sne-accent)' }} />
                <span style={{ color: 'var(--sne-text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  Transação Enviada!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.8rem', color: 'var(--sne-text-secondary)' }}>
                  {formatAddress(txHash)}
                </code>
                <a
                  href={`https://scrollscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                  style={{ color: 'var(--sne-accent)' }}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="text-xs">Ver no Explorer</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmPurchase}
            disabled={!isConnected || !hasEnoughBalance || isProcessing || !!txHash}
            className="flex items-center gap-2"
            style={{
              backgroundColor: hasEnoughBalance && !txHash ? 'var(--sne-accent)' : 'var(--sne-surface-elevated)',
              color: hasEnoughBalance && !txHash ? '#0B0B0B' : 'var(--sne-text-secondary)',
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : txHash ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Concluído
              </>
            ) : (
              'Confirmar Compra'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
