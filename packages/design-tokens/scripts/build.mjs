import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const REPO_ROOT = path.resolve(ROOT, '..', '..');
const IOS_GENERATED = path.join(REPO_ROOT, 'apps/ios/Sources/ios/Generated');
const ANDROID_GENERATED = path.join(REPO_ROOT, 'apps/android/app/src/main/kotlin/com/monorepotemplate/android/designsystem');
const ANDROID_KOTLIN_PACKAGE = 'com.monorepotemplate.android.designsystem';

// ---------- IO ----------

function readJson(relPath) {
    return JSON.parse(fs.readFileSync(path.join(SRC, relPath), 'utf8'));
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function writeFile(relPath, content) {
    const full = path.join(DIST, relPath);
    ensureDir(path.dirname(full));
    fs.writeFileSync(full, content);
    console.log(`  wrote ${path.relative(ROOT, full)}`);
}

function writeAbs(absPath, content) {
    ensureDir(path.dirname(absPath));
    fs.writeFileSync(absPath, content);
    console.log(`  wrote ${path.relative(REPO_ROOT, absPath)}`);
}

// ---------- Object utils ----------

function deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
        const a = out[key];
        const b = source[key];
        if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
            out[key] = deepMerge(a, b);
        } else {
            out[key] = b;
        }
    }
    return out;
}

function getByPath(obj, dotPath) {
    return dotPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// ---------- Reference resolution ----------

const REF_REGEX = /^\{([^}]+)\}$/;

function parseRef(str) {
    const match = str.match(REF_REGEX);
    if (!match) return null;
    const inner = match[1].trim();
    const slashIdx = inner.indexOf('/');
    if (slashIdx === -1) return { path: inner.trim(), alpha: null };
    const pathPart = inner.slice(0, slashIdx).trim();
    const alphaPart = inner.slice(slashIdx + 1).trim();
    const alpha = parseFloat(alphaPart);
    if (Number.isNaN(alpha)) throw new Error(`Invalid alpha in ref: ${str}`);
    return { path: pathPart, alpha };
}

function resolveRefs(value, ctx) {
    if (typeof value === 'string') {
        const ref = parseRef(value);
        if (!ref) return value;
        const resolved = getByPath(ctx, ref.path);
        if (resolved === undefined) throw new Error(`Unresolved ref: ${value} (path: ${ref.path})`);
        const deep = resolveRefs(resolved, ctx);
        if (ref.alpha === null) return deep;
        return applyAlphaToColor(deep, ref.alpha);
    }
    if (Array.isArray(value)) return value.map((v) => resolveRefs(v, ctx));
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = resolveRefs(v, ctx);
        return out;
    }
    return value;
}

function applyAlphaToColor(color, alpha) {
    if (color === 'transparent') return color;
    if (typeof color !== 'string') throw new Error(`Cannot apply alpha to non-color: ${JSON.stringify(color)}`);
    const parsed = parseOklch(color);
    if (!parsed) throw new Error(`Cannot apply alpha to color: ${color}`);
    return formatOklch({ ...parsed, A: alpha });
}

// ---------- OKLCH parsing / conversion ----------

const OKLCH_REGEX = /^oklch\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/;

function parseOklch(str) {
    const m = typeof str === 'string' ? str.match(OKLCH_REGEX) : null;
    if (!m) return null;
    const L = parseFloat(m[1]);
    const C = parseFloat(m[2]);
    const H = parseFloat(m[3]);
    let A = 1;
    if (m[4]) {
        A = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    }
    return { L, C, H, A };
}

function formatOklch({ L, C, H, A }) {
    const body = `${L} ${C} ${H}`;
    if (A === undefined || A === null || A >= 1) return `oklch(${body})`;
    return `oklch(${body} / ${Math.round(A * 100)}%)`;
}

