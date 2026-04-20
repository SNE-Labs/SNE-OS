# SNE Keys Sovereign Access PR Plan

## Objetivo

Este documento descreve o plano de implementacao em PRs para migrar o ecossistema SNE de um modelo de licenciamento centralizado para um modelo soberano on-chain, com separacao explicita entre:

- `Arbitrum` como source of truth de identidade, auth e entitlement
- `Tron` como rail principal de compra, ativacao e fluxos monetarios em `USDT`

O objetivo do v1 e:

- usar `SNE Keys` em `Arbitrum` como source of truth de acesso premium
- manter `Pass` e `SIWE` como base soberana de identidade do `SNE OS`
- desbloquear `SNE Radar` pago via posse ou delegacao valida do `Operator Key`
- cobrar compra e ativacao via `USDT on Tron`
- aplicar desconto em fees no `Swaps`
- manter `Radar Web` e `SNE Intel Brief` gratuitos

## Mudanca de premissa

Este plano substitui a premissa anterior de rede unica.

O modelo novo e:

- `Arbitrum = OS auth / SIWE / Pass / Keys / delegacao / entitlement`
- `Tron = compra / ativacao / checkout / TronLink / USDT`

Consequencia:

- a tese de produto permanece
- o fluxo comercial vira cross-chain
- pagamento confirmado em `Tron` nao concede premium por si so
- o acesso premium so existe depois do `Key` em `Arbitrum`

## Principios de arquitetura

### Principio 1: acesso soberano

O direito economico e de acesso premium deve ser derivado de estado verificavel publicamente on-chain.

- nao existe "usuario premium" em banco privado como verdade final
- a posse atual do `Key` define o direito base
- a delegacao valida estende esse direito a uma wallet operacional
- se o `Key` for transferido, o direito muda imediatamente

### Principio 2: Pass nao substitui Keys

`Pass` continua sendo a identidade SNE OS do usuario.

- resolve continuidade, presenca e vinculos entre wallets
- nao define entitlement premium por conta propria
- pode agregar owner wallet e delegate wallet
- nao invalida o fato de que a verdade do acesso vem do `Key`

### Principio 3: Arbitrum decide acesso, Tron decide pagamento

As duas redes tem responsabilidades distintas.

- `Arbitrum` guarda o direito
- `Tron` guarda o pagamento
- o sistema nao deve confundir pagamento confirmado com acesso concedido

### Principio 4: on-chain decide, off-chain acelera

O ecossistema continuara usando servicos off-chain para UX, indexacao e performance, mas esses servicos nao serao a fonte final de verdade para acesso pago.

- on-chain decide
- off-chain indexa
- frontend consome uma projecao do estado soberano

### Principio 5: em caso de duvida, negar premium

A politica operacional do sistema deve ser conservadora.

- em caso de duvida, negar acesso premium
- cache stale pode informar estado, mas nao promover classe de acesso
- nenhuma projecao off-chain pode conceder premium se houver divergencia critica com a verdade on-chain
- fallback degradado deve preservar leitura e UX quando possivel, mas nao inventar entitlement

### Principio 6: sessao nao e entitlement

Autenticacao, sessao e UX local podem continuar existindo.

- backend pode manter sessao curta
- frontend pode manter auth state
- dispositivos podem manter estado local seguro
- nada disso define premium por conta propria

O que morre na migracao nao e a sessao; o que morre e a decisao privada e centralizada de entitlement premium.

### Principio 7: ativacao precisa ser idempotente

O fluxo cross-chain adiciona risco operacional entre pagamento e mint.

- pagamento duplicado nunca pode gerar mint duplo
- retry de ativacao deve ser seguro
- reprocessamento deve retornar o mesmo resultado final
- a ordem operacional precisa ser rastreavel do inicio ao fim

## Repositorios e workstreams envolvidos

### Repositorio 1: SNE-OS

Path:

- `C:\Users\windows10\Desktop\SNE\SNE-OS`

Responsabilidades:

- identidade via `Pass`
- auth via `SIWE`
- hub de `Keys`
- backend de entitlement em `Arbitrum`
- checkout cross-chain
- activation service
- gating do `Radar` web
- fee tier do `Swaps`

### Repositorio 2: SNE Radar pago

Path:

- `C:\Users\windows10\Desktop\SNE\SNE-V1.0-CLOSED-BETA--production-functional\SNE-V1.0-CLOSED-BETA--production-functional`

Responsabilidades:

