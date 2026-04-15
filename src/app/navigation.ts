import {
  Activity,
  ArrowLeftRight,
  FileText,
  Home,
  KeyRound,
  Lock,
  LockKeyhole,
  Newspaper,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  path: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export type SurfaceFamily = 'narrativa' | 'infraestrutura' | 'execucao' | 'segredo' | 'referencia';

export type RouteMeta = {
  title: string;
  context: string;
  descriptor: string;
  family: SurfaceFamily;
};

export const dockNavigationItems: NavigationItem[] = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/radar', label: 'Radar', icon: Activity },
  { path: '/intel', label: 'Intel Brief', shortLabel: 'Intel', icon: Newspaper },
  { path: '/pass', label: 'Passport', icon: Shield },
  { path: '/vault', label: 'Vault', icon: Lock },
];

export const railNavigationGroups: NavigationGroup[] = [
  {
    label: 'Core',
    items: dockNavigationItems,
  },
  {
    label: 'Execução',
    items: [
      { path: '/swaps', label: 'Mover USDT', shortLabel: 'USDT', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Acesso',
    items: [
      { path: '/keys', label: 'Keys', icon: KeyRound },
      { path: '/secrets', label: 'Secrets', icon: LockKeyhole },
    ],
  },
  {
    label: 'Referência',
    items: [
      { path: '/docs', label: 'Docs', icon: FileText },
    ],
  },
];

export const navigationItems = railNavigationGroups.flatMap((group) => group.items);

const routeMetaMap: Array<{ match: (pathname: string) => boolean; meta: RouteMeta }> = [
  {
    match: (pathname) => pathname === '/' || pathname === '/home',
    meta: {
      title: 'Home',
      context: 'Conta USDT-first',
      descriptor: 'Conta soberana em dólar digital com contexto, saldo-base e execução multichain.',
      family: 'narrativa',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/radar'),
    meta: {
      title: 'Radar',
      context: 'Pré-execução',
      descriptor: 'Leia o mercado antes de mover capital: regime, risco e liquidez para decidir.',
      family: 'narrativa',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/swaps'),
    meta: {
      title: 'Mover USDT',
      context: 'Rail de execução',
      descriptor: 'Use seu saldo-base para converter, mover ou rotacionar entre redes e ativos.',
      family: 'execucao',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/pass'),
    meta: {
      title: 'Passport',
      context: 'Identidade operacional',
      descriptor: 'Camada de continuidade entre carteiras, sessão e conta soberana do OS.',
      family: 'infraestrutura',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/vault'),
    meta: {
      title: 'Vault',
      context: 'Saldo-base',
      descriptor: 'Leitura somente on-chain do saldo USDT, redes e prontidão da conta.',
      family: 'infraestrutura',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/secrets'),
    meta: {
      title: 'Secrets',
      context: 'Camada cifrada',
      descriptor: 'Camada cifrada para composição, sync e material sensível do OS.',
      family: 'segredo',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/keys'),
    meta: {
      title: 'Keys',
      context: 'Acesso',
      descriptor: 'Credenciais, chaves e superfícies de acesso do workspace.',
      family: 'infraestrutura',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/intel') || pathname.startsWith('/blog'),
    meta: {
      title: 'Intel Brief',
      context: 'Contexto editorial',
      descriptor: 'Briefings e dossiês editoriais para contexto, mercado e operação.',
      family: 'narrativa',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/pricing'),
    meta: {
      title: 'Planos',
      context: 'Acesso',
      descriptor: 'Camadas de acesso, limites e postura comercial do OS.',
      family: 'referencia',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/docs'),
    meta: {
      title: 'Docs',
      context: 'Referência',
      descriptor: 'Documentação, contexto de produto e leitura de suporte do OS.',
      family: 'referencia',
    },
  },
];

export function resolveRouteMeta(pathname: string): RouteMeta {
  return routeMetaMap.find((entry) => entry.match(pathname))?.meta ?? {
    title: 'SNE OS',
    context: 'Conta operacional',
    descriptor: 'Camada operacional auto custodial com USDT como saldo-base.',
    family: 'narrativa',
  };
}
