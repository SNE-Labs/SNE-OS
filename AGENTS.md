# AGENTS.md

Este arquivo orienta agentes que trabalhem neste repositório.

## Source Of Truth Atual

O workspace ativo é este repo:

- frontend principal na raiz:
  - `src/`
  - `public/`
  - `package.json`
  - `vite.config.ts`
- backend principal em:
  - `backend-v2/services/sne-web`
- contratos ativos de acesso soberano em:
  - `contracts/`

Serviços auxiliares existentes:

- `backend-v2/services/sne-collector`
- `backend-v2/services/sne-worker`
- `backend-v2/services/sne-auto`
- `backend-v2/services/sne-telegram`
- utilitários compartilhados em `backend-v2/services/shared`

Código legado, experimentos ou distribuições antigas:

- `archive/`
- `SNE-Scroll-Passport-main/`
- `SNE RADAR DEPLOY/`
- `SNE VAULT/`
- `SNE_RADAR_DISTRIBUICAO_20251208_175125/`

Essas áreas não são source of truth do produto atual. Não mexa nelas sem pedido explícito.

## Áreas Geradas Ou De Baixa Prioridade Para Edição

Evite editar manualmente, salvo pedido claro:

- `dist/`
- `node_modules/`
- `contracts/node_modules/`
- `contracts/artifacts/`
- `contracts/cache/`

`contracts/deployments/*.json` é operacional, mas deve ser alterado apenas quando a mudança fizer parte de deploy, handoff de contrato ou atualização deliberada de manifest.

## Stack Atual

### Frontend

- React 18
- TypeScript
- Vite 6
- React Router
- TanStack Query
- Wagmi + Viem
- integração Tron wallet em `src/lib/tron/*`
- Tailwind 4 + CSS vars locais
- componentes Radix em `src/app/components/ui/*`
- `framer-motion` quando fizer sentido

Scripts na raiz:

- `npm run dev`
- `npm run build`
- `npm run test`

### Backend

Serviço principal:

- `backend-v2/services/sne-web`

Stack:

- Flask
- Flask-SQLAlchemy
- Flask-SocketIO
- PostgreSQL
- Redis opcional
- `web3` para leitura/ativação EVM
- integração Tron para checkout/pagamentos

Execução local típica do web service:

- `pip install -r requirements.txt`
- `python -m app.main`

### Contracts

Workspace isolado em:

- `contracts/`

Stack:

- Hardhat
- Solidity `0.8.26`
- OpenZeppelin

Scripts principais:

- `npm run compile`
- `npm run test`
- `npm run deploy:arbitrum-sepolia`
- `npm run deploy:arbitrum-sepolia:mock`
- `npm run deploy:arbitrum`

## Redes E Premissas Atuais

A premissa atual do produto não é mais Scroll-first.

Hoje o código aponta para:

- `Arbitrum` como rede padrão de auth/entitlement
- `SIWE` com chain id padrão `42161`
- `Tron` como rail de checkout/pagamento em USDT

Referências de código:

- frontend auth em `src/lib/auth/AuthProvider.tsx`
- frontend RPCs em `src/lib/rpcUrls.ts`
- backend config em `backend-v2/services/sne-web/app/config.py`
- contracts e manifests em `contracts/`

Se algum doc disser Scroll como base principal do auth, trate como potencialmente defasado e confirme no código antes de seguir.

## Mapa Do Frontend

### Shell E Roteamento

Source of truth do app:

- `src/app/App.tsx`

O app decide desktop vs mobile em runtime:

- desktop shell principal em `src/app/components/*`
- mobile shell principal em `src/app/layouts/MobileLayout.tsx`

Rota desktop fullscreen fora do shell principal:

- `/auth`

### Rotas Desktop Montadas Hoje

- `/home`
- `/radar`
- `/radar/:symbol`
- `/swaps`
- `/vault`
- `/pass`
- `/keys`
- `/secrets`
- `/intel`
- `/intel/topic/:topic`
- `/intel/chain/:chain`
- `/intel/asset/:asset`
- `/intel/:slug`
- `/docs`
- `/status`
- `/pricing`
- aliases legados `/blog*` redirecionam para `/intel*`

