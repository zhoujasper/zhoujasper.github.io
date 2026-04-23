import { NextResponse } from 'next/server';
import { getTomlContent } from '@/lib/content';
import {
  decryptSecretToken,
  normalizeCardSource,
  RawCardPageSource,
  secureCompareText,
  stripSecretCardItem,
} from '@/lib/secretCards';

interface UnlockRequestBody {
  token?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UnlockRequestBody;
    const token = (body.token || '').trim();
    const password = body.password || '';

    if (!token || !password) {
      return NextResponse.json({ ok: false, message: 'Missing token or password.' }, { status: 400 });
    }

    const payload = decryptSecretToken(token);
    if (!payload) {
      return NextResponse.json({ ok: false, message: 'Invalid token.' }, { status: 400 });
    }

    const source = getTomlContent<RawCardPageSource>(`${payload.slug}.toml`, payload.locale);
    if (!source) {
      return NextResponse.json({ ok: false, message: 'Source not found.' }, { status: 404 });
    }

    const normalized = normalizeCardSource(source, payload.slug, payload.locale);
    const target = normalized.secretRawItems[payload.index];

    if (!target || !target.password) {
      return NextResponse.json({ ok: false, message: 'Secret item not found.' }, { status: 404 });
    }

    if (!secureCompareText(target.password, password)) {
      return NextResponse.json({ ok: false, message: 'Wrong password.' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      item: stripSecretCardItem(target),
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'Unlock failed.' }, { status: 500 });
  }
}
