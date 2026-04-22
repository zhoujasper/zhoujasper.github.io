import { notFound } from 'next/navigation';
import { getPageConfig, getMarkdownContent, getBibtexContent, getTomlContent } from '@/lib/content';
import { getConfig } from '@/lib/config';
import { parseBibTeX } from '@/lib/bibtexParser';
import DynamicPageClient, { type DynamicPageLocaleData } from '@/components/pages/DynamicPageClient';
import {
  BasePageConfig,
  PublicationPageConfig,
  TextPageConfig,
  CardPageConfig,
  ListPageConfig,
  ListItem,
} from '@/types/page';

import { Metadata } from 'next';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';

export const dynamicParams = false;

function toSortableDateValue(dateString: string): number {
  const normalized = /^\d{4}-\d{2}$/.test(dateString) ? `${dateString}-01` : dateString;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortNewsItems(items: ListItem[]): ListItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const dateDiff = toSortableDateValue(b.item.date) - toSortableDateValue(a.item.date);
      if (dateDiff !== 0) return dateDiff;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

function loadDynamicPageData(slug: string, locale?: string): DynamicPageLocaleData | null {
  const pageConfig = getPageConfig(slug, locale) as BasePageConfig | null;

  if (!pageConfig) {
    return null;
  }

  if (pageConfig.type === 'publication') {
    const pubConfig = pageConfig as PublicationPageConfig;
    const bibtex = getBibtexContent(pubConfig.source, locale);
    return {
      type: 'publication',
      config: pubConfig,
      publications: parseBibTeX(bibtex, locale),
    };
  }

  if (pageConfig.type === 'text') {
    const textConfig = pageConfig as TextPageConfig;
    const content = getMarkdownContent(textConfig.source, locale);
    return {
      type: 'text',
      config: textConfig,
      content,
    };
  }

  if (pageConfig.type === 'card') {
    return {
      type: 'card',
      config: pageConfig as CardPageConfig,
    };
  }

  if (pageConfig.type === 'list') {
    const listConfig = pageConfig as ListPageConfig;
    const sourceNews = listConfig.source
      ? (getTomlContent<{ news: ListItem[] }>(listConfig.source, locale)?.news || [])
      : [];
    const inlineNews = listConfig.news || [];
    const sortedNews = sortNewsItems(sourceNews.length > 0 ? sourceNews : inlineNews);
    return {
      type: 'list',
      config: listConfig,
      items: sortedNews.slice(0, listConfig.limit || sortedNews.length),
    };
  }

  return null;
}

export function generateStaticParams() {
  const config = getConfig();
  return config.navigation
    .filter(
      (nav) => nav.type === 'page'
        && !!nav.target
        && nav.target !== 'about'
        && !!getPageConfig(nav.target)
    )
    .map((nav) => ({
      slug: nav.target,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pageConfig = getPageConfig(slug) as BasePageConfig | null;

  if (!pageConfig) {
    return {};
  }

  return {
    title: pageConfig.title,
    description: pageConfig.description,
  };
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const baseConfig = getConfig();
  const runtimeI18n = getRuntimeI18nConfig(baseConfig.i18n);
  const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];

  const dataByLocale: Record<string, DynamicPageLocaleData> = {};

  for (const locale of targetLocales) {
    const localizedData = loadDynamicPageData(slug, locale);
    if (localizedData) {
      dataByLocale[locale] = localizedData;
    }
  }

  const defaultData = loadDynamicPageData(slug);
  if (defaultData) {
    dataByLocale[runtimeI18n.defaultLocale] = dataByLocale[runtimeI18n.defaultLocale] || defaultData;
  }

  if (Object.keys(dataByLocale).length === 0) {
    notFound();
  }

  return <DynamicPageClient dataByLocale={dataByLocale} defaultLocale={runtimeI18n.defaultLocale} />;
}
