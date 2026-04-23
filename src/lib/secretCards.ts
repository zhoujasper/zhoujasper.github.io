import 'server-only';

import crypto from 'crypto';
import { CardItem, SecretCardItem } from '@/types/page';

const TOKEN_ALGORITHM = 'aes-256-gcm';
const TOKEN_KEY_FALLBACK = 'personal-website-secret-cards-change-me';

export interface RawSecretCardItem extends CardItem {
  password?: string;
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

interface SecretTokenPayload {
  slug: string;
  locale?: string;
  index: number;
}

function getTokenKey(): Buffer {
  const rawKey = process.env.CARD_SECRET_KEY || TOKEN_KEY_FALLBACK;
  return crypto.createHash('sha256').update(rawKey).digest();
}

export function encryptSecretToken(payload: SecretTokenPayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(TOKEN_ALGORITHM, getTokenKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecretToken(token: string): SecretTokenPayload | null {
  try {
    const [ivB64, tagB64, dataB64] = token.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      return null;
    }

    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const encrypted = Buffer.from(dataB64, 'base64url');

    const decipher = crypto.createDecipheriv(TOKEN_ALGORITHM, getTokenKey(), iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const payload = JSON.parse(decrypted) as SecretTokenPayload;

    if (!payload.slug || typeof payload.index !== 'number') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function secureCompareText(a: string, b: string): boolean {
  const left = crypto.createHash('sha256').update(a).digest();
  const right = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(left, right);
}

export function normalizeCardSource(
  source: RawCardPageSource,
  slug: string,
  locale?: string,
): {
  items: CardItem[];
  secretItems: SecretCardItem[];
  secretRawItems: RawSecretCardItem[];
} {
  const items = source.items || source.cards || [];
  const secretRawItems = source['items-secret'] || source['item-secret'] || [];

  const secretItems = secretRawItems.map((item, index) => ({
    id: `secret-${slug}-${index}`,
    title: item.title,
    selected: item.selected,
    token: encryptSecretToken({
      slug,
      locale,
      index,
    }),
  }));

  return {
    items,
    secretItems,
    secretRawItems,
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
