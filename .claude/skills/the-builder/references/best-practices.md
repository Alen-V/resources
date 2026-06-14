# Best Practices

**Trigger:** Apply foundational code quality principles — SOLID, DRY, YAGNI, KISS, naming, function size, separation of concerns. Use on every code-writing task as a baseline check. Especially load when reviewing, refactoring, or making decisions about how to organize code at the file, function, or class level.

## The Floor, Not the Ceiling

Best practices are the minimum acceptable quality. They are not a goal — they are what you do before you think about anything else. Skipping them costs more later than applying them now.

## The Big Four Heuristics

### KISS — Keep It Simple

The simplest code that solves the problem wins. Simple beats clever every time. If a junior engineer needs explanation to read it, it's too clever.

- Boring code is good code
- A `for` loop is fine; you don't need a reduce-map-filter chain
- One return statement per function is a guideline, not a law — early returns improve clarity
- Don't import a library to do something a built-in does in 5 lines

### YAGNI — You Aren't Gonna Need It

Don't build for hypothetical needs. Build for present needs. Refactor when the future arrives.

- No "in case we ever need to switch databases" abstractions
- No configuration options for things that have one current value
- No abstract base classes for concepts that have one implementation
- Inherited abstractions are debt; earn them through repeated need (rule of three)

### DRY — Don't Repeat Yourself

But only when the repetition shares a *reason to change*.

- Two functions that *look* similar but evolve independently? Leave them duplicated.
- Two functions that encode the same business rule? Extract.
- Premature DRY couples code that has no reason to be coupled. The fix is harder than the duplication.

Rule: duplicate up to three times before extracting. By the third occurrence, you understand the shape.

### SOLID — Use with Skepticism

SOLID is helpful as a checklist, dangerous as a religion:

- **S**ingle Responsibility — One reason to change. Yes, mostly. But "reason" is fuzzy; don't split things you don't need to.
- **O**pen/Closed — Open for extension, closed for modification. Useful for plugin systems; over-applied to plain code.
- **L**iskov Substitution — Subtypes must be substitutable. Yes, always. (This one is just correctness.)
- **I**nterface Segregation — Many small interfaces beat one fat one. Yes, in typed languages where it costs little.
- **D**ependency Inversion — Depend on abstractions, not concretions. Useful at architectural seams; harmful when applied to every class.

Don't apply SOLID by reflex. Apply it where the system actually benefits.

## Naming

Names are the most-read part of code. Treat them as design:

- **Variables**: noun phrases. `userCount`, not `cnt`. `isLoggedIn`, not `flag`.
- **Functions**: verb phrases. `calculateTotal`, not `total`. Pure functions are nouns describing the result; mutating functions are imperatives.
- **Booleans**: predicate form. `isValid`, `hasPermission`, `canEdit`, `shouldRetry`.
- **Plurals for collections**: `users`, not `userList`. `userList` only if it's specifically a list vs another structure.
- **Avoid generic noise**: `data`, `info`, `manager`, `handler`, `helper`, `util`. If you can't name it more specifically, you don't understand it yet.
- **Length scales with scope**: `i` is fine in a 3-line loop; `userRepositoryFactory` is fine at module level.

Names lie when they go stale. When code changes, the name must change with it. Outdated names are worse than no names.

## Function Size

Small functions are easier to reason about — but the goal is clarity, not a line count.

Heuristics:
- A function that doesn't fit on one screen is probably doing two things
- A function name with "and" in it is two functions
- A function with more than 3-4 parameters is hiding a struct
- A function that requires comments to explain *what* it does (not *why*) needs a better name or to be split

Counter-heuristic: don't shred a sequential script into 20 one-line functions just to hit a metric. Reading 20 jumps to understand one process is worse than reading 60 lines top to bottom.

## Comments

Comments explain **why**, not what. The code shows what.

Good:
```python
# Retry up to 3 times because the upstream service has known transient failures
# under load; see incident postmortem 2024-07-15.
for attempt in range(3):
    ...
```

Bad:
```python
# Loop 3 times
for attempt in range(3):
    ...
```

Better than a comment: a clear name.

```python
TRANSIENT_FAILURE_RETRIES = 3  # See postmortem 2024-07-15
for attempt in range(TRANSIENT_FAILURE_RETRIES):
    ...
```

Delete comments that restate the code. They lie when the code changes.

## Code Organization

- **One concept per file** — A file is a unit of cohesion, not a unit of size. A 500-line file about one concept beats five 100-line files about a fragmented concept.
- **Imports at the top, sorted** — Stdlib, external, internal, types. Most languages have tools for this; use them.
- **Public surface at the top of the file** — Readers should see the exported API first, implementation details below.
- **Tests next to the code they test** — `foo.py` and `foo_test.py` in the same directory beats a parallel `tests/` tree.

## The Refactor Signal

Refactor when:
- You're about to add a feature and the current structure makes it hard
- You hit the same bug class twice in the same area
- A name is lying — what it does no longer matches what it's called
- A function or file has become unnavigable

Don't refactor when:
- It's not in the path of current work ("while I'm here" is how scope explodes)
- You don't have tests (refactor without tests is rewrite)
- It's purely aesthetic and the team disagrees on the aesthetic

## Code Review Checklist

When reviewing or finalizing code, run this pass:

1. **Names** — Do variable, function, and file names describe the current behavior?
2. **Size** — Any function over 50 lines or with >4 params? Justify or split.
3. **Duplication** — Is there shared logic that should extract? Or premature DRY that should split?
4. **Dependencies** — Anything imported that's not used? Anything used that should be a parameter?
5. **Error paths** — Does every error case have a defined behavior? (Cross-reference `error-handling.md`.)
6. **Comments** — Do remaining comments add information the code can't show?
7. **Dead code** — Removed all the commented-out blocks, unused branches, leftover prints.

## Hand-Offs

- Architectural decisions (where logic lives across modules) → `architecture.md`
- API contract design → `api-design.md`
- Performance optimization → `performance.md`
- Security review → `security.md`

This reference is the code-level floor. Other references handle higher-level decisions.
