# Testing

**Trigger:** Design and write tests that catch real bugs without slowing development — pyramid strategy, what to mock vs what to keep real, unit vs integration vs end-to-end, test naming, TDD vs not. Load whenever writing tests, deciding what to test, refactoring tests, or asking about coverage.

## The Pyramid (Still Correct)

Many small unit tests. Fewer integration tests. A small number of end-to-end tests.

```
        ╱  E2E  ╲       ← Few, slow, brittle, high-value
       ╱─────────╲
      ╱Integration╲     ← Some, real components, real DB
     ╱─────────────╲
    ╱    Unit       ╲   ← Many, fast, isolated
   ╱─────────────────╲
```

Inverting the pyramid (mostly E2E) produces slow suites that flake. Squashing it (only units, no integration) produces green tests over broken systems.

Targets, not rules:
- Unit: <1 ms each, run in parallel, no I/O
- Integration: hits a real DB, a real queue, in-process or in a container
- E2E: spans the whole system, including the UI

## Test Behavior, Not Implementation

The test calls the function and checks the result. It does not check that the function called five other functions in a specific order.

Bad (tests implementation):
```ts
expect(spy).toHaveBeenCalledWith('users', expect.anything());
expect(spy).toHaveBeenCalledTimes(1);
```

Good (tests behavior):
```ts
const user = await createUser({ email: 'a@b.com' });
expect(user.id).toBeDefined();
expect(await findUser(user.id)).toEqual(user);
```

Implementation tests break on refactors that don't change behavior. They are negative-value tests.

## What to Mock, What to Keep Real

**Mock:**
- External services you don't control (third-party APIs, payment gateways, email providers)
- Non-determinism (current time, random values, network latency)
- Slow things in unit tests (databases, file I/O)

**Don't mock:**
- Your own code. If you're mocking your own modules to test another module, you're testing your mock, not the system.
- The database in integration tests. Use a real one (Postgres in a container, in-memory SQLite if the DB is just a detail and you don't depend on Postgres-specific behavior).
- The framework. Test against real Express, real React, real Rails.

When you have to mock your own code, that's a code smell — usually the modules are coupled badly. Fix the design.

## Arrange, Act, Assert

Every test has three parts, and they should be visually separated:

```ts
test('returns 404 when user not found', async () => {
  // Arrange
  const userId = 'does-not-exist';

  // Act
  const response = await request(app).get(`/users/${userId}`);

  // Assert
  expect(response.status).toBe(404);
});
```

Don't shuffle the three together. Don't assert in the middle. One concept per test.

## Test Names

Test names are documentation. Read them in a failure log and know what broke:

Bad:
```
test('users')
test('it works')
test('handles edge case')
```

Good:
```
test('returns 401 when authorization header is missing')
test('rejects negative amounts at the API boundary')
test('idempotently handles the same payment twice within 24 hours')
```

Pattern: "what is the input, what is the expected output (or behavior)". No "should" — every test is a "should." Drop it.

## What to Test

Test the things that, when broken, cause real harm:

- **Public APIs** of modules — what callers depend on
- **Business rules** — the logic that defines what your product does
- **Edge cases** at boundaries — empty inputs, max values, null/undefined, dates around DST, currencies, unicode
- **Error paths** — every catch block, every fallback, every retry path
- **Regression-worthy bugs** — once it bit you, write the test before fixing

Skip testing:
- Trivial getters and setters
- Generated code
- Third-party libraries (test your *usage*, not their behavior)
- Configuration

Coverage is a floor, not a target. 80% coverage of the wrong code is worse than 40% coverage of the right code.

## TDD: When It Helps

TDD shines when:
- The problem is unclear and the test forces you to define "done"
- You have a flaky bug; the test reproduces it before the fix
- The interface design matters (the test is the first consumer)

TDD slows you down when:
- You already know exactly what to type (UI plumbing, framework integration)
- The output is visual or subjective (no good assertion exists)
- You're exploring; you'll throw the code away

Use it where it helps. Don't religion-ize it.

## Flaky Tests

Flaky tests train people to ignore failures. That is worse than no tests.

When a test is flaky:
1. Reproduce it locally (run it 100 times)
2. Identify the source — race condition, time dependency, ordering dependency, external service
3. Fix the source (preferred) or quarantine the test (with a dated ticket to fix)

Never ignore a flake. Never re-run until green. That habit metastasizes.

## Output Format

When designing or reviewing a test plan:

1. **What's the unit of behavior** being tested?
2. **What layer** is appropriate (unit, integration, E2E)?
3. **What's mocked** and why? What's real?
4. **What edge cases** matter beyond the happy path?
5. **What's the failure message** going to say when it breaks?

## Hand-Offs

- Error-handling design → `error-handling.md`
- Performance benchmarks → `performance.md`
- Security testing → `security.md`
- Load testing / capacity → `system-design.md`
