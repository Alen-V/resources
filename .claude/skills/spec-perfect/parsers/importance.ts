// Importance-scale parser for the spec-perfection skill.
// Decision OQ-4: 1–10 scale, no 7s allowed (forcing-function for fence-sitting).

export type ImportanceValue = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9 | 10;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isImportanceValue = (n: number): n is ImportanceValue => {
    return Number.isInteger(n) && n >= 1 && n <= 10 && n !== 7;
};

export const parseImportance = (input: unknown): ParseResult<ImportanceValue> => {
    let n: number;

    if (typeof input === 'number') {
        n = input;
    } else if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!/^-?\d+$/.test(trimmed)) {
            return { ok: false, error: `expected an integer string, got "${input}"` };
        }
        n = Number(trimmed);
    } else {
        return { ok: false, error: `expected a number or numeric string, got ${typeof input}` };
    }

    if (!Number.isInteger(n)) {
        return { ok: false, error: `expected an integer, got ${n}` };
    }
    if (n === 7) {
        return { ok: false, error: 'no 7s allowed (OQ-4 forcing function — pick 6 or 8)' };
    }
    if (n < 1 || n > 10) {
        return { ok: false, error: `out of range — importance must be 1–10 (no 7), got ${n}` };
    }
    if (!isImportanceValue(n)) {
        return { ok: false, error: `unreachable: ${n}` };
    }
    return { ok: true, value: n };
};
