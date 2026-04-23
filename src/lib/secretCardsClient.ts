import { CardItem, SecretCardCiphertext, SecretCardItem } from '@/types/page';

const SCRYPT_BLOCK_WORDS = 16;
const MAX_SCRYPT_MEMORY_BYTES = 256 * 1024 * 1024;
const MAX_SCRYPT_P = 4;
const YIELD_EVERY_ITERATIONS = 256;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToWordsLE(bytes: Uint8Array): Uint32Array {
  if (bytes.length % 4 !== 0) {
    throw new Error('Invalid scrypt block length.');
  }

  const words = new Uint32Array(bytes.length / 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let i = 0; i < words.length; i += 1) {
    words[i] = view.getUint32(i * 4, true);
  }

  return words;
}

function wordsToBytesLE(words: Uint32Array): Uint8Array {
  const bytes = new Uint8Array(words.length * 4);
  const view = new DataView(bytes.buffer);

  for (let i = 0; i < words.length; i += 1) {
    view.setUint32(i * 4, words[i], true);
  }

  return bytes;
}

function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function add(value: number, addition: number): number {
  return (value + addition) >>> 0;
}

function salsa208(block: Uint32Array, scratch: Uint32Array): void {
  scratch.set(block);

  for (let i = 0; i < 8; i += 2) {
    scratch[4] ^= rotl(add(scratch[0], scratch[12]), 7);
    scratch[8] ^= rotl(add(scratch[4], scratch[0]), 9);
    scratch[12] ^= rotl(add(scratch[8], scratch[4]), 13);
    scratch[0] ^= rotl(add(scratch[12], scratch[8]), 18);
    scratch[9] ^= rotl(add(scratch[5], scratch[1]), 7);
    scratch[13] ^= rotl(add(scratch[9], scratch[5]), 9);
    scratch[1] ^= rotl(add(scratch[13], scratch[9]), 13);
    scratch[5] ^= rotl(add(scratch[1], scratch[13]), 18);
    scratch[14] ^= rotl(add(scratch[10], scratch[6]), 7);
    scratch[2] ^= rotl(add(scratch[14], scratch[10]), 9);
    scratch[6] ^= rotl(add(scratch[2], scratch[14]), 13);
    scratch[10] ^= rotl(add(scratch[6], scratch[2]), 18);
    scratch[3] ^= rotl(add(scratch[15], scratch[11]), 7);
    scratch[7] ^= rotl(add(scratch[3], scratch[15]), 9);
    scratch[11] ^= rotl(add(scratch[7], scratch[3]), 13);
    scratch[15] ^= rotl(add(scratch[11], scratch[7]), 18);

    scratch[1] ^= rotl(add(scratch[0], scratch[3]), 7);
    scratch[2] ^= rotl(add(scratch[1], scratch[0]), 9);
    scratch[3] ^= rotl(add(scratch[2], scratch[1]), 13);
    scratch[0] ^= rotl(add(scratch[3], scratch[2]), 18);
    scratch[6] ^= rotl(add(scratch[5], scratch[4]), 7);
    scratch[7] ^= rotl(add(scratch[6], scratch[5]), 9);
    scratch[4] ^= rotl(add(scratch[7], scratch[6]), 13);
    scratch[5] ^= rotl(add(scratch[4], scratch[7]), 18);
    scratch[11] ^= rotl(add(scratch[10], scratch[9]), 7);
    scratch[8] ^= rotl(add(scratch[11], scratch[10]), 9);
    scratch[9] ^= rotl(add(scratch[8], scratch[11]), 13);
    scratch[10] ^= rotl(add(scratch[9], scratch[8]), 18);
    scratch[12] ^= rotl(add(scratch[15], scratch[14]), 7);
    scratch[13] ^= rotl(add(scratch[12], scratch[15]), 9);
    scratch[14] ^= rotl(add(scratch[13], scratch[12]), 13);
    scratch[15] ^= rotl(add(scratch[14], scratch[13]), 18);
  }

  for (let i = 0; i < SCRYPT_BLOCK_WORDS; i += 1) {
    block[i] = add(block[i], scratch[i]);
  }
}

function blockMix(block: Uint32Array, r: number, x: Uint32Array, y: Uint32Array, salsaScratch: Uint32Array): void {
  x.set(block.subarray((2 * r - 1) * SCRYPT_BLOCK_WORDS, 2 * r * SCRYPT_BLOCK_WORDS));

  for (let i = 0; i < 2 * r; i += 1) {
    const sourceOffset = i * SCRYPT_BLOCK_WORDS;

    for (let j = 0; j < SCRYPT_BLOCK_WORDS; j += 1) {
      x[j] = (x[j] ^ block[sourceOffset + j]) >>> 0;
    }

    salsa208(x, salsaScratch);

    const targetBlock = i % 2 === 0 ? i / 2 : r + (i - 1) / 2;
    y.set(x, targetBlock * SCRYPT_BLOCK_WORDS);
  }

  block.set(y);
}

