// Implementation backing validators/no_sevens_check.sh.
// Scans the spec wisp's `## Decisions Log` for `importance: <n>` lines and
// runs each through parseImportance. Any rejection (out-of-range, 7, NaN,
// non-integer) counts as a violation.

import { readFileSync } from 'fs';

import { parseImportance } from '../parsers/importance';

const wispFile = process.argv[2];
if (!wispFile) {
    console.error('usage: no_sevens_check <wisp-file>');
    process.exit(2);
}

let md: string;
try {
    md = readFileSync(wispFile, 'utf-8');
} catch (err) {
    console.error(`no_sevens_check: cannot read ${wispFile}: ${(err as Error).message}`);
    process.exit(2);
}

// Extract the ## Decisions Log section (until the next H2 or end-of-input).
// Split on a positive lookahead for ## headings so each chunk starts with
// its own H2; pick the chunk whose H2 is "Decisions Log".
const sections = md.split(/^(?=##\s+)/m);
const decisionsBlock = sections.find((s) => /^##\s+Decisions Log\b/i.test(s));
if (!decisionsBlock) {
    process.exit(0);
}

const lines = decisionsBlock.split('\n');
let violations = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Bullet prefix is optional — Decisions Log entries appear both as
    // bulleted lists and as flat key:value blocks under sub-headings.
    const m = line.match(/^\s*(?:[-*]\s+)?importance:\s*(.+?)\s*$/i);
    if (!m) continue;
    const result = parseImportance(m[1]);
    if (!result.ok) {
        console.error(`NO_7S_VIOLATION (Decisions Log line ${i + 1}): ${result.error} (got "${m[1]}")`);
        violations++;
    }
}

process.exit(violations > 0 ? 1 : 0);
