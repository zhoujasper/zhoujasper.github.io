import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

export function formatYear(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric'
  }).format(new Date(date));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeInternalRouteHref(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) {
    return href;
  }

  const url = new URL(href, 'https://internal.local');
  const lastSegment = url.pathname.split('/').filter(Boolean).at(-1) || '';

  if (
    url.pathname === '/' ||
    url.pathname.endsWith('/') ||
    /\.[^/]+$/.test(lastSegment)
  ) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return `${url.pathname}/${url.search}${url.hash}`;
}
