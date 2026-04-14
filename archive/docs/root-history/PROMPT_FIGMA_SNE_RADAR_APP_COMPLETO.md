# Prompt para Figma - SNE Radar App Completo Freemium

## Prompt Principal (copiar e colar no Figma)

```
Crie o design completo de um app freemium de análise técnica avançada: "SNE Radar" - plataforma SaaS para traders com 3 tiers (Free, Premium R$199/mês, Pro R$799/mês).

DESIGN SYSTEM SNE LABS:
- Cores: Fundo preto #0B0B0B, Superfície #111216, Superfície elevada #1B1B1F
- Accent: Laranja #FF6A00 (hover #E65A00)
- Texto primário: #F7F7F8, Texto secundário: #A6A6A6
- Status: Sucesso #00C48C, Aviso #FFC857, Crítico #FF4D4F
- Tipografia: Inter (UI), JetBrains Mono (código/dados)
- Espaçamento: Sistema 8px (8, 16, 24, 32, 48, 64px)
- Border radius: 6px (sm), 10px (md), 9999px (pill)
- Bordas: rgba(255, 255, 255, 0.1)

ESTRUTURA COMPLETA DO APP:

═══════════════════════════════════════════════════════════════
1. NAVIGATION (fixa no topo, altura 64px)
═══════════════════════════════════════════════════════════════

- Logo "SNE Radar" (font-mono, bold, esquerda)
- Links: Dashboard | Charts | Analysis (centro, espaçamento 16px)
- Badge de Tier (Free/Premium/Pro) + Endereço wallet encurtado (ex: 0x1234...5678)
- Botão "Conectar Carteira" (laranja #FF6A00) quando não conectado
- Background: #0B0B0B com borda inferior sutil
- Sticky/fixed position

═══════════════════════════════════════════════════════════════
2. DASHBOARD (Tela Principal)
═══════════════════════════════════════════════════════════════

Layout: Grid responsivo (desktop 12 colunas, tablet 8, mobile 4)

Seção 1: Market Summary (12 colunas)
- Dominância BTC/ETH
- Market cap total
- Volume 24h
- Fear & Greed Index
- Cards com gradiente sutil, borda rgba(255,255,255,0.1)

Seção 2: Top Movers (6 colunas)
- Grid de cards: Símbolo, Preço, Variação 24h, Volume
- Free: Top 10 apenas
- Premium/Pro: Top 50 com filtros
- Cards clicáveis → abre Chart

Seção 3: Watchlist (6 colunas)
- Lista de símbolos favoritos
- Preço atual + variação
- Botão "+" para adicionar
- Free: 3 símbolos, Premium: 10, Pro: ilimitado

Seção 4: Alertas Recentes (12 colunas)
- Lista de alertas disparados
- Tipo (compra/venda), Símbolo, Preço, Timestamp
- Free: últimos 5, Premium/Pro: últimos 50

Seção 5: Quick Stats (12 colunas, 4 cards)
- Análises hoje: X/Y (Free: 3/dia, Premium: 50/dia, Pro: 1000/dia)
- Taxa de sucesso: XX%
- Melhor setup: [símbolo]
- Próxima análise: [tempo restante]

Gating Visual:
- Free: Badge "FREE" nos cards limitados
- Premium: Badge "PREMIUM" laranja
- Pro: Badge "PRO" dourado
- Cards bloqueados: Overlay escuro + CTA "Upgrade to Premium"

═══════════════════════════════════════════════════════════════
3. CHART (Tela de Gráficos)
═══════════════════════════════════════════════════════════════

Layout: Split view (70% gráfico, 30% sidebar)

Top Bar (fixa):
- Seletor de símbolo (BTCUSDT, ETHUSDT, etc.)
- Seletor de timeframe (1m, 5m, 15m, 1h, 4h, 1d)
- Botões: Zoom In/Out, Reset, Fullscreen
- Indicador de tempo real (verde/amarelo/vermelho)

Main Chart Area (70%):
- TradingView Lightweight Charts
- Candlesticks com cores: Verde (alta), Vermelho (baixa)
- Indicadores overlay: EMA, RSI, MACD, Bollinger Bands
- Linhas de suporte/resistência (Premium/Pro)
- Zonas magnéticas (Premium/Pro)
- Tooltip rico ao hover: OHLC, Volume, Variação

Sidebar Direita (30%):
- Indicadores Técnicos (lista expansível)
  - RSI: Valor + gráfico mini
  - MACD: Histograma
  - EMA 8/21: Linhas no gráfico
  - Volume: Barras abaixo
- Order Book (Pro apenas)
  - Bids/Asks com profundidade
  - Spread destacado
- Trade History (últimos trades)
- Análise Rápida (score + setup)

Gating:
- Free: 1 símbolo, timeframes limitados (15m, 1h, 4h, 1d), 200 candles
- Premium: Multi-timeframe, 1000 candles, indicadores avançados
- Pro: DOM completo, tempo real 15s, histórico ilimitado

═══════════════════════════════════════════════════════════════
4. ANALYSIS (Tela de Análise Técnica)
═══════════════════════════════════════════════════════════════

Layout: Split view (60% mini-chart, 40% resultados)

Top Section:
- Seletor: Símbolo + Timeframe
- Botão "Executar Análise" (laranja, grande)
- Contador: "Análises hoje: X/Y" (Free: 3/dia, Premium: 50/dia, Pro: 1000/dia)

Mini-Chart (60%):
- Gráfico candlestick com níveis operacionais:
  - Entry (linha verde)
  - Stop Loss (linha vermelha)
  - Take Profit 1/2/3 (linhas amarelas)
- Zonas magnéticas destacadas
- Indicadores RSI/MACD em painel separado abaixo

Resultados (40%):
- Score Geral: 0-100 (badge colorido)
- Setup Identificado: [nome do padrão]
- Probabilidade: XX%
- Risk/Reward: 1:X
- Níveis Operacionais:
  - Entry: $XX,XXX
  - SL: $XX,XXX (-X%)
  - TP1: $XX,XXX (+X%)
  - TP2: $XX,XXX (+X%)
  - TP3: $XX,XXX (+X%)
- Rationale: Texto explicativo
- Confluências Técnicas: Lista de fatores
- Invalidação: Condições que invalidam o setup

Histórico (aba separada):
- Lista de análises anteriores
- Comparar análises (Premium/Pro)
- Exportar CSV (Premium/Pro)

Gating:
- Free: 3 análises/dia, score básico, 1 setup
- Premium: 50/dia, análise completa, backtest básico
- Pro: 1000/dia, análise institucional, backtest avançado

═══════════════════════════════════════════════════════════════
5. PRICING (Tela de Assinaturas)
═══════════════════════════════════════════════════════════════

Layout: 3 colunas (Free, Premium, Pro)

Card Free:
- Badge "GRÁTIS"
- Preço: R$ 0/mês
- Features:
  - ✅ Dashboard básico (Top 10)
  - ✅ 3 análises/dia
  - ✅ 1 símbolo no chart
  - ✅ Timeframes limitados
  - ❌ Sem backtest
  - ❌ Sem alertas
- Botão "Usar Grátis" (secondary, outline)

Card Premium:
- Badge "POPULAR" (laranja)
- Preço: R$ 199/mês
- Features:
  - ✅ Dashboard completo
  - ✅ 50 análises/dia
  - ✅ Multi-timeframe
  - ✅ Alertas ilimitados
  - ✅ Backtest básico
  - ✅ Histórico 30 dias
- Botão "Assinar Premium" (primary, laranja)

Card Pro:
- Badge "PROFISSIONAL"
- Preço: R$ 799/mês
- Features:
  - ✅ Tudo do Premium
  - ✅ 1000 análises/dia
  - ✅ DOM completo
  - ✅ Backtest avançado
  - ✅ Webhooks
  - ✅ Histórico ilimitado
  - ✅ SLA 99.9%
- Botão "Assinar Pro" (primary, laranja)

Comparação de Features (tabela abaixo):
- Feature | Free | Premium | Pro
- Análises/dia | 3 | 50 | 1000
- Símbolos | 1 | 3 | Ilimitado
- Timeframes | Limitado | Completo | Completo
- Backtest | ❌ | ✅ Básico | ✅ Avançado
- Alertas | ❌ | ✅ | ✅ Ilimitado

═══════════════════════════════════════════════════════════════
6. WALLET CONNECT (Modal/Overlay)
═══════════════════════════════════════════════════════════════

Modal Centralizado:
- Título: "Conectar Carteira"
- Subtítulo: "Conecte sua wallet para acessar o SNE Radar"
- Opções de conexão:
  - MetaMask (ícone + botão)
  - WalletConnect (ícone + botão)
  - Injected (ícone + botão)
- QR Code (se WalletConnect)
- Texto: "Ao conectar, você concorda com nossos Termos de Uso"
- Botão "Cancelar" (secondary)

Após Conexão:
- Modal SIWE (Sign-In with Ethereum):
  - Título: "Assinar Mensagem"
  - Mensagem SIWE formatada (legível)
  - Botão "Assinar" (primary)
  - Botão "Cancelar" (secondary)

Estado Conectado (no header):
- Badge Tier (Free/Premium/Pro)
- Endereço encurtado: 0x1234...5678
- Dropdown: Ver Perfil | Gerenciar Assinatura | Desconectar

═══════════════════════════════════════════════════════════════
7. COMPONENTES REUTILIZÁVEIS
═══════════════════════════════════════════════════════════════

Button Primary:
- Background: #FF6A00
- Texto: #F7F7F8
- Border-radius: 6px
- Padding: 8px 16px
- Shadow: 0 6px 18px rgba(255, 106, 0, 0.12)
- Hover: Background #E65A00, translateY(-1px)

Button Secondary:
- Background: transparente
- Borda: rgba(255,255,255,0.1)
- Texto: #F7F7F8
- Hover: Background #1B1B1F, borda laranja

Card:
- Background: gradiente #111216 → #1B1B1F
- Borda: rgba(255,255,255,0.1)
- Border-radius: 10px
- Padding: 24px
- Shadow: 0 4px 14px rgba(2,6,23,0.45)
- Hover: Borda laranja, translateY(-2px)

Badge Tier:
- Free: Background #1B1B1F, texto #A6A6A6
- Premium: Background rgba(255,106,0,0.2), texto #FF6A00
- Pro: Background rgba(255,200,87,0.2), texto #FFC857

Metric Card:
- Valor grande (36px, font-mono, bold, laranja)
- Label pequeno (12px, uppercase, tracking-wider)
- Trend indicator (seta verde/vermelha)
- Ícone opcional

Skeleton Loader:
- Background: #111216
- Shimmer animation (gradiente animado)
- Usar durante carregamento

Toast Notification:
- Success: Background #00C48C, ícone check
- Error: Background #FF4D4F, ícone X
- Info: Background #FF6A00, ícone info
- Posição: Top-right
- Auto-dismiss: 5s

Progress Bar:
- Background: #1B1B1F
- Fill: #FF6A00 (gradiente)
- Altura: 4px
- Border-radius: 2px

═══════════════════════════════════════════════════════════════
8. ESTADOS E INTERAÇÕES
═══════════════════════════════════════════════════════════════

Loading States:
- Skeleton loaders em cards
- Spinner em botões (durante ação)
- Progress bar em análises longas

Empty States:
- "Nenhuma análise ainda" (ilustração + CTA)
- "Conecte sua wallet para começar"
- "Upgrade para Premium para ver mais"

Error States:
- Toast de erro
- Mensagem inline em formulários
- Retry button

Success States:
- Toast de sucesso
- Confirmação visual (check animado)
- Feedback imediato

Hover States:
- Cards: Borda laranja, translateY(-2px)
- Buttons: Background mais escuro, shadow maior
- Links: Cor laranja, underline

Active States:
- Botões: translateY(0), shadow menor
- Tabs: Borda inferior laranja
- Inputs: Borda laranja, shadow sutil

Disabled States:
- Opacidade 0.5
- Cursor not-allowed
- Overlay escuro em features bloqueadas

═══════════════════════════════════════════════════════════════
9. RESPONSIVIDADE
═══════════════════════════════════════════════════════════════

Desktop (1440px+):
- Grid 12 colunas
- Padding horizontal: 96px
- Navigation completa
- Sidebars visíveis

Tablet (768px - 1439px):
- Grid 8 colunas
- Padding horizontal: 48px
- Navigation colapsável (hamburger)
- Sidebars colapsáveis

Mobile (320px - 767px):
- Grid 4 colunas
- Padding horizontal: 24px
- Navigation: Hamburger menu
- Cards empilhados verticalmente
- Chart full-width (sem sidebar)
- Modal fullscreen

═══════════════════════════════════════════════════════════════
10. ANIMAÇÕES E TRANSIÇÕES
═══════════════════════════════════════════════════════════════

Micro-interações:
- Hover: 120ms ease
- Click: 100ms ease
- Transições: 150ms cubic-bezier(.2,.9,.3,1)

Animações:
- Fade in: 200ms
- Slide in: 300ms
- Shimmer (skeleton): 1.5s infinite
- Pulse (badge status): 2s infinite
- Background gradiente: 18s linear infinite

Transições de Página:
- Fade: 200ms
- Slide: 300ms

Reduced Motion:
- Respeitar prefers-reduced-motion
- Desabilitar animações se usuário preferir

═══════════════════════════════════════════════════════════════
11. ACESSIBILIDADE
═══════════════════════════════════════════════════════════════

- Contraste mínimo: 4.5:1 (AA)
- Focus ring: 2px laranja com 4px offset
- Navegação por teclado completa
- ARIA labels em todos os elementos interativos
- Alt text em imagens/gráficos
- Screen reader friendly

═══════════════════════════════════════════════════════════════
ESTILO GERAL
═══════════════════════════════════════════════════════════════

- Design sóbrio, técnico, profissional (Bloomberg-like)
- Alta densidade de informação sem poluição visual
- Contraste alto (preto + laranja)
- Monospace para números/dados/endereços
- Espaçamento generoso mas eficiente
- Visual "terminal" moderno, não retro
- Foco em funcionalidade e produtividade
- Gating visual claro (Free vs Premium vs Pro)
- Feedback imediato em todas as ações
```

