import { Activity, DollarSign, FileText, Home, KeyRound, Lock, LockKeyhole, Newspaper, Shield } from 'lucide-react';

export type NavigationItem = {
  path: string;
  label: string;
  icon: typeof Home;
};

export type RouteMeta = {
  title: string;
  context: string;
  descriptor: string;
};

export const navigationItems: NavigationItem[] = [
  { path: '/home', label: 'Início', icon: Home },
  { path: '/radar', label: 'Radar', icon: Activity },
  { path: '/pass', label: 'Passport', icon: Shield },
  { path: '/vault', label: 'Vault', icon: Lock },
  { path: '/secrets', label: 'Secrets', icon: LockKeyhole },
  { path: '/keys', label: 'Keys', icon: KeyRound },
  { path: '/intel', label: 'Intelligence', icon: Newspaper },
  { path: '/pricing', label: 'Planos', icon: DollarSign },
  { path: '/docs', label: 'Documentação', icon: FileText },
];

const routeMetaMap: Array<{ match: (pathname: string) => boolean; meta: RouteMeta }> = [
  {
    match: (pathname) => pathname === '/' || pathname === '/home',
    meta: {
      title: 'Início',
      context: 'Base operacional',
      descriptor: 'Estado do sistema, mercado e editorial em um só lugar.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/radar'),
    meta: {
      title: 'Radar',
      context: 'Mercados líquidos',
      descriptor: 'Leitura tática dos pares com mais fluxo do universo SNE.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/pass'),
    meta: {
      title: 'Passport',
      context: 'Identity hub',
      descriptor: 'Checkpoint de identidade Web3 e lookup público on-chain.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/vault'),
    meta: {
      title: 'Vault',
      context: 'Capital',
      descriptor: 'Saldo, postura de conta e superfície de capital ao vivo.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/secrets'),
    meta: {
      title: 'Secrets',
      context: 'Privacidade',
      descriptor: 'Camada cifrada para composição e sincronização de segredos.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/keys'),
    meta: {
      title: 'Keys',
      context: 'Acesso',
      descriptor: 'Grants, licenças e credenciais do sistema operacional.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/intel') || pathname.startsWith('/blog'),
    meta: {
      title: 'Intelligence Layer',
      context: 'Intel editorial',
      descriptor: 'Dossiês, briefings e narrativas produzidas a partir do motor de Intel.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/pricing'),
    meta: {
      title: 'Planos',
      context: 'Entitlements',
      descriptor: 'Camadas de acesso e orçamento operacional do produto.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/docs'),
    meta: {
      title: 'Documentação',
      context: 'Referência',
      descriptor: 'Guia do OS, módulos e arquitetura de produto.',
    },
  },
];

export function resolveRouteMeta(pathname: string): RouteMeta {
  return routeMetaMap.find((entry) => entry.match(pathname))?.meta ?? {
    title: 'SNE OS',
    context: 'Workspace',
    descriptor: 'Camada operacional do sistema.',
  };
}
