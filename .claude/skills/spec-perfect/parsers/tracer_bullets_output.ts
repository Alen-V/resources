// Tracer-bullet output schema validator (T5c).
// Per the spec wisp output schema additions in the design doc (tracer
// bullets amendment): the spec-perfect output's tracer_bullets[] field
// has a fixed shape that downstream TDD agents read to know which beads
// to claim.

export type TracerStatus = 'pending' | 'landed' | 'failed';

const VALID_STATUSES: ReadonlyArray<TracerStatus> = ['pending', 'landed', 'failed'];

export type TracerBullet = {
    tracer_id: string;
    red_bead: string;
    green_bead: string;
    depends_on: ReadonlyArray<string>;
    status: TracerStatus;
};

// ---------------------------------------------------------------------------
// BucketCEntry — bucket_c entry shape for the consolidator's OUTPUT_WISP.
//
// Separate from TracerBullet: TracerBullet is instantiated only for
// tracer-bullet specs; BucketCEntry is the shape for flat-GREEN specs
// that produce bucket_c entries (not TracerBullet entries). The stale
// opt_out_audit verdict bug (numanac-web-ngkg) fires for flat-GREEN specs,
// so verdict_against lives here, not on TracerBullet.
//
// verdict_against — provenance tag added by the Snapshot approach (BC-ngkg-1
// option b): when the consolidator snapshots the spec wisp text before Bucket
// A patches run (Step 3.5), any opt_out_audit verdict that was generated
// against that snapshot carries verdict_against: "pre-patch". Downstream TDD
// agents can tell whether the verdict evaluates the pre- or post-patch spec.
// ---------------------------------------------------------------------------

export type BucketCSeverity = 'BLOCKER' | 'IMPORTANT' | 'NIT';
export type VerdictAgainst = 'pre-patch' | 'post-patch';

const VALID_BUCKET_C_SEVERITIES: ReadonlyArray<BucketCSeverity> = ['BLOCKER', 'IMPORTANT', 'NIT'];
const VALID_VERDICT_AGAINST: ReadonlyArray<VerdictAgainst> = ['pre-patch', 'post-patch'];

export type BucketCEntry = {
    id: string;
    severity: BucketCSeverity;
    importance: number;
    question: string;
    options: ReadonlyArray<string>;
    recommendation: string;
    source_wisps: ReadonlyArray<string>;
    verdict_against?: VerdictAgainst;
};

/** Type guard that validates an unknown value as a well-formed BucketCEntry. */
export const isBucketCEntry = (v: unknown): v is BucketCEntry => {
    if (typeof v !== 'object' || v === null) return false;
    const e = v as Record<string, unknown>;
    if (typeof e.id !== 'string' || e.id.length === 0) return false;
    if (!VALID_BUCKET_C_SEVERITIES.includes(e.severity as BucketCSeverity)) return false;
    if (typeof e.importance !== 'number' || e.importance < 1 || e.importance > 10) return false;
    if (typeof e.question !== 'string') return false;
    if (!Array.isArray(e.options)) return false;
    if (typeof e.recommendation !== 'string') return false;
    if (!Array.isArray(e.source_wisps)) return false;
    if (e.verdict_against !== undefined && !VALID_VERDICT_AGAINST.includes(e.verdict_against as VerdictAgainst)) return false;
    return true;
};

// ---------------------------------------------------------------------------
// verifyVerdictAgainstSnapshot — Snapshot approach integrity helper.
//
// Asserts that each criterion name in failed_criteria is "resolvable" in the
// pre-patch snapshot text. "Resolvable" is defined as: the criterion token
// (e.g. "mechanical", "tiny-scope") appears as a substring of the snapshot.
//
// This is intentionally lenient: it checks presence, not semantic match.
// The goal is to surface stale references (entries that point to text Bucket A
// has since removed) rather than to re-run the full opt_out_audit logic.
//
// Returns:
//   { ok: true }                        — all references resolve (or list empty)
//   { ok: false, stale_criteria: [...] } — one or more criteria are absent
// ---------------------------------------------------------------------------

export type OptOutVerdict = {
    pass: boolean;
    failed_criteria: ReadonlyArray<string>;
    reasoning: string;
};

export type SnapshotVerifyResult =
    | { ok: true }
    | { ok: false; stale_criteria: ReadonlyArray<string> };