### Rotas Mobile Montadas Hoje

- `/home`
- `/radar`
- `/radar/:symbol`
- `/swaps`
- `/vault`
- `/pass`
- `/keys`
- `/secrets`
- `/intel`
- `/intel/topic/:topic`
- `/intel/chain/:chain`
- `/intel/asset/:asset`
- `/intel/:slug`
- `/docs`
- `/status`
- aliases legados `/blog*` redirecionam para `/intel*`

Observação importante:

- existe arquivo `src/app/pages/mobile/Pricing.tsx`, mas o mobile layout atual não expõe `/pricing`
- `/auth` é desktop-only hoje

### Páginas E Superfícies

Desktop:

- `src/app/pages/*`

Mobile:

- `src/app/pages/mobile/*`

Superfícies centrais hoje:

- `Home`: entrada editorial/operacional do OS
- `Radar`: leitura pré-execução
- `Intel`: trilha editorial e posts
- `Vault`: saldo-base e prontidão de conta
- `Swaps`: rail de execução
- `Pass` / `Passport`: identidade, linking e lookup público
- `Keys`: entitlement soberano, owner/delegate e checkout Operator
- `Secrets`: cofre cifrado do cliente
- `Docs`: referência in-product
- `Status`: saúde do sistema

### Componentes

- shell/layout desktop: `src/app/components/*`
- shell/layout mobile: `src/app/components/mobile/*`
- domínio swaps: `src/app/components/swaps/*`
- domínio passport: `src/app/components/passport/*`
- domínio keys: `src/app/components/keys/*`
- domínio blog/intel: `src/app/components/blog/*`
- UI base: `src/app/components/ui/*`

### Dados, Contratos E Estado Local

Normalização e acesso a API:

- `src/services/*-api.ts`
- `src/lib/api/http.ts`

Hooks de query:

- `src/hooks/*`

Auth e entitlement:

- `src/lib/auth/AuthProvider.tsx`
- `src/lib/auth/EntitlementsProvider.tsx`
- hook `useEntitlements` exportado por `src/lib/auth/EntitlementsProvider.tsx`

Persistência local importante:

- snapshots em `src/lib/querySnapshot.ts`
- leitura desses snapshots também em `src/app/shell-context.tsx`
- watchlist local em `src/services/storage/watchlistStorage.ts`
- secrets cifrados no cliente em `src/services/storage/secretsCrypto.ts`
- Passport lookup recente em `localStorage`
- estado de Tron wallet adapter em `localStorage`

Regra importante:

Se o payload do backend mudar, confirme impacto em:

1. `src/services/*-api.ts`
2. `src/hooks/*`
3. `src/app/shell-context.tsx`
4. qualquer hidratação via `readPersistedSnapshot`
5. desktop e mobile

Se esquecer snapshots e hidratação, `localStorage` antigo pode quebrar render ou gerar leitura incorreta.

### SEO

Source of truth atual:

- `src/app/RouteSeo.tsx`
- `src/lib/seo/useSeoMeta.ts`

Ao mudar semântica de rota ou página:

- atualize título
- descrição
- canonical
- structured data
- possíveis redirects legados `/blog -> /intel`

`src/SEO_IMPLEMENTATION_GUIDE.md` não é a referência principal do código atual. Confirme sempre contra `RouteSeo.tsx` e as páginas reais.

## Mapa Do Backend

Source of truth web:

- `backend-v2/services/sne-web/app`

Factory e registro de blueprints:

- `backend-v2/services/sne-web/app/__init__.py`

Entrypoint:

- `backend-v2/services/sne-web/app/main.py`

### Blueprints Ativos

Rotas principais expostas hoje incluem:

