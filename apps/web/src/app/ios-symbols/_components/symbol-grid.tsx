'use client';

import { useVirtualizer } from '@tanstack/react-virtual';

import * as React from 'react';

import type { SymbolEntry } from '../_lib/types';
import { SymbolCell } from './symbol-cell';

interface SymbolGridProps {
    symbols: SymbolEntry[];
    onCopy: (symbol: SymbolEntry) => void;
}

// Minimum target width per cell; the column count is derived from the measured width.
const CELL_MIN = 128;
// Never show more than this many columns, so cells stay comfortably large on wide screens.
const MAX_COLUMNS = 8;
// Uniform gap between cells. Matches the horizontal `gap-2` (8px) so spacing is even all around.
const GAP = 8;
// Initial estimate of a row's height (just the cell); the exact height is measured at runtime.
const ROW_HEIGHT = 132;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/** Nearest scrollable ancestor — the app-shell content area, so the whole page scrolls. */
function findScrollParent(node: HTMLElement | null): HTMLElement | null {
    let el = node?.parentElement ?? null;
    while (el) {
        const overflowY = getComputedStyle(el).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') return el;
        el = el.parentElement;
    }
    return null;
}

export function SymbolGrid({ symbols, onCopy }: SymbolGridProps) {
    const listRef = React.useRef<HTMLDivElement>(null);
    const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null);
    const [columns, setColumns] = React.useState(1);
    const [scrollMargin, setScrollMargin] = React.useState(0);

    // Recompute the column count and the list's offset within the page scroll container.
    const measure = React.useCallback(() => {
        const list = listRef.current;
        if (!list) return;
        setColumns(Math.min(MAX_COLUMNS, Math.max(1, Math.floor(list.clientWidth / CELL_MIN))));
        const parent = findScrollParent(list);
        if (parent) {
            setScrollMargin(list.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop);
        }
    }, []);

    // Bind to the page's scroll container and keep measurements in sync on resize.
    useIsomorphicLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        setScrollEl(findScrollParent(list));
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(list);
        const parent = findScrollParent(list);
        if (parent) observer.observe(parent);
        return () => observer.disconnect();
    }, [measure]);

    const rowCount = Math.ceil(symbols.length / columns);

    const rowVirtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => scrollEl,
        estimateSize: () => ROW_HEIGHT,
        overscan: 8,
        gap: GAP,
        scrollMargin,
    });

    // The list offset can shift when the toolbar grows (e.g. the localized language row);
    // re-measure and re-run virtualization when the result set or layout changes.
    useIsomorphicLayoutEffect(() => {
        measure();
        rowVirtualizer.measure();
    }, [measure, rowVirtualizer, symbols.length, columns]);

    if (symbols.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-sm font-medium">No symbols found</p>
                <p className="text-muted-foreground mt-1 text-sm">Try adjusting your search or filters.</p>
            </div>
        );
    }

    return (
        <div className="px-4 py-4 sm:px-6">
            <div ref={listRef} className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const start = virtualRow.index * columns;
                    const rowSymbols = symbols.slice(start, start + columns);

                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className="absolute inset-x-0 grid gap-2"
                            style={{
                                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                            }}
                        >
                            {rowSymbols.map((symbol) => (
                                <SymbolCell key={symbol.name} symbol={symbol} onCopy={onCopy} />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
