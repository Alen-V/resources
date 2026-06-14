// Hedging detector for spec wisps.
// Amendment X (section-aware): scan only sections (a) Threat / Bug Model,
// (c) Fix Design, and Tracer Bullets prose. Skip Decisions Log, Bucket C,
// Out-of-Scope (those legitimately discuss alternatives or open questions).
// Other sections — (b), (d), (e), (f), Schema Changes, Shared Type Impact —
// are not scanned per amendment X's "applied only to" wording.

export type HedgingMatch = {
    phrase: string;
    section: string;
    lineNumber: number;
    excerpt: string;
};

// Curated blocklist (amendment X target: 15–20 phrases).
export const HEDGING_BLOCKLIST: readonly string[] = [
    'we could',
    'we may',
    "we'll see",
    'we should consider',
    'we may want to',
    'option a or option b',
    'this might work',
    'this could',
    'might be',
    'could be',
    'perhaps',
    'maybe',
    'alternatively',
    'it depends',
    'arguably',
    'could go either way',
    'either way',
    'one approach',
    'another approach',
    'on the other hand',
] as const;

const INCLUDED_PATTERNS: readonly RegExp[] = [
    /\bthreat\b/i, // (a) Threat / Bug Model
    /\bfix\s+design\b/i, // (c) Fix Design
    /\btracer\s+bullets?\b/i, // ## Tracer Bullets
];

const EXCLUDED_PATTERNS: readonly RegExp[] = [
    /\bdecisions?\s+log\b/i,
    /\bbucket\s+c\b/i,
    /\bout[-\s]?of[-\s]?scope\b/i,
];

const isIncludedSection = (heading: string): boolean => {
    if (EXCLUDED_PATTERNS.some((p) => p.test(heading))) return false;
    return INCLUDED_PATTERNS.some((p) => p.test(heading));
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPhraseRegex = (phrase: string): RegExp => {
    // Word-boundary on letters only (so apostrophes / spaces inside phrases don't matter,
    // but a phrase doesn't match inside a longer word).
    return new RegExp(`(?<![A-Za-z])${escapeRegExp(phrase)}(?![A-Za-z])`, 'gi');
};

const PHRASE_REGEXES: readonly { phrase: string; regex: RegExp }[] = HEDGING_BLOCKLIST.map((phrase) => ({
    phrase,
    regex: buildPhraseRegex(phrase),
}));

export const detectHedging = (markdown: string): HedgingMatch[] => {
    const matches: HedgingMatch[] = [];
    const lines = markdown.split('\n');

    let currentSection = '';
    let scanCurrent = false;

    for (const [i, line] of lines.entries()) {
        const headingMatch = line.match(/^##+\s+(.+?)\s*$/);
        if (headingMatch && headingMatch[1] !== undefined) {
            currentSection = headingMatch[1].trim();
            scanCurrent = isIncludedSection(currentSection);
            continue;
        }
        if (!scanCurrent) continue;

        for (const { phrase, regex } of PHRASE_REGEXES) {
            // Reset lastIndex; these regexes are reused across lines.
            regex.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = regex.exec(line)) !== null) {
                const start = Math.max(0, m.index - 20);
                const end = Math.min(line.length, m.index + m[0].length + 40);
                matches.push({
                    phrase,
                    section: currentSection,
                    lineNumber: i + 1,
                    excerpt: line.slice(start, end),
                });
            }
        }
    }
    return matches;
};
