import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Facet, FilterState, SymbolEntry } from '../_lib/types';
import { filterSymbols, useSymbolFilters } from './use-symbol-filters';

/**
 * Small in-memory fixture covering every dimension of the filter:
 * - base vs. localized variants (with a language code)
 * - multiple categories (for OR semantics) and an unmapped entry (uncategorized)
 * - overlapping facets (for AND semantics)
 */
const FIXTURE: SymbolEntry[] = [
    { name: 'house.fill', facets: ['fill'], categories: ['objectsandtools'] },
    {
        name: 'bell.slash.circle.fill',
        facets: ['slash', 'circle', 'fill'],
        categories: ['communication'],
    },
    { name: 'bell', facets: [], categories: ['communication'] },
    { name: 'star.square', facets: ['square'], categories: ['objectsandtools'] },
    { name: 'mystery.glyph', facets: [], categories: [] }, // unmapped → uncategorized
    {
        name: '08.square.hi',
        localized: true,
        lang: 'hi',
        facets: ['square', 'numbered'],
        categories: ['indices'],
    },
];

/** Build a FilterState, overriding only the fields a given test cares about. */
function makeState(overrides: Partial<FilterState> = {}): FilterState {
    return {
        query: '',
        categories: new Set<string>(),
        facets: new Set<Facet>(),
        showLocalized: false,
        lang: null,
        ...overrides,
    };
}

const names = (entries: SymbolEntry[]) => entries.map((e) => e.name).sort();

describe('filterSymbols', () => {
    it('hides localized variants by default', () => {
        const result = filterSymbols(FIXTURE, makeState(), '');
        expect(result).toHaveLength(5);
        expect(result.some((e) => e.localized)).toBe(false);
    });

    it('matches the query case-insensitively as a substring of name', () => {
        const result = filterSymbols(FIXTURE, makeState(), 'BELL');
        // "bell.slash.circle.fill" and "bell" — localized fixture has no "bell".
        expect(names(result)).toEqual(['bell', 'bell.slash.circle.fill']);
    });

    it('applies category OR semantics across selected categories', () => {
        const state = makeState({
            categories: new Set(['communication', 'objectsandtools']),
        });
        const result = filterSymbols(FIXTURE, state, '');
        expect(names(result)).toEqual(['bell', 'bell.slash.circle.fill', 'house.fill', 'star.square']);
    });

    it("treats an entry with empty categories as 'uncategorized'", () => {
        const result = filterSymbols(FIXTURE, makeState({ categories: new Set(['uncategorized']) }), '');
        expect(names(result)).toEqual(['mystery.glyph']);
    });

    it('applies facet AND semantics across selected facets', () => {
        const state = makeState({ facets: new Set<Facet>(['fill', 'circle']) });
        const result = filterSymbols(FIXTURE, state, '');
        // Only bell.slash.circle.fill has BOTH fill and circle; house.fill has fill only.
        expect(names(result)).toEqual(['bell.slash.circle.fill']);
    });

    it('includes localized variants when showLocalized is true', () => {
        const result = filterSymbols(FIXTURE, makeState({ showLocalized: true }), '');
        expect(result).toHaveLength(6);
        expect(result.some((e) => e.lang === 'hi')).toBe(true);
    });

    it('narrows to a single language when lang is set', () => {
        const result = filterSymbols(FIXTURE, makeState({ showLocalized: true, lang: 'hi' }), '');
        expect(names(result)).toEqual(['08.square.hi']);
    });

    it('composes query AND categories(OR) AND facets(AND) together', () => {
        const state = makeState({
            query: 'square',
            categories: new Set(['objectsandtools', 'indices']),
            facets: new Set<Facet>(['square']),
        });
        // Base-only: "star.square" matches; "08.square.hi" is localized → excluded.
        const result = filterSymbols(FIXTURE, state, 'square');
        expect(names(result)).toEqual(['star.square']);
    });
});

describe('useSymbolFilters', () => {
    it('exposes total and an initial unfiltered (base-only) result set', () => {
        const { result } = renderHook(() => useSymbolFilters(FIXTURE));
        expect(result.current.total).toBe(6);
        expect(result.current.filteredCount).toBe(5); // localized hidden by default
        expect(result.current.state.query).toBe('');
    });

    it('filters by query through the debounced (deferred) value', () => {
        const { result } = renderHook(() => useSymbolFilters(FIXTURE));
        act(() => result.current.setQuery('house'));
        expect(names(result.current.results)).toEqual(['house.fill']);
        expect(result.current.filteredCount).toBe(1);
    });

    it('toggleCategory and toggleFacet flip set membership', () => {
        const { result } = renderHook(() => useSymbolFilters(FIXTURE));

        act(() => result.current.toggleCategory('communication'));
        expect(result.current.state.categories.has('communication')).toBe(true);
        expect(names(result.current.results)).toEqual(['bell', 'bell.slash.circle.fill']);

        act(() => result.current.toggleFacet('fill'));
        expect(result.current.state.facets.has('fill')).toBe(true);
        expect(names(result.current.results)).toEqual(['bell.slash.circle.fill']);

        // Toggling again removes it.
        act(() => result.current.toggleCategory('communication'));
        expect(result.current.state.categories.has('communication')).toBe(false);
    });

    it('setShowLocalized reveals variants and clearing it drops the lang sub-filter', () => {
        const { result } = renderHook(() => useSymbolFilters(FIXTURE));

        act(() => result.current.setShowLocalized(true));
        act(() => result.current.setLang('hi'));
        expect(names(result.current.results)).toEqual(['08.square.hi']);

        act(() => result.current.setShowLocalized(false));
        expect(result.current.state.lang).toBeNull();
        expect(result.current.results.some((e) => e.localized)).toBe(false);
    });

    it('clear() resets all filter state back to defaults', () => {
        const { result } = renderHook(() => useSymbolFilters(FIXTURE));

        act(() => {
            result.current.setQuery('bell');
            result.current.toggleCategory('communication');
            result.current.toggleFacet('fill');
            result.current.setShowLocalized(true);
        });

        act(() => result.current.clear());

        expect(result.current.state.query).toBe('');
        expect(result.current.state.categories.size).toBe(0);
        expect(result.current.state.facets.size).toBe(0);
        expect(result.current.state.showLocalized).toBe(false);
        expect(result.current.state.lang).toBeNull();
        expect(result.current.filteredCount).toBe(5); // back to base-only
    });
});
