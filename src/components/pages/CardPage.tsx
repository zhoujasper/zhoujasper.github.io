'use client';

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunnelIcon, CalendarIcon, TagIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CardItem, CardPageConfig, SecretCardItem } from '@/types/page';
import { useMessages } from '@/lib/i18n/useMessages';
import { decryptSecretCard } from '@/lib/secretCardsClient';

const markdownComponents = {
    p: ({ children }: React.ComponentProps<'p'>) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }: React.ComponentProps<'ul'>) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: React.ComponentProps<'ol'>) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
    li: ({ children }: React.ComponentProps<'li'>) => <li className="mb-1">{children}</li>,
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium transition-all duration-200 rounded hover:bg-accent/25 hover:shadow-sm"
        />
    ),
    blockquote: ({ children }: React.ComponentProps<'blockquote'>) => (
        <blockquote className="border-l-4 border-accent/50 pl-4 italic my-4 text-neutral-600 dark:text-neutral-500">
            {children}
        </blockquote>
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
    code: ({ children }: React.ComponentProps<'code'>) => (
        <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em]">{children}</code>
    ),
};

export default function CardPage({
    config,
    embedded = false,
    showDescription = true,
    showViewAll = false,
    viewAllHref = '/experience',
    onlyShowTitle = false,
    enableClickToJump = false,
    linkToPage = null,
}: {
    config: CardPageConfig;
    embedded?: boolean;
    showDescription?: boolean;
    showViewAll?: boolean;
    viewAllHref?: string;
    onlyShowTitle?: boolean;
    enableClickToJump?: boolean;
    linkToPage?: string | null;
}) {
    const messages = useMessages();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState<string | 'all'>('all');
    const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [secretPasswords, setSecretPasswords] = useState<Record<string, string>>({});
    const [secretErrors, setSecretErrors] = useState<Record<string, boolean>>({});
    const [secretLoading, setSecretLoading] = useState<Record<string, boolean>>({});
    const [secretShaking, setSecretShaking] = useState<Record<string, boolean>>({});
    const [unlockedSecretItems, setUnlockedSecretItems] = useState<Record<string, CardItem>>({});
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    const previewLength = 128;

    const toggleExpanded = (itemKey: string) => {
        setExpandedItems((prev) => ({
            ...prev,
            [itemKey]: !prev[itemKey],
        }));
    };

    const triggerSecretError = (secretId: string) => {
        setSecretErrors((prev) => ({ ...prev, [secretId]: true }));
        setSecretShaking((prev) => ({ ...prev, [secretId]: false }));

        requestAnimationFrame(() => {
            setSecretShaking((prev) => ({ ...prev, [secretId]: true }));
        });

        setTimeout(() => {
            setSecretShaking((prev) => ({ ...prev, [secretId]: false }));
        }, 420);
    };

    const handleUnlockSecret = async (secretItem: SecretCardItem) => {
        const password = secretPasswords[secretItem.id] || '';
        if (!password) {
            triggerSecretError(secretItem.id);
            return;
        }

        setSecretLoading((prev) => ({ ...prev, [secretItem.id]: true }));
        setSecretErrors((prev) => ({ ...prev, [secretItem.id]: false }));

        try {
            const item = await decryptSecretCard(secretItem, password);

            setUnlockedSecretItems((prev) => ({
                ...prev,
                [secretItem.id]: item,
            }));
            setSecretPasswords((prev) => ({ ...prev, [secretItem.id]: '' }));
            setSecretErrors((prev) => ({ ...prev, [secretItem.id]: false }));
        } catch {
            triggerSecretError(secretItem.id);
        } finally {
            setSecretLoading((prev) => ({ ...prev, [secretItem.id]: false }));
        }
    };

    const getPreviewContent = (content: string): { preview: string; isLonger: boolean } => {
        if (content.length <= previewLength) {
            return { preview: content, isLonger: false };
        }
        return {
            preview: content.slice(0, previewLength) + '...',
            isLonger: true,
        };
    };

    const handleCardClick = (itemTitle: string) => {
        if (!linkToPage) return;

        // 创建一个唯一的 ID 用于定位卡片
        const itemId = `card-${itemTitle.toLowerCase().replace(/\s+/g, '-')}`;

        // 存储目标 ID 到 sessionStorage，以便在目标页面加载后使用
        sessionStorage.setItem('targetCardId', itemId);
        sessionStorage.setItem('enableFlash', 'true');

        // 导航到新页面
        router.push(linkToPage);
    };

    const years = useMemo(() => {
        const uniqueYears = Array.from(
            new Set(
                config.items
                    .map((item) => item.date?.trim())
                    .filter((value): value is string => Boolean(value))
            )
        );
        return uniqueYears.sort((a, b) => b.localeCompare(a));
    }, [config.items]);

    const tags = useMemo(() => {
        const uniqueTags = Array.from(
            new Set(
                config.items.flatMap((item) => item.tags || [])
            )
        );
        return uniqueTags.sort((a, b) => a.localeCompare(b));
    }, [config.items]);

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return config.items.filter((item) => {
            const searchableText = [
                item.title,
                item.subtitle,
                item.date,
                item.content,
                item.tags?.join(' '),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesSearch = !query || searchableText.includes(query);
            const matchesYear = selectedYear === 'all' || (item.date?.trim() || '') === selectedYear;
            const matchesTag = selectedTag === 'all' || (item.tags || []).includes(selectedTag);

            return matchesSearch && matchesYear && matchesTag;
        });
    }, [config.items, searchQuery, selectedYear, selectedTag]);

    const filteredSecretItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const secretItems = config.secretItems || [];

        return secretItems.filter((secretItem) => {
            const unlockedItem = unlockedSecretItems[secretItem.id];
            const searchableText = [
                secretItem.title,
                unlockedItem?.subtitle,
                unlockedItem?.date,
                unlockedItem?.content,
                unlockedItem?.tags?.join(' '),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesSearch = !query || searchableText.includes(query);
            const matchesYear = selectedYear === 'all' || (unlockedItem?.date?.trim() || '') === selectedYear;
            const matchesTag = selectedTag === 'all' || (unlockedItem?.tags || []).includes(selectedTag);

            return matchesSearch && matchesYear && matchesTag;
        });
    }, [config.secretItems, unlockedSecretItems, searchQuery, selectedYear, selectedTag]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className={embedded ? "mb-4" : "mb-8"}>
                <div className="flex items-center justify-between mb-4">
                    <h1 className={`${embedded ? "text-2xl" : "text-4xl"} font-serif font-bold text-primary`}>{config.title}</h1>
                    {showViewAll && (
                        <Link
                            href={viewAllHref}
                            prefetch={true}
                            className="text-accent hover:text-accent-dark text-sm font-medium transition-all duration-200 rounded hover:bg-accent/25 hover:shadow-sm"
                        >
                            {messages.home.viewAll} →
                        </Link>
                    )}
                </div>
                {showDescription && config.description && (
                    <div className={`${embedded ? "text-base" : "text-lg"} text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed`}>
                        <ReactMarkdown components={markdownComponents}>
                            {config.description}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {!embedded && (
                <div className="mb-8 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder={messages.cards.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:flex-1 sm:min-w-0 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                        />
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex shrink-0 items-center justify-center whitespace-nowrap px-4 py-2 rounded-lg border transition-all duration-200 ${showFilters
                                ? 'bg-accent text-white border-accent'
                                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:border-accent hover:text-accent'}`}
                        >
                            <FunnelIcon className="h-5 w-5 mr-2" />
                            {messages.cards.filters}
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center">
                                            <CalendarIcon className="h-4 w-4 mr-1" /> {messages.cards.year}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedYear('all')}
                                                className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedYear === 'all'
                                                    ? 'bg-accent text-white'
                                                    : 'bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                                            >
                                                {messages.common.all}
                                            </button>
                                            {years.map((year) => (
                                                <button
                                                    type="button"
                                                    key={year}
                                                    onClick={() => setSelectedYear(year)}
                                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedYear === year
                                                        ? 'bg-accent text-white'
                                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center">
                                            <TagIcon className="h-4 w-4 mr-1" /> {messages.cards.tag}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTag('all')}
                                                className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedTag === 'all'
                                                    ? 'bg-accent text-white'
                                                    : 'bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                                            >
                                                {messages.common.all}
                                            </button>
                                            {tags.map((tag) => (
                                                <button
                                                    type="button"
                                                    key={tag}
                                                    onClick={() => setSelectedTag(tag)}
                                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedTag === tag
                                                        ? 'bg-accent text-white'
                                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <div className={`grid ${embedded ? "gap-4" : "gap-6"}`}>
                {filteredItems.map((item, index) => {
                    const itemId = `card-${item.title.toLowerCase().replace(/\s+/g, '-')}`;
                    const isClickable = (!!linkToPage && (onlyShowTitle || enableClickToJump));
                    const itemStateKey = `normal-${index}`;
                    
                    return (
                    <motion.div
                        key={index}
                        ref={(el) => { if (el) cardRefs.current[index] = el; }}
                        id={itemId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        onClick={() => isClickable && handleCardClick(item.title)}
                        className={`bg-white dark:bg-neutral-900 ${embedded ? "p-4" : "p-6"} rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all duration-200 hover:scale-[1.01] ${isClickable ? 'cursor-pointer' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className={`${embedded ? "text-lg" : "text-xl"} font-semibold text-primary`}>{item.title}</h3>
                            {!embedded && item.date && (
                                <span className="text-sm text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded" style={{ textAlign: "center" }}>
                                    {item.date}
                                </span>
                            )}
                        </div>
                        {item.subtitle && (
                            <p className={`${embedded ? "text-sm" : "text-base"} text-accent font-medium mb-3`}>{item.subtitle}</p>
                        )}
                        {!onlyShowTitle && item.content && (
                            <div>
                                <div className={`${embedded ? "text-sm" : "text-base"} text-neutral-600 dark:text-neutral-500 leading-relaxed`}>
                                    <ReactMarkdown components={markdownComponents}>
                                        {expandedItems[itemStateKey] ? item.content : getPreviewContent(item.content).preview}
                                    </ReactMarkdown>
                                </div>
                                {getPreviewContent(item.content).isLonger && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpanded(itemStateKey);
                                        }}
                                        className="mt-3 text-xs font-medium text-accent hover:text-accent-dark transition-colors"
                                    >
                                        {expandedItems[itemStateKey] ? messages.home.readLess : messages.home.readMore}
                                    </button>
                                )}
                            </div>
                        )}
                        {!embedded && !onlyShowTitle && item.gallery && item.gallery.length > 0 && (
                            <div className="mt-4">
                                <div className={`grid gap-3 ${item.gallery.length === 1 ? 'grid-cols-1' : item.gallery.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                    {item.gallery.map((image, imgIndex) => (
                                        <a
                                            key={imgIndex}
                                            href={image}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-shadow duration-200"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <img
                                                src={image}
                                                alt={`Gallery ${imgIndex + 1}`}
                                                className="w-full h-40 object-cover hover:scale-105 transition-transform duration-200"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="160"%3E%3Crect fill="%23e5e7eb" width="300" height="160"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236b7280" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E';
                                                }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!embedded && !onlyShowTitle && item.links && item.links.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {item.links.map((linkItem, linkIndex) => (
                                    <a
                                        key={linkIndex}
                                        href={linkItem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white font-medium rounded-lg transition-all duration-200 text-sm"
                                    >
                                        <span>{linkItem.name}</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                ))}
                            </div>
                        )}
                        {!onlyShowTitle && item.tags && !embedded && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {item.tags.map(tag => (
                                    <span key={tag} className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                    );
                })}

                {filteredSecretItems.map((secretItem, index) => {
                    const unlockedItem = unlockedSecretItems[secretItem.id];
                    const displayItem = unlockedItem || { title: secretItem.title };
                    const itemId = `card-${displayItem.title.toLowerCase().replace(/\s+/g, '-')}`;
                    const isClickable = Boolean(unlockedItem && linkToPage && (onlyShowTitle || enableClickToJump));
                    const itemStateKey = `secret-${secretItem.id}`;

                    return (
                        <motion.div
                            key={secretItem.id}
                            id={itemId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 * (index + filteredItems.length) }}
                            onClick={() => {
                                if (unlockedItem && isClickable) {
                                    handleCardClick(displayItem.title);
                                }
                            }}
                            className={`bg-white dark:bg-neutral-900 ${embedded ? 'p-4' : 'p-6'} rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all duration-200 hover:scale-[1.01] ${isClickable ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`${embedded ? 'text-lg' : 'text-xl'} font-semibold text-primary`}>{displayItem.title}</h3>
                                {!embedded && unlockedItem?.date && (
                                    <span className="text-sm text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded" style={{ textAlign: 'center' }}>
                                        {unlockedItem.date}
                                    </span>
                                )}
                            </div>

                            {!unlockedItem && (
                                <div
                                    className={`secret-lock-panel relative mt-3 h-56 rounded-xl border p-4 overflow-hidden ${secretErrors[secretItem.id]
                                        ? 'border-red-500 dark:border-red-500'
                                        : ''} ${secretShaking[secretItem.id] ? 'animate-shake' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="secret-lock-overlay absolute inset-0" />
                                    <div className="relative h-full flex flex-col justify-center">
                                        <p className="text-sm text-neutral-600 dark:text-neutral-200 mb-3" style={{ color: '#b6935d' }}>
                                            {messages.cards.lockedHint}
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="password"
                                                autoComplete="current-password"
                                                value={secretPasswords[secretItem.id] || ''}
                                                onChange={(e) => {
                                                    setSecretPasswords((prev) => ({ ...prev, [secretItem.id]: e.target.value }));
                                                    if (secretErrors[secretItem.id]) {
                                                        setSecretErrors((prev) => ({ ...prev, [secretItem.id]: false }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        void handleUnlockSecret(secretItem);
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder={messages.cards.passwordPlaceholder}
                                                className={`secret-password-input w-full sm:flex-1 sm:min-w-0 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 ${secretErrors[secretItem.id]
                                                    ? 'border-red-500 text-red-600 dark:text-red-400'
                                                    : 'text-neutral-700 dark:text-neutral-100'}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void handleUnlockSecret(secretItem);
                                                }}
                                                disabled={Boolean(secretLoading[secretItem.id])}
                                                className="shrink-0 whitespace-nowrap px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                                            >
                                                {secretLoading[secretItem.id] ? messages.cards.unlocking : messages.cards.unlock}
                                            </button>
                                        </div>
                                        {secretErrors[secretItem.id] && (
                                            <p className="mt-2 text-xs text-red-500">{messages.cards.wrongPassword}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {unlockedItem && unlockedItem.subtitle && (
                                <p className={`${embedded ? 'text-sm' : 'text-base'} text-accent font-medium mb-3`}>{unlockedItem.subtitle}</p>
                            )}

                            {unlockedItem && !onlyShowTitle && unlockedItem.content && (
                                <div>
                                    <div className={`${embedded ? 'text-sm' : 'text-base'} text-neutral-600 dark:text-neutral-500 leading-relaxed`}>
                                        <ReactMarkdown components={markdownComponents}>
                                            {expandedItems[itemStateKey] ? unlockedItem.content : getPreviewContent(unlockedItem.content).preview}
                                        </ReactMarkdown>
                                    </div>
                                    {getPreviewContent(unlockedItem.content).isLonger && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpanded(itemStateKey);
                                            }}
                                            className="mt-3 text-xs font-medium text-accent hover:text-accent-dark transition-colors"
                                        >
                                            {expandedItems[itemStateKey] ? messages.home.readLess : messages.home.readMore}
                                        </button>
                                    )}
                                </div>
                            )}

                            {!embedded && unlockedItem && !onlyShowTitle && unlockedItem.gallery && unlockedItem.gallery.length > 0 && (
                                <div className="mt-4">
                                    <div className={`grid gap-3 ${unlockedItem.gallery.length === 1 ? 'grid-cols-1' : unlockedItem.gallery.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                        {unlockedItem.gallery.map((image, imgIndex) => (
                                            <a
                                                key={imgIndex}
                                                href={image}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-shadow duration-200"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <img
                                                    src={image}
                                                    alt={`Gallery ${imgIndex + 1}`}
                                                    className="w-full h-40 object-cover hover:scale-105 transition-transform duration-200"
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="160"%3E%3Crect fill="%23e5e7eb" width="300" height="160"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236b7280" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E';
                                                    }}
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!embedded && unlockedItem && !onlyShowTitle && unlockedItem.links && unlockedItem.links.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {unlockedItem.links.map((linkItem, linkIndex) => (
                                        <a
                                            key={linkIndex}
                                            href={linkItem.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white font-medium rounded-lg transition-all duration-200 text-sm"
                                        >
                                            <span>{linkItem.name}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    ))}
                                </div>
                            )}

                            {unlockedItem && !onlyShowTitle && unlockedItem.tags && !embedded && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {unlockedItem.tags.map((tag) => (
                                        <span key={tag} className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {filteredItems.length + filteredSecretItems.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                    {messages.cards.noResults}
                </div>
            )}
        </motion.div>
    );
}
