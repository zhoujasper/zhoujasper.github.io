export interface BasePageConfig {
    type: 'about' | 'publication' | 'card' | 'text' | 'list';
    title: string;
    description?: string;
}

export interface PublicationPageConfig extends BasePageConfig {
    type: 'publication';
    source: string;
}

export interface TextPageConfig extends BasePageConfig {
    type: 'text';
    source: string;
}

export interface ListItem {
    date: string;
    content: string;
}

export interface ListPageConfig extends BasePageConfig {
    type: 'list';
    source?: string;
    limit?: number;
    news?: ListItem[];
}

export interface CardItem {
    title: string;
    subtitle?: string;
    date?: string;
    content?: string;
    tags?: string[];
    link?: string;
    image?: string;
    selected?: boolean;
}

export interface CardPageConfig extends BasePageConfig {
    type: 'card';
    items: CardItem[];
}
