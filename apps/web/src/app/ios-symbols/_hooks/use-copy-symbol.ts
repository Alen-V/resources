'use client';

import { toast } from 'sonner';

import { useCallback } from 'react';

import { formatSymbol } from '../_lib/symbol-format';
import type { CopyFormat, SymbolEntry } from '../_lib/types';

/** Public URL of a symbol's PNG, served statically from `apps/web/public/ios-symbols/`. */
function pngUrl(name: string): string {
    return '/ios-symbols/' + name + '.png';
}

/**
 * Copies a symbol to the clipboard (or triggers a download) in the requested format,
 * surfacing the outcome via a `sonner` toast.
 *
 * - text formats (`name`/`swiftui`/`uikit`/`filename`) → `navigator.clipboard.writeText`
 * - `png` → fetches the PNG and writes a `ClipboardItem`; falls back to copying the
 *   name when `ClipboardItem` is unavailable (e.g. Firefox) or the write is rejected
 * - `download` → clicks a generated `<a download>` pointing at the PNG
 *
 * Any failure (clipboard blocked/denied) is caught and reported with an error toast.
 */
export function useCopySymbol() {
    const copy = useCallback(async (symbol: SymbolEntry, format: CopyFormat): Promise<void> => {
        try {
            switch (format) {
                case 'name':
                case 'swiftui':
                case 'uikit':
                case 'filename': {
                    await navigator.clipboard.writeText(formatSymbol(symbol.name, format));
                    toast.success('Copied ' + symbol.name);
                    return;
                }

                case 'png': {
                    await copyPng(symbol.name);
                    return;
                }

                case 'download': {
                    downloadPng(symbol.name);
                    return;
                }
            }
        } catch {
            toast.error('Copy failed — clipboard blocked');
        }
    }, []);

    return { copy };
}

/**
 * Writes the symbol's PNG to the clipboard as an `image/png` `ClipboardItem`.
 * Falls back to copying the symbol name (with a notice) when the browser cannot
 * place an image on the clipboard.
 */
async function copyPng(name: string): Promise<void> {
    if (typeof ClipboardItem === 'undefined') {
        await fallbackPng(name);
        return;
    }

    try {
        const response = await fetch(pngUrl(name));
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('Copied ' + name + ' image');
    } catch {
        await fallbackPng(name);
    }
}

/** Best-effort fallback when PNG-to-clipboard is unsupported: copy the name instead. */
async function fallbackPng(name: string): Promise<void> {
    await navigator.clipboard.writeText(name);
    toast.info("PNG copy isn't supported in this browser — copied the name instead");
}

/** Triggers a browser download of the symbol's PNG via a transient anchor click. */
function downloadPng(name: string): void {
    const anchor = document.createElement('a');
    anchor.href = pngUrl(name);
    anchor.download = name + '.png';
    anchor.click();
}