- auth/session: `auth_siwe.py`
- home: `home_api.py`
- radar: `radar_api.py`
- vault: `vault_api.py`
- passport: `passport_api.py`
- keys: `keys_api.py`
- swaps: `swaps_api.py`
- checkout: `checkout_api.py`
- payments Tron: `payments_tron_api.py`
- activations: `activations_api.py`
- secrets: `secrets_api.py`
- status: `status_api.py`
- intel: `intel_api.py`
- seo/share: `seo_api.py`, `share_api.py`
- networks: `networks_api.py`

Também existem endpoints legados ou auxiliares ainda montados:

- `dashboard_api.py`
- `charts_api.py`
- `api.py`

Não assuma que `dashboard_api.py` é a melhor source of truth de uma superfície nova. Para produto atual, prefira os serviços específicos por domínio.

### Arquivos Importantes Por Superfície

- `home_service.py`
- `radar_service.py`
- `vault_service.py`
- `passport_service.py`
- `passport_identity_service.py`
- `keys_service.py`
- `keys_contract_service.py`
- `keys_entitlement_service.py`
- `checkout_service.py`
- `activation_service.py`
- `tron_payments_service.py`
- `secrets_service.py`
- `intel_service.py`
- `intel_visuals.py`

### Modelos E Estado Persistido

Modelos centrais em:

- `backend-v2/services/sne-web/app/models.py`

O arquivo contém:

- modelos atuais de `ActivationOrder`
- identidade Passport
- watchlist
- análises
- modelos legados de `Product`, `License`, `UserTier`

Regra importante:

`License` e `UserTier` ainda existem no schema, mas não devem ser tratados automaticamente como source of truth do entitlement premium atual. A camada soberana de `Keys` já existe e deve ser considerada antes de reforçar licenciamento legado.

## Mapa Dos Contratos

Workspace ativo:

- `contracts/`

Arquivos centrais:

- `contracts/src/OperatorKey.sol`
- `contracts/src/KeySale.sol`
- `contracts/src/DelegationRegistry.sol`
- `contracts/test/SovereignAccess.test.js`
- `contracts/scripts/deploy.js`
- `contracts/deployments/*.json`

Semântica atual:

- `OperatorKey` define a classe de acesso
- `DelegationRegistry` resolve delegação owner -> delegate
- `KeySale` cobre venda primária em USDT
- manifests em `contracts/deployments/` alimentam o backend

Ao mudar contratos, normalmente você precisa revisar também:

1. `contracts/deployments/*.json`
2. `backend-v2/services/sne-web/app/keys_contract_service.py`
3. `backend-v2/services/sne-web/app/keys_entitlement_service.py`
4. `backend-v2/services/sne-web/app/checkout_service.py`
5. `src/services/keys-api.ts`
6. `src/hooks/useKeysEntitlement.ts`
7. `src/app/pages/Keys.tsx`
8. `src/app/pages/mobile/Keys.tsx`

## Documentação Do Repo

Docs operacionais que ainda valem como ponto de partida:

- `README.md`
- `backend-v2/services/sne-web/README.md`
- `contracts/README.md`
- `env.example`
- `docs/SNE_KEYS_SOVEREIGN_ACCESS_PR_PLAN.md`
- `docs/SNE_KEYS_SOVEREIGN_ACCESS_SPRINT_CHECKLIST.md`

Classifique os docs assim:

- runtime/source of truth:
  - código
  - `backend-v2/services/sne-web/README.md`
  - `contracts/README.md`
  - `env.example`
- planejamento:
  - `docs/SNE_KEYS_SOVEREIGN_ACCESS_PR_PLAN.md`
  - `docs/SNE_KEYS_SOVEREIGN_ACCESS_SPRINT_CHECKLIST.md`
- potencialmente defasados:
  - `DEPLOYMENT.md`
  - `src/SEO_IMPLEMENTATION_GUIDE.md`

Se doc e código divergirem, o código atual vence.

## Semântica De Produto Atual

Ao escrever UI/copy, siga esta gramática:

