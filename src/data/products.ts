import type { Product } from '../types/passport';

/**
 * Produtos SNE disponíveis para compra
 * Definidos localmente - não dependem de API
 * Contratos são usados apenas para assinar transações
 */
export const PRODUCTS: Product[] = [
  {
    id: 'sne-box-tier3',
    title: 'SNE Box — Tier 3',
    priceUSD: '3499',
    priceETH: '0.1234',
    features: [
      'Secure Enclave (TPM/TEE)',
      'Starlink-ready',
      'Tamper Line',
      'ARM + ASIC (BitAxe)',
      'AES-256 encryption',
      'KDF (Key Derivation Function)',
      'Proof of Uptime (PoU)',
      'Suporte 24/7'
    ],
    available: true,
    contractAddress: '0x0000000000000000000000000000000000000000', // TODO: Adicionar endereço real
  },
  {
    id: 'sne-keys-physical',
    title: 'SNE Keys — Físicas',
    priceUSD: '299',
    priceETH: '0.0105',
    features: [
      'Chave física segura',
      'Vinculação on-chain',
      'Backup criptográfico',
      'Suporte para múltiplas wallets'
    ],
    available: true,
    contractAddress: '0x0000000000000000000000000000000000000000', // TODO: Adicionar endereço real
  },
  {
    id: 'sne-keys-virtual',
    title: 'SNE Keys — Virtuais',
    priceUSD: '99',
    priceETH: '0.0035',
    features: [
      'Chave virtual segura',
      'Armazenamento criptográfico',
      'Vinculação on-chain',
      'Acesso rápido'
    ],
    available: true,
    contractAddress: '0x0000000000000000000000000000000000000000', // TODO: Adicionar endereço real
  },
  {
    id: 'sne-license-basic',
    title: 'Licença SNE — Básica',
    priceUSD: '199',
    priceETH: '0.007',
    features: [
      'Acesso a nós SNE',
      'Proof of Uptime (PoU)',
      'Merkle Tree verification',
      'Suporte básico'
    ],
    available: true,
    contractAddress: '0x0000000000000000000000000000000000000000', // TODO: Adicionar endereço real
  },
  {
    id: 'sne-license-premium',
    title: 'Licença SNE — Premium',
    priceUSD: '499',
    priceETH: '0.0175',
    features: [
      'Acesso a nós SNE',
      'Proof of Uptime (PoU)',
      'Merkle Tree verification',
      'Prioridade em suporte',
      'Recursos avançados',
      'Analytics detalhados'
    ],
    available: true,
    contractAddress: '0x0000000000000000000000000000000000000000', // TODO: Adicionar endereço real
  },
];
