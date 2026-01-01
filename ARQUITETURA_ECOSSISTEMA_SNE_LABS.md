# 🌐 ARQUITETURA DE ECOSSISTEMA SNE LABS
## Sistema Unificado com Autonomia e Comunicação

**Data:** Janeiro 2025  
**Ecossistema:** SNE Vault + SNE Passport + SNE Radar  
**Princípio:** Base comum, comunicação integrada, autonomia própria

---

## 📋 VISÃO GERAL DO ECOSSISTEMA

### Componentes do Ecossistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECOSSISTEMA SNE LABS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  SNE VAULT       │  │  SNE PASSPORT    │  │  SNE RADAR   │  │
│  │  snelabs.space   │  │  pass.snelabs.space│ │  radar.snelabs│ │
│  │                  │  │                  │  │              │  │
│  │  • Documentação   │  │  • Licenças      │  │  • Análise   │  │
│  │  • Dashboard     │  │  • Passaportes   │  │  • Trading    │  │
│  │  • Products      │  │  • Verificação   │  │  • Gráficos   │  │
│  │  • Docs          │  │  • On-chain      │  │  • Alertas    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│         │                      │                      │          │
│         └──────────────────────┴──────────────────────┘          │
│                            │                                      │
│         ┌──────────────────▼──────────────────┐                  │
│         │   SNE ECOSYSTEM CORE (Shared)       │                  │
│         │  ─────────────────────────────────  │                  │
│         │  • Design System                    │                  │
│         │  • Auth Service (WalletConnect)     │                  │
│         │  • License Registry (Scroll L2)    │                  │
│         │  • API Gateway                      │                  │
│         │  • Event Bus                        │                  │
│         └─────────────────────────────────────┘                  │
│                            │                                      │
│         ┌──────────────────▼──────────────────┐                  │
│         │   BLOCKCHAIN LAYER (Scroll L2)      │                  │
│         │  ─────────────────────────────────  │                  │
│         │  • SNELicenseRegistry (ERC-721)     │                  │
│         │  • SNEKeys (Gestão de chaves)       │                  │
│         │  • Proof of Uptime (PoU)            │                  │
│         └─────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 BASE COMUM (Shared Foundation)

### 1. Design System Unificado

#### Estrutura Compartilhada
```
sne-design-system/
├── packages/
│   ├── @sne-labs/tokens/          # Design tokens (cores, tipografia)
│   ├── @sne-labs/components/      # Componentes Vue/React
│   ├── @sne-labs/icons/           # Ícones unificados
│   └── @sne-labs/utils/            # Utilitários compartilhados
├── docs/
│   └── SNE-DESIGN-SYSTEM.md       # Documentação completa
└── examples/
    └── showcase/                   # Showcase de componentes
```

#### Design Tokens
```typescript
// packages/@sne-labs/tokens/src/index.ts
export const sneTokens = {
  colors: {
    terminal: {
      bg: '#0a0a0a',
      fg: '#00ff00',
      border: 'rgba(0, 255, 0, 0.3)',
      accent: '#00ff00',
      warning: '#ffaa00',
      error: '#ff0000',
      success: '#00ff00'
    },
    // Cores compartilhadas entre todos os serviços
  },
  typography: {
    fontFamily: {
      mono: "'Courier New', 'Monaco', monospace",
      sans: "'Inter', system-ui, sans-serif"
    },
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px'
    }
  },
  spacing: {
    // Sistema de espaçamento unificado
  },
  breakpoints: {
    // Breakpoints responsivos
  }
}
```

#### Componentes Compartilhados
```typescript
// packages/@sne-labs/components/src/
├── Button/
├── Card/
├── Input/
├── Modal/
├── Chart/              // Wrapper para gráficos
├── WalletConnect/      // Componente de conexão
└── LicenseBadge/       // Badge de licença
```

### 2. Autenticação Unificada (Auth Service)

