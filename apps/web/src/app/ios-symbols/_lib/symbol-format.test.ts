import { describe, expect, it } from 'vitest';

import { formatSymbol, type TextCopyFormat } from './symbol-format';

describe('formatSymbol', () => {
    const name = 'house.fill';

    const cases: { format: TextCopyFormat; expected: string }[] = [
        { format: 'name', expected: 'house.fill' },
        { format: 'swiftui', expected: 'Image(systemName: "house.fill")' },
        { format: 'uikit', expected: 'UIImage(systemName: "house.fill")' },
        { format: 'filename', expected: 'house.fill.png' },
    ];

    it.each(cases)('formats $format', ({ format, expected }) => {
        expect(formatSymbol(name, format)).toBe(expected);
    });
});
