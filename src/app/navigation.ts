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
    label: 'Execution',
    items: [
      { path: '/swaps', label: 'Swaps', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Access',
    items: [
      { path: '/keys', label: 'Keys', icon: KeyRound },
      { path: '/secrets', label: 'Secrets', icon: LockKeyhole },
    ],
  },
  {
    label: 'Reference',
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
      context: 'Intel em primeiro plano',
      descriptor: 'Briefing operacional, memória de sessão e contexto para a próxima janela.',
      family: 'narrativa',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/radar'),
    meta: {
      title: 'Radar',
      context: 'Mercado em foco',
      descriptor: 'Leitura direcional, liquidez e contexto de execução antes da decisão.',
      family: 'narrativa',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/swaps'),
    meta: {
      title: 'Swaps',
      context: 'Execução',
      descriptor: 'Mover, converter e usar USDT quando a intenção já está definida.',
      family: 'execucao',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/pass'),
    meta: {
      title: 'Passport',
      context: 'Identidade',
      descriptor: 'Conta, wallets vinculadas e lookup público persistente do OS.',
      family: 'infraestrutura',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/vault'),
    meta: {
      title: 'Vault',
      context: 'Capital',
      descriptor: 'Capital, postura de conta e readiness da carteira conectada.',
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
    context: 'Workspace pessoal',
    descriptor: 'Camada operacional pessoal para mercado, identidade e capital.',
    family: 'narrativa',
  };
}
