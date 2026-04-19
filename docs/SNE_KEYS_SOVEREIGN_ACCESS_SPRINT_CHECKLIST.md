# SNE Keys Sovereign Access Sprint Checklist

## Objetivo

Este documento converte o plano de migracao soberana do `SNE Keys` em um checklist operacional por sprint.

Ele parte do documento principal:

- `docs/SNE_KEYS_SOVEREIGN_ACCESS_PR_PLAN.md`

O foco aqui e execucao.

## Regras de execucao

- nenhuma sprint deve reintroduzir source of truth privada para premium
- sessao, auth e cache podem existir, mas nao decidem entitlement
- em caso de duvida, negar premium
- dados stale podem informar estado, mas nao promover `accessClass`
- `Pass` continua identidade
- `Keys` continua entitlement soberano
- `Arbitrum` continua source of truth de acesso
- `Tron` continua rail de compra e ativacao
- pagamento confirmado nao concede premium por si so

## Definicao de pronto do programa

O programa estara pronto quando:

- `Operator Key` existir em `Arbitrum`
- owner wallet puder operar diretamente
- owner wallet puder delegar para wallet operacional
- usuario autenticado em EVM puder iniciar uma ordem de compra
- usuario puder pagar em `USDT on Tron`
- o sistema puder ativar `Operator Key` em `Arbitrum`
- `SNE Radar` pago consumir entitlement soberano
- `SNE Radar` web premium respeitar `effectiveAccess`
- `Swaps` aplicar desconto por `feeTier`
- transferencia do `Key` mover imediatamente o direito

## Sprint 0: Preparacao e congelamento conceitual

### Objetivo

Fechar as definicoes que nao podem continuar mudando durante a implementacao.

### Checklist

- [ ] Confirmar `Arbitrum` como rede canonica de `Keys`
- [ ] Confirmar `Tron` como rail comercial de compra e ativacao
- [ ] Confirmar endereco de `USDT` em `Tron`
- [ ] Confirmar RPC e explorer de `Arbitrum`
- [ ] Confirmar escolha de `ERC-1155` para `OperatorKey`
- [ ] Confirmar `tokenId = 1` para classe `Operator`
- [ ] Confirmar semantica de delegacao `1:1`
- [ ] Confirmar que delegate nao recebe poderes administrativos
- [ ] Confirmar treasury wallet
- [ ] Confirmar frase canonica do `Operator Key`
- [ ] Confirmar que `Pass` nao e source of truth de premium
- [ ] Confirmar politica de falha: em duvida, negar premium
- [ ] Confirmar objeto operacional `ActivationOrder`

### Critério de saida

Nao existe ambiguidade sobre:

- classe `Operator`
- `Arbitrum` vs `Tron`
- posse + delegacao
- transferencia
- regra de premium

## Sprint 1: Contratos nucleares em Arbitrum

### Objetivo

Subir a camada on-chain minima de acesso soberano.

### Checklist

- [ ] Fechar `contracts/src/OperatorKey.sol`
- [ ] Fechar `contracts/src/KeySale.sol`
- [ ] Fechar `contracts/src/DelegationRegistry.sol`
- [ ] Validar `ERC-1155` + `tokenId = 1`
- [ ] Implementar `setDelegate`
- [ ] Implementar `clearDelegate`
- [ ] Implementar leitura que invalida delegacao sem posse atual
- [ ] Cobrir compra com testes
- [ ] Cobrir delegacao com testes
- [ ] Cobrir transferencia com testes
- [ ] Exportar ABIs
- [ ] Gerar deployment manifest

### Critério de saida

- owner com `Key` tem entitlement
- delegate so funciona enquanto owner tiver `Key`
- transferencia derruba validade da delegacao anterior
- contratos compilam e testes passam

## Sprint 2: Deploy de testnet e leitura soberana

### Objetivo

Colocar os contratos em ambiente de teste e validar leitura real de chain state em `Arbitrum`.

### Checklist

- [ ] Deploy de `OperatorKey` em testnet `Arbitrum`
- [ ] Deploy de `KeySale` em testnet `Arbitrum`
- [ ] Deploy de `DelegationRegistry` em testnet `Arbitrum`
- [ ] Registrar enderecos de contrato
- [ ] Registrar ABIs finais da testnet
- [ ] Publicar `deployments/<network>.json`
- [ ] Executar delegacao real em testnet
- [ ] Executar transferencia real em testnet
- [ ] Validar perda de acesso apos transferencia
- [ ] Documentar enderecos e parametros

