# Architecture

**Trigger:** Choose and apply the right architectural pattern — layering, module boundaries, dependency direction, MVC, hexagonal, clean architecture, event-driven, vertical slice, monolith vs microservices. Load whenever structuring a new codebase, refactoring an existing one, splitting a service, or deciding where logic lives, how layers talk to each other, or what depends on what.

## The First Question

Before reaching for a pattern, ask: **what is this codebase optimizing for?**

- **Iteration speed** (early product, demand testing) → minimum viable structure
- **Correctness under load** (financial, healthcare) → strong layering, explicit boundaries
- **Team scale** → clear module ownership, low coupling
- **Long-term maintainability** → loose coupling to frameworks, pure domain at the core
- **Vendor flexibility** → ports-and-adapters / hexagonal

The pattern is not the goal. The pattern is the tool. Pick the simplest pattern that buys what you actually need.

## The Spectrum: Simple to Complex

```
Script → Layered (MVC/N-tier) → Vertical Slice → Hexagonal → Clean → Event-Driven → Microservices
←  faster to ship                                                easier to evolve at scale  →
```

Bias: pick one notch left of where you think you should be. You can refactor toward more structure; you rarely refactor toward less.

## Pattern: Script / Single-File

For prototypes, demand tests, scripts under ~500 lines. One file. No layers. Move on when it becomes hard to navigate.

## Pattern: Layered (N-Tier, MVC)

Default for most web apps. Organized by technical role:

```
controllers/    ← HTTP, routing
services/       ← business logic
repositories/   ← data access
models/         ← data shapes
```

Dependency direction: top down only. Controllers call services, services call repositories. Never reverse.

**When it breaks**: business logic gets fat and starts depending on infrastructure. The "service" layer becomes a swamp.

## Pattern: Vertical Slice

Organized by feature, not technical role:

```
features/
  checkout/
    routes.ts, service.ts, repository.ts, types.ts
  user-profile/
    routes.ts, service.ts, repository.ts, types.ts
```

Excellent when features have low coupling. Extract shared code into `shared/` ruthlessly — premature sharing is worse than duplication.

## Pattern: Hexagonal (Ports and Adapters)

Domain at center. Everything else plugs in.

```
HTTP adapter ──→ │ Domain │ ←── DB adapter
CLI adapter  ──→ │  Core  │ ←── Email adapter
```

- **Ports** are interfaces the domain defines
- **Adapters** implement the ports
- **Domain** depends on nothing external

**When it fits**: multi-channel input, vendor flexibility, deep business rules.
**When it breaks**: small CRUD apps — ceremony exceeds benefit.

## Pattern: Clean Architecture

Hexagonal with stricter concentric rings:

```
Frameworks → Adapters → Use Cases → Entities
```

Dependencies point only inward. Use cases know nothing of HTTP. Entities know nothing of use cases.

**When it fits**: large, long-lived domains with rich business rules.
**When it breaks**: most product work — the indirection cost is real.

## Pattern: Event-Driven

Components communicate by publishing/subscribing to events.

**When it fits**: fan-out workflows, loose coupling, async-by-nature workloads, audit trails.
**When it breaks**: strong consistency requirements, workflows you need to reason about end-to-end, small teams without observability.

Hidden cost: **observability debt**. Without distributed tracing, structured logs, and event replay, you've traded readable code for unreadable production.

## Pattern: Monolith vs Microservices

Default: **modular monolith** — one deployable, strict internal module boundaries.

Split into microservices only when at least two are true:

1. Independent scaling needs
2. Independent deploy cadence
3. Different runtime constraints
4. Real organizational scale
5. Failure isolation matters more than coordination cost

If only one is true, you're paying microservice tax for monolith benefits. Microservices add network calls, distributed transactions you can't have, eventual consistency, service discovery, observability, deployment pipelines, on-call complexity, and a new class of bugs.

## Dependency Direction: The One Rule

**Dependencies point toward the stable, away from the volatile.**

- The domain is stable. Everything points toward it.
- Frameworks, databases, vendors, UIs are volatile.
- Importing a framework class into domain logic couples stable to volatile. That's the bug.

In practice:
- Domain models don't import ORM decorators
- Business logic doesn't accept HTTP request objects
- Use cases don't return framework response objects
- The DB schema is not the domain model

## Choosing Module Boundaries

A good boundary has: high cohesion inside, low coupling outside, stable public surface, one reason to change.

Common mistakes:
- Boundary by technical role at scale → split by feature
- Boundary by entity when the entity isn't a real bounded context → split by use case
- Boundary by team when the team doesn't own a coherent concept → fragmentation

DDD's "bounded context" is the right unit: a slice of the business where the same words mean the same things.

## Refactoring Toward Better Architecture

Don't rewrite. Refactor incrementally:

1. Find the seams
2. Extract interfaces at the seams
3. Move one feature behind the interface; verify
4. Repeat over weeks

Strangler fig: new code goes behind the new structure; old code migrates piece by piece.

## Output Format

1. Restate the problem and goals
2. Recommend a pattern (one paragraph justification)
3. Sketch the structure (concrete folder layout or diagram)
4. Show dependency direction
5. Identify boundaries — where modules split and what crosses
6. Trade-offs — what this costs, what the alternative would have cost
7. Migration path (if refactoring) — concrete first three steps

## Hand-Offs

- Capacity, scaling, failure modes → `system-design.md`
- API contracts → `api-design.md`
- Schemas → `data-modeling.md`
- Code-level patterns → `best-practices.md`
