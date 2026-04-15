"""
Verificação SIWE (Sign-In with Ethereum)
Implementação básica para SNE Radar
"""

from datetime import datetime, timedelta, timezone
from eth_account.messages import encode_defunct
from eth_account import Account
from typing import Dict, Any, Iterable
import re
from urllib.parse import urlparse

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
        elif line.startswith('Version:'):
            parsed['version'] = line.replace('Version:', '').strip()
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

def _normalize_domain(value: str | None) -> str:
    return (value or "").strip().lower()

def _normalize_origin(value: str | None) -> str:
    parsed = urlparse((value or "").strip())
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"

def _matches_expected(value: str | None, expected: str | Iterable[str] | None, normalizer) -> bool:
    if expected is None:
        return True

    normalized_value = normalizer(value)
    if isinstance(expected, (list, tuple, set, frozenset)):
        allowed_values = {normalizer(item) for item in expected if item}
        return normalized_value in allowed_values

    return normalized_value == normalizer(expected)

def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.strip().replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None

def verify_siwe(
    message: str,
    signature: str,
    *,
    expected_domain: str | None = None,
    expected_origin: str | None = None,
    expected_chain_id: int | str | Iterable[int | str] | None = None,
    max_clock_skew: timedelta = timedelta(minutes=5),
) -> bool:
    """
    Verifica assinatura SIWE
    """
    try:
        parsed = parse_siwe_message(message)
        address = parsed.get('address')
        if not address:
            return False
        if parsed.get('version') != '1':
            return False
        if not _matches_expected(parsed.get('domain'), expected_domain, _normalize_domain):
            return False
        if not _matches_expected(parsed.get('uri'), expected_origin, _normalize_origin):
            return False
        if expected_chain_id is not None:
            if isinstance(expected_chain_id, (list, tuple, set, frozenset)):
                allowed_chain_ids = {str(item) for item in expected_chain_id}
                if str(parsed.get('chain_id')) not in allowed_chain_ids:
                    return False
            elif str(parsed.get('chain_id')) != str(expected_chain_id):
                return False

        nonce = (parsed.get('nonce') or '').strip()
        if not nonce or not re.match(r'^[A-Za-z0-9]{8,}$', nonce):
            return False

        now = datetime.now(timezone.utc)
        issued_at = _parse_timestamp(parsed.get('issued_at'))
        expiration_time = _parse_timestamp(parsed.get('expiration_time'))
        not_before = _parse_timestamp(parsed.get('not_before'))

        if issued_at is None or expiration_time is None:
            return False
        if issued_at - now > max_clock_skew:
            return False
        if now - max_clock_skew > expiration_time:
            return False
        if not_before and now + max_clock_skew < not_before:
            return False

        message_hash = encode_defunct(text=message)
        recovered_address = Account.recover_message(message_hash, signature=signature)
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