### Critério de saida

- todo fluxo principal de entitlement foi exercitado em testnet
- comportamento da delegacao foi validado fora de mocks

## Sprint 3: Entitlement backend no SNE-OS

### Objetivo

Traduzir estado on-chain de `Arbitrum` em uma camada operacional consumivel pelo produto.

### Checklist

- [ ] Fechar `backend-v2/services/sne-web/app/keys_contract_service.py`
- [ ] Fechar `backend-v2/services/sne-web/app/keys_indexer.py`
- [ ] Fechar `backend-v2/services/sne-web/app/keys_entitlement_service.py`
- [ ] Fechar `backend-v2/services/sne-web/app/keys_api.py`
- [ ] Fechar `backend-v2/services/sne-web/app/swaps_fee_service.py`
- [ ] Registrar blueprint de `keys_api.py` no app
- [ ] Implementar `GET /api/keys/entitlement`
- [ ] Implementar `GET /api/keys/overview`
- [ ] Implementar `GET /api/keys/delegation`
- [ ] Implementar `GET /api/swaps/fee-tier`
- [ ] Registrar `lastIndexedBlock`
- [ ] Expor `source`
- [ ] Definir regra de reconciliacao indexador vs RPC direto
- [ ] Implementar politica conservadora de premium
- [ ] Ler deployment manifest automaticamente

### Critério de saida

- a API resolve owner, delegate, `effectiveAccess` e `feeTier`
- o backend nao concede premium sem posse ou delegacao valida
- divergencias criticas podem ser reconciliadas contra RPC direto

## Sprint 4: Frontend SNE-OS

### Objetivo

Fazer o `SNE-OS` consumir entitlement soberano de verdade, mantendo auth EVM-first.

### Checklist

- [ ] Expandir `src/services/keys-api.ts`
- [ ] Criar `src/hooks/useKeysEntitlement.ts`
- [ ] Criar `src/hooks/useKeysDelegation.ts`
- [ ] Refatorar `src/lib/auth/EntitlementsProvider.tsx`
- [ ] Manter `src/lib/auth/AuthProvider.tsx` focado em EVM / `SIWE`
- [ ] Remover hardcode local de `free/premium/pro`
- [ ] Atualizar `src/app/pages/Keys.tsx`
- [ ] Atualizar `src/app/pages/mobile/Keys.tsx`
- [ ] Mostrar owner wallet
- [ ] Mostrar delegate wallet
- [ ] Mostrar `accessClass`
- [ ] Mostrar `effectiveAccess`
- [ ] Aplicar gating no `Radar`
- [ ] Aplicar `feeTier` no `Swaps`
- [ ] Preparar CTA para checkout `Tron`
- [ ] Validar coerencia desktop/mobile

### Critério de saida

- o `SNE-OS` deixa de montar premium localmente
- `Keys` reflete estado soberano
- `Radar` e `Swaps` passam a ler a verdade via API de entitlement

## Sprint 5: Tron checkout e ActivationOrder

### Objetivo

Subir a trilha comercial em `Tron` sem mover o source of truth do access layer.

### Checklist

- [ ] Criar entidade `ActivationOrder`
- [ ] Definir maquina de estados da ordem
- [ ] Implementar `POST /api/checkout/orders`
- [ ] Implementar `GET /api/checkout/orders/:id`
- [ ] Implementar `POST /api/checkout/orders/:id/tron-session`
- [ ] Implementar `POST /api/checkout/orders/:id/cancel`
- [ ] Integrar `TronLink`
- [ ] Exibir instrucoes de pagamento `USDT on Tron`
- [ ] Persistir `buyer_tron_address`
- [ ] Persistir `target_arbitrum_address`
- [ ] Validar ordem server-side mesmo com fechamento de aba

### Critério de saida

- usuario autenticado em EVM consegue criar ordem
- wallet `Tron` consegue ser vinculada a ordem
- nenhuma etapa de checkout concede premium diretamente

## Sprint 6: Activation service cross-chain

### Objetivo

Ligar `Tron` a `Arbitrum` de forma idempotente e auditavel.

### Checklist

