# System Design

**Trigger:** Reason about system design at any scale — sizing, capacity, scaling axes, consistency vs availability trade-offs, caching, queueing, partitioning, failure modes. Load whenever a design decision affects how the system behaves under load, failure, or growth — including database choice, API throughput planning, sync vs async, caching layers, designing for failure, or estimating cost.

## The Core Move

Before designing anything, answer these in order. If you can't, the design is premature:

1. **What does the system do?** One sentence. Not features — the job.
2. **At what scale?** Concrete numbers: users, requests/sec, data volume, growth rate. Order-of-magnitude is enough.
3. **What are the read/write patterns?** Read-heavy? Write-heavy? Bursty? Steady? Real-time? Batch?
4. **What can break, and what happens when it does?** Failure is a feature requirement, not an afterthought.
5. **What's the budget?** Money, latency, team time. Designs that ignore budget aren't designs — they're wishlists.

State the answers to the user before sketching architecture. If any are missing or vague, ask. Don't paper over them with assumptions.

## Sizing: Numbers Beat Vibes

| Quantity | Useful anchor |
|----------|---------------|
| L1 cache reference | ~1 ns |
| Main memory reference | ~100 ns |
| SSD random read | ~100 µs |
| Network round-trip (same region) | ~1 ms |
| Network round-trip (cross-continent) | ~150 ms |
| Disk seek (HDD) | ~10 ms |
| 1 MB sequential read from SSD | ~1 ms |
| Single-row indexed DB query (cached) | <1 ms |
| Single-row indexed DB query (cold) | ~10 ms |

**Rule-of-thumb arithmetic:**
- 1M requests/day ≈ 12 req/sec (peak ≈ 3-5× average)
- 100 req/sec on a single modern server is comfortable for most CRUD work
- 10K req/sec needs horizontal scaling, caching, or both

When the user says "we'll have a million users," ask: concurrent? daily active? total signups? The answers differ by 100×.

## The Scaling Axes

Identify which axis is actually saturating before adding infrastructure:

- **Compute** — CPU-bound work. Scale horizontally or vertically.
- **Memory** — Working set doesn't fit in RAM. Vertical, or partition.
- **Storage** — Disk space. Cheap to scale; expensive to query.
- **Network bandwidth** — Egress costs, CDN strategy, payload size.
- **Database connections** — Often the silent ceiling. Pool, queue, or shard.
- **Concurrency** — Locks, transactions, queue depth. Adding servers doesn't help if they all wait on the same row.

Diagnose first. Scaling the wrong axis is expensive and useless.

## The Big Three Trade-Offs

**Consistency vs Availability** (CAP, practically)
- **Strong consistency** — financial transactions, inventory counts, anything where stale reads cause real damage.
- **Eventual consistency** — feeds, view counts, recommendations, most UGC.
- **Read-your-writes** — middle ground; users see their own writes immediately.

**Latency vs Throughput**
- **Latency-optimized** — sync, in-memory, dedicated resources, low queue depth.
- **Throughput-optimized** — batched, async, queued, shared resources.

**Cost vs Performance** — The cheapest design that meets the requirements is right. Design for 10× headroom, not 100×.

## Caching: When and Where

Reach for caching only when:
1. The same read happens many times
2. Data is expensive to fetch or compute
3. Slight staleness is acceptable
4. You have a clear invalidation strategy

| Layer | Use for | TTL |
|-------|---------|-----|
| Browser / client | Static assets, immutable resources | Long (`max-age=31536000, immutable`) |
| CDN | Public cacheable HTTP responses | Hours to days |
| Application in-memory | Hot config, computed values | Seconds to minutes |
| Distributed cache (Redis) | Shared hot data | Seconds to hours |
| DB query cache | Repeated identical queries | Often automatic |

Invalidation strategies (pick one explicitly): TTL-only, write-through, cache-aside, event-driven. Never cache without specifying invalidation.

## Synchronous vs Asynchronous

Default to synchronous. Move work to async only when:
- Work is genuinely slow (>1 sec) and the user doesn't need to wait
- Fire-and-forget (notifications, analytics, logging)
- You need to smooth load spikes
- You need retries with backoff
- You need fan-out

Async introduces: queues, workers, DLQs, idempotency requirements, eventual consistency, and a much bigger debugging surface. Pay the cost on purpose.

## Database Decisions

Start with PostgreSQL. Move off it only when you can articulate why:

- Need horizontal write scaling beyond partitioning → distributed SQL or document stores
- Need flexible schemas and the data is genuinely document-shaped → MongoDB
- Need sub-ms key lookups → Redis (primary or cache)
- Need full-text search at scale → Postgres FTS, then Elasticsearch/OpenSearch
- Need time-series → TimescaleDB, InfluxDB, ClickHouse
- Need analytics on huge datasets → ClickHouse, DuckDB, BigQuery, Snowflake

Polyglot persistence is operational debt. Resist until pain forces you.

## Designing for Failure

- **Blast radius** — For each external dependency: what breaks, what degrades, what survives?
- **Graceful degradation** — Recommendations fail → show defaults. Search fails → fall back to category.
- **Timeouts on every external call** — No exceptions.
- **Retries with exponential backoff and jitter** — Only for idempotent operations.
- **Circuit breakers** — Stop hammering a failing dependency.
- **Bulkheads** — Isolate failures. One slow tenant must not exhaust the pool.
- **Idempotency keys** — On any operation a client might retry.

For anything user-facing, ask: "What does the user see when this fails?" "An error page" is not an answer.

## Output Format

1. **Restate the problem** (one sentence)
2. **State the assumptions** (scale, read/write mix, latency budget, failure tolerance)
3. **Sketch the components** (data stores, services, queues, caches)
4. **Walk the critical paths** — read path and write path, end to end
5. **Call out the trade-offs** and what they cost
6. **Identify the next bottleneck** as scale increases
7. **Open questions** — what you need from the user to firm this up

## Hand-Offs

- Architectural patterns (MVC, hexagonal) → `architecture.md`
- API contracts → `api-design.md`
- Schema design → `data-modeling.md`
- Operational specifics → `deployment.md`
