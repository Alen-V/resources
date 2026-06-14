#!/usr/bin/env node
// symbols:meta — generate the committed SF Symbols metadata artifacts.
//
// Reads the canonical PNG list in `packages/icons/*.png` and enriches it with
// Apple's official metadata (categories + availability) extracted from the
// locally installed `SF Symbols.app`. Emits three committed JSON files under
// `apps/web/src/data/ios-symbols/`:
//
//   - manifest.json    array of { name, localized?, lang?, facets, categories, since? }
//   - categories.json  array of { key, label } for browseable categories
//   - languages.json   object mapping language code -> label
//
// macOS-only (depends on `plutil` and `SF Symbols.app`). Run rarely, whenever
// the PNG set changes. CI / Vercel never run this — the outputs are committed.
//
//   node packages/icons/scripts/build-manifest.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const ICONS_DIR = resolve(REPO_ROOT, 'packages/icons');
const OUT_DIR = resolve(REPO_ROOT, 'apps/web/src/data/ios-symbols');

const METADATA_DIR = '/Applications/SF Symbols.app/Contents/Resources/Metadata';
const SYMBOL_CATEGORIES_PLIST = `${METADATA_DIR}/symbol_categories.plist`;
const CATEGORIES_PLIST = `${METADATA_DIR}/categories.plist`;
const NAME_AVAILABILITY_PLIST = `${METADATA_DIR}/name_availability.plist`;

// Category keys that are not user-browseable filters — excluded everywhere.
const META_CATEGORIES = new Set(['all', 'whatsnew', 'draw', 'variable', 'multicolor']);

// Trailing dot-segment language suffixes for localized variants, with labels.
const LANGUAGE_LABELS = {
    ar: 'Arabic',
    he: 'Hebrew',
    hi: 'Hindi',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    th: 'Thai',
    bn: 'Bengali',
    gu: 'Gujarati',
    kn: 'Kannada',
    ml: 'Malayalam',
    mr: 'Marathi',
    or: 'Odia',
    pa: 'Punjabi',
    sat: 'Santali',
    mni: 'Manipuri',
    ta: 'Tamil',
    te: 'Telugu',
    el: 'Greek',
};
const LANGUAGE_CODES = new Set(Object.keys(LANGUAGE_LABELS));

// Filename-derived facet tokens (present when the token is a dot-segment).
const FACET_TOKENS = ['fill', 'circle', 'square', 'slash', 'badge', 'rtl'];

