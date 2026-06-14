export type Facet = 'fill' | 'circle' | 'square' | 'slash' | 'badge' | 'rtl' | 'numbered';
export type CopyFormat = 'name' | 'swiftui' | 'uikit' | 'filename' | 'png' | 'download';

export interface SymbolEntry {
    name: string;
    localized?: boolean;
    lang?: string;
    facets: Facet[];
    categories: string[];
    since?: string;
}

export interface CategoryDef {
    key: string;
    label: string;
}
export type Languages = Record<string, string>;

export interface FilterState {
    query: string;
    categories: Set<string>;
    facets: Set<Facet>;
    showLocalized: boolean;
    lang: string | null;
}

export const FACETS: Facet[] = ['fill', 'circle', 'square', 'slash', 'badge', 'rtl', 'numbered'];

export const COPY_FORMATS: { value: CopyFormat; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'swiftui', label: 'SwiftUI' },
    { value: 'uikit', label: 'UIKit' },
    { value: 'filename', label: 'Filename' },
    { value: 'png', label: 'PNG image' },
    { value: 'download', label: 'Download PNG' },
];