function integerify(block: Uint32Array, r: number): number {
  return block[(2 * r - 1) * SCRYPT_BLOCK_WORDS] >>> 0;
}

async function yieldToBrowser(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function romix(block: Uint32Array, n: number, r: number): Promise<void> {
  const blockWords = block.length;
  const v = new Uint32Array(n * blockWords);
  const x = new Uint32Array(SCRYPT_BLOCK_WORDS);
  const y = new Uint32Array(blockWords);
  const salsaScratch = new Uint32Array(SCRYPT_BLOCK_WORDS);

  for (let i = 0; i < n; i += 1) {
    v.set(block, i * blockWords);
    blockMix(block, r, x, y, salsaScratch);

    if (i % YIELD_EVERY_ITERATIONS === YIELD_EVERY_ITERATIONS - 1) {
      await yieldToBrowser();
    }
  }

  for (let i = 0; i < n; i += 1) {
    const j = integerify(block, r) & (n - 1);
    const vOffset = j * blockWords;

    for (let k = 0; k < blockWords; k += 1) {
      block[k] = (block[k] ^ v[vOffset + k]) >>> 0;
    }

    blockMix(block, r, x, y, salsaScratch);

    if (i % YIELD_EVERY_ITERATIONS === YIELD_EVERY_ITERATIONS - 1) {
      await yieldToBrowser();
    }
  }
}

async function pbkdf2Sha256(passwordKey: CryptoKey, salt: Uint8Array, iterations: number, byteLength: number): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations,
    },
    passwordKey,
    byteLength * 8,
  );

  return new Uint8Array(bits);
}

function validateEncryptedPayload(payload: SecretCardCiphertext): void {
  if (
    payload.version !== 1
    || payload.kdf.name !== 'scrypt'
    || payload.cipher.name !== 'AES-GCM'
    || payload.kdf.dkLen !== 32
    || payload.kdf.n < 2
    || (payload.kdf.n & (payload.kdf.n - 1)) !== 0
    || payload.kdf.r < 1
    || payload.kdf.p < 1
    || payload.kdf.p > MAX_SCRYPT_P
  ) {
    throw new Error('Unsupported secret card encryption payload.');
  }

  if (128 * payload.kdf.n * payload.kdf.r > MAX_SCRYPT_MEMORY_BYTES) {
    throw new Error('Secret card scrypt parameters are too large for browser unlock.');
  }
}

async function deriveScryptKey(password: string, payload: SecretCardCiphertext): Promise<Uint8Array> {
  validateEncryptedPayload(payload);

  const passwordBytes = textEncoder.encode(password);
  const passwordKey = await crypto.subtle.importKey('raw', toArrayBuffer(passwordBytes), 'PBKDF2', false, ['deriveBits']);
  const salt = base64UrlToBytes(payload.kdf.salt);
  const blockBytes = 128 * payload.kdf.r;
  const expandedBytes = await pbkdf2Sha256(passwordKey, salt, 1, payload.kdf.p * blockBytes);
  const expandedWords = bytesToWordsLE(expandedBytes);
  const blockWords = blockBytes / 4;

  for (let i = 0; i < payload.kdf.p; i += 1) {
    const block = expandedWords.subarray(i * blockWords, (i + 1) * blockWords);
    await romix(block, payload.kdf.n, payload.kdf.r);
  }

  const mixedBytes = wordsToBytesLE(expandedWords);
  return pbkdf2Sha256(passwordKey, mixedBytes, 1, payload.kdf.dkLen);
}

function assertCardItem(value: unknown): asserts value is CardItem {
  if (!value || typeof value !== 'object' || typeof (value as CardItem).title !== 'string') {
    throw new Error('Secret card decrypted to an invalid item.');
  }
}

export async function decryptSecretCard(secretItem: SecretCardItem, password: string): Promise<CardItem> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is not available in this browser context.');
  }

  const keyBytes = await deriveScryptKey(password, secretItem.encrypted);
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), 'AES-GCM', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64UrlToBytes(secretItem.encrypted.cipher.nonce)),
    },
    key,
    toArrayBuffer(base64UrlToBytes(secretItem.encrypted.cipher.data)),
  );
  const item = JSON.parse(textDecoder.decode(decrypted)) as unknown;

  assertCardItem(item);
  return item;
}