/** Convert a plist to JSON via `plutil` and parse it. */
function readPlist(path) {
    const json = execFileSync('plutil', ['-convert', 'json', '-o', '-', path], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(json);
}

/** Canonical symbol names: every `*.png` in packages/icons, without extension. */
function readSymbolNames() {
    return readdirSync(ICONS_DIR)
        .filter((f) => f.endsWith('.png'))
        .map((f) => f.slice(0, -'.png'.length));
}

function main() {
    // 1. Canonical name list + lookup set.
    const names = readSymbolNames();
    const nameSet = new Set(names);

    // 2. Apple metadata.
    const symbolCategories = readPlist(SYMBOL_CATEGORIES_PLIST); // name -> [keys]
    const categoriesList = readPlist(CATEGORIES_PLIST); // [{ key, label, ... }]

    // Optional, best-effort availability → iOS `since` version.
    // Shape: { symbols: { name -> yearCode }, year_to_release: { yearCode -> { iOS, ... } } }
    let sinceByName = new Map();
    try {
        const avail = readPlist(NAME_AVAILABILITY_PLIST);
        const symbolYears = avail?.symbols;
        const yearToRelease = avail?.year_to_release;
        if (symbolYears && yearToRelease) {
            for (const [name, yearCode] of Object.entries(symbolYears)) {
                const iosVersion = yearToRelease[yearCode]?.iOS;
                if (typeof iosVersion === 'string') sinceByName.set(name, iosVersion);
            }
        }
    } catch {
        // Shape unclear or file missing — skip `since` silently.
    }

    // 3. Build the manifest entries.
    const entries = names.map((name) => {
        const segments = name.split('.');
        const segmentSet = new Set(segments);

        // Localization: last segment is a known language code AND the de-suffixed
        // base name also exists in the canonical set (guards false positives).
        const last = segments[segments.length - 1];
        let localized = false;
        let lang;
        let baseName;
        if (LANGUAGE_CODES.has(last)) {
            const candidateBase = segments.slice(0, -1).join('.');
            if (nameSet.has(candidateBase)) {
                localized = true;
                lang = last;
                baseName = candidateBase;
            }
        }

        // Facets: present tokens, then `numbered` for names starting with a digit.
        const facets = FACET_TOKENS.filter((t) => segmentSet.has(t));
        if (/^[0-9]/.test(name)) facets.push('numbered');

        // Categories: direct lookup; localized variants inherit their base when
        // they have no direct mapping. Drop meta keys; empty array is allowed.
        let rawCategories = symbolCategories[name];
        if (rawCategories === undefined && localized) {
            rawCategories = symbolCategories[baseName];
        }
        const categories = Array.isArray(rawCategories) ? rawCategories.filter((key) => !META_CATEGORIES.has(key)) : [];

        // Assemble, omitting optional keys when not applicable to stay lean.
        const entry = { name };
        if (localized) {
            entry.localized = true;
            entry.lang = lang;
        }
        entry.facets = facets;
        entry.categories = categories;
        const since = sinceByName.get(name);
        if (since) entry.since = since;
        return entry;
    });

    // 6. Sort by name.
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    // 7. Browseable categories: those that appear on >=1 symbol, in plist order,
    //    minus meta keys. Append `uncategorized` if any symbol is unmapped.
    const usedCategoryKeys = new Set();
    let hasUncategorized = false;
    for (const entry of entries) {
        if (entry.categories.length === 0) hasUncategorized = true;
        for (const key of entry.categories) usedCategoryKeys.add(key);
    }
    const categories = categoriesList
        .filter((c) => !META_CATEGORIES.has(c.key) && usedCategoryKeys.has(c.key))
        .map((c) => ({ key: c.key, label: c.label }));
    if (hasUncategorized) {
        categories.push({ key: 'uncategorized', label: 'Uncategorized' });
    }

    // 8. Languages that actually appear, code -> label.
    const usedLanguages = new Set();
    for (const entry of entries) {
        if (entry.lang) usedLanguages.add(entry.lang);
    }
    const languages = {};
    for (const code of Object.keys(LANGUAGE_LABELS)) {
        if (usedLanguages.has(code)) languages[code] = LANGUAGE_LABELS[code];
    }

    // Emit.
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(resolve(OUT_DIR, 'manifest.json'), `${JSON.stringify(entries)}\n`);
    writeFileSync(resolve(OUT_DIR, 'categories.json'), `${JSON.stringify(categories, null, 2)}\n`);
    writeFileSync(resolve(OUT_DIR, 'languages.json'), `${JSON.stringify(languages, null, 2)}\n`);

    // 9. Verify + report.
    const localizedCount = entries.filter((e) => e.localized).length;
    const uncategorizedCount = entries.filter((e) => e.categories.length === 0).length;
    const withSince = entries.filter((e) => e.since).length;

    // Every entry must have a backing PNG (it was derived from the file list).
    let missingPng = 0;
    for (const entry of entries) {
        if (!nameSet.has(entry.name)) missingPng += 1;
    }

    console.log(`symbols (manifest length): ${entries.length}`);
    console.log(`localized variants:        ${localizedCount}`);
    console.log(`uncategorized symbols:     ${uncategorizedCount}`);
    console.log(`with since:                ${withSince}`);
    console.log(`browseable categories:     ${categories.length}`);
    console.log(`languages:                 ${Object.keys(languages).length}`);
    console.log(`entries missing a PNG:     ${missingPng}`);

    if (entries.length !== nameSet.size) {
        throw new Error(`manifest length ${entries.length} != PNG count ${nameSet.size}`);
    }
    if (missingPng !== 0) {
        throw new Error(`${missingPng} manifest entries have no backing PNG`);
    }
}

main();
