import type { SecretItem } from '../secrets-api';

const PBKDF2_ITERATIONS = 250_000;
const PBKDF2_HASH = 'SHA-256';
const AES_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type SecretVaultId = 'passwords' | 'api_keys' | 'secure_notes' | 'recovery_material';

export type SecretDraft = {
  vault_id: SecretVaultId;
  label: string;
  login?: string;
  url?: string;
  secret: string;
  note?: string;
  passphrase: string;
};

export type DecryptedSecret = {
  secret: string;
  login?: string;
  url?: string;
  note?: string;
  created_at?: string;
};

type WrappedKeyBundle = {
  version: number;
  algorithm: string;
  kdf: {
    name: 'PBKDF2';
    hash: string;
    iterations: number;
    salt: string;
  };
  iv: string;
  ciphertext: string;
  auth_tag: string;
};

function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function splitCiphertextAndTag(payload: ArrayBuffer): { ciphertext: Uint8Array; authTag: Uint8Array } {
  const bytes = new Uint8Array(payload);
  const ciphertext = bytes.slice(0, Math.max(0, bytes.length - AUTH_TAG_LENGTH));
  const authTag = bytes.slice(Math.max(0, bytes.length - AUTH_TAG_LENGTH));
  return { ciphertext, authTag };
}

function joinCiphertextAndTag(ciphertext: Uint8Array, authTag: Uint8Array): Uint8Array {
  const output = new Uint8Array(ciphertext.length + authTag.length);
  output.set(ciphertext, 0);
  output.set(authTag, ciphertext.length);
  return output;
}

function kindFromVaultId(vaultId: SecretVaultId): string {
  if (vaultId === 'api_keys') return 'api_key';
  if (vaultId === 'secure_notes') return 'secure_note';
  if (vaultId === 'recovery_material') return 'recovery_material';
  return 'password';
}

async function deriveMasterKey(address: string, passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${address.toLowerCase()}:${passphrase}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseMaterial,
    { name: AES_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function createEncryptedSecretEnvelope(address: string, draft: SecretDraft) {
  const normalizedAddress = address.toLowerCase();
  const itemKey = await crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exportedItemKey = new Uint8Array(await crypto.subtle.exportKey('raw', itemKey));

  const salt = randomBytes(16);
  const masterKey = await deriveMasterKey(normalizedAddress, draft.passphrase, salt);

  const wrapIv = randomBytes(IV_LENGTH);
  const wrappedKeyPayload = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: wrapIv },
    masterKey,
    exportedItemKey
  );
  const wrappedSplit = splitCiphertextAndTag(wrappedKeyPayload);
  const wrappedBundle: WrappedKeyBundle = {
    version: 1,
    algorithm: `${AES_ALGORITHM}+${PBKDF2_HASH.toLowerCase()}`,
    kdf: {
      name: 'PBKDF2',
      hash: PBKDF2_HASH,
      iterations: PBKDF2_ITERATIONS,
      salt: toBase64(salt),
    },
    iv: toBase64(wrapIv),
    ciphertext: toBase64(wrappedSplit.ciphertext),
    auth_tag: toBase64(wrappedSplit.authTag),
  };

  const cleartext = {
    secret: draft.secret,
    login: draft.login?.trim() || undefined,
    url: draft.url?.trim() || undefined,
    note: draft.note?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  const aadPayload = {
    address: normalizedAddress,
    vault_id: draft.vault_id,
    kind: kindFromVaultId(draft.vault_id),
    label: draft.label.trim(),
  };
  const aad = encoder.encode(JSON.stringify(aadPayload));

  const iv = randomBytes(IV_LENGTH);
  const ciphertextPayload = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv, additionalData: aad },
    itemKey,
    encoder.encode(JSON.stringify(cleartext))
  );
  const encryptedSplit = splitCiphertextAndTag(ciphertextPayload);

  return {
    vault_id: draft.vault_id,
    kind: kindFromVaultId(draft.vault_id),
    label: draft.label.trim(),
    algorithm: 'aes-256-gcm+pbkdf2-sha256',
    ciphertext: toBase64(encryptedSplit.ciphertext),
    wrapped_key: toBase64(encoder.encode(JSON.stringify(wrappedBundle))),
    iv: toBase64(iv),
    auth_tag: toBase64(encryptedSplit.authTag),
    aad: toBase64(aad),
    metadata: {
      login: draft.login?.trim() || undefined,
      url: draft.url?.trim() || undefined,
      has_note: Boolean(draft.note?.trim()),
      address: normalizedAddress,
    },
    version: 1,
  };
}

export async function decryptSecretItem(address: string, passphrase: string, item: SecretItem): Promise<DecryptedSecret> {
  const wrappedBundleJson = decoder.decode(fromBase64(item.wrapped_key));
  const wrappedBundle = JSON.parse(wrappedBundleJson) as WrappedKeyBundle;

  const masterKey = await deriveMasterKey(address.toLowerCase(), passphrase, fromBase64(wrappedBundle.kdf.salt));
  const rawItemKey = await crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv: fromBase64(wrappedBundle.iv) },
    masterKey,
    joinCiphertextAndTag(fromBase64(wrappedBundle.ciphertext), fromBase64(wrappedBundle.auth_tag))
  );

  const itemKey = await crypto.subtle.importKey(
    'raw',
    rawItemKey,
    { name: AES_ALGORITHM, length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: AES_ALGORITHM,
      iv: fromBase64(item.iv),
      additionalData: item.aad ? fromBase64(item.aad) : undefined,
    },
    itemKey,
    joinCiphertextAndTag(fromBase64(item.ciphertext), fromBase64(item.auth_tag))
  );

  return JSON.parse(decoder.decode(new Uint8Array(decrypted))) as DecryptedSecret;
}
