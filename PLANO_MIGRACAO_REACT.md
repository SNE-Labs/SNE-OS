# 🚀 Plano de Migração: Vue.js → React

## Situação Atual

### ✅ O que já temos em React (pasta `figma/`)
- ✅ App completo funcional (Dashboard, Charts, Analysis, Pricing)
- ✅ Componentes UI completos (Radix UI)
- ✅ Design system SNE Labs implementado
- ✅ Estrutura de pastas pronta
- ✅ Tailwind CSS configurado
- ✅ TypeScript configurado

### ⚠️ O que precisa ser migrado/adicionado
- ⚠️ WalletConnect + SIWE (wagmi hooks)
- ⚠️ Integração com backend (API client)
- ⚠️ Socket.IO client
- ⚠️ Lightweight Charts (já está no package.json)
- ⚠️ Rotas (react-router)
- ⚠️ State management (zustand ou context)

---

## 📋 Plano de Migração (2-3 semanas)

### Fase 1: Setup e Estrutura (1 dia)

#### 1.1 Copiar estrutura do `figma/` para `frontend/`
```bash
# Backup do Vue atual
mv frontend frontend-vue-backup

# Copiar React do Figma
cp -r figma frontend

# Limpar arquivos desnecessários do Figma
cd frontend
rm -rf .figma  # se houver
```

#### 1.2 Instalar dependências Web3
```bash
cd frontend
npm install wagmi viem siwe @tanstack/react-query
npm install react-router-dom zustand
npm install socket.io-client axios
npm install lightweight-charts
```

#### 1.3 Configurar variáveis de ambiente
```bash
# .env
VITE_WALLETCONNECT_PROJECT_ID=3fcc6bba6f1de962d911bb5b5c3dba68
VITE_SCROLL_RPC_URL=https://sepolia-rpc.scroll.io
VITE_SIWE_DOMAIN=radar.snelabs.space
VITE_SIWE_ORIGIN=https://radar.snelabs.space
VITE_API_BASE_URL=https://api.radar.snelabs.space
VITE_WS_URL=wss://api.radar.snelabs.space
```

---

### Fase 2: Integração Web3 (2-3 dias)

#### 2.1 Configurar Wagmi
```typescript
// src/lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { walletConnect, injected, metaMask } from 'wagmi/connectors'
import { scrollSepolia } from 'wagmi/chains'

export const wagmiConfig = createConfig({
  chains: [scrollSepolia],
  connectors: [
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
    }),
    injected(),
    metaMask(),
  ],
  transports: {
    [scrollSepolia.id]: http(import.meta.env.VITE_SCROLL_RPC_URL),
  },
})
```

#### 2.2 Criar hook useWallet com SIWE
```typescript
// src/hooks/useWallet.ts
import { useAccount, useConnect, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useState } from 'react'

export function useWallet() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { signMessageAsync } = useSignMessage()
  const [tier, setTier] = useState<'free' | 'premium' | 'pro'>('free')
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    if (!address) return

    setLoading(true)
    try {
      // 1. Obter nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address }),
      })
      const { nonce } = await nonceRes.json()

      // 2. Criar mensagem SIWE
      const message = new SiweMessage({
        domain: import.meta.env.VITE_SIWE_DOMAIN,
        address,
        statement: 'Sign in to SNE Radar',
        uri: import.meta.env.VITE_SIWE_ORIGIN,
        version: '1',
        chainId: 534351,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })

      const messageToSign = message.prepareMessage()

      // 3. Assinar
      const signature = await signMessageAsync({ message: messageToSign })

      // 4. Autenticar
      const authRes = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: messageToSign, signature }),
      })

      if (!authRes.ok) throw new Error('Authentication failed')

      const { license } = await authRes.json()
      setTier(license.tier || 'free')
    } catch (error) {
      console.error('SIWE error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    address,
    isConnected,
    tier,
    loading,
    connect,
    signIn,
  }
}
```

#### 2.3 Atualizar App.tsx para usar hooks
```typescript
// src/app/App.tsx
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../lib/wagmi'
import { useWallet } from '../hooks/useWallet'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function AppContent() {
  const { address, isConnected, tier, connect, signIn } = useWallet()
  // ... resto do código
}
```

---

### Fase 3: Rotas e Navegação (1 dia)

#### 3.1 Configurar React Router
```typescript
// src/router/index.tsx
import { createBrowserRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import Chart from '../pages/Chart'
import Analysis from '../pages/Analysis'
import Pricing from '../pages/Pricing'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/chart',
    element: <Chart />,
  },
  {
    path: '/analysis',
    element: <Analysis />,
  },
  {
    path: '/pricing',
    element: <Pricing />,
  },
])
```

#### 3.2 Atualizar App.tsx
```typescript
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

### Fase 4: Integração Backend (2-3 dias)

#### 4.1 API Client
```typescript
// src/services/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // Para cookies HttpOnly
})

export const getDashboardSummary = () => api.get('/api/dashboard/summary')
export const getCandles = (symbol: string, tf: string, limit: number) =>
  api.get('/api/chart/candles', { params: { symbol, tf, limit } })
export const analyze = (symbol: string, tf: string) =>
  api.post('/api/analyze', { symbol, tf })
```

#### 4.2 Socket.IO Client
```typescript
// src/services/websocket.ts
import { io } from 'socket.io-client'

export const socket = io(import.meta.env.VITE_WS_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
})

socket.on('connect', () => {
  console.log('Socket connected')
})

