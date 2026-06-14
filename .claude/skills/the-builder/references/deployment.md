# Deployment

**Trigger:** Ship code to production safely and recover from failures fast — environments, CI/CD pipelines, feature flags, rollback strategy, database migrations, secrets handling at deploy time, blue-green and canary patterns. Load whenever setting up deploys, shipping a risky change, planning a rollout, or recovering from a bad release.

## The Goal

Deployment isn't "code reaches the server." Deployment is "users experience the new behavior, and you can undo it fast if it's wrong." Optimize for the second half.

## Environments

You need at least: **development**, **staging**, **production**.

Rules:
- **Configuration differs; code does not.** The same artifact promotes from staging to production. Don't rebuild for prod.
- **Staging mirrors production** in topology, config style, and data shape. Diverged staging is worse than no staging — it gives false confidence.
- **Secrets per environment** — never share secrets across environments. Compromised dev shouldn't compromise prod.
- **Production data does not flow downstream untransformed.** PII must be redacted, hashed, or fake before reaching dev.

Smaller teams often skip staging. That's a real trade-off; live with it deliberately, with strong feature-flag and rollback habits to compensate.

## CI/CD Baseline

Every project should have, from day one:

- **Continuous integration** — every PR runs tests, lints, type checks, security scans. If any fail, merging is blocked.
- **Continuous deployment** — merge to main triggers a deploy (to staging at minimum, to production with appropriate gating).
- **Reproducible builds** — same commit produces the same artifact every time. Pin language versions, dependency versions, base images.

This is a one-day investment that pays for itself in two weeks.

## Deploy Strategies

| Strategy | How | When |
|----------|-----|------|
| **Recreate** | Stop old, start new | Acceptable downtime; simple |
| **Rolling** | Replace instances one at a time | Default for stateless services |
| **Blue/Green** | Two full environments; switch traffic atomically | Instant rollback; doubles infra cost during deploy |
| **Canary** | Route small % of traffic to new version; monitor; ramp up | Risky changes at scale; needs real metrics |
| **Feature Flag** | Code ships dark; feature toggles on per user/cohort | Decouples deploy from release; the safest option |

For most services: rolling deploys + feature flags is the right baseline. Blue/green and canary earn their cost at higher scale or higher risk.

## Feature Flags

Feature flags decouple **deploying code** from **releasing functionality**. That decoupling is the single biggest deploy-safety improvement available.

Use feature flags for:
- Any change that affects user-visible behavior in a non-trivial way
- Risky refactors (run old and new paths in parallel; compare; cut over)
- Gradual rollouts (1% → 10% → 50% → 100%)
- Kill switches for new features (instant disable without a deploy)

Discipline:
- **Every flag has an owner and a removal date.** Stale flags are debt that compounds.
- **Default off in production until you've verified.**
- **Test both states in CI** — the off-state path must keep working.
- **Clean up after rollout.** A feature flag that's been 100% on for three months is dead code.

Tools: LaunchDarkly, Statsig, Unleash, or your own simple flags table for small projects.

## Rollback: The One Practice

The most important thing about a deploy is that you can undo it. Optimize for fast, safe rollback.

Rollback paths, in order of preference:
1. **Turn off the feature flag.** No deploy, no waiting. Instant.
2. **Deploy the previous artifact.** If your CI keeps recent builds, this is one click.
3. **Revert the commit and deploy main.** Slower; works if you have CI.
4. **Manually restore from backup.** This is what happens when 1-3 don't work; minutes-to-hours of pain.

Before any deploy, ask: how would I roll this back? If the answer involves a database migration that can't be reversed, slow down.

## Database Migrations Are Deploys

A schema change ships, then code that uses the schema ships. Or vice versa for removals. Never atomic-deploy schema + code that depend on each other.

The expand-contract pattern (cross-ref `data-modeling.md`):
1. **Expand** — add the new column/table, nullable. Deploy. (Old code still works.)
2. **Migrate data** — backfill in batches. Deploy.
3. **Switch code** — application uses new column. Deploy.
4. **Contract** — remove old column. Deploy.

Each step is independently deployable and revertable. The "let's just rename the column" PR is how you cause a 10-minute outage.

## Secrets at Deploy Time

Cross-reference `security.md` (secrets section). At deploy time specifically:

- Secrets injected via env vars or secret-manager references at startup
- Never baked into the image
- Never committed alongside config files
- Rotated regularly; rotation should not require a deploy

## Pre-Ship Checklist

Before shipping anything non-trivial:

1. **Tests pass in CI** — including the new ones
2. **Rollback plan defined** — specifically, which lever pulls back the change
3. **Feature flag in place** for any user-visible change with non-trivial risk
4. **Monitoring covers the change** — relevant metrics, error rates, latency
5. **Alerts updated** if new failure modes are introduced
6. **Documentation updated** — runbooks, README, API docs as relevant
7. **Migration plan** if there's a schema change — expand-contract, not atomic-rename
8. **On-call awareness** if the change is risky or out of hours

If any of these is "no" or "not sure," delay the ship.

## After Shipping

The deploy isn't done at "deploy succeeded." It's done after:

1. Health checks green
2. Key metrics within normal range (error rate, latency, throughput)
3. A spot-check of the changed behavior with a real user account
4. Any feature flag at the intended exposure level

If anything's off, roll back before debugging. You can debug at leisure on a healthy production.

## Incident Response

When production breaks:

1. **Stabilize first, diagnose second.** Roll back. Page the right people. Restore service.
2. **One incident commander.** Even on a small team, one person coordinates and others execute. Confusion costs minutes.
3. **Public status communication** — if customers are affected, tell them what you know and what you're doing.
4. **Write the postmortem** — what happened, what we did, what we'll change. Blameless. Action items with owners and dates.

The goal of the postmortem isn't to assign blame. It's to make the next failure less likely or less harmful.

## Output Format

When planning a deploy:

1. **What's changing** — code, schema, infra, config
2. **Risk level** — low/medium/high, with reasoning
3. **Strategy** — rolling/canary/feature-flag/blue-green
4. **Rollback path** — specifically how to undo, in seconds-to-minutes
5. **Monitoring** — what metrics will tell us if it went wrong
6. **Sequence** — order of operations (schema first? code first? both? when?)

## Hand-Offs

- Architectural decisions about what to deploy → `architecture.md`, `system-design.md`
- Application-level error handling → `error-handling.md`
- Security review of the changes → `security.md`
