// Implementation backing validators/hedging_check.sh.
// Invoked via tsx; calls parsers/hedging.ts on the wisp file given as argv[2].

import { readFileSync } from 'fs';

import { detectHedging } from '../parsers/hedging';

const wispFile = process.argv[2];
if (!wispFile) {
    console.error('usage: hedging_check <wisp-file>');
    process.exit(2);
}

let md: string;
try {
    md = readFileSync(wispFile, 'utf-8');
} catch (err) {
    console.error(`hedging_check: cannot read ${wispFile}: ${(err as Error).message}`);
    process.exit(2);
}

const matches = detectHedging(md);
if (matches.length > 0) {
    for (const m of matches) {
        console.error(`HEDGING_DETECTED: "${m.phrase}" in section "${m.section}" (line ${m.lineNumber})`);
        console.error(`  excerpt: ${m.excerpt}`);
    }
    process.exit(1);
}
process.exit(0);