socket.on('dashboard:update', (data) => {
  // Atualizar dashboard
})
```

#### 4.3 State Management (Zustand)
```typescript
// src/stores/dashboard.ts
import { create } from 'zustand'

interface DashboardState {
  topMovers: any[]
  marketSummary: any
  watchlist: any[]
  setTopMovers: (movers: any[]) => void
  setMarketSummary: (summary: any) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  topMovers: [],
  marketSummary: null,
  watchlist: [],
  setTopMovers: (movers) => set({ topMovers: movers }),
  setMarketSummary: (summary) => set({ marketSummary: summary }),
}))
```

---

### Fase 5: Lightweight Charts (2 dias)

#### 5.1 Componente Chart
```typescript
// src/components/Chart.tsx
import { useEffect, useRef } from 'react'
import { createChart, IChartApi } from 'lightweight-charts'

export function Chart({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0B0B0B' },
        textColor: '#F7F7F8',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.1)' },
        horzLines: { color: 'rgba(255,255,255,0.1)' },
      },
    })

    chartRef.current = chart

    return () => {
      chart.remove()
    }
  }, [])

  // Carregar candles e atualizar chart
  useEffect(() => {
    // ... lógica de carregamento
  }, [symbol, timeframe])

  return <div ref={chartContainerRef} className="w-full h-[600px]" />
}
```

---

### Fase 6: Polimento e Testes (3-4 dias)

#### 6.1 Loading States
- [ ] Skeleton loaders em todos os cards
- [ ] Spinners em botões durante ações
- [ ] Progress bars em análises longas

#### 6.2 Error Handling
- [ ] Toast notifications (sonner já está instalado)
- [ ] Error boundaries
- [ ] Retry logic

#### 6.3 Responsividade
- [ ] Testar mobile (375px)
- [ ] Testar tablet (768px)
- [ ] Testar desktop (1440px)

#### 6.4 Integração Completa
- [ ] Testar WalletConnect
- [ ] Testar SIWE
- [ ] Testar API calls
- [ ] Testar Socket.IO
- [ ] Testar limites por tier

---

## 📁 Estrutura Final

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── ui/              # Radix UI (já existe)
│   │   │   ├── sne/             # SNE components (já existe)
│   │   │   ├── Chart.tsx        # Lightweight Charts
│   │   │   └── WalletModal.tsx  # Wallet Connect
│   │   └── App.tsx              # App principal
│   ├── pages/
│   │   ├── Dashboard.tsx        # Já existe (atualizar)
│   │   ├── Chart.tsx            # Já existe (atualizar)
│   │   ├── Analysis.tsx         # Já existe (atualizar)
│   │   └── Pricing.tsx         # Já existe (atualizar)
│   ├── hooks/
│   │   ├── useWallet.ts        # Wagmi + SIWE
│   │   ├── useAuth.ts          # Autenticação
│   │   └── useAnalysis.ts      # Análise
│   ├── services/
│   │   ├── api.ts              # API client
│   │   └── websocket.ts        # Socket.IO
│   ├── stores/
│   │   ├── dashboard.ts        # Zustand store
│   │   └── auth.ts            # Auth store
│   ├── lib/
│   │   ├── wagmi.ts           # Wagmi config
│   │   └── utils.ts           # Utils (já existe)
│   ├── router/
│   │   └── index.tsx          # React Router
│   └── styles/
│       ├── theme.css          # SNE design system (já existe)
│       └── index.css
├── package.json
├── vite.config.ts
└── .env
```

---

## ✅ Checklist de Migração

### Setup
- [ ] Copiar estrutura do `figma/` para `frontend/`
- [ ] Instalar dependências Web3 (wagmi, viem, siwe)
- [ ] Configurar variáveis de ambiente
- [ ] Configurar Vite para React

### Web3
- [ ] Configurar Wagmi
- [ ] Implementar useWallet hook
- [ ] Implementar SIWE
- [ ] Testar WalletConnect
- [ ] Testar SIWE flow completo

### Rotas
- [ ] Configurar React Router
- [ ] Criar páginas (Dashboard, Chart, Analysis, Pricing)
- [ ] Atualizar navegação

### Backend
- [ ] Criar API client
- [ ] Integrar Socket.IO
- [ ] Implementar state management (Zustand)
- [ ] Testar todas as APIs

### Charts
- [ ] Integrar Lightweight Charts
- [ ] Implementar indicadores
- [ ] Implementar níveis operacionais
- [ ] Testar performance

### Polimento
- [ ] Loading states
- [ ] Error handling
- [ ] Toast notifications
- [ ] Responsividade
- [ ] Testes E2E

---

## 🎯 Vantagens da Migração

1. ✅ **Design já pronto** - Economia de semanas
2. ✅ **Componentes UI prontos** - Radix UI completo
3. ✅ **Wagmi hooks** - Muito mais fácil que @wagmi/core
4. ✅ **Consistência** - Mesmo stack do SNE Vault
5. ✅ **Ecossistema** - Mais recursos disponíveis
6. ✅ **Produtividade** - Desenvolvimento mais rápido

---

## ⏱️ Timeline

- **Semana 1:** Setup + Web3 + Rotas
- **Semana 2:** Backend + Charts
- **Semana 3:** Polimento + Testes

**Total: 2-3 semanas para migração completa**

---

## 🚀 Próximo Passo

**Decisão:** Aprovar migração para React?

Se sim, começar pela Fase 1 (Setup e Estrutura).