- aplicativo premium `SNE Radar`
- consumo do entitlement soberano
- remocao do licensing centralizado atual

## Escopo do v1

Entram no v1:

- `OperatorKey` em `Arbitrum`
- delegacao owner -> delegate em `Arbitrum`
- leitura de entitlement por posse ou delegacao em `Arbitrum`
- checkout em `USDT on Tron`
- integracao `TronLink`
- fluxo de compra com transferencia TRC-20 assinada pela wallet do usuario
- `ActivationOrder` como entidade operacional
- activation service que valida pagamento em `Tron` e ativa `Key` em `Arbitrum`
- gating premium do `SNE Radar`
- desconto de fee no `Swaps`

Ficam fora do v1:

- `SNE Token`
- staking
- yielding
- marketplace secundario sofisticado
- governanca ampla
- perks economicos nao essenciais alem do desconto de fee
- multiplos produtos no checkout
- multiplos rails de pagamento

## Modelo conceitual

### Classe de acesso

O produto principal do v1 sera:

- `Operator Key`

O `Operator Key` concede acesso permanente a uma classe de acesso, nao a todas as features futuras do ecossistema.

No v1, a classe `Operator` inclui:

- acesso premium ao `SNE Radar`
- desconto em fees no `Swaps`
- privilegios operacionais basicos no sistema

### Frase canonica de produto

Esta frase deve ser repetida de forma consistente em documentacao, UX, copy de compra e comunicacao comercial:

`Operator Key concede acesso permanente a classe Operator do ecossistema SNE, conforme os privilegios definidos para essa classe ao longo do tempo.`

### Posse e delegacao

O modelo de uso sera:

- owner wallet possui o `Key` em `Arbitrum`
- delegate wallet opera o produto
- o direito sempre depende da posse atual do owner ou de delegacao valida

Regras:

- se owner possui o `Key`, owner pode operar
- se owner delega para outra wallet, a delegate wallet pode operar
- se owner transferir o `Key`, delegacoes anteriores perdem validade imediatamente

### Semantica de delegacao do v1

A delegacao e a superficie mais sensivel do sistema e precisa de semantica explicita.

No v1, a recomendacao operacional e:

- delegacao `1:1`
- uma owner wallet pode ter apenas uma delegate wallet ativa por vez
- uma delegate wallet so pode estar vinculada a uma owner wallet por vez
- owner pode trocar a delegate sem precisar de etapa manual separada de clear, desde que a operacao substitua explicitamente a delegacao anterior
- a validade da delegacao depende da posse atual do `Key`
- se a owner wallet perder ou transferir o `Key`, a delegacao anterior fica invalida imediatamente
- delegate wallet recebe apenas direito de uso operacional, nao poderes administrativos sobre venda, transferencia ou reconfiguracao economica do `Key`

Assuntos que podem ser estendidos depois, mas ficam fora do v1:

- delegacao `1:N`
- expiracao temporal de delegacao
- nonce ou epoch de delegacao
- subdelegacao
- poderes administrativos da delegate wallet

## Arquitetura operacional cross-chain

O fluxo canonicamente correto do v1 e:

`Tron checkout -> payment verification -> activation service -> Arbitrum key mint/assign -> entitlement available`

### Papel por camada

`Arbitrum`

- `Pass`
- `SIWE`
- `Operator Key`
- delegacao
- entitlement soberano
- leitura de acesso por `SNE OS` e `SNE Radar`

`Tron`

- checkout em `USDT`
- `TronLink`
- transferencia TRC-20 assinada pela wallet do usuario
- pagamento e ativacao comercial

`Activation Service`

- observa e valida pagamento em `Tron`
- cria e mantem a ordem de ativacao
- executa `mint` ou `assign` do `Operator Key` em `Arbitrum`
- garante idempotencia, retry e reconciliacao

### Regra de produto

A compra acontece em `Tron`, mas o direito nasce em `Arbitrum`.

### Fluxo ideal do usuario

1. usuario entra pelo `Radar Web` ou `Keys`
2. conecta wallet EVM em `Arbitrum`
3. faz `SIWE`
4. o sistema sabe qual wallet recebera o `Operator Key` em `Arbitrum`
5. usuario escolhe pagar com `USDT` via `TronLink`
6. checkout gera uma ordem de ativacao
7. usuario paga em `Tron`
8. payment service valida o pagamento
9. activation service executa a ativacao em `Arbitrum`
10. entitlement passa a existir
11. `SNE Radar` e `Swaps` reconhecem `Operator access`

