# Error Handling

**Trigger:** Design error paths that fail fast on bugs, recover gracefully from transient failures, and surface useful information for operators and users — error types, retries with backoff, idempotency, structured logging, graceful degradation. Load whenever calling external services, writing async code, building APIs that other systems consume, or any code where things can go wrong.

## Two Categories of Failure

Every failure is one of these, and the right response differs:

- **Programmer errors** — bugs. Null where there shouldn't be null, invariant violated, impossible state. Response: crash loudly. Get a stack trace. Fix the bug.
- **Operational errors** — expected failures. Network timeout, third-party 503, validation failure, conflicting write. Response: handle gracefully. Retry, fall back, or surface a useful message.

Mixing these is the central mistake. Catching `Exception` everywhere and logging "something went wrong" hides bugs and gives users no recourse for operational failures.

## Fail Fast on Programmer Errors

When an assumption is violated, crash. Don't try to recover. Don't `try/catch` around it.

```python
# Bad — hides bugs
def process(order):
    try:
        return order.items[0].price
    except:
        return 0  # turns NoneType bugs into silent zeros

# Good — fails fast
def process(order):
    assert order.items, "order must have at least one item"
    return order.items[0].price
```

A crash with a stack trace is debuggable. A silent zero is not.

## Handle Operational Errors Specifically

For each operational failure, decide explicitly:

| Strategy | Use when |
|----------|----------|
| **Propagate** | The caller can do something useful with the error |
| **Retry** | The operation is idempotent and the failure is likely transient |
| **Fall back** | A degraded result is acceptable (cached value, default, partial data) |
| **Fail loudly** | The operation is critical and silence would cause worse damage |

Don't reach for `try/catch` reflexively. Pick a strategy.

## Retries: Idempotent + Backoff + Jitter

Retry only **idempotent** operations. Retrying a non-idempotent operation (a POST without idempotency keys) is how customers get charged twice.

When you retry:
- **Exponential backoff** — wait 1s, 2s, 4s, 8s, not 1s, 1s, 1s, 1s
- **Add jitter** — random offset prevents synchronized retry storms ("thundering herd")
- **Cap the attempts** — 3-5 retries usually; more rarely helps
- **Cap the total time** — total budget matters more than retry count

```python
import random
import time

def call_with_retry(fn, max_attempts=4, base_delay=1.0, max_delay=30.0):
    for attempt in range(max_attempts):
        try:
            return fn()
        except TransientError:
            if attempt == max_attempts - 1:
                raise
            delay = min(base_delay * (2 ** attempt), max_delay)
            jittered = delay * (0.5 + random.random())  # 50%-150% of delay
            time.sleep(jittered)
```

Don't retry on 4xx — the request itself is wrong; retrying won't fix it. Retry on 5xx and network errors only.

## Circuit Breakers

When a dependency is consistently failing, stop hammering it. Open the circuit, fail fast, periodically test for recovery.

States:
- **Closed** — calls flow through; failures counted
- **Open** — calls fail immediately without hitting the dependency
- **Half-open** — after a cooldown, allow one call; if it succeeds, close; if it fails, open again

Libraries: most languages have one (`opossum` in Node, `pybreaker` in Python, Resilience4j in JVM). Don't roll your own.

## Idempotency Keys

For operations a client might retry (payments, account creation, sending email), accept an `Idempotency-Key` header. Store the key and the response for some window. Return the stored response on retry.

Without idempotency, retries become bugs. With it, retries become safe.

## Structured Logging

Logs are queryable data, not prose. Every log line is structured:

```json
{
  "level": "error",
  "msg": "payment failed",
  "request_id": "req_abc123",
  "user_id": "usr_456",
  "amount": 1999,
  "currency": "USD",
  "provider": "stripe",
  "provider_error_code": "card_declined",
  "duration_ms": 832
}
```

Not:
```
ERROR: Payment failed for user 456 with amount 1999 USD — Stripe returned card_declined after 832ms
```

The structured version is grep-able, aggregateable, alertable. The string is human-readable and machine-hostile.

**Always include**:
- `request_id` or `trace_id` — ties log lines to one operation
- `level` — at least error/warn/info/debug
- `msg` — short, stable string (don't interpolate variables into it)
- Domain context — user_id, order_id, whatever you'd want to filter on

**Never log**:
- Passwords, tokens, credit cards, full PII
- Entire request/response bodies in production (sample if you need them)
- High-cardinality data at INFO level (every URL with query params → log volume explosion)

## Error Envelope (for APIs)

Cross-reference `api-design.md`. Use a consistent shape:

```json
{
  "error": {
    "code": "stable_machine_string",
    "message": "Human-readable explanation.",
    "request_id": "req_abc123"
  }
}
```

The `request_id` shows up in the user's experience and in your logs. When the user files a ticket with the request_id, you find their failure in seconds.

## Graceful Degradation

When a dependency fails, the user should still get something useful:

- Recommendations service down → show curated defaults
- Search service down → fall back to category browse
- Avatar CDN down → show initials
- Analytics API down → drop the event silently (analytics is never user-blocking)

Decide in advance which dependencies are critical (the page can't render without them) and which are optional (the page renders without them). Optional dependencies should never block critical paths.

## What to Log, What to Alert On

- **Log** every meaningful state transition and every error path
- **Alert** on conditions that require human action

Alert criteria:
- Error rate exceeds threshold for X minutes
- Latency p99 exceeds budget
- A critical dependency is down
- A queue is backing up

Don't alert on every error — alerts that fire constantly get ignored. Alert on patterns; log everything.

## Output Format

When designing error handling for a feature:

1. **List the failure modes** — what can go wrong at each external boundary
2. **Categorize each** — programmer error or operational?
3. **Choose a strategy** per operational failure — propagate, retry, fall back, fail loud
4. **Define the error envelope** if it's an API
5. **Identify the logs** that need to exist at each path
6. **Identify the alerts** that should exist on aggregate failure

## Hand-Offs

- Choosing data stores or topology → `system-design.md`
- API contract design → `api-design.md`
- Test coverage of error paths → `testing.md`
