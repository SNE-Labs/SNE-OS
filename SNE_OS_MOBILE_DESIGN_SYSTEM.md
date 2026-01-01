# SNE OS Mobile - Design System Documentation

## Visão Geral

Sistema de design mobile premium para SNE OS com tema dark industrial, minimalista e refinado. Otimizado para experiência mobile-first (375x812px - iPhone 13/14 base).

---

## 🎨 Tokens de Tema

### Cores de Fundo (Surfaces)
```css
--bg-0: #0a0a0f;        /* Background principal */
--bg-1: #13141a;        /* Cards padrão */
--bg-2: #1a1c24;        /* Elementos secundários */
--bg-elevated: #1f212a; /* Cards elevados */
```

### Bordas (Strokes)
```css
--stroke-1: rgba(255, 255, 255, 0.08); /* Bordas sutis */
--stroke-2: rgba(255, 255, 255, 0.12); /* Bordas médias */
```

### Texto
```css
--text-1: #f5f5f7; /* Texto primário */
--text-2: #9ca3af; /* Texto secundário */
--text-3: #6b7280; /* Texto terciário */
```

### Cores de Status
```css
--accent-orange: #FF6A00; /* Accent principal */
--success: #10b981;       /* Verde de sucesso */
--warning: #f59e0b;       /* Amarelo de aviso */
--danger: #ef4444;        /* Vermelho de erro */
--info: #06b6d4;          /* Ciano informativo */
```

---

## 📐 Grid & Espaçamento

### Grid Layout
- **Colunas**: 4 colunas
- **Margin**: 16px (lateral)
- **Gutter**: 12px (entre colunas)

### Espaçamentos Padrão
- `8px` - Micro
- `12px` - Small
- `16px` - Base
- `24px` - Medium
- `32px` - Large

### Border Radius
- `14-18px` - Cards e surfaces
- `999px` - Badges e pills
- `8-12px` - Botões

---

## 🧩 Componentes

### Badge / Pill
Badges para status, tiers e categorias.

**Variantes:**
- `success` - Verde (sucesso, ativo)
- `warning` - Amarelo (aviso, pendente)
- `danger` - Vermelho (erro, crítico)
- `info` - Ciano (informação)
- `neutral` - Cinza neutro
- `orange` - Accent laranja
- `free` / `pro` / `enterprise` - Badges de tier

**Tamanhos:**
- `sm` - 20px altura
- `md` - 24px altura (padrão)
- `lg` - 28px altura

**Exemplo:**
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="pro">PRO</Badge>
```

---

### MobileButton
Botões otimizados para touch.

**Variantes:**
- `primary` - Laranja accent (CTA principal)
- `secondary` - Fundo surface (ação secundária)
- `ghost` - Transparente
- `destructive` - Vermelho (ações destrutivas)
- `icon` - Botão de ícone apenas

**Tamanhos:**
- `sm` - 32px altura
- `md` - 44px altura (padrão, touch-friendly)
- `lg` - 48px altura
- `icon` - 40x40px

**Exemplo:**
```tsx
<MobileButton variant="primary">Connect Wallet</MobileButton>
<MobileButton variant="secondary">Cancel</MobileButton>
```

---

### SurfaceCard
Container principal para conteúdo.

**Variantes:**
- `default` - Card padrão (bg-1)
- `elevated` - Card com sombra
- `interactive` - Hover e active states
- `warning` / `danger` / `success` - Cards coloridos

**Padding:**
- `none`, `sm`, `md` (padrão), `lg`

**Border Radius:**
- `default` - 16px
- `lg` - 18px
- `xl` - 24px

**Exemplo:**
```tsx
<SurfaceCard variant="elevated">
  <h3>Título</h3>
  <p>Conteúdo do card</p>
</SurfaceCard>
```

---

### StatTile & StatGrid
Exibição de métricas e estatísticas.

**StatTile:**
- Label (texto pequeno, uppercase)
- Valor (grande, destaque)
- Delta opcional (com ícone de tendência)

**StatGrid:**
- `columns={2}` - Grid 2x2 (padrão)
- `columns={3}` - Grid 1x3

**Exemplo:**
```tsx
<StatGrid 
  stats={[
    { label: 'Price', value: '$42,184', delta: { value: '+2.4%', positive: true } },
    { label: 'Volume', value: '$28.4B' },
  ]} 
  columns={2} 
/>
```

---

### ListItem
Item de lista com suporte a badges, ícones e chevron.

**Props:**
- `title` - Título principal
- `subtitle` - Texto secundário
- `meta` - Metadata à direita
- `badge` - Badge inline
- `icon` - Ícone à esquerda
- `showChevron` - Seta de navegação
- `variant` - `default`, `destructive`, `disabled`

**Exemplo:**
```tsx
<ListItem
  title="BTC/USD"
  subtitle="Strong signal"
  badge={{ label: 'BUY', variant: 'success' }}
  showChevron
  onClick={() => {}}
/>
```

---

### GateBanner
Banner de acesso limitado / gating.

**Tipos:**
- `free-limited` - Acesso limitado (free tier)
- `connect-wallet` - Requer conexão de carteira
- `sign-in` - Requer autenticação (SIWE)
- `upgrade-required` - Requer upgrade de plano

**Exemplo:**
```tsx
<GateBanner
  type="free-limited"
  onCtaClick={() => console.log('Connect')}