## Entidade central: ActivationOrder

O objeto operacional mais importante do fluxo cross-chain e `ActivationOrder`.

Campos minimos:

- `id`
- `status`
- `product_code`
- `buyer_tron_address`
- `target_arbitrum_address`
- `payment_chain`
- `payment_asset`
- `expected_amount`
- `received_amount`
- `payment_tx_hash`
- `payment_confirmed_at`
- `activation_chain`
- `activation_tx_hash`
- `activation_attempts`
- `idempotency_key`
- `error_code`
- `error_message`
- `created_at`
- `updated_at`

### Estados da ordem

- `created`
- `awaiting_payment`
- `payment_seen`
- `payment_confirmed`
- `activation_pending`
- `activation_submitted`
- `activated`
- `activation_failed`
- `cancelled`
- `refund_pending`
- `refunded`

### Regras da ordem

- `payment_confirmed` nao concede acesso
- `activated` so existe depois do mint confirmado em `Arbitrum`
- em duvida, negar premium
- reprocessamento deve ser idempotente
- pagamento duplicado nunca pode gerar segundo mint

## Estrutura de PRs

O rollout sera quebrado em seis PRs principais.

---

## PR 1: Contracts V1 em Arbitrum

### Objetivo

Criar a camada soberana minima de entitlement do ecossistema em `Arbitrum`.

### Repositorio

- `SNE-OS/contracts`

### Arquivos

- `contracts/src/OperatorKey.sol`
- `contracts/src/KeySale.sol`
- `contracts/src/DelegationRegistry.sol`
- `contracts/src/mocks/MockUSDT.sol`
- `contracts/test/SovereignAccess.test.js`
- `contracts/scripts/deploy.js`
- `contracts/deployments/<network>.json`

### Responsabilidades

O `PR 1` junta tres superficies criticas, que devem ser tratadas como subcamadas conceituais:

- `OperatorKey` = modelo economico e juridico do acesso
- `KeySale` = caminho EVM de referencia e integracao, mesmo que o rail comercial do v1 seja `Tron`
- `DelegationRegistry` = autorizacao operacional

Observacao:

- no v1 comercial, a compra principal acontecera em `Tron`
- ainda assim, `KeySale.sol` permanece util como referencia de venda EVM, como fallback futuro e como parte da arquitetura de contratos

### Tarefas

1. Fechar `OperatorKey.sol`
2. Fechar `DelegationRegistry.sol`
3. Manter `KeySale.sol` como trilha EVM de referencia
4. Garantir `ERC-1155`, `tokenId = 1` e semantica `1:1`
5. Escrever testes unitarios e de integracao
6. Exportar ABIs
7. Preparar deploy em `Arbitrum`
8. Publicar manifest em `contracts/deployments/<network>.json`

### Critérios de aceite

- owner com `Key` possui entitlement valido
- delegate wallet so possui entitlement se owner tiver `Key`
- ao transferir o `Key`, o delegate anterior perde acesso na leitura imediatamente
- contratos compilam e testes passam
- manifest de deploy existe para consumo do backend

### Dependencias

- definicao da testnet/mainnet de `Arbitrum`
- owner wallet
- treasury wallet

---

## PR 2: Entitlement Backend no SNE-OS

### Objetivo

Projetar o estado de `Arbitrum` em APIs consumiveis por `SNE-OS`, `SNE Radar` e `Swaps`, sem transformar o backend na source of truth.

### Papel estrutural

`PR 2` continua sendo o coracao operacional do modelo soberano.

Ele traduz para o produto:

- posse
- delegacao
- acesso efetivo
- fee tier
- source
- ultimo bloco indexado

### Repositorio

- `C:\Users\windows10\Desktop\SNE\SNE-OS`

### Arquivos

- `backend-v2/services/sne-web/app/keys_contract_service.py`
- `backend-v2/services/sne-web/app/keys_indexer.py`
- `backend-v2/services/sne-web/app/keys_entitlement_service.py`
- `backend-v2/services/sne-web/app/keys_api.py`
- `backend-v2/services/sne-web/app/swaps_fee_service.py`
- `backend-v2/services/sne-web/app/config.py`

### Responsabilidades

#### `keys_contract_service.py`

- ler `Arbitrum` via RPC direto quando necessario
- consultar saldo do `OperatorKey`
- consultar delegacao
- ler automaticamente o deployment manifest quando disponivel
- normalizar respostas on-chain

