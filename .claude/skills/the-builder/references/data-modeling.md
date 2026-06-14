# Data Modeling

**Trigger:** Design database schemas that are correct, performant, and evolvable — tables, columns, types, constraints, indexes, foreign keys, normalization decisions, soft-delete strategy, audit trails, migrations. Load whenever creating tables, designing a schema, planning indexes, writing migrations, or modeling a new domain in a database.

## Model the Domain, Not the Screen

The schema models the business. The screen is a projection. Build the schema to represent what the business *is*, not what one UI happens to display. UIs change weekly; schemas migrate over years.

If a column exists because "the dashboard needs it that way," redesign.

## Normalize First, Denormalize on Purpose

Start at 3rd Normal Form. Each fact lives in exactly one place. Joins are cheap on modern databases at typical app scale.

Denormalize when you have measured a problem:
- A specific read path is hot and the joins are slow
- The data is genuinely append-only and immutable (event logs, audit trails)
- You need to support analytics that hate joins (move to a warehouse, don't fight Postgres)

Denormalization is a sharp tool. Every duplicated value is a place data can go inconsistent.

## Types: Pick Correctly, Once

Wrong types are painful to migrate later. A few rules:

- **IDs**: `bigint` or `uuid`. Never `int` for anything user-facing — you'll hit the limit. `uuid` for IDs that leak to clients (no enumeration); `bigint` for internal sequences when ordering matters.
- **Money**: `numeric(p,s)` or integer cents. Never `float` or `double` — rounding errors compound.
- **Timestamps**: `timestamptz` (timestamp with timezone). Store UTC. Convert at the edges.
- **Booleans**: `boolean`, not `int` or `varchar('Y'/'N')`.
- **Enums**: a `text` column with a `CHECK` constraint, or a lookup table. Avoid native ENUM types in Postgres — adding values requires migration.
- **Free text**: `text`, not `varchar(n)`. There's no performance difference in Postgres; `varchar(n)` adds a constraint without value.
- **JSON**: `jsonb` (not `json`). Use it for genuinely schemaless data, not as a substitute for proper columns.

## Constraints Are Documentation

Every constraint is a fact the database enforces forever. Use them aggressively:

- **NOT NULL** on every column that shouldn't be null. The default should be `NOT NULL`; `NULL` is opt-in.
- **UNIQUE** on every column or set that should be unique. Application-level uniqueness is a race condition waiting to happen.
- **FOREIGN KEY** for every reference. Set `ON DELETE` behavior explicitly: `CASCADE`, `SET NULL`, or `RESTRICT`.
- **CHECK** for invariants the database can verify (positive amounts, valid status values, date ordering).

A nullable column without a reason for being nullable is a bug.

## Standard Columns

Every table gets, at minimum:

```sql
id           bigserial PRIMARY KEY  -- or uuid for externally-visible IDs
created_at   timestamptz NOT NULL DEFAULT now()
updated_at   timestamptz NOT NULL DEFAULT now()
```

When `updated_at` matters, set it via a trigger or an ORM hook — never trust application code to remember.

## Soft Delete: Mostly Don't

Soft deletes (`deleted_at` columns) sound responsible. They make every query messier, break uniqueness constraints, and rarely buy what people hoped for.

Use hard deletes by default. When you genuinely need to recover or audit deletions, use:
- **An audit log table** — a separate `events` or `audit_log` table that records what happened
- **A `_deleted_<table>` archive table** — move deleted rows out, don't poison the live table
- **Database backups + point-in-time recovery** — for true recovery

Reach for `deleted_at` only when undelete is a user-facing feature (trash bin), and even then, weigh it against an archive table.

## Audit Trails

When the business needs to know "who did what when":

- A dedicated audit table: `(id, actor_id, action, target_type, target_id, before, after, occurred_at, request_id)`
- Or domain events: `(id, aggregate_id, event_type, payload, occurred_at)` — better when the system already publishes events
- Capture at the boundary (controller or use case), not deep in the data layer where context is gone

Audit logs are append-only. Never `UPDATE` or `DELETE` rows in them.

## Indexes: Read Patterns Drive Them

Don't index by reflex. Index based on actual queries:

- Every foreign key gets an index (the FK constraint doesn't create one in most databases)
- Every column you `WHERE` on regularly
- Every column you `ORDER BY` regularly (sometimes combined with the WHERE columns into a composite index)
- The leftmost prefix of a composite index covers prefix queries; column order matters

Indexes cost: write performance, disk space, query planner complexity. Add them with intent.

**B-tree** is the default. Reach for **GIN** (full-text, JSONB containment), **BRIN** (very large append-only tables), or **GiST** (geometric/range) only when the use case fits.

## Migrations: Forward-Only, Reversible

Migrations apply in production. Therefore:

- **Always forward-only** — don't write down migrations; if you need to undo, write a new forward migration
- **Backwards-compatible deploys** — schema change ships first, code change ships after (or vice versa for removals). Never atomic-deploy schema + code that depend on each other.
- **Long migrations need care** — large tables: `ADD COLUMN NULL` (fast) then backfill in batches, never `ADD COLUMN DEFAULT 'x' NOT NULL` (rewrites the table). Same for index creation on large tables: use `CREATE INDEX CONCURRENTLY`.
- **Test on production-size data** — staging with 100 rows tells you nothing about how the migration runs on 100 million.

## Output Format

When designing or reviewing a schema:

1. **Tables** — name, purpose, columns with types and constraints
2. **Relationships** — foreign keys, cardinality
3. **Indexes** — which columns, why (which queries they serve)
4. **Standard columns** — confirmed (`id`, `created_at`, `updated_at`)
5. **Deletion strategy** — hard delete? archive table? audit log?
6. **Migration plan** — how to roll this out without locking the table
7. **Open questions** — anything ambiguous about cardinality, ownership, or lifecycle

## Hand-Offs

- Picking the database technology → `system-design.md`
- API contract over the data → `api-design.md`
- Caching strategy → `system-design.md` (caching section)
- ORM-level patterns → `best-practices.md`