- [ ] Implementar verificador de pagamento `Tron`
- [ ] Validar `USDT`, valor, destino e ordem
- [ ] Implementar `POST /api/payments/tron/webhook`
- [ ] Implementar `POST /api/payments/tron/reconcile/:orderId`
- [ ] Implementar `POST /api/activations/:orderId/process`
- [ ] Implementar `POST /api/activations/:orderId/retry`
- [ ] Implementar `GET /api/activations/:orderId`
- [ ] Registrar `payment_tx_hash`
- [ ] Registrar `activation_tx_hash`
- [ ] Implementar retry seguro
- [ ] Garantir idempotencia
- [ ] Garantir que pagamento duplicado nao gere segundo mint

### Critério de saida

- pagamento confirmado em `Tron` nao libera premium sozinho
- mint em `Arbitrum` cria o `Operator Key`
- ordem vai para `activated` somente apos confirmacao do mint

## Sprint 7: Migracao do SNE Radar pago

### Objetivo

Substituir licenciamento centralizado pelo modelo soberano.

### Checklist

- [ ] Mapear todos os usos de `subscription_expires`
- [ ] Mapear todos os usos de `license_manager.py`
- [ ] Mapear todos os usos de `payment_manager.py`
- [ ] Refatorar `frontend/src/stores/auth.js`
- [ ] Ajustar `auth_manager.py` para sessao sem premium local
- [ ] Ajustar backend do app pago para consumir entitlement remoto
- [ ] Integrar leitura do estado de ativacao quando necessario
- [ ] Remover `premium` decidido por banco privado
- [ ] Garantir perda de acesso apos transferencia do `Key`
- [ ] Garantir suporte a owner wallet
- [ ] Garantir suporte a delegate wallet
- [ ] Validar UX de sessao segura continua funcionando

### Critério de saida

- sessao continua existindo
- auth continua existindo
- premium privado deixa de existir como verdade

## Sprint 8: Swaps fee, operacao e go-live controlado

### Objetivo

Conectar o primeiro beneficio economico real ao `Key` e fechar operacao.

### Checklist

- [ ] Definir tabela de `feeTier`
- [ ] Implementar regra `standard` vs `operator_discount`
- [ ] Integrar `feeTier` com `Swaps`
- [ ] Exibir desconto aplicado na UI
- [ ] Validar holder direto com desconto
- [ ] Validar delegate com desconto
- [ ] Validar perda do desconto apos transferencia do `Key`
- [ ] Criar runbook de compra
- [ ] Criar runbook de delegacao
- [ ] Criar runbook de transferencia
- [ ] Criar runbook de falha `Tron -> Arbitrum`
- [ ] Monitorar ultimo bloco indexado
- [ ] Monitorar atraso do indexador
- [ ] Monitorar divergencia entre indexador e RPC direto
- [ ] Monitorar divergencia entre pagamento, ativacao e entitlement
- [ ] Implementar modo degradado legivel
- [ ] Garantir que falha nunca promova premium
- [ ] Preparar rollout com allowlist inicial

### Critério de saida

- fee discount e coerente com o entitlement
- operacao sabe diagnosticar incidentes
- divergencias sao observaveis
- go-live pode acontecer sem depender de ad hoc

## Pós-v1

Itens explicitamente adiados:

- `SNE Token`
- staking
- yielding
- perks adicionais fora do escopo nuclear
- classes extras alem de `Operator`
- governanca ampla
- multiplos rails de pagamento

## Checklist transversal de anti-recaida

Este checklist deve ser revisado em toda sprint.

- [ ] Nenhum hardcode local voltou a decidir premium
- [ ] Nenhuma tabela privada voltou a decidir premium
- [ ] `Pass` nao assumiu papel de entitlement
- [ ] sessao continua separada de premium
- [ ] cache stale nao promoveu classe de acesso
- [ ] transferencia continua movendo o direito imediatamente
- [ ] delegacao continua subordinada a posse atual
- [ ] pagamento confirmado continua separado de entitlement concedido

## Sequencia recomendada de execucao

1. Sprint 0
2. Sprint 1
3. Sprint 2
4. Sprint 3
5. Sprint 4
6. Sprint 5
7. Sprint 6
8. Sprint 7
9. Sprint 8

## Proximo nivel de detalhamento

Se este checklist for aprovado, o proximo desdobramento recomendado e:

- transformar cada sprint em tickets por arquivo
- marcar responsavel por repo
- definir criterio de teste por fluxo
- ligar cada sprint a uma milestone formal
