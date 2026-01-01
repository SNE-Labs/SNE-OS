# Correções de Imports Mobile - Pendentes

Os componentes mobile foram copiados para `src/app/components/mobile/` mas ainda precisam ter os imports corrigidos.

## Arquivos que precisam correção:

Todos os arquivos em `src/app/components/mobile/*.tsx` precisam ter:
- `from '../../lib/utils'` → `from '../ui/utils'`

## Arquivos já corrigidos:
- ✅ `Badge.tsx`
- ✅ `MobilePageShell.tsx` (usa `useAuth` e `formatAddress`)

## Próximos passos:

1. Corrigir imports nos arquivos restantes
2. Atualizar `MobileLayout.tsx` para usar `BottomTabBar` do design system
3. Refatorar páginas mobile para usar componentes do design system
4. Adicionar tokens mobile ao `theme.css` (já iniciado)

## Comando para corrigir imports (PowerShell):

```powershell
cd src\app\components\mobile
Get-ChildItem *.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from '../../lib/utils'", "from '../ui/utils'"
    Set-Content -Path $_.FullName -Value $content -NoNewline
}
```