#### `keys_indexer.py`

- consumir eventos de `OperatorKey` e `DelegationRegistry`
- manter cursor de bloco indexado
- alimentar cache ou projecao consultavel

#### `keys_entitlement_service.py`

- resolver:
  - `wallet`
  - `ownerWallet`
  - `delegateWallet`
  - `hasOperatorKey`
  - `accessClass`
  - `effectiveAccess`
  - `feeTier`
  - `source`
  - `lastIndexedBlock`

#### `keys_api.py`

- expor APIs de leitura

#### `swaps_fee_service.py`

- calcular fee tier do `Swaps`
- mapear a classe `Operator` para desconto aplicavel

### Endpoints minimos

- `GET /api/keys/entitlement?address=0x...`
- `GET /api/keys/overview?address=0x...`
- `GET /api/keys/delegation?address=0x...`
- `GET /api/swaps/fee-tier?address=0x...`

### Shape esperado de entitlement

```json
{
  "wallet": "0x...",
  "ownerWallet": "0x...",
  "delegateWallet": "0x...",
  "accessClass": "operator",
  "hasOperatorKey": true,
  "effectiveAccess": true,
  "feeTier": "operator_discount",
  "source": "rpc_direct",
  "lastIndexedBlock": 12345678
}
```

### Tarefas

1. Subir leitura de `Arbitrum`
2. Criar servico de resolucao de entitlement
3. Expor os endpoints minimos
4. Registrar blueprint no app
5. Implementar fallback legivel quando RPC ou indexador falhar
6. Garantir que o backend nunca conceda acesso sem posse ou delegacao valida
7. Formalizar regra de precedencia entre RPC direto e projecao indexada

### Critérios de aceite

- `/api/keys/entitlement` responde owner, delegate e `effectiveAccess`
- `/api/swaps/fee-tier` responde tier coerente com o entitlement
- transferencia do `Key` reflete perda de acesso no holder anterior apos refresh/indexacao
- nenhuma tabela privada de assinatura vira source of truth

### Politica de reconciliacao

- projecao indexada e o caminho padrao de leitura
- RPC direto e o caminho de reconciliacao em divergencias criticas
- em caso de conflito relevante entre cache/indexador e leitura direta, o sistema deve preferir a leitura direta para decidir acesso premium
- dados stale podem ser exibidos como informacao operacional, mas nao como autorizacao premium

### Dependencias

- ABIs e enderecos do PR 1
- configuracao RPC de `Arbitrum`
- politica inicial de fee tier

---

## PR 3: Frontend SNE-OS

### Objetivo

Substituir o gating local baseado em `tier` por entitlement soberano derivado de `SNE Keys` em `Arbitrum`, mantendo o frontend EVM-first para auth e uso do OS.

### Repositorio

- `C:\Users\windows10\Desktop\SNE\SNE-OS`

### Arquivos

- `src/services/keys-api.ts`
- `src/lib/auth/EntitlementsProvider.tsx`
- `src/lib/auth/AuthProvider.tsx`
- `src/app/pages/Keys.tsx`
- `src/app/pages/mobile/Keys.tsx`
- `src/app/pages/Radar.tsx`
- `src/app/pages/mobile/Radar.tsx`
- `src/app/pages/Swaps.tsx`
- `src/app/pages/mobile/Swaps.tsx`
- `src/hooks/useKeysEntitlement.ts`
- `src/hooks/useKeysDelegation.ts`

### Papel da superficie `Keys` no v1

`Keys` e o hub comercial-operacional do ecossistema dentro do `SNE-OS`.

Ele deve concentrar:

- leitura de entitlement
- leitura de owner wallet
- leitura de delegate wallet
- leitura da classe de acesso
- leitura do estado efetivo premium
- entrada de compra cross-chain
- entrada futura de delegacao

### Tarefas

1. Expandir `keys-api.ts` para consumir `/api/keys/entitlement`
2. Criar hooks para entitlement e delegacao
3. Remover hardcode de `free/premium/pro` de `EntitlementsProvider`
4. Manter `AuthProvider` e `SIWE` focados em wallet EVM
5. Fazer a pagina `Keys` refletir:
   - owner wallet
   - delegate wallet
   - classe `Operator`
   - estado de acesso efetivo
6. Aplicar gating premium no `Radar`
7. Aplicar desconto visual e logico no `Swaps`
8. Preparar a UX para iniciar checkout `Tron`

### Critérios de aceite

