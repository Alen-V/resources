# Performance

**Trigger:** Diagnose and improve performance — measure before optimizing, identify bottlenecks (N+1, render budgets, bundle size, blocking I/O), apply the right caching layer, avoid premature optimization. Load whenever the user reports slowness, asks how to make something faster, or is planning a launch where performance will matter. Do not optimize prematurely.

## The First Rule: Measure

You cannot optimize what you have not measured. Every "I bet the slow part is X" is wrong roughly half the time. Profile, then act.

Tools:
- **CPU/memory**: language-specific profilers (`py-spy`, `pprof`, Chrome DevTools Performance tab, Instruments)
- **Web frontend**: Lighthouse, WebPageTest, Chrome Performance and Coverage tabs
- **Backend latency**: structured logs with `duration_ms`, plus distributed tracing (OpenTelemetry, Datadog APM)
- **Database**: `EXPLAIN ANALYZE` (Postgres), slow query logs, pg_stat_statements

Profile in conditions close to production: production-sized data, production-like network, real builds (not dev mode). A dev-mode React bundle is 10× the size of a production build; benchmarking dev is benchmarking the wrong thing.

## The 80/20 Reality

Most slowness lives in 1-3 hot paths. Find them; optimize them; ignore everything else.

Optimization that doesn't move a measured metric is wasted effort. The win isn't in shaving microseconds off code that runs once; it's in fixing the query that runs on every page load.

## The Universal Bottlenecks

### N+1 Queries

The single most common backend perf bug. Looks like:

```python
# N+1
orders = Order.where(user_id=user.id)  # 1 query
for order in orders:
    items = order.items  # 1 query per order, N queries total
```

Fix: eager loading, joins, or batched fetches.

```python
# Eager loaded
orders = Order.where(user_id=user.id).preload('items')  # 1 query (or 2 with a JOIN)
```

Every ORM has a way. Learn yours. Watch query logs in development; surprise queries are the smell.

### Missing Indexes

A query that does a full table scan over a million rows is slow regardless of code quality.

`EXPLAIN ANALYZE` the query. If you see "Seq Scan" on a large table for a filtered query, you probably need an index. Cross-reference `data-modeling.md`.

### Blocking I/O on the Hot Path

Synchronous calls to external services in the request path multiply latency. A page that calls 5 services sequentially at 100ms each takes 500ms before code runs.

Fix: parallelize independent calls, async/await with `Promise.all` (or equivalents), or move to a background job if the result isn't user-blocking.

### Bundle Size (Frontend)

Every kilobyte of JavaScript is parsed, compiled, and executed on the user's device. Mobile devices on slow networks pay the most.

Diagnose:
- Run a bundle analyzer (webpack-bundle-analyzer, Vite's rollup-plugin-visualizer)
- Lighthouse will flag oversized JS

Fix:
- **Code splitting** at route boundaries (lazy-load routes)
- **Tree shaking** — ensure you're using ES modules and only importing what you use
- **Audit dependencies** — moment.js → date-fns or native Intl; lodash → individual imports; charting libraries → are you using 5% of the API?
- **Modern build targets** — shipping ES5 to evergreen browsers costs you 30%+

A 1 MB bundle is a code smell. A 3 MB bundle is broken.

### Render Performance (Frontend)

A page can have low bundle size and still feel slow. Look for:

- **Layout thrashing** — JS that reads layout then writes it then reads it again, forcing reflows
- **Long tasks** (>50 ms) blocking the main thread — break them up, use `requestIdleCallback`, or move to a Web Worker
- **Re-renders** in React — too-broad context, missing memoization where it matters (don't memoize everything; measure)
- **Images** — unsized images cause layout shift; oversized images waste bandwidth; missing `loading="lazy"` on below-the-fold images wastes connections

Web Vitals: Largest Contentful Paint (LCP) < 2.5s, Interaction to Next Paint (INP) < 200ms, Cumulative Layout Shift (CLS) < 0.1.

## Caching: After Fixing the Real Problem

Caching is the second-best fix. The best fix is making the underlying operation fast.

Cross-reference `system-design.md` (caching section). Quick rules:

- Don't cache to mask an N+1 — fix the N+1
- Don't cache to mask a missing index — add the index
- Cache because the operation is fundamentally expensive *and* repeated *and* tolerant of staleness
- Always specify an invalidation strategy

## Lazy Loading

Defer work until it's needed:

- **Images below the fold** — `loading="lazy"`
- **Routes** — code-split, load on navigation
- **Third-party scripts** — defer analytics, chat widgets, anything non-critical
- **Heavy components** — load on interaction, not on mount

But: don't lazy-load the hero image, the primary CTA, or anything in the LCP path. Lazy-loading the wrong thing makes perceived performance worse.

## Perceived vs Actual Performance

Users perceive performance based on:
- **First feedback** — did anything happen when I clicked?
- **First useful content** — can I start reading?
- **Time to interactive** — can I do anything?

A 1-second action that shows a spinner immediately feels faster than a 500ms action that shows nothing for 400ms then snaps. Optimize the *experience*, not just the wall-clock.

Patterns:
- Optimistic updates (cross-ref `state-management.md`)
- Skeleton screens beat spinners
- Stream content; render the page header while the body loads
- Show "Saving..." → "Saved ✓" — confirmation reduces anxiety even when work is fast

## Backend Optimization Order

When a request is slow, in order:
1. **Database queries** — most wins live here. EXPLAIN, index, restructure.
2. **External API calls** — parallelize, cache, batch, move to background.
3. **Computation** — profile; usually less than you'd think.
4. **Serialization** — only matters for very large payloads or very tight inner loops.

Don't optimize step 3 before fixing step 1.

## Frontend Optimization Order

1. **Initial bundle size** — fewer bytes to download and parse
2. **LCP element** — what does the user wait for? Speed it up.
3. **Render performance** — what blocks the main thread?
4. **Memory/leaks** — relevant for long-lived SPAs
5. **Animation smoothness** — last; only matters when the rest is good

## Output Format

When optimizing performance:

1. **Define the metric** — what are we improving (LCP, p99 latency, throughput)? What's the target?
2. **Measure baseline** — profile, capture numbers
3. **Identify the top bottleneck** — what dominates the time budget?
4. **Apply one fix** — change one thing
5. **Re-measure** — did the metric move?
6. **Decide**: ship the fix, revert, or iterate

Never ship "optimizations" without measuring before and after. Most of them don't help.

## Hand-Offs

- Architecture-level capacity decisions → `system-design.md`
- Test performance / flakiness → `testing.md`
- Security-related throttling → `security.md`
