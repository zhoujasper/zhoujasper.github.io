'use client';

import { useEffect } from 'react';
import PublicationsList from '@/components/publications/PublicationsList';
import TextPage from '@/components/pages/TextPage';
import CardPage from '@/components/pages/CardPage';
import News from '@/components/home/News';
import { Publication } from '@/types/publication';
import {
  PublicationPageConfig,
  TextPageConfig,
  CardPageConfig,
  ListPageConfig,
  ListItem,
} from '@/types/page';
import { useLocaleStore } from '@/lib/stores/localeStore';

export type DynamicPageLocaleData =
  | { type: 'publication'; config: PublicationPageConfig; publications: Publication[] }
  | { type: 'text'; config: TextPageConfig; content: string }
  | { type: 'card'; config: CardPageConfig }
  | { type: 'list'; config: ListPageConfig; items: ListItem[] };

interface DynamicPageClientProps {
  dataByLocale: Record<string, DynamicPageLocaleData>;
  defaultLocale: string;
}

export default function DynamicPageClient({ dataByLocale, defaultLocale }: DynamicPageClientProps) {
  const locale = useLocaleStore((state) => state.locale);
  const fallback = dataByLocale[defaultLocale] || Object.values(dataByLocale)[0];
  const pageData = dataByLocale[locale] || fallback;

  useEffect(() => {
    const targetCardId = sessionStorage.getItem('targetCardId');
    const enableFlash = sessionStorage.getItem('enableFlash');

    if (targetCardId && enableFlash === 'true') {
      // 延迟以确保 DOM 已经渲染
      const timer = setTimeout(() => {
        const element = document.getElementById(targetCardId);
        if (element) {
          // 平滑滚动到卡片
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 添加闪烁动画标记
          element.setAttribute('data-flash', 'true');
          
          // 清理 sessionStorage 和动画标记
          setTimeout(() => {
            sessionStorage.removeItem('targetCardId');
            sessionStorage.removeItem('enableFlash');
            element.removeAttribute('data-flash');
          }, 3000);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!pageData) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {pageData.type === 'publication' && (
        <PublicationsList config={pageData.config} publications={pageData.publications} />
      )}
      {pageData.type === 'text' && (
        <TextPage config={pageData.config} content={pageData.content} />
      )}
      {pageData.type === 'card' && (
        <CardPage config={pageData.config} />
      )}
      {pageData.type === 'list' && (
        <News items={pageData.items} title={pageData.config.title} />
      )}
    </div>
  );
}
