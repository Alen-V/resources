// Doc-reader spawn predicate (amendment AJ — broadened from amendment T).
//
// Returns true when the bead description references any *.md file. The
// orchestrator uses this to decide whether to dispatch the doc_reader
// agent in parallel with R0. The predicate is a stated rule, not a
// heuristic — composes with Decision N (no magic).

const MD_REFERENCE_REGEX = /\b\w+\.md\b/i;

export const shouldSpawnDocReader = (description: string): boolean => {
    if (typeof description !== 'string' || description.length === 0) return false;
    return MD_REFERENCE_REGEX.test(description);
};