- a pagina `Keys` mostra estado on-chain real de `Arbitrum`
- `SNE Radar` web premium so libera quando `effectiveAccess = true`
- `Swaps` exibe e usa `feeTier`
- frontend deixa de depender de entitlement montado localmente

---

## PR 4: Tron Checkout e ActivationOrder

### Objetivo

Criar a trilha comercial do v1 em `Tron`, sem mover o source of truth do entitlement para fora de `Arbitrum`.

### Repositorio

- `C:\Users\windows10\Desktop\SNE\SNE-OS`

### Novas responsabilidades

- checkout em `USDT on Tron`
- integracao `TronLink`
- assinatura direta da transferencia TRC-20 pela wallet do usuario
- criacao e leitura de `ActivationOrder`
- vinculacao entre wallet `Tron` pagadora e wallet `Arbitrum` de destino

### Entidades

- `ActivationOrder`
- `TronPayment`
- `PassSession`

### Endpoints minimos

- `POST /api/checkout/orders`
- `GET /api/checkout/orders/:id`
- `POST /api/checkout/orders/:id/tron-session`
- `POST /api/checkout/orders/:id/cancel`
- `GET /api/payments/tron/:orderId`

### Tarefas

1. Criar `ActivationOrder` no backend
2. Criar estado de maquina da ordem
3. Implementar endpoints de checkout
4. Integrar `TronLink` no frontend
5. Mostrar instrucoes de pagamento `USDT on Tron`
6. Assinar transferencia TRC-20 normal em `Tron` com a wallet do usuario
7. Persistir `buyer_tron_address` e `target_arbitrum_address`
8. Garantir que a ordem continue server-side mesmo se a aba fechar

### Critérios de aceite

- usuario autenticado em EVM consegue criar ordem
- wallet `Tron` consegue ser vinculada a ordem
- ordem passa por `created -> awaiting_payment`
- pagamento em `Tron` e uma transferencia normal assinada pela wallet do usuario
- nenhuma etapa de checkout concede premium diretamente

---

## PR 5: Activation Service cross-chain

### Objetivo

Ligar `Tron` a `Arbitrum` de forma idempotente e auditavel.

### Repositorio

- `C:\Users\windows10\Desktop\SNE\SNE-OS`

### Responsabilidades

`TronPaymentService`

- observar transacoes ou callbacks em `Tron`
- validar `USDT`, valor, destino e ordem
- marcar `payment_seen` e `payment_confirmed`

`ActivationService`

- processar ordens com pagamento confirmado
- executar `mint` ou `assign` em `Arbitrum`
- registrar `activation_tx_hash`
- fazer retry seguro

### Endpoints minimos

- `POST /api/payments/tron/webhook`
- `POST /api/payments/tron/reconcile/:orderId`
- `POST /api/activations/:orderId/process`
- `POST /api/activations/:orderId/retry`
- `GET /api/activations/:orderId`

### Eventos operacionais

- `checkout.order.created`
- `payment.tron.seen`
- `payment.tron.confirmed`
- `payment.tron.failed`
- `activation.arbitrum.submitted`
- `activation.arbitrum.confirmed`
- `activation.arbitrum.failed`
- `entitlement.available`

### Tarefas

1. Implementar verificador de pagamento em `Tron`
2. Implementar reconciliacao manual
3. Implementar `ActivationService`
4. Gravar `activation_tx_hash`
5. Implementar retries e idempotencia
6. Atualizar ordem ate `activated`
7. Garantir que `GET /api/keys/entitlement` so mude depois do `Key` em `Arbitrum`

### Critérios de aceite

- pagamento confirmado em `Tron` nao libera premium sozinho
- mint em `Arbitrum` cria o `Operator Key`
- ordem vai para `activated` somente apos confirmacao do mint
- pagamentos duplicados nao geram segundo mint

---

## PR 6: Migracao do SNE Radar pago, cleanup e go-live

### Objetivo

Fechar a migracao do `SNE Radar` pago para o modelo soberano e preparar producao.

### Repositorios

- `SNE-OS`
- `SNE Radar` pago

### Estado atual a ser descontinuado

O app pago hoje depende de:

- `frontend/src/stores/auth.js`
- `auth_manager.py`
- `license_manager.py`
- `payment_manager.py`
- `app/models/models.py` com `User`, `Subscription` e `subscription_expires`

Esse modelo deve sair da source of truth do acesso premium.

### Tarefas