/>
```

---

### MobilePageShell
Shell de página com header e área de conteúdo.

**Features:**
- Header com título e subtítulo
- Slot de ação (botão/ícone)
- Status pill opcional
- Content area com scroll

**Exemplo:**
```tsx
<MobilePageShell
  title="Radar"
  subtitle="Análise de mercado"
  statusPill={{ label: 'FREE TIER', variant: 'free' }}
  action={<Button>Refresh</Button>}
>
  {/* Content */}
</MobilePageShell>
```

---

### BottomTabBar
Navegação inferior com 6 tabs.

**Tabs:**
- Radar (ícone: Radar)
- Vault (ícone: Lock)
- Pass (ícone: CreditCard)
- Pricing (ícone: DollarSign)
- Status (ícone: Activity)
- Docs (ícone: BookOpen)

**Estados:**
- `active` - Tab ativa (laranja)
- `inactive` - Tab inativa (cinza)
- `disabled` - Tab desabilitada
- Badge dot opcional

**Exemplo:**
```tsx
<BottomTabBar
  activeTab="radar"
  onTabChange={(tab) => setTab(tab)}
  badges={{ status: true }}
  disabled={['vault']}
/>
```

---

### Estados Auxiliares

#### LoadingSkeleton
```tsx
<LoadingSkeleton variant="card" />
<LoadingSkeletonGroup count={3} />
```

#### EmptyState
```tsx
<EmptyState
  title="Nenhum dado"
  description="Conecte sua carteira para ver seus dados"
  action={<Button>Connect</Button>}
/>
```

#### ErrorState
```tsx
<ErrorState
  title="Erro ao carregar"
  description="Tente novamente mais tarde"
  onRetry={() => refetch()}
/>
```

---

## 📱 Telas Implementadas

### 1. Radar
- Análise de mercado em tempo real
- Overview BTC/USD com StatGrid
- Sinais de trading em lista
- Gate banner para free users

### 2. Vault
- Overview de segurança física
- Status "Em Desenvolvimento"
- Features list (TPM, Proof of Uptime, Zero Trust)
- Arquitetura em layers

### 3. Pass (Licenses)
- Sistema de licenças NFT
- Status de conexão
- Gerenciamento (visualizar, rotation, revoke)
- Gate banner de conexão

### 4. Pricing
- 3 planos (Free / Pro / Enterprise)
- Pro destacado como "Popular"
- Features detalhadas por plano
- FAQ integrada

### 5. Status
- Status geral do sistema
- Lista de serviços com badges
- Métricas em tempo real
- Incidentes recentes

### 6. Docs
- Search field
- Table of contents por seções
- Introdução com TL;DR
- Links rápidos (Changelog, GitHub, Security)
- Community links

---

## 🎯 UX Principles

### Hierarquia Visual
1. **1 CTA dominante por tela** - Sempre destacado em laranja
2. **Cards para agrupamento** - Nunca texto solto
3. **Scan rápido** - Valores grandes, labels pequenas
4. **Gating consistente** - GateBanner em features limitadas

### Touch Targets
- Botões: mínimo 44px altura
- List items: 56-64px altura
- Tab bar: 56px altura + safe area

### Feedback Visual
- Active states: `scale(0.98)`
- Hover states: mudança de background
- Loading: skeleton screens
- Errors: error states com retry

---

## 🚀 Como Usar

### Importar componentes
```tsx
import {
  Badge,
  MobileButton,
  SurfaceCard,
  StatGrid,
  ListItem,
  GateBanner,
  MobilePageShell,
  BottomTabBar,
} from './components/mobile';
```

### Estrutura de tela típica
```tsx
<MobilePageShell title="Title" subtitle="Subtitle">
  <GateBanner type="free-limited" />
  
  <SurfaceCard>
    <StatGrid stats={stats} />
  </SurfaceCard>
  
  <SurfaceCard padding="none">
    <ListItem title="Item 1" showChevron />
    <ListItem title="Item 2" showChevron />
  </SurfaceCard>
  
  <MobileButton variant="primary">Action</MobileButton>
</MobilePageShell>
```

---

## 📦 Tecnologias

- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **class-variance-authority** - Component variants
- **Lucide React** - Ícones

---

## 🔧 Customização

### Alterar cores de accent
Edite `/src/styles/theme.css`:
```css
--accent-orange: #FF6A00; /* Sua cor */
```

### Adicionar novo tamanho de breakpoint
Para criar variante 390x844 (iPhone 14 Pro):
```tsx
<div className="max-w-[390px]"> {/* em vez de 375px */}
```

### Criar nova variante de componente
Exemplo em `Badge.tsx`:
```tsx
variant: {
  // ... existing
  custom: 'bg-purple-500 text-white border-purple-600',
}
```

---

## ✅ Checklist de Qualidade

- [x] Dark theme industrial premium
- [x] Grid mobile 4 colunas + margins
- [x] Tokens de cor consistentes
- [x] Componentes com variantes
- [x] 6 telas completas
- [x] Tab navigation funcional
- [x] Touch targets >= 44px
- [x] Loading/Error/Empty states
- [x] Safe area handling
- [x] Gating consistente
- [x] TypeScript types completos
- [x] Responsive (base 375px)

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Design System**: SNE OS Mobile UI Kit
