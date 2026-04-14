"""
SIWE (Sign-In with Ethereum) - Implementação Manual (EIP-4361 + EIP-191 + EIP-1271)

✅ Sem dependência do pacote 'siwe' - usa apenas eth-account + web3
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional

from eth_account import Account
from eth_account.messages import encode_defunct, defunct_hash_message
from eth_utils import to_checksum_address
from web3 import Web3

EIP1271_MAGIC_VALUE = "0x1626ba7e"

@dataclass
class ParsedSiwe:
    domain: str
    address: str
    uri: str
    version: str
    chain_id: int
    nonce: str
    issued_at: datetime
    expiration_time: Optional[datetime] = None
    not_before: Optional[datetime] = None

_siwe_re = re.compile(
    r"^(?P<domain>.+) wants you to sign in with your Ethereum account:\n"
    r"(?P<address>0x[a-fA-F0-9]{40})\n\n"
    r"(?:(?P<statement>.*)\n\n)?"
    r"URI: (?P<uri>.+)\n"
    r"Version: (?P<version>\d+)\n"
    r"Chain ID: (?P<chain_id>\d+)\n"
    r"Nonce: (?P<nonce>[A-Za-z0-9]+)\n"
    r"Issued At: (?P<issued_at>.+)"
    r"(?:\nExpiration Time: (?P<expiration_time>.+))?"
    r"(?:\nNot Before: (?P<not_before>.+))?"
    r"(?:\nRequest ID: .+)?"
    r"(?:\nResources:\n(?:- .+\n?)*)?$",
    re.DOTALL
)

def _parse_iso8601(s: str) -> datetime:
    """
    Parse ISO8601 timestamp (ex.: 2022-04-25T14:51:12.040Z)
    """
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(timezone.utc)

def parse_siwe_message(raw: str) -> ParsedSiwe:
    """
    Parse SIWE message (EIP-4361)
    
    Raises ValueError se a mensagem estiver malformada
    """
    m = _siwe_re.match(raw.strip())
    if not m:
        raise ValueError("Malformed SIWE message")

    return ParsedSiwe(
        domain=m.group("domain").strip(),
        address=to_checksum_address(m.group("address")),
        uri=m.group("uri").strip(),
        version=m.group("version").strip(),
        chain_id=int(m.group("chain_id")),
        nonce=m.group("nonce").strip(),
        issued_at=_parse_iso8601(m.group("issued_at")),
        expiration_time=_parse_iso8601(m.group("expiration_time")) if m.group("expiration_time") else None,
        not_before=_parse_iso8601(m.group("not_before")) if m.group("not_before") else None,
    )

def verify_siwe(
    w3: Web3,
    raw_message: str,
    signature: str,
    expected_domain: str,
    expected_uri_prefix: str,
    expected_nonce: str,
    max_age_minutes: int = 5
) -> str:
    """
    Verifica mensagem SIWE completa (EIP-4361 + EIP-191 + EIP-1271)
    
    Args:
        w3: Instância Web3
        raw_message: Mensagem SIWE completa (string)
        signature: Assinatura hex (0x...)
        expected_domain: Domínio esperado (domain binding)
        expected_uri_prefix: Prefixo URI esperado
        expected_nonce: Nonce esperado (single-use)
        max_age_minutes: Idade máxima da mensagem em minutos (default: 5)
    
    Returns:
        address: Endereço verificado (checksum)
    
    Raises:
        ValueError: Se validação falhar
    """
    msg = parse_siwe_message(raw_message)

    # Domain/URI binding
    if msg.domain != expected_domain:
        raise ValueError(f"SIWE domain mismatch: expected {expected_domain}, got {msg.domain}")
    if not msg.uri.startswith(expected_uri_prefix):
        raise ValueError(f"SIWE uri mismatch: expected prefix {expected_uri_prefix}, got {msg.uri}")

    # Nonce
    if msg.nonce != expected_nonce:
        raise ValueError(f"SIWE nonce mismatch: expected {expected_nonce}, got {msg.nonce}")

    # Time checks
    now = datetime.now(timezone.utc)
    if msg.issued_at < now - timedelta(minutes=max_age_minutes):
        raise ValueError(f"SIWE issuedAt too old: {msg.issued_at} (max age: {max_age_minutes} min)")
    if msg.expiration_time and now > msg.expiration_time:
        raise ValueError(f"SIWE expired: {msg.expiration_time}")
    if msg.not_before and now < msg.not_before:
        raise ValueError(f"SIWE not yet valid: {msg.not_before}")

    # Signature verify (EOA vs contract wallet)
    address = msg.address
    code = w3.eth.get_code(address)
    
    if code and len(code) > 0:
        # ✅ EIP-1271 (Smart Contract Wallet)
        digest = defunct_hash_message(text=raw_message)  # bytes32 EIP-191 digest
        
        abi = [{
            "name": "isValidSignature",
            "type": "function",
            "stateMutability": "view",
            "inputs": [
                {"name": "_hash", "type": "bytes32"},
                {"name": "_signature", "type": "bytes"}
            ],
            "outputs": [{"name": "", "type": "bytes4"}],
        }]
        
        contract = w3.eth.contract(address=address, abi=abi)
        res = contract.functions.isValidSignature(
            digest,
            bytes.fromhex(signature[2:])  # Remove 0x prefix
        ).call()
        
        # web3.py pode retornar bytes4; normalizar:
        res_hex = Web3.to_hex(res)
        if res_hex.lower() != EIP1271_MAGIC_VALUE.lower():
            raise ValueError(f"EIP-1271 invalid signature: expected {EIP1271_MAGIC_VALUE}, got {res_hex}")
        
        return address

    # ✅ EOA (Externally Owned Account)
    recovered = Account.recover_message(encode_defunct(text=raw_message), signature=signature)
    if to_checksum_address(recovered) != address:
        raise ValueError(f"Invalid SIWE signature: recovered {recovered}, expected {address}")
    
    return address

