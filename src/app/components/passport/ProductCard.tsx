import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingCart, Info } from 'lucide-react';
import type { Product } from '../../../types/passport';
import { Button } from '../ui/button';

interface ProductCardProps {
  product: Product;
  onPurchase: (product: Product) => void;
}

/**
 * Card de produto com descrição expandível
 * Sprint: Simplificação Dashboard
 */
export function ProductCard({ product, onPurchase }: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded border p-4" style={{ backgroundColor: 'var(--sne-bg)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h5 style={{ color: 'var(--sne-text-primary)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
            {product.title}
          </h5>
          <div className="flex items-center gap-4">
            <div style={{ color: 'var(--sne-text-primary)', fontWeight: 600, fontSize: '1rem' }}>
              USD ${product.priceUSD}
            </div>
            {product.priceETH && (
              <div style={{ color: 'var(--sne-text-secondary)', fontSize: '0.9rem' }}>
                {product.priceETH} ETH
              </div>
            )}
            {!product.available && (
              <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--sne-surface-elevated)', color: 'var(--sne-text-secondary)' }}>
                Indisponível
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded"
          style={{ backgroundColor: 'var(--sne-surface-elevated)' }}
          aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'var(--sne-text-secondary)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--sne-text-secondary)' }} />
          )}
        </button>
      </div>

      {/* Features resumidas (sempre visíveis) */}
      {product.features && product.features.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {product.features.slice(0, 3).map((feature, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--sne-surface-elevated)', color: 'var(--sne-text-secondary)' }}
              >
                {feature}
              </span>
            ))}
            {product.features.length > 3 && !isExpanded && (
              <span className="px-2 py-1 rounded text-xs" style={{ color: 'var(--sne-text-secondary)' }}>
                +{product.features.length - 3} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Descrição expandida */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4" style={{ color: 'var(--sne-accent)' }} />
            <span style={{ color: 'var(--sne-text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
              Detalhes do Produto
            </span>
          </div>

          {/* Features completas */}
          {product.features && product.features.length > 0 && (
            <div className="mb-3">
              <div style={{ color: 'var(--sne-text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>
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

          {/* Informações adicionais */}
          {product.contractAddress && (
            <div className="mb-2">
              <div style={{ color: 'var(--sne-text-secondary)', fontSize: '0.85rem' }}>
                <strong>Contrato:</strong>{' '}
                <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.8rem' }}>
                  {product.contractAddress.slice(0, 10)}...{product.contractAddress.slice(-8)}
                </code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão de compra */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          onClick={() => onPurchase(product)}
          disabled={!product.available}
          className="flex-1 flex items-center justify-center gap-2"
          style={{
            backgroundColor: product.available ? 'var(--sne-accent)' : 'var(--sne-surface-elevated)',
            color: product.available ? '#0B0B0B' : 'var(--sne-text-secondary)',
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          {product.available ? 'Comprar Agora' : 'Indisponível'}
        </Button>
      </div>
    </div>
  );
}
