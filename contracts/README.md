# SNE Keys Contracts

Este diretório agora é o ponto de partida do `PR 1` da migração soberana do ecossistema SNE.

## Objetivo do v1

Subir a camada on-chain mínima para:

- emitir a classe de acesso `Operator`
- vender o `Operator Key` em `USDT`
- delegar uso da owner wallet para uma delegate wallet
- permitir leitura soberana de entitlement por posse ou delegação válida

## Estrutura atual

- `src/OperatorKey.sol`
- `src/KeySale.sol`
- `src/DelegationRegistry.sol`
- `src/mocks/MockUSDT.sol`
- `test/SovereignAccess.test.js`
- `scripts/deploy.js`
- `hardhat.config.js`
- `.env.example`
- `SNELicenseRegistry.abi.json` - ABI legado mantido apenas como referência histórica

## Modelo do v1

- `OperatorKey`
  Contrato `ERC-1155` que representa classes de acesso.
- `KeySale`
  Contrato de venda primária em `USDT`.
- `DelegationRegistry`
  Registro de delegação `owner -> delegate`.

## Regras centrais

- `tokenId = 1` representa a classe `Operator`
- a posse atual do `Key` define o direito base
- a delegação depende da posse atual do owner
- ao transferir o `Key`, a delegação anterior perde validade na leitura

## Toolchain

O diretório `contracts/` agora é um workspace Hardhat isolado do frontend principal.

Configuração atual:

- `solc 0.8.26`
- `evmVersion = cancun`

Comandos:

- `npm install`
- `npm run compile`
- `npm run test`
- `npm run deploy:arbitrum-sepolia`
- `npm run deploy:arbitrum-sepolia:mock`
- `npm run deploy:arbitrum`
- `npm run deploy:arbitrum:mock`

Depois do deploy, o script grava automaticamente um manifest em:

- `deployments/<network>.json`
- `deployments/<network>.mock.json` para stacks de teste com `MockUSDT`

## Variáveis de ambiente

Copiar `.env.example` para `.env` e preencher:

- `DEPLOYER_PRIVATE_KEY`
- `*_RPC_URL` da rede alvo
- `USDT_ADDRESS`
- `TREASURY_ADDRESS`
- `OWNER_ADDRESS` opcional; se omitido, o deployer permanece owner
- `OPERATOR_KEY_URI`
- `OPERATOR_PRICE`
- `SNE_KEYS_DEPLOYMENT_PATH` opcional; útil para handoff explícito ao backend

### Fluxo de teste com MockUSDT

Quando o objetivo for validar compra e entitlement sem depender de saldo externo de `USDT`, usar a stack de teste com `MockUSDT`.

Passos:

- preencher `.env` com `DEPLOYER_PRIVATE_KEY`, `*_RPC_URL`, `TREASURY_ADDRESS`, `OWNER_ADDRESS`, `OPERATOR_KEY_URI`, `OPERATOR_PRICE`
- rodar `npm run deploy:arbitrum-sepolia:mock`
- o manifest será salvo em `deployments/arbitrum-sepolia.mock.json`
- definir `MOCK_USDT_ADDRESS`, `MINT_TO` e `MINT_AMOUNT`
- rodar `npm run mint:mock-usdt:arbitrum-sepolia`
- definir `KEYSALE_ADDRESS` e `APPROVE_AMOUNT`
- rodar `npm run approve:mock-usdt:arbitrum-sepolia`
- definir `BUY_AMOUNT=1`
- rodar `npm run buy:operator-key:arbitrum-sepolia`
- definir `DELEGATION_REGISTRY_ADDRESS` e `DELEGATE_ADDRESS`
- rodar `npm run set-delegate:arbitrum-sepolia`
- para remover depois, rodar `npm run clear-delegate:arbitrum-sepolia`

Exemplo para cunhar `100 USDT` com `6` decimais:

- `MOCK_USDT_ADDRESS=<endereco do mock do manifest>`
- `MINT_TO=<wallet compradora>`
- `MINT_AMOUNT=100000000`

Exemplo para aprovar `100 USDT` e comprar `1` Operator Key:

- `KEYSALE_ADDRESS=<endereco do KeySale do manifest>`
- `APPROVE_AMOUNT=100000000`
- `BUY_AMOUNT=1`

Exemplo para delegar acesso:

- `DELEGATION_REGISTRY_ADDRESS=<endereco do DelegationRegistry do manifest>`
- `DELEGATE_ADDRESS=<wallet delegate>`

Observação:

- a stack `mock` não sobrescreve `deployments/<network>.json`
- para usar a stack `mock` no backend, apontar `SNE_KEYS_DEPLOYMENT_PATH` para `deployments/arbitrum-sepolia.mock.json`

## Cobertura do v1

Os testes atuais cobrem:

- compra do `Operator Key` em `USDT`
- pausa da venda
- delegação `owner -> delegate`
- invalidação imediata da delegação após transferência
- conflito de delegate entre owners
- limpeza manual da delegação

## Estado atual do PR 1

O workspace já foi validado localmente com:

- `npm install`
- `npm run compile`
- `npm run test`

Pendência restante:

- validar deploy de testnet
- publicar endereços/ABIs da rede escolhida para o `PR 2`

## Handoff para o backend

O `sne-web` já consegue ler automaticamente os endereços do deploy manifest.

Opções:

- definir `SNE_KEYS_NETWORK=arbitrum-sepolia` e deixar o backend usar `contracts/deployments/arbitrum-sepolia.json`
- definir `SNE_KEYS_NETWORK=arbitrum` e deixar o backend usar `contracts/deployments/arbitrum.json`
- ou apontar explicitamente `SNE_KEYS_DEPLOYMENT_PATH=/abs/path/to/contracts/deployments/arbitrum-sepolia.json`

Arquivos de apoio:

- `.env.arbitrum-sepolia.example`
- `deployments/arbitrum-sepolia.example.json`

## Observação sobre o ABI legado

O arquivo `SNELicenseRegistry.abi.json` pertence ao modelo anterior de licenças on-chain.

Ele não é a base da nova arquitetura soberana de `SNE Keys`, mas foi mantido para facilitar leitura histórica e comparação de abordagem.
