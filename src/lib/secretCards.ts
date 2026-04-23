import 'server-only';

import crypto from 'crypto';
import { CardItem, SecretCardCiphertext, SecretCardItem } from '@/types/page';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const DEFAULT_PUBLIC_TITLE = 'Protected content';
const DEFAULT_PUBLIC_TITLE_ZH = '受保护内容';
const DEFAULT_SCRYPT_N = 2 ** 16;
const DEFAULT_SCRYPT_R = 8;
const DEFAULT_SCRYPT_P = 1;
const SECRET_KEY_BYTES = 32;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const MAX_SCRYPT_MEMORY_BYTES = 256 * 1024 * 1024;
const MAX_SCRYPT_P = 4;

export interface RawSecretCardItem extends CardItem {
  password?: string;
  publicTitle?: string;
  public_title?: string;
}

export interface RawCardPageSource {
  type?: string;
  title?: string;
  description?: string;
  items?: CardItem[];
  cards?: CardItem[];
  'item-secret'?: RawSecretCardItem[];
  'items-secret'?: RawSecretCardItem[];
}

function getPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPowerOfTwo(value: number): boolean {
  return value >= 2 && (value & (value - 1)) === 0;
}

function getScryptParams() {
  const params = {
    n: getPositiveIntegerEnv('SECRET_CARD_SCRYPT_N', DEFAULT_SCRYPT_N),
    r: getPositiveIntegerEnv('SECRET_CARD_SCRYPT_R', DEFAULT_SCRYPT_R),
    p: getPositiveIntegerEnv('SECRET_CARD_SCRYPT_P', DEFAULT_SCRYPT_P),
    dkLen: SECRET_KEY_BYTES,
  };

  if (!isPowerOfTwo(params.n)) {
    throw new Error('SECRET_CARD_SCRYPT_N must be a power of two.');
  }

  if (128 * params.n * params.r > MAX_SCRYPT_MEMORY_BYTES) {
    throw new Error('Secret card scrypt memory is above the browser unlock limit.');
  }

  if (params.p > MAX_SCRYPT_P) {
    throw new Error(`SECRET_CARD_SCRYPT_P must be ${MAX_SCRYPT_P} or lower.`);
  }

  return params;
}

function getDefaultPublicTitle(locale?: string): string {
  return locale?.toLowerCase().startsWith('zh') ? DEFAULT_PUBLIC_TITLE_ZH : DEFAULT_PUBLIC_TITLE;
}

function encryptSecretCardItem(item: RawSecretCardItem, slug: string, index: number): SecretCardCiphertext {
  if (!item.password) {
    throw new Error(`Secret card "${item.title || index}" in "${slug}.toml" is missing a password.`);
  }

  const scrypt = getScryptParams();
  const salt = crypto.randomBytes(SALT_BYTES);
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const key = crypto.scryptSync(item.password, salt, scrypt.dkLen, {
    N: scrypt.n,
    r: scrypt.r,
    p: scrypt.p,
    maxmem: Math.max(256 * 1024 * 1024, 256 * scrypt.n * scrypt.r * scrypt.p),
  });
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, nonce);
  const plaintext = Buffer.from(JSON.stringify(stripSecretCardItem(item)), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    kdf: {
      name: 'scrypt',
      salt: salt.toString('base64url'),
      n: scrypt.n,
      r: scrypt.r,
      p: scrypt.p,
      dkLen: scrypt.dkLen,
    },
    cipher: {
      name: 'AES-GCM',
      nonce: nonce.toString('base64url'),
      data: Buffer.concat([encrypted, tag]).toString('base64url'),
    },
  };
}

export function normalizeCardSource(
  source: RawCardPageSource,
  slug: string,
  locale?: string,
): {
  items: CardItem[];
  secretItems: SecretCardItem[];
} {
  const items = source.items || source.cards || [];
  const secretRawItems = source['items-secret'] || source['item-secret'] || [];

  const localePrefix = locale ? `${locale}-` : '';
  const secretItems = secretRawItems.map((item, index) => ({
    id: `secret-${localePrefix}${slug}-${index}`,
    title: item.publicTitle || item.public_title || getDefaultPublicTitle(locale),
    selected: item.selected,
    encrypted: encryptSecretCardItem(item, slug, index),
  }));

  return {
    items,
    secretItems,
  };
}

export function stripSecretCardItem(item: RawSecretCardItem): CardItem {
  return {
    title: item.title,
    subtitle: item.subtitle,
    date: item.date,
    content: item.content,
    tags: item.tags,
    links: item.links,
    image: item.image,
    gallery: item.gallery,
    selected: item.selected,
  };
}