export const verifyVerdictAgainstSnapshot = (
    verdict: OptOutVerdict,
    snapshot: string,
): SnapshotVerifyResult => {
    if (verdict.failed_criteria.length === 0) return { ok: true };
    const stale = verdict.failed_criteria.filter((criterion) => !snapshot.includes(criterion));
    if (stale.length > 0) return { ok: false, stale_criteria: stale };
    return { ok: true };
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// parseSpecDrafterOutput — XML-tagged trailer parser (y3pj hard-cutover).
//
// Accepts ONLY the new <output_status>...</output_status> XML-wrapped form.
// Old bare-YAML-fenced trailers return null (BC1 hard-cutover decision).
//
// WRONG_BRANCH and FAILED are inline prose handled by orchestrator
// text-pattern-match — they are NOT wrapped in <output_status> (BC2).
// The parser returns null for those forms.
//
// LAST-MATCH strategy: uses a greedy [\s\S]* (not [\s\S]*?) to capture
// everything between the first <output_status> and the LAST </output_status>.
// This avoids false-matching when spec body prose discusses <output_status>
// (e.g. the y3pj spec itself contains example blocks).
//
// TRUNCATED sentinel: when <output_status> is present but </output_status>
// is absent (truncated emission), returns { status: 'TRUNCATED', raw: string }
// to aid debugging vs. "no trailer" null.
// ---------------------------------------------------------------------------

export type SpecDrafterOutputDrafted = {
    status: 'DRAFTED';
    spec_wisp_id: string;
    mode: string;
    verified_at: string;
    section_count: number;
    tracer_bullet_count: number;
    decisions_logged: number;
    warnings: string;
};

export type SpecDrafterOutputNeedsUserInput = {
    status: 'NEEDS_USER_INPUT';
    question: string;
    options: string;
};

export type SpecDrafterOutputTruncated = {
    status: 'TRUNCATED';
    raw: string;
};

export type SpecDrafterOutput =
    | SpecDrafterOutputDrafted
    | SpecDrafterOutputNeedsUserInput
    | SpecDrafterOutputTruncated;

/**
 * Extract a key-value pair from a flat YAML block (one key per line).
 * Returns the raw string value or undefined if the key is absent.
 */
const extractField = (block: string, key: string): string | undefined => {
    // Match "key: value" — value runs to end of line
    const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : undefined;
};

/**
 * Parse the body of a spec-drafter wisp and extract the structured output
 * from within the <output_status>...</output_status> XML envelope.
 *
 * Returns:
 *   SpecDrafterOutput — when envelope found and status is recognised
 *   null              — when no <output_status> opening tag is present
 *                       (includes bare-fence legacy form, WRONG_BRANCH,
 *                        and FAILED inline prose)
 */
export const parseSpecDrafterOutput = (wispBody: string): SpecDrafterOutput | null => {
    if (!wispBody || wispBody.trim() === '') return null;

    const openTag = '<output_status>';
    const closeTag = '</output_status>';

    const openIdx = wispBody.indexOf(openTag);
    if (openIdx === -1) return null;

    // TRUNCATED: opening tag present but closing tag absent
    const closeIdx = wispBody.lastIndexOf(closeTag);
    if (closeIdx === -1 || closeIdx < openIdx) {
        // Everything after the LAST opening tag is the raw partial block
        const lastOpenIdx = wispBody.lastIndexOf(openTag);
        return {
            status: 'TRUNCATED',
            raw: wispBody.slice(lastOpenIdx + openTag.length).trim(),
        };
    }

    // LAST-MATCH: find the LAST </output_status> and the corresponding
    // <output_status> that precedes it. This ensures we capture the real
    // trailer at the end of the wisp, not a body-prose example.
    const lastCloseIdx = wispBody.lastIndexOf(closeTag);
    // Walk backwards from lastCloseIdx to find the matching opening tag
    const precedingText = wispBody.slice(0, lastCloseIdx);
    const matchingOpenIdx = precedingText.lastIndexOf(openTag);
    if (matchingOpenIdx === -1) {
        return { status: 'TRUNCATED', raw: wispBody.slice(openIdx + openTag.length).trim() };
    }

    const block = wispBody.slice(matchingOpenIdx + openTag.length, lastCloseIdx).trim();

    const status = extractField(block, 'status');
    if (!status) return null;

    if (status === 'DRAFTED') {
        return {
            status: 'DRAFTED',
            spec_wisp_id: extractField(block, 'spec_wisp_id') ?? '',
            mode: extractField(block, 'mode') ?? '',
            verified_at: extractField(block, 'verified_at') ?? '',
            section_count: parseInt(extractField(block, 'section_count') ?? '0', 10),
            tracer_bullet_count: parseInt(extractField(block, 'tracer_bullet_count') ?? '0', 10),
            decisions_logged: parseInt(extractField(block, 'decisions_logged') ?? '0', 10),
            warnings: extractField(block, 'warnings') ?? '[]',
        };
    }

    if (status === 'NEEDS_USER_INPUT') {
        return {
            status: 'NEEDS_USER_INPUT',
            question: extractField(block, 'question') ?? '',
            options: extractField(block, 'options') ?? '[]',
        };
    }

    // Unrecognised status inside <output_status> — treat as null
    return null;
};

const isTracerStatus = (s: unknown): s is TracerStatus => {
    return typeof s === 'string' && (VALID_STATUSES as ReadonlyArray<string>).includes(s);
};

const validateOne = (entry: unknown, idx: number): string | null => {
    if (typeof entry !== 'object' || entry === null) {
        return `entry ${idx}: must be an object`;
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.tracer_id !== 'string' || e.tracer_id.length === 0) {
        return `entry ${idx}: tracer_id (non-empty string) is required`;
    }
    if (typeof e.red_bead !== 'string' || e.red_bead.length === 0) {
        return `entry ${idx}: red_bead (non-empty string) is required`;
    }
    if (typeof e.green_bead !== 'string' || e.green_bead.length === 0) {
        return `entry ${idx}: green_bead (non-empty string) is required`;
    }
    if (!Array.isArray(e.depends_on)) {
        return `entry ${idx}: depends_on (string array) is required`;
    }
    for (const d of e.depends_on as unknown[]) {
        if (typeof d !== 'string') {
            return `entry ${idx}: depends_on must contain only strings`;
        }
    }
    if (!isTracerStatus(e.status)) {
        return `entry ${idx}: status must be one of ${VALID_STATUSES.join(' | ')}`;
    }
    return null;
};

export const validateTracerBulletsOutput = (entries: ReadonlyArray<unknown>): ValidationResult => {
    if (!Array.isArray(entries)) {
        return { ok: false, error: 'tracer_bullets must be an array' };
    }
    for (let i = 0; i < entries.length; i++) {
        const err = validateOne(entries[i], i);
        if (err) return { ok: false, error: err };
    }
    return { ok: true };
};
