// symbols:sync — copy SF Symbol PNGs into the web app's public dir so Next.js
// can serve them as static files. Runs on any OS (no plutil/macOS dependency),
// wired into predev/prebuild after tokens:build. The destination is gitignored.
//
// Idempotent: a file is skipped when the destination already exists with the
// same byte size, so repeated builds only copy what actually changed.

import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..', '..', '..');
const srcDir = join(repoRoot, 'packages', 'icons');
const destDir = join(repoRoot, 'apps', 'web', 'public', 'ios-symbols');

mkdirSync(destDir, { recursive: true });

const pngs = readdirSync(srcDir).filter((file) => file.endsWith('.png'));

let copied = 0;
let skipped = 0;

for (const file of pngs) {
    const src = join(srcDir, file);
    const dest = join(destDir, file);

    let destSize = -1;
    try {
        destSize = statSync(dest).size;
    } catch {
        // Destination missing — fall through to copy.
    }

    if (destSize === statSync(src).size) {
        skipped += 1;
        continue;
    }

    copyFileSync(src, dest);
    copied += 1;
}

console.log(`symbols:sync — ${copied} copied, ${skipped} skipped (${pngs.length} total) → ${destDir}`);
