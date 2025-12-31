<div align="center">

  <br />

  <h1 align="center">SNE Scroll Pass</h1>

  <p align="center">
    <strong>The Unofficial Official Control Panel for Scroll Network 📜</strong>
  </p>

  <p align="center">
    <a href="https://sne-scroll-pass.vercel.app/"><strong>📱 Live Demo</strong></a>
    ·
    <a href="https://github.com/SNE-Labs/SNE-Scroll-Passport/issues">Report Bug</a>
    ·
    <a href="https://github.com/SNE-Labs/SNE-Scroll-Passport/pulls">Request Feature</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status">
    <img src="https://img.shields.io/badge/network-Scroll_Sepolia-ff6b6b.svg" alt="Network">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </p>

</div>

<br />

---

## 🇺🇸 English

### ⚡️ About The Project

> **"Scroll needs a soul."**

Current block explorers (Etherscan, Dune) are powerful but cluttered, slow, and designed for machines, not humans. **SNE Scroll Pass** is the answer to the UX problem in the Scroll ecosystem.

It is a **premium, privacy-first interface** designed to be the "Apple-like" standard for interacting with the Scroll Blockchain. No ads, no tracking, just your assets and security in a high-performance terminal.

### 🎯 Key Features

* **⚡️ Instant Balance Check:** Query ETH and Token balances with intelligent filtering (hides spam/dust).

* **⛽️ Real-Time Gas Tracker:** On-demand gas checking to time your transactions perfectly.

* **🕵️ Spy Mode (Watchlist):** Monitor Whale wallets or friends without connecting your own wallet.

* **🔒 Privacy First:** No private keys stored. No unnecessary RPC polling. Smart Local Caching.

* **🎨 Cyberpunk Terminal UI:** A dark-mode first design system built for pro-traders and developers.

* **📊 On-Demand Requests:** Zero automatic polling. All data fetched when you need it.

### 🛠️ Tech Stack

Built with the **"Modern Ethereum Stack"** for maximum performance (<1s load time).