1. Remover dependencia de `subscription_expires` do fluxo premium
2. Alterar store de auth para consumir entitlement remoto
3. Ajustar backend do app pago para nao validar premium via banco local
4. Garantir que a perda ou transferencia do `Key` derrube acesso no holder anterior
5. Integrar polling ou refresh da `ActivationOrder`
6. Aplicar fee tier coerente no `Swaps`
7. Criar runbooks de compra, delegacao, transferencia e falha cross-chain
8. Monitorar atraso de indexacao e reconciliacao
9. Definir modo degradado legivel

### Doutrina de migracao

- sessao pode continuar existindo
- auth pode continuar existindo
- armazenamento local seguro pode continuar existindo
- o que nao pode continuar existindo e o premium decidido por licenca local, subscription em banco privado ou machine binding como verdade final

### Critérios de aceite

- `SNE Radar` pago autentica wallet, nao "usuario pago"
- o acesso premium vem apenas de posse ou delegacao valida em `Arbitrum`
- pagamento `Tron` so influencia a ordem de ativacao, nao o entitlement final
- `license_manager.py` e `payment_manager.py` nao participam mais da decisao de acesso premium
- operacao consegue diagnosticar divergencia entre pagamento, ativacao e entitlement

## Ordem recomendada de execucao

1. `PR 1: Contracts V1 em Arbitrum`
2. `PR 2: Entitlement Backend no SNE-OS`
3. `PR 3: Frontend SNE-OS`
4. `PR 4: Tron Checkout e ActivationOrder`
5. `PR 5: Activation Service cross-chain`
6. `PR 6: Migracao do SNE Radar pago, cleanup e go-live`

## Dependencias entre PRs

### PR 1 -> PR 2

`PR 2` depende de:

- ABIs finais
- enderecos dos contratos em `Arbitrum`
- manifest de deploy
- estrategia de delegacao consolidada

### PR 2 -> PR 3

`PR 3` depende de:

- `/api/keys/entitlement`
- `/api/swaps/fee-tier`

### PR 3 -> PR 4

`PR 4` depende de:

- sessao `SIWE` estavel
- wallet `Arbitrum` conhecida
- hub `Keys` pronto para iniciar checkout

### PR 4 -> PR 5

`PR 5` depende de:

- `ActivationOrder` funcional
- fluxo `Tron` de pagamento definido
- wallet `Arbitrum` de destino vinculada a ordem

### PR 5 -> PR 6

`PR 6` depende de:

- pipeline de ativacao cross-chain funcional
- entitlement refletindo ativacao concluida

## Critério de pronto do v1

O v1 estara pronto quando:

- `OperatorKey` existir em `Arbitrum`
- owner wallet puder operar diretamente
- owner wallet puder delegar para wallet operacional
- usuario autenticado em EVM puder iniciar compra
- usuario puder pagar em `USDT on Tron`
- o sistema puder validar esse pagamento
- o sistema puder ativar `Operator Key` em `Arbitrum`
- `SNE Radar` pago liberar acesso apenas para posse ou delegacao valida
- `Swaps` aplicar desconto coerente com a classe `Operator`
- a transferencia do `Key` mover o direito imediatamente
- nenhum banco privado definir premium como verdade final

## Decisoes ja fechadas

- `Pass` e a identidade SNE OS do usuario
- `Keys` sao a source of truth do acesso premium
- o entitlement canonicamente vive em `Arbitrum`
- auth do `SNE OS` continua `SIWE` / EVM-first
- compra e ativacao comercial do v1 acontecem em `Tron`
- compra baseada em `USDT`
- acesso premium usa posse + delegacao
- transferencia move o direito imediatamente
- `Operator Key` representa acesso permanente a uma classe de acesso
- `SNE Radar` pago e a principal superficie premium
- `Swaps` monetiza por fee, com desconto para `Operator`

## Assuntos explicitamente adiados

- `SNE Token`
- staking
- yielding
- economia de rewards
- governanca do ecossistema
- classes adicionais alem de `Operator`
- marketplace secundario cross-chain
- multiplos rails de checkout

## Recomendacao final

O primeiro corte executavel continua sendo:

- contratos em `Arbitrum`
- entitlement backend

Mas o v1 de negocio so fecha de verdade quando a trilha nova tambem existir:

- checkout `Tron`
- activation service cross-chain

Em resumo:

- `Arbitrum` guarda o direito
- `Tron` guarda o pagamento
- `Activation Service` liga as duas coisas
- o app so libera premium quando o direito existir em `Arbitrum`
