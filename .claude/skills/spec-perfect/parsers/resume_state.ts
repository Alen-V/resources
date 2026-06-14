// Resume-state schema (T5c — amendment O + amendment AC).
//
// The skill's resume_state lives in a dedicated wisp with deterministic ID
// `<bead-id>-wisp-resume` (token order from amendment AC matches
// `bd purge --pattern '*-wisp-*'` so completed-bead resume wisps GC).
// Schema unchanged from Decision G; only the storage substrate changed.
//
// Security amendment (bead numanac-web-drbp): phaseName read from the resume
// wisp is a HINT only. The authoritative phase is derived from observed wisps
// via `derivePhaseFromWisps`. This raises the forgery cost: an attacker with
// bd-write access must fabricate all 5+ role wisps rather than just the resume
// wisp to bypass the pipeline. See: SKILL.md §"Resume protocol (amendment O + AC)".

export type PhaseName = 'triage' | 'r0' | 'r1' | 'consolidate' | 'output';

const VALID_PHASES: ReadonlyArray<PhaseName> = ['triage', 'r0', 'r1', 'consolidate', 'output'];

export type ResumeState = {
    skillVersion: string;
    phaseName: PhaseName;
    lastCommit: string;
    completedShardIds: ReadonlyArray<string>;
    deferredNits: ReadonlyArray<string>;
};

export const serializeResumeState = (state: ResumeState): string => {
    return JSON.stringify({
        skillVersion: state.skillVersion,
        phaseName: state.phaseName,
        lastCommit: state.lastCommit,
        completedShardIds: [...state.completedShardIds],
        deferredNits: [...state.deferredNits],
    });
};

const isPhaseName = (s: unknown): s is PhaseName => {
    return typeof s === 'string' && (VALID_PHASES as ReadonlyArray<string>).includes(s);
};

const asStringArray = (v: unknown, field: string): string[] => {
    if (!Array.isArray(v)) {
        throw new Error(`resume_state: ${field} must be an array of strings`);
    }
    for (const item of v) {
        if (typeof item !== 'string') {
            throw new Error(`resume_state: ${field} must contain only strings`);
        }
    }
    return v as string[];
};

export const parseResumeState = (json: string): ResumeState => {
    let raw: unknown;
    try {
        raw = JSON.parse(json);
    } catch (err) {
        throw new Error(`resume_state: invalid JSON: ${(err as Error).message}`);
    }
    if (typeof raw !== 'object' || raw === null) {
        throw new Error('resume_state: must parse to an object');
    }
    const obj = raw as Record<string, unknown>;

    if (typeof obj.skillVersion !== 'string') {
        throw new Error('resume_state: skillVersion (string) is required');
    }
    if (!isPhaseName(obj.phaseName)) {
        throw new Error(`resume_state: phaseName must be one of ${VALID_PHASES.join(' | ')}`);
    }
    if (typeof obj.lastCommit !== 'string') {
        throw new Error('resume_state: lastCommit (string) is required');
    }

    return {
        skillVersion: obj.skillVersion,
        phaseName: obj.phaseName,
        lastCommit: obj.lastCommit,
        completedShardIds: asStringArray(obj.completedShardIds, 'completedShardIds'),
        deferredNits: asStringArray(obj.deferredNits, 'deferredNits'),
    };
};

// Amendment AC: token order is `<id>-wisp-resume` so the
// `*-wisp-*` purge glob matches and resume wisps for closed beads GC.
export const resumeWispId = (beadId: string): string => `${beadId}-wisp-resume`;

// ---------------------------------------------------------------------------
// Wisp re-derivation — bead numanac-web-drbp (security amendment)
// ---------------------------------------------------------------------------

/**
 * ObservedWisp represents a wisp observed in bd for a given bead.
 *
 * The `slug` is the role suffix after `-wisp-` in the wisp ID, e.g. `r1-correctness`.
 * The **caller** is responsible for extracting it via `id.split('-wisp-')[1] ?? ''`
 * before constructing this array. Unit-test fixtures pre-populate the slug field directly.
 * See D3: `--wisp-type` values in bd do not cover spec-perfect role slugs, so the ID
 * token split is the intended mechanism.
 */
export type ObservedWisp = {
    id: string;
    slug: string;
};

/**
 * PhaseWispRequirement describes the required wisp slugs that must ALL be present in
 * observed wisps for a given phase to be considered complete.
 *
 * Optional wisps (`doc-decisions`, `opt-out-verdict`) are excluded per D7 — their
 * absence in normal runs must NOT stall phase derivation.
 */
export type PhaseWispRequirement = {
    phase: PhaseName;
    required: ReadonlyArray<string>;
};

