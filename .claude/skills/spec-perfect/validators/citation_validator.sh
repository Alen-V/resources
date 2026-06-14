#!/usr/bin/env bash
# Citation validator — handles both greenfield and refactor branches
# (amendment P, two-pass design).
#
# Usage: bash citation_validator.sh <wisp-file>
#
# Greenfield: <CITATION src="path/to/doc.md#section-anchor">snippet</CITATION>
#   Pass 1: literal grep -F for snippet in the cited file.
#   Pass 2: matched offset must lie within the section identified by anchor.
#
# Refactor:   <CITATION src="path/to/file.ts:LINE">snippet</CITATION>
#   Pass 1: literal grep -F for snippet anywhere in the cited file.
#   Pass 2: snippet must appear at the cited line number (sed -n LINEp).
#
# Branch dispatch is mechanical: src ending in `:<digits>` → refactor;
# src containing `#` → greenfield; bare path → greenfield (no anchor scope
# enforced; pass-1 only).
#
# Exit codes:
#   0 — all citations passed both passes
#   1 — at least one citation failed
#   2 — usage / IO error

set -u

WISP="${1:-}"
if [[ -z "$WISP" ]]; then
    echo "usage: $0 <wisp-file>" >&2
    exit 2
fi
if [[ ! -f "$WISP" ]]; then
    echo "citation_validator: wisp file not found: $WISP" >&2
    exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FAIL_COUNT=0

# Canonical (symlink-resolved) repo root for path-containment checks.
# CR770 C3173183861: `src` is wisp content; canonicalize and reject any
# cited file that does not resolve under $REPO_ROOT.
REPO_ROOT_REAL="$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$REPO_ROOT" 2>/dev/null)"
if [[ -z "$REPO_ROOT_REAL" ]]; then
    echo "citation_validator: cannot canonicalize REPO_ROOT $REPO_ROOT" >&2
    exit 2
fi

# is_under_repo_root <abs_path> — exits 0 if the canonical form of
# <abs_path> equals or is a strict descendant of REPO_ROOT_REAL, else 1.
is_under_repo_root() {
    local candidate="$1"
    local real
    real="$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$candidate" 2>/dev/null)"
    if [[ -z "$real" ]]; then
        return 1
    fi
    if [[ "$real" == "$REPO_ROOT_REAL" || "$real" == "$REPO_ROOT_REAL"/* ]]; then
        return 0
    fi
    return 1
}

# section_bounds <file> <slug> → prints "<start_line> <end_line>" (inclusive),
# bounded by the next heading at the same-or-higher level. Empty if not found.
section_bounds() {
    local file="$1"
    local target_slug="$2"
    awk -v target="$target_slug" '
        /^#+ / {
            level = 0
            while (substr($0, level + 1, 1) == "#") level++
            heading = substr($0, level + 1)
            # strip leading whitespace + trailing whitespace
            sub(/^[ \t]+/, "", heading)
            sub(/[ \t]+$/, "", heading)

            slug = tolower(heading)
            gsub(/[^a-z0-9]+/, "-", slug)
            sub(/^-+/, "", slug)
            sub(/-+$/, "", slug)

            if (in_target && level <= start_level) {
                print start_line, NR - 1
                finished = 1
                exit
            }
            if (!in_target && slug == target) {
                start_line = NR
                start_level = level
                in_target = 1
            }
        }
        END {
            if (in_target && !finished) print start_line, NR
        }
    ' "$file"
}

# extract_citations → emits "src<TAB>snippet" lines. Snippets with embedded
# whitespace runs are normalized to single spaces (citations are written as
# inline content in the spec wisp).
extract_citations() {
    perl -0777 -e '
        my $content = do { local $/; <STDIN> };
        while ($content =~ m{<CITATION\s+src="([^"]+)">(.*?)</CITATION>}sg) {
            my ($src, $snippet) = ($1, $2);
            $snippet =~ s/\s+/ /g;
            $snippet =~ s/^\s+|\s+$//g;
            print "$src\t$snippet\n";
        }
    ' < "$WISP"
}

while IFS=$'\t' read -r src snippet; do
    [[ -z "$src" ]] && continue

    # Audit I4-F1: reject nested <CITATION> tags inside the snippet body.
    # The non-greedy extract regex captures up to the first </CITATION>,
    # so a payload of the form
    #   <CITATION src="real"><CITATION src="x">y</CITATION>middle</CITATION>
    # leaves `middle</CITATION>` outside any captured snippet — attacker
    # text would masquerade as validated wisp prose. Reject before
    # opening the cited file.
    if [[ "$snippet" == *"<CITATION"* ]]; then
        echo "FAIL: snippet contains a nested <CITATION> tag (rejected by structural rule): $src" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
        continue
    fi

    # Branch dispatch
    mode=""
    cited_path=""
    anchor=""
    line_number=""
    if [[ "$src" =~ ^(.+):([0-9]+)$ ]]; then
        # Refactor mode: path:LINE
        cited_path="${BASH_REMATCH[1]}"
        line_number="${BASH_REMATCH[2]}"
        mode="refactor"
    elif [[ "$src" == *"#"* ]]; then
        # Greenfield mode: path#anchor
        cited_path="${src%%#*}"
        anchor="${src##*#}"
        mode="greenfield"
    else
        # Bare path: pass-1 only
        cited_path="$src"
        mode="bare"
    fi

    if [[ "$cited_path" != /* ]]; then
        full_path="$REPO_ROOT/$cited_path"
    else
        full_path="$cited_path"
    fi

    if ! is_under_repo_root "$full_path"; then
        echo "FAIL: cited path resolves outside repo root: $cited_path" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
        continue
    fi

    if [[ ! -f "$full_path" ]]; then
        echo "FAIL: cited file does not exist: $cited_path" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
        continue
    fi

    # Pass 1: literal grep (all modes)
    if ! grep -qF -- "$snippet" "$full_path"; then
        echo "FAIL (pass-1): snippet not found in $cited_path" >&2
        echo "  snippet: $snippet" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
        continue
    fi

    # Pass 2: mode-specific scope check
    case "$mode" in
        greenfield)
            bounds=$(section_bounds "$full_path" "$anchor")
            if [[ -z "$bounds" ]]; then
                echo "FAIL (pass-2): anchor #$anchor not found in $cited_path" >&2
                FAIL_COUNT=$((FAIL_COUNT + 1))
                continue
            fi
            start_line="${bounds% *}"
            end_line="${bounds#* }"
            if ! sed -n "${start_line},${end_line}p" "$full_path" | grep -qF -- "$snippet"; then
                echo "FAIL (pass-2): snippet not in section #$anchor of $cited_path (lines $start_line-$end_line)" >&2
                echo "  snippet: $snippet" >&2
                FAIL_COUNT=$((FAIL_COUNT + 1))
                continue
            fi
            ;;
        refactor)
            cited_line=$(sed -n "${line_number}p" "$full_path")
            if ! grep -qF -- "$snippet" <<<"$cited_line"; then
                echo "FAIL (pass-2): snippet not at line $line_number of $cited_path" >&2
                echo "  expected: $snippet" >&2
                echo "  found at line $line_number: $cited_line" >&2
                FAIL_COUNT=$((FAIL_COUNT + 1))
                continue
            fi
            ;;
        bare)
            # No pass-2; pass-1 (grep -F) is the only check.
            ;;
    esac
done < <(extract_citations)

if [[ $FAIL_COUNT -ne 0 ]]; then
    echo "citation_validator: $FAIL_COUNT failure(s)" >&2
    exit 1
fi
exit 0