#### Arquitetura de Auth
```
┌─────────────────────────────────────────────────────────┐
│  SNE AUTH SERVICE (auth.snelabs.space)                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  WalletConnect   │  │  Traditional     │            │
│  │  (Web3)          │  │  (Email/Pass)    │            │
│  └──────────────────┘  └──────────────────┘            │
│         │                      │                        │
│         └──────────┬────────────┘                        │
│                    │                                     │
│         ┌──────────▼──────────┐                         │
│         │  JWT Token Service  │                         │
│         │  (Gera tokens)      │                         │
│         └──────────┬──────────┘                         │
│                    │                                     │
│         ┌──────────▼──────────┐                         │
│         │  License Check      │                         │
│         │  (Scroll L2)        │                         │
│         └─────────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

#### Implementação
```typescript
// shared/auth-service/src/index.ts
export class SNEAuthService {
  // WalletConnect login
  async walletLogin(address: string, signature: string) {
    // 1. Verificar assinatura
    const isValid = await this.verifySignature(address, signature)
    if (!isValid) throw new Error('Invalid signature')
    
    // 2. Verificar licença on-chain (Scroll L2)
    const hasLicense = await this.checkLicenseOnChain(address)
    if (!hasLicense) throw new Error('No license found')
    
    // 3. Gerar JWT token
    const token = await this.generateJWT({
      address,
      license: hasLicense,
      tier: hasLicense.tier
    })
    
    return { token, address, tier: hasLicense.tier }
  }
  