function oklchToLinearRgb({ L, C, H }) {
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;

    const lc = l_ ** 3;
    const mc = m_ ** 3;
    const sc = s_ ** 3;

    return {
        r: 4.0767245293 * lc - 3.3072168827 * mc + 0.2307590544 * sc,
        g: -1.2681437731 * lc + 2.6093323231 * mc - 0.341134429 * sc,
        b: -0.0041119885 * lc - 0.7034763098 * mc + 1.7068625689 * sc,
    };
}

function linearToSrgb(x) {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function toHexByte(v) {
    return Math.max(0, Math.min(255, Math.round(v * 255)))
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
}

function oklchToHex(colorStr) {
    if (colorStr === 'transparent') return '#00000000';
    const parsed = parseOklch(colorStr);
    if (!parsed) {
        if (typeof colorStr === 'string' && colorStr.startsWith('#')) return colorStr.toUpperCase();
        throw new Error(`Cannot convert to hex: ${colorStr}`);
    }
    const lin = oklchToLinearRgb(parsed);
    const r = toHexByte(linearToSrgb(lin.r));
    const g = toHexByte(linearToSrgb(lin.g));
    const b = toHexByte(linearToSrgb(lin.b));
    const hex = `#${r}${g}${b}`;
    return parsed.A >= 1 ? hex : `${hex}${toHexByte(parsed.A)}`;
}

// ---------- String utils ----------

function camelToKebab(str) {
    return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function px(n) {
    return typeof n === 'number' ? `${n}px` : String(n);
}

function ms(n) {
    return typeof n === 'number' ? `${n}ms` : String(n);
}

function safeIdent(k) {
    const cleaned = String(k).replace(/[^a-zA-Z0-9]/g, '_');
    return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

function radiusKeyToName(k) {
    if (k === '2xl') return 'xl2';
    if (k === '3xl') return 'xl3';
    if (k === '4xl') return 'xl4';
    return k;
}

function swiftButtonSizeIdent(sizeName) {
    if (sizeName === 'default') return 'sizeDefault';
    return `size${sizeName[0].toUpperCase()}${sizeName.slice(1)}`;
}

// ---------- Load all sources ----------

function loadTokens() {
    const primitiveFiles = [
        'core/primitives.json',
        'core/spacing.json',
        'core/radius.json',
        'core/typography.json',
        'core/opacity.json',
        'core/shadow.json',
        'core/border.json',
        'core/motion.json',
        'core/templates.json',
        'core/palette.json',
    ];
    let primitives = {};
    for (const f of primitiveFiles) {
        primitives = deepMerge(primitives, readJson(f));
    }

    const activeTheme = primitives.activeTheme;
    if (!activeTheme) throw new Error('templates.json: missing "activeTheme"');
    const activeTemplate = primitives.templates?.[activeTheme];
    if (!activeTemplate) throw new Error(`templates.json: unknown activeTheme "${activeTheme}"`);
    console.log(`  theme: ${activeTemplate.name || activeTheme}`);
    primitives.template = activeTemplate;

    const lightRaw = readJson('themes/light.json');
    const darkRaw = readJson('themes/dark.json');
    const chartRaw = readJson('web-only/chart.json');
    const sidebarRaw = readJson('web-only/sidebar.json');
    const buttonRaw = readJson('components/button.json');
    const inputRaw = readJson('components/input.json');

    const baseCtx = { ...primitives };

    const light = resolveRefs(lightRaw, { ...baseCtx, ...lightRaw });
    const dark = resolveRefs(darkRaw, { ...baseCtx, ...darkRaw });
    const chart = resolveRefs(chartRaw, { ...baseCtx, ...chartRaw });
    const sidebar = resolveRefs(sidebarRaw, { ...baseCtx, ...sidebarRaw });
    const button = resolveRefs(buttonRaw, { ...baseCtx, ...buttonRaw });
    const input = resolveRefs(inputRaw, { ...baseCtx, ...inputRaw });

    return {
        primitives,
        light: light.theme,
        dark: dark.theme,
        chart: chart.chart,
        sidebar: sidebar.sidebar,
        button: button.button,
        input: input.input,
    };
}

// ---------- Web CSS ----------

function genWebCss(t) {
    const L = [];
    L.push('/* GENERATED FILE. Do not edit. Source: packages/design-tokens/src/ */');
    L.push('');
    L.push(':root {');

    for (const [k, v] of Object.entries(t.light)) {
        L.push(`  --${camelToKebab(k)}: ${v};`);
    }
    for (const [k, v] of Object.entries(t.chart.light)) {
        L.push(`  --chart-${k}: ${v};`);
    }
    for (const [k, v] of Object.entries(t.sidebar.light)) {
        L.push(`  --${camelToKebab(k)}: ${v};`);
    }

    L.push(`  --radius: ${t.primitives.radius.base / 16}rem;`);

    for (const [k, v] of Object.entries(t.primitives.spacing)) {
        L.push(`  --spacing-${k}: ${px(v)};`);
    }
    for (const [k, v] of Object.entries(t.primitives.radius)) {
        if (k === 'base') continue;
        L.push(`  --radius-${k}: ${px(v)};`);
    }
    for (const [k, v] of Object.entries(t.primitives.typography)) {
        L.push(`  --text-${k}-size: ${px(v.fontSize)};`);
        L.push(`  --text-${k}-line-height: ${px(v.lineHeight)};`);
        L.push(`  --text-${k}-weight: ${v.fontWeight};`);
    }
    for (const [k, v] of Object.entries(t.primitives.opacity)) {
        L.push(`  --opacity-${k}: ${v};`);
    }
    for (const [k, v] of Object.entries(t.primitives.border)) {
        L.push(`  --border-width-${k}: ${px(v)};`);
    }
    for (const [k, v] of Object.entries(t.primitives.duration)) {
        L.push(`  --duration-${k}: ${ms(v)};`);
    }
    for (const [k, v] of Object.entries(t.primitives.easing)) {
        L.push(`  --easing-${k}: ${v};`);
    }
    for (const [k, v] of Object.entries(t.primitives.shadow)) {
        const col = applyAlphaToColor(v.color, v.alpha);
        L.push(`  --shadow-${k}: ${v.offsetX}px ${v.offsetY}px ${v.blur}px ${v.spread}px ${col};`);
    }

    L.push('}');
    L.push('');
    L.push('.dark {');
    for (const [k, v] of Object.entries(t.dark)) {
        L.push(`  --${camelToKebab(k)}: ${v};`);
    }
    for (const [k, v] of Object.entries(t.chart.dark)) {
        L.push(`  --chart-${k}: ${v};`);
    }
    for (const [k, v] of Object.entries(t.sidebar.dark)) {
        L.push(`  --${camelToKebab(k)}: ${v};`);
    }
    L.push('}');
    L.push('');

    return L.join('\n');
}

// ---------- Web TS ----------

function genWebTs(t) {
    return `// GENERATED FILE. Do not edit. Source: packages/design-tokens/src/
export const tokens = ${JSON.stringify(t, null, 2)} as const;
export type Tokens = typeof tokens;
`;
}

// ---------- iOS Swift ----------

function genIosSwift(t) {
    const L = [];
    L.push('// GENERATED FILE. Do not edit. Source: packages/design-tokens/src/');
    L.push('');
    L.push('import Foundation');
    L.push('import CoreGraphics');
    L.push('');

    L.push('public enum DSColorLight {');
    for (const [k, v] of Object.entries(t.light)) {
        L.push(`    public static let ${k} = "${oklchToHex(v)}"`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSColorDark {');
    for (const [k, v] of Object.entries(t.dark)) {
        L.push(`    public static let ${k} = "${oklchToHex(v)}"`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSSpacing {');
    for (const [k, v] of Object.entries(t.primitives.spacing)) {
        L.push(`    public static let s${safeIdent(k)}: CGFloat = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSRadius {');
    for (const [k, v] of Object.entries(t.primitives.radius)) {
        L.push(`    public static let ${radiusKeyToName(k)}: CGFloat = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSFontSize {');
    for (const [k, v] of Object.entries(t.primitives.typography)) {
        L.push(`    public static let ${k}: CGFloat = ${v.fontSize}`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSLineHeight {');
    for (const [k, v] of Object.entries(t.primitives.typography)) {
        L.push(`    public static let ${k}: CGFloat = ${v.lineHeight}`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSFontWeight {');
    for (const [k, v] of Object.entries(t.primitives.typography)) {
        L.push(`    public static let ${k}: CGFloat = ${v.fontWeight}`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSOpacity {');
    for (const [k, v] of Object.entries(t.primitives.opacity)) {
        L.push(`    public static let ${k}: Double = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSBorderWidth {');
    for (const [k, v] of Object.entries(t.primitives.border)) {
        L.push(`    public static let ${k}: CGFloat = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSDuration {');
    for (const [k, v] of Object.entries(t.primitives.duration)) {
        L.push(`    public static let ${k}: Double = ${(v / 1000).toFixed(3)}`);
    }
    L.push('}');
    L.push('');

    L.push('public struct DSShadowSpec: Sendable {');
    L.push('    public let offsetX: CGFloat');
    L.push('    public let offsetY: CGFloat');
    L.push('    public let blur: CGFloat');
    L.push('    public let spread: CGFloat');
    L.push('    public let color: String');
    L.push('    public let alpha: Double');
    L.push('}');
    L.push('');
    L.push('public enum DSShadow {');
    for (const [k, v] of Object.entries(t.primitives.shadow)) {
        const colorHex = oklchToHex(v.color).slice(0, 7);
        L.push(
            `    public static let ${k} = DSShadowSpec(offsetX: ${v.offsetX}, offsetY: ${v.offsetY}, blur: ${v.blur}, spread: ${v.spread}, color: "${colorHex}", alpha: ${v.alpha})`,
        );
    }
    L.push('}');
    L.push('');

    L.push('public struct DSButtonSize: Sendable {');
    L.push('    public let height: CGFloat');
    L.push('    public let width: CGFloat?');
    L.push('    public let paddingX: CGFloat?');
    L.push('    public let fontSize: CGFloat?');
    L.push('}');
    L.push('');
    L.push('public enum DSButton {');
    L.push(`    public static let radius: CGFloat = ${t.button.radius}`);
    L.push(`    public static let iconGap: CGFloat = ${t.button.iconGap}`);
    L.push(`    public static let focusRingWidth: CGFloat = ${t.button.focusRingWidth}`);
    for (const [sizeName, spec] of Object.entries(t.button.sizes)) {
        const ident = swiftButtonSizeIdent(sizeName);
        const h = spec.height ?? '0';
        const w = spec.width == null ? 'nil' : spec.width;
        const px = spec.paddingX == null ? 'nil' : spec.paddingX;
        const fs = spec.fontSize == null ? 'nil' : spec.fontSize;
        L.push(`    public static let ${ident} = DSButtonSize(height: ${h}, width: ${w}, paddingX: ${px}, fontSize: ${fs})`);
    }
    L.push('}');
    L.push('');

    L.push('public enum DSInput {');
    for (const [k, v] of Object.entries(t.input)) {
        L.push(`    public static let ${k}: CGFloat = ${v}`);
    }
    L.push('}');
    L.push('');

    return L.join('\n');
}

// ---------- Android Kotlin ----------

function genAndroidKotlin(t) {
    const L = [];
    L.push('// GENERATED FILE. Do not edit. Source: packages/design-tokens/src/');
    L.push('');
    L.push(`package ${ANDROID_KOTLIN_PACKAGE}`);
    L.push('');

    L.push('object DSColorLight {');
    for (const [k, v] of Object.entries(t.light)) {
        L.push(`    const val ${k} = "${oklchToHex(v)}"`);
    }
    L.push('}');
    L.push('');

    L.push('object DSColorDark {');
    for (const [k, v] of Object.entries(t.dark)) {
        L.push(`    const val ${k} = "${oklchToHex(v)}"`);
    }
    L.push('}');
    L.push('');

    L.push('object DSSpacing {');
    for (const [k, v] of Object.entries(t.primitives.spacing)) {
        L.push(`    const val s${safeIdent(k)}: Int = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('object DSRadius {');
    for (const [k, v] of Object.entries(t.primitives.radius)) {
        L.push(`    const val ${radiusKeyToName(k)}: Int = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('object DSFontSize {');
    for (const [k, v] of Object.entries(t.primitives.typography)) {
        L.push(`    const val ${k}: Int = ${v.fontSize}`);
    }
    L.push('}');
    L.push('');

    L.push('object DSLineHeight {');
    for (const [k, v] of Object.entries(t.primitives.typography)) {
        L.push(`    const val ${k}: Int = ${v.lineHeight}`);
    }
    L.push('}');
    L.push('');

    L.push('object DSFontWeight {');
    for (const [k, v] of Object.entries(t.primitives.typography)) {
        L.push(`    const val ${k}: Int = ${v.fontWeight}`);
    }
    L.push('}');
    L.push('');

    L.push('object DSOpacity {');
    for (const [k, v] of Object.entries(t.primitives.opacity)) {
        L.push(`    const val ${k}: Float = ${v}f`);
    }
    L.push('}');
    L.push('');

    L.push('object DSBorderWidth {');
    for (const [k, v] of Object.entries(t.primitives.border)) {
        L.push(`    const val ${k}: Int = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('object DSDuration {');
    for (const [k, v] of Object.entries(t.primitives.duration)) {
        L.push(`    const val ${k}Ms: Int = ${v}`);
    }
    L.push('}');
    L.push('');

    L.push('data class DSShadowSpec(');
    L.push('    val offsetX: Int,');
    L.push('    val offsetY: Int,');
    L.push('    val blur: Int,');
    L.push('    val spread: Int,');
    L.push('    val color: String,');
    L.push('    val alpha: Float,');
    L.push(')');
    L.push('');
    L.push('object DSShadow {');
    for (const [k, v] of Object.entries(t.primitives.shadow)) {
        const colorHex = oklchToHex(v.color).slice(0, 7);
        L.push(`    val ${k} = DSShadowSpec(${v.offsetX}, ${v.offsetY}, ${v.blur}, ${v.spread}, "${colorHex}", ${v.alpha}f)`);
    }
    L.push('}');
    L.push('');

    L.push('object DSButton {');
    L.push(`    const val radius: Int = ${t.button.radius}`);
    L.push(`    const val iconGap: Int = ${t.button.iconGap}`);
    L.push(`    const val focusRingWidth: Int = ${t.button.focusRingWidth}`);
    L.push('}');
    L.push('');

    L.push('object DSInput {');
    for (const [k, v] of Object.entries(t.input)) {
        L.push(`    const val ${k}: Int = ${v}`);
    }
    L.push('}');
    L.push('');

    return L.join('\n');
}

// ---------- Main ----------

function main() {
    console.log('Building design tokens...');
    const tokens = loadTokens();

    ensureDir(DIST);
    const swiftOut = genIosSwift(tokens);
    const kotlinOut = genAndroidKotlin(tokens);

    writeFile('web/theme.css', genWebCss(tokens));
    writeFile('web/tokens.ts', genWebTs(tokens));
    writeFile('ios/DesignTokens.swift', swiftOut);
    writeFile('android/DesignTokens.kt', kotlinOut);

    writeAbs(path.join(IOS_GENERATED, 'DesignTokens.swift'), swiftOut);
    writeAbs(path.join(ANDROID_GENERATED, 'DesignTokens.kt'), kotlinOut);

    console.log('Done.');
}

main();
