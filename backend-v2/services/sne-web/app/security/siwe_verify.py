"""
Verificação SIWE (Sign-In with Ethereum)
Implementação básica para SNE Radar
"""

import hashlib
import hmac
from eth_account.messages import encode_defunct
from eth_account import Account
from typing import Dict, Any
import re

def parse_siwe_message(message: str) -> Dict[str, Any]:
    """
    Parse SIWE message e extrai campos importantes
    """
    lines = message.strip().split('\n')

    parsed = {
        'domain': None,
        'address': None,
        'statement': None,
        'uri': None,
        'version': None,
        'chain_id': None,
        'nonce': None,
        'issued_at': None,
        'expiration_time': None,
        'not_before': None,
        'request_id': None
    }

    for line in lines:
        line = line.strip()
        if line.startswith('URI:'):
            parsed['uri'] = line.replace('URI:', '').strip()
        elif line.startswith('Web3 Token Version:'):
            parsed['version'] = line.replace('Web3 Token Version:', '').strip()
        elif line.startswith('Chain ID:'):
            parsed['chain_id'] = line.replace('Chain ID:', '').strip()
        elif line.startswith('Nonce:'):
            parsed['nonce'] = line.replace('Nonce:', '').strip()
        elif line.startswith('Issued At:'):
            parsed['issued_at'] = line.replace('Issued At:', '').strip()
        elif line.startswith('Expiration Time:'):
            parsed['expiration_time'] = line.replace('Expiration Time:', '').strip()
        elif line.startswith('Not Before:'):
            parsed['not_before'] = line.replace('Not Before:', '').strip()
        elif line.startswith('Request ID:'):
            parsed['request_id'] = line.replace('Request ID:', '').strip()
        elif re.match(r'^0x[a-fA-F0-9]{40}$', line):
            parsed['address'] = line.lower()
        elif 'wants you to sign in with your Ethereum account' in line:
            # Extrair domain da primeira linha
            domain_match = re.search(r'^(.*?)\s+wants', line)
            if domain_match:
                parsed['domain'] = domain_match.group(1)

    # Statement é o conteúdo principal
    if len(lines) > 3:
        parsed['statement'] = '\n'.join(lines[2:-2]).strip()

    return parsed

def verify_siwe(message: str, signature: str) -> bool:
    """
    Verifica assinatura SIWE
    """
    try:
        # Parse message
        parsed = parse_siwe_message(message)
        address = parsed.get('address')

        if not address:
            return False

        # Criar message hash
        message_hash = encode_defunct(text=message)

        # Recuperar endereço da assinatura
        recovered_address = Account.recover_message(message_hash, signature=signature)

        # Comparar endereços (case insensitive)
        return recovered_address.lower() == address.lower()

    except Exception as e:
        print(f"SIWE verification error: {str(e)}")
        return False

def generate_siwe_message(domain: str, address: str, statement: str, uri: str, nonce: str, chain_id: int = 1) -> str:
    """
    Gera message SIWE formatada
    """
    from datetime import datetime, timedelta

    issued_at = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    expiration_time = (datetime.utcnow() + timedelta(minutes=5)).strftime('%Y-%m-%dT%H:%M:%S.%fZ')

    message = f"""{domain} wants you to sign in with your Ethereum account:
{address}

{statement}

URI: {uri}
Version: 1
Chain ID: {chain_id}
Nonce: {nonce}
Issued At: {issued_at}
Expiration Time: {expiration_time}"""

    return message