## Checklist de Telas no Figma

### Telas Principais
- [ ] Navigation (header fixo)
- [ ] Dashboard (market summary + top movers + watchlist)
- [ ] Chart (gráfico + sidebar de indicadores)
- [ ] Analysis (mini-chart + resultados + histórico)
- [ ] Pricing (3 cards de tiers)
- [ ] Wallet Connect Modal
- [ ] SIWE Sign Modal

### Estados
- [ ] Loading (skeletons)
- [ ] Empty states
- [ ] Error states
- [ ] Success states
- [ ] Gating (features bloqueadas)

### Componentes
- [ ] Button (Primary, Secondary, Ghost)
- [ ] Card (Default, Hover, Active)
- [ ] Badge (Tier, Status)
- [ ] Metric Card
- [ ] Toast Notification
- [ ] Progress Bar
- [ ] Skeleton Loader
- [ ] Modal/Dialog

### Responsividade
- [ ] Desktop (1440px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

## Dicas para o Figma

1. **Crie um Design System primeiro:**
   - Frame "Design Tokens" com todas as cores
   - Componentes reutilizáveis (Button, Card, Badge)
   - Text styles (H1, H2, H3, Body, Small, Code)
   - Effects (shadows, glows)

2. **Use Auto Layout:**
   - Todos os containers com Auto Layout
   - Constraints para responsividade
   - Spacing consistente (8px grid)

3. **Variants para componentes:**
   - Button: Primary, Secondary, Ghost, Disabled
   - Card: Default, Hover, Active, Disabled
   - Badge: Free, Premium, Pro, Success, Warning, Error

4. **Anotações:**
   - Adicione notes com especificações técnicas
   - Indique animações e transições
   - Marque breakpoints responsivos
   - Documente gating por tier

5. **Prototipagem:**
   - Conecte telas com transições
   - Adicione interações (hover, click)
   - Teste fluxo completo (conectar wallet → dashboard → chart → analysis)

## Após Criar no Figma

1. Exporte o design como referência
2. Compartilhe o link do Figma ou exporte os assets
3. Eu implemento baseado no seu design completo