- `Home`: quadro inicial da conta operacional
- `Radar`: regime, liquidez e decisão antes da execução
- `Intel`: contexto editorial e leitura ampliada
- `Vault`: estado de conta USDT-first
- `Swaps`: rail completo de execução
- `Pass` / `Passport`: identidade operacional, sessão e continuidade entre wallets
- `Keys`: camada soberana de acesso, owner/delegate, fee tier e checkout Operator
- `Secrets`: material cifrado e superfícies sensíveis do operador
- `Docs`: referência operacional
- `Status`: estado da stack

Evite recaída para linguagem de “dashboard SaaS genérico”.

### Regras Úteis

- menos explicação textual, mais estado legível
- menos cardização gratuita, mais linhas, faixas, rails, listas e tabelas quando fizer sentido
- números e status devem carregar a leitura principal
- CTA deve nascer do estado atual da conta
- `Keys` fala de entitlement soberano e acesso
- `Pass` fala de identidade, não de premium
- pagamento confirmado em `Tron` não equivale a entitlement concedido

## Diretrizes De Edição

- Preserve o padrão existente antes de inventar abstrações novas.
- Não refatore áreas não relacionadas só porque está nelas.
- Não edite `archive/` sem pedido explícito.
- Não assuma que docs antigas representam o runtime atual.
- Não assuma que toda página desktop está exposta no mobile; confirme em `MobileLayout.tsx`.
- Mudanças globais de mobile devem priorizar `src/app/layouts/MobileLayout.tsx` e `src/app/components/mobile/*`.
- Mudanças globais de SEO devem passar por `RouteSeo.tsx` e `useSeoMeta.ts`.
- Mudanças em auth devem revisar `AuthProvider`, `EntitlementsProvider` e os endpoints SIWE.
- Mudanças em checkout/activation devem revisar frontend, backend e contratos/manifests quando aplicável.

### Contratos E Payloads

Se o contrato do backend mudar, atualize junto:

1. `src/services/*-api.ts`
2. `src/hooks/*`
3. snapshots persistidos
4. desktop e mobile
5. qualquer copy/estado dependente de entitlement ou checkout

Se o contrato on-chain mudar, atualize junto:

1. contracts
2. manifest de deployment
3. leitura backend
4. camada frontend de Keys/Swaps/checkout

## Validação Recomendada

### Frontend

Preferência:

1. `git diff --check`
2. `npm run build`
3. `npm run test`

### Backend

Para mudanças pequenas em Python:

- `python -m py_compile <arquivo>`

Para mudanças maiores:

- rode os testes disponíveis do serviço afetado
- se alterar fluxo de API, pelo menos valide import/startup do serviço

### Contracts

Para mudanças em `contracts/`:

1. `npm run compile`
2. `npm run test`

Se houver mudança de deploy/manifest:

3. valide também o consumo do manifest pelo backend

Se a toolchain local não estiver disponível, registre isso explicitamente.

## Mudanças De Alto Risco

Tenha cuidado extra com:

- contrato de API entre `sne-web` e `src/services/*-api.ts`
- snapshots persistidos e `localStorage`
- auth SIWE e chain id padrão
- entitlement soberano em `Keys`
- `OperatorCheckoutCard` e fluxo `checkout -> tron-session -> payment -> activation`
- `Swaps` quando o `feeTier` mudar
- diferença entre rotas desktop/mobile
- redirects `/blog* -> /intel*`
- SEO centralizado
- manifests em `contracts/deployments`

## Regra Prática Antes De Editar

Antes de editar, responda:

1. qual é a source of truth desta superfície: frontend, `sne-web` ou `contracts`?
2. a rota está montada em desktop, mobile ou ambos?
3. o payload mudou?
4. existe snapshot persistido, `localStorage` ou hydration no shell?
5. a mudança toca auth, entitlement, checkout ou activations?
6. a linguagem continua alinhada ao produto atual?
7. algum doc que estou seguindo está defasado em relação ao código?

Se essas respostas estiverem claras, a chance de quebrar o fluxo cai bastante.
