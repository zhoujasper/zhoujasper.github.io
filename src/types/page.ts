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

export interface LinkItem {
    name: string;
    url: string;
}

export interface SecretCardCiphertext {
    version: 1;
    kdf: {
        name: 'scrypt';
        salt: string;
        n: number;
        r: number;
        p: number;
        dkLen: number;
    };
    cipher: {
        name: 'AES-GCM';
        nonce: string;
        data: string;
    };
}

export interface SecretCardItem {
    id: string;
    title: string;
    encrypted: SecretCardCiphertext;
    selected?: boolean;
}

export interface CardItem {
    title: string;
    subtitle?: string;
    date?: string;
    content?: string;
    tags?: string[];
    links?: LinkItem[];
    image?: string;
    gallery?: string[];
    selected?: boolean;
}

export interface CardPageConfig extends BasePageConfig {
    type: 'card';
    items: CardItem[];
    secretItems?: SecretCardItem[];
}
