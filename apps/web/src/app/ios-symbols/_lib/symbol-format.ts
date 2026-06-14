import type { CopyFormat } from './types';

/** The copy formats that resolve to a plain text string. PNG/download are handled elsewhere. */
export type TextCopyFormat = Extract<CopyFormat, 'name' | 'swiftui' | 'uikit' | 'filename'>;

/**
 * Format a symbol name into the clipboard text for a given copy format.
 *
 * - `name` → the name unchanged
 * - `swiftui` → `Image(systemName: "<name>")`
 * - `uikit` → `UIImage(systemName: "<name>")`
 * - `filename` → `<name>.png`
 */
export function formatSymbol(name: string, format: TextCopyFormat): string {
    switch (format) {
        case 'name':
            return name;
        case 'swiftui':
            return `Image(systemName: "${name}")`;
        case 'uikit':
            return `UIImage(systemName: "${name}")`;
        case 'filename':
            return `${name}.png`;
    }
}
