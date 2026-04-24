'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMessages } from '@/lib/i18n/useMessages';
import { normalizeInternalRouteHref } from '@/lib/utils';

export interface NewsItem {
    date: string;
    content: string;
}

interface NewsProps {
    items: NewsItem[];
    title?: string;
    showViewAll?: boolean;
    enableOnePageMode?: boolean;
}

export default function News({
    items,
    title,
    showViewAll = false,
    enableOnePageMode = false,
}: NewsProps) {
    const messages = useMessages();
    const resolvedTitle = title || messages.home.news;
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

    const previewLength = 256;

    const getPlainTextLength = (text: string): number => text.replace(/\s+/g, ' ').trim().length;

    const toggleExpanded = (index: number) => {
        setExpandedItems((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
        >
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-serif font-bold text-primary">{resolvedTitle}</h1>
                {showViewAll && (
                    <Link
                        href={normalizeInternalRouteHref(enableOnePageMode ? "/#news" : "/news")}
                        prefetch={false}
                        className="text-accent hover:text-accent-dark text-sm font-medium transition-all duration-200 rounded hover:bg-accent/25 hover:shadow-sm"
                    >
                        {messages.home.viewAll} →
                    </Link>
                )}
            </div>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                        <span className="text-xs text-neutral-500 mt-1 w-16 flex-shrink-0">{item.date}</span>
                        <div className="text-sm text-neutral-700">
                            <p>
                                {expandedItems[index] || item.content.length <= previewLength
                                    ? item.content
                                    : `${item.content.slice(0, previewLength)}...`}
                            </p>
                            {getPlainTextLength(item.content) > previewLength && (
                                <button
                                    type="button"
                                    onClick={() => toggleExpanded(index)}
                                    className="mt-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors"
                                >
                                    {expandedItems[index] ? messages.home.readLess : messages.home.readMore}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </motion.section>
    );
}
