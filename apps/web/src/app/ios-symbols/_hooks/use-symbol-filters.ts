'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import type { Facet, FilterState, SymbolEntry } from '../_lib/types';

/** Synthetic category key for symbols that have no Apple category mapping. */
const UNCATEGORIZED = 'uncategorized';

const INITIAL_STATE: FilterState = {
    query: '',
    categories: new Set<string>(),
    facets: new Set<Facet>(),
    showLocalized: false,
    lang: null,
};

/**
 * Pure filtering used by {@link useSymbolFilters}. Exported so the composition
 * rules can be unit-tested without rendering. `query` is passed explicitly so
 * the hook can feed it the deferred (debounced) value.
 */
export function filterSymbols(symbols: SymbolEntry[], state: FilterState, query: string): SymbolEntry[] {
    const { categories, facets, showLocalized, lang } = state;
    const needle = query.trim().toLowerCase();
    const hasCategories = categories.size > 0;
    const hasFacets = facets.size > 0;

    return symbols.filter((symbol) => {
        // Localization visibility.
        if (!showLocalized) {
            if (symbol.localized) return false;
        } else if (lang && symbol.lang !== lang) {
            return false;
        }

        // Query: case-insensitive substring match on the symbol name.
        if (needle && !symbol.name.toLowerCase().includes(needle)) {
            return false;
        }

        // Categories: OR semantics. An entry with no categories matches only when
        // the synthetic "uncategorized" key is among the selected ones.
        if (hasCategories) {
            const matches =
                symbol.categories.length === 0 ? categories.has(UNCATEGORIZED) : symbol.categories.some((key) => categories.has(key));
            if (!matches) return false;
        }

        // Facets: AND semantics — every selected facet must be present.
        if (hasFacets) {
            for (const facet of facets) {
                if (!symbol.facets.includes(facet)) return false;
            }
        }

        return true;
    });
}

export interface UseSymbolFilters {
    state: FilterState;
    setQuery: (q: string) => void;
    toggleCategory: (k: string) => void;
    toggleFacet: (f: Facet) => void;
    setShowLocalized: (v: boolean) => void;
    setLang: (c: string | null) => void;
    clear: () => void;
    results: SymbolEntry[];
    total: number;
    filteredCount: number;
}

/**
 * Owns the filter/search state for the SF Symbols browser and derives the
 * filtered result set. The query is debounced via `useDeferredValue` and the
 * results are memoized so typing stays responsive over the full symbol set.
 */
export function useSymbolFilters(symbols: SymbolEntry[]): UseSymbolFilters {
    const [state, setState] = useState<FilterState>(INITIAL_STATE);

    // Defer the whole filter input: the toolbar stays controlled by the immediate
    // `state` (instant feedback), while the expensive 9k-item filter runs against a
    // low-priority deferred snapshot, so typing and toggling never block the UI.
    const deferredState = useDeferredValue(state);

    const setQuery = useCallback((q: string) => {
        setState((prev) => ({ ...prev, query: q }));
    }, []);

    const toggleCategory = useCallback((k: string) => {
        setState((prev) => {
            const categories = new Set(prev.categories);
            if (categories.has(k)) categories.delete(k);
            else categories.add(k);
            return { ...prev, categories };
        });
    }, []);

    const toggleFacet = useCallback((f: Facet) => {
        setState((prev) => {
            const facets = new Set(prev.facets);
            if (facets.has(f)) facets.delete(f);
            else facets.add(f);
            return { ...prev, facets };
        });
    }, []);

    const setShowLocalized = useCallback((v: boolean) => {
        setState((prev) => ({
            ...prev,
            showLocalized: v,
            // Drop any language sub-filter when localized variants are hidden.
            lang: v ? prev.lang : null,
        }));
    }, []);

    const setLang = useCallback((c: string | null) => {
        setState((prev) => ({ ...prev, lang: c }));
    }, []);

    const clear = useCallback(() => {
        setState(INITIAL_STATE);
    }, []);

    const results = useMemo(() => filterSymbols(symbols, deferredState, deferredState.query), [symbols, deferredState]);

    return {
        state,
        setQuery,
        toggleCategory,
        toggleFacet,
        setShowLocalized,
        setLang,
        clear,
        results,
        total: symbols.length,
        filteredCount: results.length,
    };
}
