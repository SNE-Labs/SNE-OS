"""
LicenseService - Verificação de licenças on-chain e validação SIWE
"""
import os
import json
from web3 import Web3
from eth_account.messages import encode_defunct
from app.security.siwe_verify import parse_siwe_message

class LicenseService:
    def __init__(self):
        # Conectar à Scroll Sepolia
        self.rpc_url = os.getenv('SCROLL_RPC_URL', 'https://sepolia-rpc.scroll.io')
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Endereço do contrato
        self.contract_address = os.getenv('LICENSE_CONTRACT_ADDRESS')
        
        # Em desenvolvimento, permitir sem contrato (para testes)
        if not self.contract_address and not os.getenv('SKIP_LICENSE_CHECK', 'False').lower() == 'true':
            import warnings
            warnings.warn(
                "LICENSE_CONTRACT_ADDRESS não configurado. "
                "Configure no .env ou defina SKIP_LICENSE_CHECK=true para desenvolvimento."
            )
            self.contract_address = None
            self.contract = None
            self.abi = None
            return
        
        # Carregar ABI e criar contrato
        if self.contract_address:
            self.abi = self._load_abi()
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(self.contract_address),
                abi=self.abi
            )
        else:
            self.abi = None
            self.contract = None
    
    def _load_abi(self):
        """Carregar ABI do contrato"""
        abi_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'contracts',
            'SNELicenseRegistry.abi.json'
        )
        
        if os.path.exists(abi_path):
            with open(abi_path, 'r') as f:
                return json.load(f)
        else:
            # ABI mínimo se arquivo não existir
            return [
                {
                    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                    "name": "checkAccess",
                    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                    "name": "getLicenseInfo",
                    "outputs": [
                        {"internalType": "bool", "name": "hasAccess", "type": "bool"},
                        {"internalType": "bool", "name": "isLifetime", "type": "bool"},
                        {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
    
    def check_license(self, address: str) -> dict:
        """
        Verificar licença on-chain e determinar tier
        
        Retorna: { valid, tier, expires_at, is_lifetime }
        """
        # Se não há contrato configurado, retornar free (modo desenvolvimento)
        if not self.contract:
            return {
                'valid': False,
                'tier': 'free',
                'expires_at': None,
                'is_lifetime': False
            }
        
        try:
            from main import UserTier, db
            
            # Query apenas se db estiver inicializado
            if db:
                user_tier = UserTier.query.filter_by(
                    address=address.lower()
                ).first()
                
                if user_tier:
                    tier = user_tier.tier
                else:
                    tier = 'premium'
            else:
                tier = 'premium'
        except:
            # Se não conseguir importar db, assume premium
            tier = 'premium'
        
        # 1. Verificar checkAccess (retorna bool)
        has_access = self.contract.functions.checkAccess(
            Web3.to_checksum_address(address)
        ).call()
        
        if not has_access:
            return {
                'valid': False,
                'tier': 'free',
                'expires_at': None,
                'is_lifetime': False
            }
        
        # 2. Obter informações detalhadas
        license_info = self.contract.functions.getLicenseInfo(
            Web3.to_checksum_address(address)
        ).call()
        
        has_access, is_lifetime, expiry_timestamp = license_info
        
        # 3. Determinar tier (off-chain - banco de dados)
        # checkAccess decide Free vs Licensed
        # user_tiers decide Premium/Pro
        user_tier = UserTier.query.filter_by(
            address=address.lower()
        ).first()
        
        if user_tier:
            tier = user_tier.tier
        else:
            # Se não tem entrada no DB, assume 'premium' (licença básica)
            tier = 'premium'
        
        return {
            'valid': True,
            'tier': tier,
            'expires_at': expiry_timestamp if expiry_timestamp > 0 else None,
            'is_lifetime': is_lifetime
        }
    
    def verify_signature(self, address: str, message: str, signature: str, domain: str) -> bool:
        """
        Verificar assinatura SIWE (suporta EOA e EIP-1271)
        
        ⚠️ NOTA: Esta função é mantida para compatibilidade, mas a verificação
        completa já é feita em verify_siwe() no auth.py
        """
        try:
            from app.security.siwe_verify import verify_siwe
            
            # Usar verify_siwe que já faz tudo (EOA + EIP-1271)
            parsed = parse_siwe_message(message)
            
            verify_siwe(
                w3=self.w3,
                raw_message=message,
                signature=signature,
                expected_domain=domain,
                expected_uri_prefix=domain,  # Ajustar conforme necessário
                expected_nonce=parsed.nonce,
                max_age_minutes=5
            )
            
            return True
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"SIWE signature verification failed: {str(e)}")
            return False
    
    def _verify_eip1271(self, address: str, message: str, signature: str, domain: str) -> bool:
        """
        Verifica assinatura via EIP-1271 (smart contract wallets)
        
        ⚠️ NOTA: Esta função é mantida para compatibilidade, mas a verificação
        EIP-1271 já é feita em verify_siwe() no siwe_verify.py
        """
        import logging
        from eth_account.messages import defunct_hash_message
        from web3 import Web3
        
        logger = logging.getLogger(__name__)
        
        logger.info(f"EIP-1271 verification attempt for contract wallet: {address}")
        
        try:
            # ✅ Usar defunct_hash_message (mesmo que verify_siwe usa)
            digest = defunct_hash_message(text=message)  # bytes32 EIP-191 digest
            
            # ABI mínimo para EIP-1271
            eip1271_abi = [
                {
                    "inputs": [
                        {"internalType": "bytes32", "name": "_hash", "type": "bytes32"},
                        {"internalType": "bytes", "name": "_signature", "type": "bytes"}
                    ],
                    "name": "isValidSignature",
                    "outputs": [{"internalType": "bytes4", "name": "", "type": "bytes4"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(address),
                abi=eip1271_abi
            )
            
            # Converter signature para bytes
            signature_bytes = bytes.fromhex(signature.replace('0x', ''))
            
            # Chamar isValidSignature
            result = contract.functions.isValidSignature(
                digest,
                signature_bytes
            ).call()
            
            # Magic value EIP-1271: 0x1626ba7e
            result_hex = Web3.to_hex(result)
            is_valid = result_hex.lower() == "0x1626ba7e"
            
            if is_valid:
                logger.info(f"EIP-1271 verification SUCCESS for contract wallet: {address}")
            else:
                logger.warning(
                    f"EIP-1271 verification FAILED for contract wallet: {address}. "
                    f"Expected: 0x1626ba7e, Got: {result_hex}"
                )
            
            return is_valid
            
        except Exception as e:
            logger.error(
                f"EIP-1271 verification ERROR for contract wallet: {address}. "
                f"Error: {str(e)}"
            )
            return False