* **Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build:** [Vite](https://vitejs.dev/) (Ultra-fast HMR)
* **Blockchain:** [Viem](https://viem.sh/) + [Wagmi](https://wagmi.sh/) (Lightweight, type-safe interactions)
* **State:** [Zustand](https://github.com/pmndrs/zustand) + [TanStack Query](https://tanstack.com/query/latest)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) + Custom Design System

### 🚀 Getting Started

#### Prerequisites

* Node.js (v18 or higher)
* npm or pnpm

#### Installation

1. **Clone the repo**
   ```sh
   git clone https://github.com/4LFR3Dv1/SNE-Scroll-Passport.git
   cd SNE-Scroll-Passport/sne-scroll-pass
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Run development server**
   ```sh
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

> **Note:** In development mode, the app uses a Vite proxy (`/api/rpc`) to avoid CORS issues with public RPCs.

#### Build for Production

```sh
npm run build
```

The build output will be in the `dist/` directory.

### 📐 Project Structure

```
sne-scroll-pass/
├── src/
│   ├── components/     # React Components
│   │   ├── Balance/    # Balance Display
│   │   ├── Gas/        # Gas Tracker
│   │   ├── Public/     # Public Wallet View
│   │   ├── Spy/        # Watchlist/Spy Mode
│   │   ├── Wallet/     # Wallet Connection
│   │   └── Pro/        # Pro Features
│   ├── pages/          # Application Pages
│   ├── hooks/          # Custom Hooks
│   ├── lib/            # Configurations (Wagmi, etc.)
│   ├── utils/          # Utility Functions
│   └── types/          # TypeScript Types
├── public/             # Static Assets
└── dist/               # Build Output
```

### 🗺️ Roadmap

- [x] **v0.1 Alpha (Current)**
  - Wallet Connection (Injected/MetaMask/WalletConnect)
  - Balance Display with Cache
  - Gas Tracker (On-Demand)
  - Public Address Spy
  - Watchlist Management (LocalStorage)

- [ ] **v0.2 Beta**
  - Transfer Interface
  - Shareable PnL Cards (Viral Feature)
  - Revoke Service Integration
  - Transaction History

- [ ] **v1.0 Genesis**
  - Contract Decoder (Human-readable transactions)
  - SNE Pro License Integration
  - Intelligent Token Filtering
  - Multi-Wallet Support

### 🐛 Performance & Troubleshooting

#### Error 429 (Too Many Requests)

We use public RPC endpoints for the Alpha version. To prevent rate limiting:

1. **Smart Caching:** 5-minute TTL for balances and gas prices
2. **On-Demand Requests:** User click triggers update (no automatic polling)
3. **Cache Fallback:** Uses cached data even if expired when rate limited

#### CORS Issues

* **Development:** Vite proxy automatically handles CORS (`/api/rpc`)
* **Production:** Direct RPC calls (Scroll RPC should accept requests from your domain)

### 🔒 Security

* **Non-Custodial:** We never touch your private keys.
* **Open Source:** Verify every line of code in this repo.
* **No Tracking:** No analytics, no ads, no data collection.
* **Local Storage Only:** Watchlist and cache stored locally in your browser.

### 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🇧🇷 Português

### ⚡️ Sobre o Projeto

> **"Scroll precisa de uma alma."**

Os exploradores de blocos atuais (Etherscan, Dune) são poderosos, mas bagunçados, lentos e projetados para máquinas, não para humanos. **SNE Scroll Pass** é a resposta para o problema de UX no ecossistema Scroll.

É uma **interface premium, focada em privacidade** projetada para ser o padrão "estilo Apple" para interagir com a Blockchain Scroll. Sem anúncios, sem rastreamento, apenas seus ativos e segurança em um terminal de alta performance.

### 🎯 Funcionalidades Principais

* **⚡️ Verificação Instantânea de Saldo:** Consulte saldos de ETH e Tokens com filtragem inteligente (oculta spam/poeira).

* **⛽️ Gas Tracker em Tempo Real:** Verificação de gas sob demanda para cronometrar suas transações perfeitamente.

* **🕵️ Modo Spy (Watchlist):** Monitore carteiras de baleias ou amigos sem conectar sua própria wallet.

* **🔒 Privacidade em Primeiro Lugar:** Nenhuma chave privada armazenada. Sem polling RPC desnecessário. Cache Local Inteligente.

* **🎨 UI Terminal Cyberpunk:** Um design system dark-mode primeiro construído para traders profissionais e desenvolvedores.

* **📊 Requisições Sob Demanda:** Zero polling automático. Todos os dados buscados quando você precisa.

### 🛠️ Stack Tecnológica

Construído com a **"Stack Ethereum Moderna"** para máxima performance (<1s tempo de carregamento).

* **Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build:** [Vite](https://vitejs.dev/) (HMR Ultra-rápido)
* **Blockchain:** [Viem](https://viem.sh/) + [Wagmi](https://wagmi.sh/) (Interações leves e type-safe)
* **State:** [Zustand](https://github.com/pmndrs/zustand) + [TanStack Query](https://tanstack.com/query/latest)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + Design System Customizado

### 🚀 Como Começar

#### Pré-requisitos

* Node.js (v18 ou superior)
* npm ou pnpm

#### Instalação

1. **Clone o repositório**
   ```sh
   git clone https://github.com/4LFR3Dv1/SNE-Scroll-Passport.git
   cd SNE-Scroll-Passport/sne-scroll-pass
   ```

2. **Instale as dependências**
   ```sh
   npm install
   ```

3. **Execute o servidor de desenvolvimento**
   ```sh
   npm run dev
   ```
   O app estará disponível em `http://localhost:5173`.

> **Nota:** Em modo de desenvolvimento, o app usa um proxy Vite (`/api/rpc`) para evitar problemas de CORS com RPCs públicos.

#### Build para Produção

```sh
npm run build
```

A saída do build estará no diretório `dist/`.

### 📐 Estrutura do Projeto

```
sne-scroll-pass/
├── src/
│   ├── components/     # Componentes React
│   │   ├── Balance/    # Exibição de Saldo
│   │   ├── Gas/        # Gas Tracker
│   │   ├── Public/     # Visualização Pública
│   │   ├── Spy/        # Watchlist/Modo Spy
│   │   ├── Wallet/     # Conexão de Wallet
│   │   └── Pro/        # Funcionalidades Pro
│   ├── pages/          # Páginas da Aplicação
│   ├── hooks/          # Custom Hooks
│   ├── lib/            # Configurações (Wagmi, etc.)
│   ├── utils/          # Funções Utilitárias
│   └── types/          # Tipos TypeScript
├── public/             # Assets Estáticos
└── dist/               # Saída do Build
```

### 🗺️ Roadmap

- [x] **v0.1 Alpha (Atual)**
  - Conexão de Wallet (Injected/MetaMask/WalletConnect)
  - Exibição de Saldo com Cache
  - Gas Tracker (Sob Demanda)
  - Spy de Endereço Público
  - Gerenciamento de Watchlist (LocalStorage)

- [ ] **v0.2 Beta**
  - Interface de Transferência
  - Cards PnL Compartilháveis (Funcionalidade Viral)
  - Integração Revoke Service
  - Histórico de Transações

- [ ] **v1.0 Genesis**
  - Contract Decoder (Transações legíveis por humanos)
  - Integração Licença SNE Pro
  - Filtragem Inteligente de Tokens
  - Suporte Multi-Wallet

### 🐛 Performance e Troubleshooting

#### Erro 429 (Too Many Requests)

Usamos endpoints RPC públicos para a versão Alpha. Para prevenir rate limiting:

1. **Cache Inteligente:** TTL de 5 minutos para saldos e preços de gas
2. **Requisições Sob Demanda:** Clique do usuário dispara atualização (sem polling automático)
3. **Fallback de Cache:** Usa dados em cache mesmo se expirados quando rate limited

#### Problemas de CORS

* **Desenvolvimento:** Proxy Vite lida automaticamente com CORS (`/api/rpc`)
* **Produção:** Chamadas RPC diretas (RPC Scroll deve aceitar requisições do seu domínio)

### 🔒 Segurança

* **Não-Custodial:** Nunca tocamos em suas chaves privadas.
* **Open Source:** Verifique cada linha de código neste repositório.
* **Sem Rastreamento:** Sem analytics, sem anúncios, sem coleta de dados.
* **Apenas Local Storage:** Watchlist e cache armazenados localmente no seu navegador.

### 🤝 Contribuindo

Contribuições são o que tornam a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer é **muito apreciada**.

1. Faça um Fork do Projeto
2. Crie sua Branch de Feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas Mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

  <p>
    Built with 💚 in Brazil by <a href="https://github.com/4LFR3Dv1"><strong>SNE Labs</strong></a>
  </p>

  <p>
    <em>Building the financial infrastructure of tomorrow.</em>
  </p>

  <p>
    <a href="https://sne-scroll-pass.vercel.app/">🌐 Live Demo</a>
    ·
    <a href="https://github.com/SNE-Labs/SNE-Scroll-Passport">📦 GitHub</a>
    ·
    <a href="https://scroll.io">📜 Scroll Network</a>
  </p>

</div>