  // Verificar licença no Scroll L2
  async checkLicenseOnChain(address: string) {
    const contract = new ethers.Contract(
      SNELicenseRegistryAddress,
      SNELicenseRegistryABI,
      scrollProvider
    )
    
    const license = await contract.checkAccess(address)
    return license
  }
}
```

### 3. API Gateway Unificado

#### Estrutura
```
api.snelabs.space (API Gateway)
├── /auth/*              → Auth Service
├── /vault/*             → SNE Vault API
├── /passport/*          → SNE Passport API
├── /radar/*             → SNE Radar API
└── /onchain/*           → Scroll L2 Proxy
```

#### Configuração (Vercel/Kong)
```yaml
# vercel.json ou Kong config
routes:
  - path: /auth/*
    target: auth.snelabs.space
  - path: /vault/*
    target: vault-api.snelabs.space
  - path: /passport/*
    target: passport-api.snelabs.space
  - path: /radar/*
    target: radar-api.snelabs.space
  - path: /onchain/*
    target: scroll-proxy.snelabs.space
```

---

## 🔗 COMUNICAÇÃO ENTRE SERVIÇOS

### 1. Event Bus (Comunicação Assíncrona)

#### Arquitetura
```
┌─────────────────────────────────────────────────────────┐
│  SNE EVENT BUS (Redis Pub/Sub ou Cloud Pub/Sub)       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Eventos:                                                │
│  • license.activated                                     │
│  • license.revoked                                       │
│  • analysis.completed                                     │
│  • alert.triggered                                       │
│  • user.upgraded                                         │
└─────────────────────────────────────────────────────────┘
```

#### Implementação
```python
# shared/event-bus/src/event_bus.py
import redis
import json

class SNEEventBus:
    def __init__(self):
        self.redis = redis.Redis(host='redis.snelabs.space')
        self.pubsub = self.redis.pubsub()
    
    def publish(self, event_type: str, data: dict):
        """Publica evento no bus"""
        self.redis.publish(
            f'sne:events:{event_type}',
            json.dumps(data)
        )
    
    def subscribe(self, event_type: str, callback):
        """Subscreve a eventos"""
        self.pubsub.subscribe(f'sne:events:{event_type}')
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                data = json.loads(message['data'])
                callback(data)
```

#### Exemplo de Uso
```python
# SNE Passport: Quando licença é ativada
event_bus.publish('license.activated', {
    'address': '0x123...',
    'tier': 'premium',
    'expires_at': '2025-12-31'
})

# SNE Radar: Escuta evento
event_bus.subscribe('license.activated', lambda data: {
    # Atualizar tier do usuário
    update_user_tier(data['address'], data['tier'])
})
```

### 2. API Cross-Service

#### Comunicação Direta
```typescript
// SNE Radar chamando SNE Passport
const license = await fetch('https://api.snelabs.space/passport/check', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: userAddress
  })
})

// SNE Passport chamando SNE Vault
const vaultStatus = await fetch('https://api.snelabs.space/vault/status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 🏗️ ARQUITETURA POR SERVIÇO

### 1. SNE VAULT (snelabs.space)

#### Stack
- **Frontend:** Vite + TypeScript + React/Vue
- **Deploy:** Vercel
- **Backend:** API Gateway (opcional)

#### Funcionalidades
- Documentação técnica
- Dashboard read-only (licenças, chaves, SNE Boxes)
- Products (documentação de produtos)
- Docs (documentação completa)

#### Integração com Ecossistema
```typescript
// Verificar licença do usuário
const license = await sneAuth.checkLicense(userAddress)

// Mostrar badge de licença
<LicenseBadge tier={license.tier} />

// Link para SNE Radar (se tiver licença)
{license.tier !== 'free' && (
  <Link to="https://radar.snelabs.space">
    Acessar SNE Radar
  </Link>
)}
```

---

### 2. SNE PASSPORT (pass.snelabs.space)

#### Stack
- **Frontend:** Vite + TypeScript + React/Vue
- **Deploy:** Vercel
- **Backend:** GCP Cloud Run (API)
- **Blockchain:** Scroll L2 (smart contracts)

#### Funcionalidades
- Gestão de licenças (ERC-721)
- Verificação on-chain
- Passaportes digitais
- Revogação de licenças

#### Integração com Ecossistema
```typescript
// Quando licença é emitida
async function issueLicense(address: string, tier: string) {
  // 1. Mint NFT no Scroll L2
  const tx = await licenseContract.mint(address, tier)
  await tx.wait()
  
  // 2. Publicar evento
  eventBus.publish('license.activated', {
    address,
    tier,
    tokenId: tx.tokenId
  })
  
  // 3. Notificar outros serviços
  await notifySNERadar(address, tier)
  await notifySNEVault(address, tier)
}
```

---

### 3. SNE RADAR (radar.snelabs.space)

#### Stack
- **Frontend:** Vite + TypeScript + Vue.js 3
- **Deploy:** Vercel
- **Backend:** GCP Cloud Run (Flask API)
- **Database:** PostgreSQL (GCP Cloud SQL)

#### Funcionalidades
- Análise técnica avançada
- Gráficos interativos
- Trading assistido
- Alertas inteligentes

#### Integração com Ecossistema
```typescript
// Verificar licença antes de análise
async function performAnalysis(symbol: string) {
  // 1. Verificar licença via SNE Passport
  const license = await fetch('https://api.snelabs.space/passport/check', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!license.valid) {
    throw new Error('License required')
  }
  
  // 2. Verificar limites do tier
  if (license.tier === 'free' && analysisCount >= 3) {
    throw new Error('Daily limit reached. Upgrade to Premium.')
  }
  
  // 3. Executar análise
  const result = await analyzeSymbol(symbol)
  
  // 4. Publicar evento
  eventBus.publish('analysis.completed', {
    address: userAddress,
    symbol,
    result
  })
  
  return result
}
```

---

## 🔐 AUTENTICAÇÃO UNIFICADA

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────┐
│  FLUXO DE AUTENTICAÇÃO UNIFICADO                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Usuário acessa qualquer serviço                     │
│     (snelabs.space, pass.snelabs.space, radar.snelabs) │
│     ↓                                                    │
│  2. Clica "Conectar Wallet" ou "Login"                  │
│     ↓                                                    │
│  3. WalletConnect modal abre                            │
│     ↓                                                    │
│  4. Usuário seleciona wallet e aprova                   │
│     ↓                                                    │
│  5. Assina mensagem de login                            │
│     ↓                                                    │
│  6. Auth Service (auth.snelabs.space)                   │
│     • Verifica assinatura                               │
│     • Verifica licença no Scroll L2                     │
│     • Gera JWT token                                    │
│     ↓                                                    │
│  7. Token retornado para frontend                       │
│     ↓                                                    │
│  8. Frontend armazena token                             │
│     ↓                                                    │
│  9. Todas as requisições incluem token                  │
│     ↓                                                    │
│  10. Cada serviço valida token e verifica licença       │
│     ↓                                                    │
│  11. Acesso liberado conforme tier                       │
└─────────────────────────────────────────────────────────┘
```

### Implementação Cross-Service

#### Frontend (Composables Compartilhados)
```typescript
// shared/composables/useSNEAuth.ts
import { useWalletConnect } from '@walletconnect/web3-provider'
import { ethers } from 'ethers'

export function useSNEAuth() {
  const connect = async () => {
    // 1. Conectar wallet
    const provider = new WalletConnectProvider({
      rpc: {
        534352: 'https://rpc.scroll.io' // Scroll L2
      },
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
    })
    
    await provider.enable()
    const web3Provider = new ethers.providers.Web3Provider(provider)
    const signer = web3Provider.getSigner()
    const address = await signer.getAddress()
    
    // 2. Solicitar assinatura
    const nonce = await getNonce(address)
    const message = `SNE Labs Login\n\nAddress: ${address}\nNonce: ${nonce}`
    const signature = await signer.signMessage(message)
    
    // 3. Autenticar via Auth Service
    const response = await fetch('https://api.snelabs.space/auth/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, message })
    })
    
    const { token, license } = await response.json()
    
    // 4. Armazenar token e license
    localStorage.setItem('sne_token', token)
    localStorage.setItem('sne_license', JSON.stringify(license))
    
    return { token, license, address }
  }
  
  const checkLicense = async () => {
    const token = localStorage.getItem('sne_token')
    if (!token) return null
    
    const response = await fetch('https://api.snelabs.space/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    return response.json()
  }
  
  return { connect, checkLicense }
}
```

#### Backend (Auth Service)
```python
# auth-service/app/main.py
from flask import Flask, request, jsonify
from web3 import Web3
from eth_account.messages import encode_defunct
import jwt

app = Flask(__name__)

# Scroll L2 Provider
scroll_provider = Web3(Web3.HTTPProvider('https://rpc.scroll.io'))

# SNELicenseRegistry Contract
LICENSE_REGISTRY_ADDRESS = '0x...'  # Endereço do contrato
LICENSE_REGISTRY_ABI = [...]  # ABI do contrato

@app.route('/auth/wallet', methods=['POST'])
def wallet_login():
    data = request.json
    address = data['address']
    signature = data['signature']
    message = data['message']
    
    # 1. Verificar assinatura
    w3 = Web3()
    message_hash = encode_defunct(text=message)
    recovered = w3.eth.account.recover_message(
        message_hash, signature=signature
    )
    
    if recovered.lower() != address.lower():
        return jsonify({'error': 'Invalid signature'}), 401
    
    # 2. Verificar licença no Scroll L2
    contract = scroll_provider.eth.contract(
        address=LICENSE_REGISTRY_ADDRESS,
        abi=LICENSE_REGISTRY_ABI
    )
    
    license_data = contract.functions.checkAccess(address).call()
    
    if not license_data['valid']:
        return jsonify({
            'error': 'No valid license found',
            'tier': 'free'
        }), 403
    
    # 3. Gerar JWT
    token = jwt.encode({
        'address': address,
        'tier': license_data['tier'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        'success': True,
        'token': token,
        'license': {
            'tier': license_data['tier'],
            'expires_at': license_data['expires_at'],
            'token_id': license_data['token_id']
        }
    })
```

---

## 📦 ESTRUTURA DE REPOSITÓRIOS

### Opção 1: Monorepo (Recomendado)

```
sne-labs-ecosystem/
├── packages/
│   ├── design-system/          # Design system compartilhado
│   ├── auth-service/            # Serviço de autenticação
│   ├── event-bus/               # Event bus compartilhado
│   └── shared-types/            # TypeScript types compartilhados
│
├── apps/
│   ├── sne-vault/               # snelabs.space
│   │   ├── frontend/            # Vite + TypeScript
│   │   └── vercel.json
│   │
│   ├── sne-passport/            # pass.snelabs.space
│   │   ├── frontend/            # Vite + TypeScript
│   │   ├── backend/             # Flask API
│   │   └── contracts/           # Smart contracts (Solidity)
│   │
│   └── sne-radar/               # radar.snelabs.space
│       ├── frontend/            # Vite + TypeScript + Vue.js
│       ├── backend/             # Flask API
│       └── vercel.json
│
├── infrastructure/
│   ├── api-gateway/             # Configuração do gateway
│   ├── terraform/               # Infraestrutura como código
│   └── docker/                  # Dockerfiles
│
└── docs/
    ├── ARCHITECTURE.md          # Este documento
    └── DESIGN_SYSTEM.md         # Design system
```

### Opção 2: Multi-Repo (Atual)

```
SNE-Labs/SNE-Labs          → snelabs.space
SNE-Labs/SNE-Scroll-Passport → pass.snelabs.space
SNE-Labs/SNE-Radar         → radar.snelabs.space
SNE-Labs/sne-design-system → Design system (npm package)
SNE-Labs/sne-auth-service  → Auth service (GCP)
```

---

## 🔄 COMUNICAÇÃO ENTRE SERVIÇOS

### 1. Verificação de Licença (SNE Radar → SNE Passport)

```typescript
// SNE Radar: Antes de executar análise
async function checkLicenseAndAnalyze(symbol: string) {
  const token = localStorage.getItem('sne_token')
  
  // Verificar licença via SNE Passport API
  const licenseCheck = await fetch(
    'https://api.snelabs.space/passport/verify',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Service': 'sne-radar'  // Identificar serviço chamador
      }
    }
  )
  
  const { valid, tier, limits } = await licenseCheck.json()
  
  if (!valid) {
    throw new Error('License required. Visit pass.snelabs.space')
  }
  
  // Verificar limites do tier
  if (tier === 'free' && dailyAnalysisCount >= limits.analyses_per_day) {
    throw new Error('Daily limit reached. Upgrade at pass.snelabs.space')
  }
  
  // Executar análise
  return await performAnalysis(symbol)
}
```

### 2. Notificação de Eventos (SNE Passport → SNE Radar)

```python
# SNE Passport: Quando licença é emitida/revogada
from shared.event_bus import event_bus

def issue_license(address: str, tier: str):
    # 1. Mint NFT no Scroll L2
    tx = license_contract.mint(address, tier)
    
    # 2. Publicar evento
    event_bus.publish('license.activated', {
        'address': address,
        'tier': tier,
        'token_id': tx.token_id,
        'expires_at': calculate_expiry(tier)
    })
    
    # 3. Notificar SNE Radar diretamente (opcional)
    notify_sne_radar(address, tier)

# SNE Radar: Escuta eventos
event_bus.subscribe('license.activated', handle_license_activated)
event_bus.subscribe('license.revoked', handle_license_revoked)
```

### 3. Sincronização de Dados

```typescript
// SNE Radar: Sincronizar dados de usuário
async function syncUserData() {
  const token = localStorage.getItem('sne_token')
  
  // Buscar dados do SNE Passport
  const passportData = await fetch(
    'https://api.snelabs.space/passport/user',
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )
  
  // Buscar dados do SNE Vault (se aplicável)
  const vaultData = await fetch(
    'https://api.snelabs.space/vault/user',
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )
  
  // Consolidar dados
  return {
    license: passportData.license,
    vault: vaultData.status,
    radar: getLocalRadarData()
  }
}
```

---

## 🎨 DESIGN SYSTEM COMPARTILHADO

### Estrutura do Package

```typescript
// packages/@sne-labs/design-system/src/index.ts
export * from './tokens'
export * from './components'
export * from './utils'

// Tokens
export const colors = {
  terminal: {
    bg: '#0a0a0a',
    fg: '#00ff00',
    // ...
  }
}

// Componentes Vue
export { default as SNEButton } from './components/Button/Button.vue'
export { default as SNECard } from './components/Card/Card.vue'
export { default as SNEWalletConnect } from './components/WalletConnect/WalletConnect.vue'
export { default as SNELicenseBadge } from './components/LicenseBadge/LicenseBadge.vue'

// Utilitários
export { formatAddress, formatTier } from './utils/formatters'
```

### Uso nos Serviços

```vue
<!-- SNE Radar: Usando componentes compartilhados -->
<template>
  <div>
    <SNEWalletConnect @connected="handleConnect" />
    <SNELicenseBadge :tier="userTier" />
    <SNEButton @click="analyze">Analisar</SNEButton>
  </div>
</template>

<script setup>
import { SNEWalletConnect, SNELicenseBadge, SNEButton } from '@sne-labs/design-system'
</script>
```

---

## 🔐 GESTÃO DE LICENÇAS (Scroll L2)

### Smart Contract: SNELicenseRegistry

```solidity
// contracts/SNELicenseRegistry.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SNELicenseRegistry is ERC721 {
    struct License {
        string tier;        // "free", "premium", "pro"
        uint256 expiresAt;
        bool active;
    }
    
    mapping(uint256 => License) public licenses;
    mapping(address => uint256) public addressToTokenId;
    
    function checkAccess(address user) public view returns (
        bool valid,
        string memory tier,
        uint256 expiresAt
    ) {
        uint256 tokenId = addressToTokenId[user];
        if (tokenId == 0) {
            return (false, "free", 0);
        }
        
        License memory license = licenses[tokenId];
        bool isValid = license.active && license.expiresAt > block.timestamp;
        
        return (isValid, license.tier, license.expiresAt);
    }
    
    function mint(address to, string memory tier) public {
        // Lógica de mint
    }
}
```

### Integração nos Serviços

```typescript
// shared/blockchain/src/license-registry.ts
import { createPublicClient, http } from 'viem'
import { scroll } from 'viem/chains'

const client = createPublicClient({
  chain: scroll,
  transport: http('https://rpc.scroll.io')
})

export async function checkLicense(address: string) {
  const result = await client.readContract({
    address: SNELicenseRegistryAddress,
    abi: SNELicenseRegistryABI,
    functionName: 'checkAccess',
    args: [address]
  })
  
  return {
    valid: result[0],
    tier: result[1],
    expiresAt: result[2]
  }
}
```

---

## 📊 DASHBOARD UNIFICADO (Opcional)

### Visão Consolidada

```
┌─────────────────────────────────────────────────────────┐
│  SNE LABS DASHBOARD (dashboard.snelabs.space)          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  SNE VAULT   │  │  SNE PASSPORT │  │  SNE RADAR   │ │
│  │  Status      │  │  Licença      │  │  Análises    │ │
│  │  • Active    │  │  • Premium    │  │  • 50/50     │ │
│  │  • 3 Nodes   │  │  • Expires    │  │  • Today     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  Quick Actions:                                          │
│  • Acessar SNE Vault                                    │
│  • Gerenciar Licenças                                   │
│  • Abrir SNE Radar                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Semana 1-2)

#### 1.1 Design System
- [ ] Criar package `@sne-labs/design-system`
- [ ] Definir design tokens
- [ ] Criar componentes base
- [ ] Publicar no npm (privado ou público)

#### 1.2 Auth Service
- [ ] Criar serviço de autenticação
- [ ] Implementar WalletConnect
- [ ] Integrar Scroll L2
- [ ] Deploy no GCP Cloud Run

#### 1.3 API Gateway
- [ ] Configurar API Gateway (Vercel/Kong)
- [ ] Configurar rotas
- [ ] Configurar CORS
- [ ] Testar comunicação

---

### Fase 2: Integração (Semana 3-4)

#### 2.1 SNE Vault
- [ ] Integrar design system
- [ ] Integrar auth service
- [ ] Adicionar links para outros serviços
- [ ] Testar comunicação

#### 2.2 SNE Passport
- [ ] Integrar design system
- [ ] Integrar auth service
- [ ] Implementar eventos
- [ ] Testar comunicação

#### 2.3 SNE Radar
- [ ] Integrar design system
- [ ] Integrar auth service
- [ ] Implementar verificação de licença
- [ ] Testar comunicação

---

### Fase 3: Event Bus (Semana 5-6)

#### 3.1 Event Bus
- [ ] Configurar Redis Pub/Sub
- [ ] Implementar event bus
- [ ] Definir eventos
- [ ] Testar publicação/subscrição

#### 3.2 Integração de Eventos
- [ ] SNE Passport publica eventos
- [ ] SNE Radar escuta eventos
- [ ] SNE Vault escuta eventos
- [ ] Testar sincronização

---

### Fase 4: Otimização (Semana 7-8)

#### 4.1 Performance
- [ ] Cache compartilhado
- [ ] Otimizar chamadas cross-service
- [ ] Implementar retry logic
- [ ] Monitoramento

#### 4.2 UX
- [ ] Navegação entre serviços
- [ ] Estado compartilhado
- [ ] Notificações unificadas
- [ ] Dashboard consolidado

---

## 📋 CHECKLIST DE INTEGRAÇÃO

### Design System
- [ ] Tokens definidos
- [ ] Componentes criados
- [ ] Documentação completa
- [ ] Package publicado

### Autenticação
- [ ] Auth service deployado
- [ ] WalletConnect funcionando
- [ ] Scroll L2 integrado
- [ ] JWT tokens funcionando

### Comunicação
- [ ] API Gateway configurado
- [ ] Event bus funcionando
- [ ] Cross-service calls testados
- [ ] Error handling implementado

### Cada Serviço
- [ ] Design system integrado
- [ ] Auth service integrado
- [ ] Eventos publicados/escutados
- [ ] Testes de integração passando

---

## 💰 CUSTOS ESTIMADOS

### Vercel (Frontends)
- **3 serviços:** $0-60/mês (dependendo do tráfego)

### GCP (Backends)
- **Cloud Run:** ~$30-80/mês
- **Cloud SQL:** ~$10-25/mês
- **Redis (Memorystore):** ~$30/mês

### Scroll L2
- **Gas fees:** ~$5-20/mês (dependendo do uso)

### Total
- **Mínimo:** ~$75/mês
- **Moderado:** ~$150/mês
- **Alto Tráfego:** ~$300/mês

---

## ✅ VANTAGENS DA ARQUITETURA

### 1. Autonomia
- Cada serviço pode ser deployado independentemente
- Falha em um serviço não afeta os outros
- Escalabilidade independente

### 2. Comunicação
- Eventos assíncronos para desacoplamento
- API Gateway para comunicação síncrona
- Estado compartilhado via blockchain (Scroll L2)

### 3. Base Comum
- Design system unificado
- Autenticação unificada
- Experiência consistente

### 4. Manutenibilidade
- Código compartilhado em packages
- Documentação centralizada
- Testes de integração

---

**Desenvolvido com base em:**
- SNE Labs Architecture (github.com/SNE-Labs/SNE-Labs)
- SNE Vault Protocol (snelabs.space)
- Scroll L2 Documentation
- WalletConnect Protocol
- Microservices Best Practices