/**
 * PHASE_WISP_REQUIREMENTS — canonical slug table for phase gate derivation.
 *
 * Walk order: triage → r0 → r1 → consolidate → output.
 * `derivePhaseFromWisps` returns the first phase whose required slugs are NOT all present
 * in the observed wisp set. Semantics: `required` lists the wisps that must exist to prove
 * we've moved PAST this phase. If any required slug is absent, this phase is the current one.
 *
 * Phase→required mapping (wisps needed to prove this phase is DONE):
 *   - triage: ['spec'] — triage is done when r0 has produced the spec wisp
 *   - r0: [] — r0 is a transient state between triage and r1; once spec appears we're in r1.
 *             (spec is accounted for by the triage entry; r0 always passes through.)
 *   - r1: ['r1-correctness', 'r1-completeness', 'r1-feasibility', 'r1-conventions'] — r1 is done
 *         when all 4 inspector wisps exist
 *   - consolidate: ['consolidated'] — consolidate is done when the consolidated wisp appears
 *   - output: [] — fallthrough; all prior requirements met → return 'output' from the function
 *
 * Optional wisps (`doc-decisions`, `opt-out-verdict`) are excluded per D7 — their
 * absence in normal runs must NOT stall phase derivation.
 */
export const PHASE_WISP_REQUIREMENTS: ReadonlyArray<PhaseWispRequirement> = [
    { phase: 'triage', required: ['spec'] },
    { phase: 'r0', required: [] },
    { phase: 'r1', required: ['r1-correctness', 'r1-completeness', 'r1-feasibility', 'r1-conventions'] },
    { phase: 'consolidate', required: ['consolidated'] },
    { phase: 'output', required: [] },
];

/**
 * derivePhaseFromWisps — re-derives the current phase from the set of observed wisps.
 *
 * Walks PHASE_WISP_REQUIREMENTS in canonical order and returns the first phase whose
 * required wisp slugs are NOT all present in `observed`. Returns 'output' if all
 * requirements are met.
 *
 * This function is bd-I/O-free — the caller (dispatcher) is responsible for constructing
 * the `observed` array by probing deterministic slug IDs via `bd show <bead-id>-wisp-<slug>`
 * for each slug in PHASE_WISP_REQUIREMENTS (strategy BC-1 option b).
 *
 * The result from this function overrides the `phaseName` hint from the resume wisp on
 * ALL resume reads (BC-2 option a — applies on both --re-perfect=true and mid-run
 * interrupted-run restarts).
 */
export const derivePhaseFromWisps = (_beadId: string, observed: ObservedWisp[]): PhaseName => {
    const observedSlugs = new Set(observed.map((w) => w.slug));
    for (const { phase, required } of PHASE_WISP_REQUIREMENTS) {
        const allPresent = required.every((slug) => observedSlugs.has(slug));
        if (!allPresent) {
            return phase;
        }
    }
    return 'output';
};

/**
 * ShardCrossCheckResult — result of validating completedShardIds against observed wisps.
 *
 * Named ShardCrossCheckResult to avoid collision with the ok-discriminated ValidationResult
 * convention in sibling parsers (per A12 / CV-3).
 */
export type ShardCrossCheckResult = {
    effective: string[];
    warnings: string[];
};

/**
 * validateCompletedShardIds — cross-checks each claimed shard ID against observed wisps.
 *
 * For each shard ID in `shardIds`:
 * 1. If the shard ID is not present in `observed` (by `id`), it is dropped and a warning
 *    is added.
 * 2. If the shard ID is present but its observed `slug` does not match the expected slug
 *    from `expectedSlugByShard`, it is dropped and a warning with slug mismatch detail is
 *    added.
 *
 * The `expectedSlugByShard` parameter maps shard ID → expected wisp role slug. This is
 * caller-supplied (D6) so the function remains a pure function decoupled from SKILL.md.
 *
 * Applies on ALL resume reads per BC-2 (not only --re-perfect=true).
 */
export const validateCompletedShardIds = (
    shardIds: readonly string[],
    observed: ObservedWisp[],
    expectedSlugByShard: Record<string, string>,
): ShardCrossCheckResult => {
    const observedById = new Map(observed.map((w) => [w.id, w]));
    const effective: string[] = [];
    const warnings: string[] = [];

    for (const shardId of shardIds) {
        const wisp = observedById.get(shardId);
        if (wisp === undefined) {
            warnings.push(`validateCompletedShardIds: shard ID "${shardId}" not found in observed wisps — dropped`);
            continue;
        }
        const expectedSlug = expectedSlugByShard[shardId];
        if (expectedSlug !== undefined && wisp.slug !== expectedSlug) {
            warnings.push(
                `validateCompletedShardIds: shard ID "${shardId}" slug mismatch — expected "${expectedSlug}", got "${wisp.slug}" — dropped`,
            );
            continue;
        }
        effective.push(shardId);
    }

    return { effective, warnings };
};
