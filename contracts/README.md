# Smart Contracts

Este diretório contém os arquivos relacionados aos smart contracts do SNE Radar.

## Arquivos

- `SNELicenseRegistry.abi.json` - ABI do contrato de licenças

## Contrato

**SNELicenseRegistry** - Contrato na rede Scroll L2 (Sepolia Testnet)

- **Função principal:** `checkAccess(address)` - Retorna `bool`
- **Função detalhada:** `getLicenseInfo(address)` - Retorna `(bool hasAccess, bool isLifetime, uint256 expiryTimestamp)`

## Uso

O backend usa este ABI para verificar licenças on-chain durante o processo de autenticação SIWE.

