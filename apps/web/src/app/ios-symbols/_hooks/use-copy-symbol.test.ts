// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
// Imported after the mock above so we get the mocked module.
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CopyFormat, SymbolEntry } from '../_lib/types';
import { useCopySymbol } from './use-copy-symbol';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

const symbol: SymbolEntry = {
    name: 'house.fill',
    facets: ['fill'],
    categories: ['objectsandtools'],
};

/** Renders the hook and returns its stable `copy` function. */
function getCopy() {
    return renderHook(() => useCopySymbol()).result.current.copy;
}

const writeText = vi.fn<(text: string) => Promise<void>>();
const write = vi.fn<(items: unknown[]) => Promise<void>>();

/** A minimal `ClipboardItem` stand-in that records the type → blob map it was given. */
class FakeClipboardItem {
    readonly items: Record<string, Blob>;
    constructor(items: Record<string, Blob>) {
        this.items = items;
    }
}

beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    write.mockReset().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', { clipboard: { writeText, write } });
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ blob: async () => new Blob(['png-bytes'], { type: 'image/png' }) })),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

describe('useCopySymbol', () => {
    describe('text formats', () => {
        const cases: { format: CopyFormat; payload: string }[] = [
            { format: 'name', payload: 'house.fill' },
            { format: 'swiftui', payload: 'Image(systemName: "house.fill")' },
            { format: 'uikit', payload: 'UIImage(systemName: "house.fill")' },
            { format: 'filename', payload: 'house.fill.png' },
        ];

        it.each(cases)('writes the $format payload to the clipboard', async ({ format, payload }) => {
            const copy = getCopy();

            await copy(symbol, format);

            expect(writeText).toHaveBeenCalledTimes(1);
            expect(writeText).toHaveBeenCalledWith(payload);
            expect(write).not.toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledTimes(1);
            expect(toast.error).not.toHaveBeenCalled();
        });
    });

    describe('png format', () => {
        it('fetches the PNG and writes a single image/png ClipboardItem', async () => {
            const copy = getCopy();

            await copy(symbol, 'png');

            expect(fetch).toHaveBeenCalledWith('/ios-symbols/house.fill.png');
            expect(write).toHaveBeenCalledTimes(1);

            const items = write.mock.calls[0]![0] as FakeClipboardItem[];
            expect(items).toHaveLength(1);
            const [item] = items;
            expect(item).toBeInstanceOf(FakeClipboardItem);
            expect(Object.keys(item!.items)).toEqual(['image/png']);
            expect(item!.items['image/png']).toBeInstanceOf(Blob);

            expect(writeText).not.toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledTimes(1);
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('falls back to copying the name when ClipboardItem is unsupported', async () => {
            vi.stubGlobal('ClipboardItem', undefined);
            const copy = getCopy();

            await copy(symbol, 'png');

            expect(write).not.toHaveBeenCalled();
            expect(fetch).not.toHaveBeenCalled();
            expect(writeText).toHaveBeenCalledWith('house.fill');
            expect(toast.info).toHaveBeenCalledTimes(1);
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('falls back to copying the name when the clipboard write is rejected', async () => {
            write.mockRejectedValue(new Error('write denied'));
            const copy = getCopy();

            await copy(symbol, 'png');

            expect(write).toHaveBeenCalledTimes(1);
            expect(writeText).toHaveBeenCalledWith('house.fill');
            expect(toast.info).toHaveBeenCalledTimes(1);
            expect(toast.error).not.toHaveBeenCalled();
        });
    });

    describe('download format', () => {
        it('clicks a transient anchor pointing at the PNG', async () => {
            // Render the hook first so testing-library builds its container with the real
            // `createElement`; only then intercept the call the hook itself makes.
            const copy = getCopy();
            const anchor = { href: '', download: '', click: vi.fn() };
            const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement);

            await copy(symbol, 'download');

            expect(createElement).toHaveBeenCalledWith('a');
            expect(anchor.href).toBe('/ios-symbols/house.fill.png');
            expect(anchor.download).toBe('house.fill.png');
            expect(anchor.click).toHaveBeenCalledTimes(1);
            expect(writeText).not.toHaveBeenCalled();
            expect(write).not.toHaveBeenCalled();
        });
    });

    describe('failure handling', () => {
        it('routes a thrown clipboard error to toast.error', async () => {
            writeText.mockRejectedValue(new Error('clipboard blocked'));
            const copy = getCopy();

            await copy(symbol, 'name');

            expect(writeText).toHaveBeenCalledTimes(1);
            expect(toast.success).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledTimes(1);
            expect(toast.error).toHaveBeenCalledWith('Copy failed — clipboard blocked');
        });

        it('routes a rejected PNG fetch to toast.error', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => {
                    throw new Error('network down');
                }),
            );
            // The thrown fetch is caught by copyPng's inner try, which then attempts the
            // name fallback; make that fail too so the outer handler reports an error.
            writeText.mockRejectedValue(new Error('clipboard blocked'));
            const copy = getCopy();

            await copy(symbol, 'png');

            expect(toast.error).toHaveBeenCalledTimes(1);
            expect(toast.error).toHaveBeenCalledWith('Copy failed — clipboard blocked');
        });
    });
});
