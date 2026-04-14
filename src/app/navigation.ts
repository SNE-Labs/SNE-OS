import {
  Activity,
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

export type RouteMeta = {
  title: string;
  context: string;
  descriptor: string;
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
      context: 'Intel first',
      descriptor: 'Briefing operacional, memória de sessão e contexto para a próxima janela.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/radar'),
    meta: {
      title: 'Radar',
      context: 'Mercado em foco',
      descriptor: 'Leitura direcional, liquidez e contexto de execução antes da decisão.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/pass'),
    meta: {
      title: 'Passport',
      context: 'Identidade',
      descriptor: 'Identidade, vínculo e lookup público persistente do OS.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/vault'),
    meta: {
      title: 'Vault',
      context: 'Capital',
      descriptor: 'Capital, postura de conta e readiness da carteira conectada.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/secrets'),
    meta: {
      title: 'Secrets',
      context: 'Camada cifrada',
      descriptor: 'Camada cifrada para composição, sync e material sensível do OS.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/keys'),
    meta: {
      title: 'Keys',
      context: 'Acesso',
      descriptor: 'Credenciais, chaves e superfícies de acesso do workspace.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/intel') || pathname.startsWith('/blog'),
    meta: {
      title: 'Intel Brief',
      context: 'Fluxo editorial',
      descriptor: 'Briefings e dossiês editoriais para contexto, mercado e operação.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/pricing'),
    meta: {
      title: 'Planos',
      context: 'Acesso',
      descriptor: 'Camadas de acesso, limites e postura comercial do OS.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/docs'),
    meta: {
      title: 'Docs',
      context: 'Referência',
      descriptor: 'Documentação, contexto de produto e leitura de suporte do OS.',
    },
  },
];

export function resolveRouteMeta(pathname: string): RouteMeta {
  return routeMetaMap.find((entry) => entry.match(pathname))?.meta ?? {
    title: 'SNE OS',
    context: 'Workspace',
    descriptor: 'Camada operacional pessoal para mercado, identidade e capital.',
  };
}
