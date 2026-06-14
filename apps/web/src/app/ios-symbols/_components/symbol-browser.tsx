'use client';

import { Toaster } from '@/components/ui/sonner';

import { useCallback, useState } from 'react';

import { useCopySymbol } from '../_hooks/use-copy-symbol';
import { useSymbolFilters } from '../_hooks/use-symbol-filters';
import type { CategoryDef, CopyFormat, Languages, SymbolEntry } from '../_lib/types';
import { SymbolGrid } from './symbol-grid';
import { SymbolToolbar } from './symbol-toolbar';

export interface SymbolBrowserProps {
    symbols: SymbolEntry[];
    categories: CategoryDef[];
    languages: Languages;
}

/**
 * Client island for the SF Symbols browser. Owns the copy-format selection,
 * delegates filter/search state to {@link useSymbolFilters}, and wires the
 * toolbar to the virtualized grid. Clicking a cell copies the symbol in the
 * active format via {@link useCopySymbol}.
 */
export function SymbolBrowser({ symbols, categories, languages }: SymbolBrowserProps) {
    const [copyFormat, setCopyFormat] = useState<CopyFormat>('name');
    const f = useSymbolFilters(symbols);
    const { copy } = useCopySymbol();
    const handleCopy = useCallback((symbol: SymbolEntry) => copy(symbol, copyFormat), [copy, copyFormat]);

    return (
        <div className="flex flex-col">
            <SymbolToolbar
                categories={categories}
                languages={languages}
                state={f.state}
                copyFormat={copyFormat}
                total={f.total}
                filteredCount={f.filteredCount}
                onQueryChange={f.setQuery}
                onToggleCategory={f.toggleCategory}
                onToggleFacet={f.toggleFacet}
                onShowLocalizedChange={f.setShowLocalized}
                onLangChange={f.setLang}
                onCopyFormatChange={setCopyFormat}
                onClear={f.clear}
            />
            <SymbolGrid symbols={f.results} onCopy={handleCopy} />
            <Toaster />
        </div>
    );
}
