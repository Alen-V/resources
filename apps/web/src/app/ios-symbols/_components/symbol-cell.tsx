'use client';

import { Button } from '@/components/ui/button';

import * as React from 'react';

import type { SymbolEntry } from '../_lib/types';

interface SymbolCellProps {
    symbol: SymbolEntry;
    onCopy: (symbol: SymbolEntry) => void;
}

function SymbolCellComponent({ symbol, onCopy }: SymbolCellProps) {
    const src = `/ios-symbols/${symbol.name}.png`;
    const title = symbol.since ? `${symbol.name} — since ${symbol.since}` : symbol.name;

    return (
        <Button
            type="button"
            variant="outline"
            title={title}
            onClick={() => onCopy(symbol)}
            className="group flex h-auto w-full flex-col items-center gap-2 rounded-xl p-3 text-center transition-all duration-150 active:scale-[0.97]"
        >
            {/* PNGs are black-on-transparent glyphs; a fixed light tile keeps them legible in both themes. */}
            <span className="flex size-20 items-center justify-center rounded-xl bg-zinc-100">
                <img src={src} alt={symbol.name} width={56} height={56} decoding="async" draggable={false} className="size-14" />
            </span>
            <span className="text-muted-foreground group-hover:text-foreground w-full truncate text-xs font-normal">{symbol.name}</span>
        </Button>
    );
}

export const SymbolCell = React.memo(SymbolCellComponent);
