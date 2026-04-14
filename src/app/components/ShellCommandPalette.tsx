import { ArrowUpRight, Compass, FileText, House, Newspaper, Search, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { dockNavigationItems, railNavigationGroups } from '../navigation';
import { useShellContextData } from '../shell-context';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './ui/command';

type ShellCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShellCommandPalette({ open, onOpenChange }: ShellCommandPaletteProps) {
  const navigate = useNavigate();
  const { sidebarContext } = useShellContextData();

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Comandos do SNE OS" description="Buscar ativo, wallet, rota ou ação rápida.">
      <CommandInput placeholder="Buscar ativo, wallet, rota ou ação..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Principal">
          {dockNavigationItems.map((item) => (
            <CommandItem key={item.path} onSelect={() => handleNavigate(item.path)}>
              <item.icon />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Workspace">
          <CommandItem onSelect={() => handleNavigate(sidebarContext.actionPath)}>
            <Sparkles />
            <span>{sidebarContext.actionLabel}</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/intel')}>
            <Newspaper />
            <span>Abrir Intel Brief</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/radar')}>
            <Compass />
            <span>Abrir Radar</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Suporte">
          {railNavigationGroups.flatMap((group) => group.items).filter((item) => !dockNavigationItems.some((dockItem) => dockItem.path === item.path)).map((item) => (
            <CommandItem key={item.path} onSelect={() => handleNavigate(item.path)}>
              <item.icon />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Atalhos">
          <CommandItem onSelect={() => handleNavigate('/home')}>
            <House />
            <span>Ir para Home</span>
            <CommandShortcut>H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/pass')}>
            <Shield />
            <span>Ir para Passport</span>
            <CommandShortcut>P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/docs')}>
            <FileText />
            <span>Abrir Docs</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/intel')}>
            <Search />
            <span>Buscar briefing</span>
            <ArrowUpRight className="ml-auto h-4 w-4" />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
