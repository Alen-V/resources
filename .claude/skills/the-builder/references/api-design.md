# API Design

**Trigger:** Design HTTP APIs (REST, RPC, GraphQL) that are consistent, evolvable, and safe under retries — resource modeling, HTTP semantics, status codes, pagination, error envelopes, idempotency, versioning. Load whenever designing an endpoint, an API contract, integration between services, a webhook, or a public-facing API.

## Pick the Style Deliberately

- **REST** — default. Most consumers understand it. Excellent for resources with CRUD semantics. Caching is free.
- **RPC** (gRPC, JSON-RPC) — when the API is action-oriented rather than resource-oriented, when you control both sides, when you need typed contracts and high throughput.
- **GraphQL** — when consumers need flexible projections of a complex graph, when many clients with different needs hit the same backend. Comes with caching complexity and a new attack surface.

Default to REST. Move to RPC for internal service-to-service contracts where types matter. Move to GraphQL only when the flexibility benefit clearly exceeds the operational cost.

## Resource Modeling (REST)

URLs name resources (nouns), not actions (verbs):

```
GET    /users              ← list
POST   /users              ← create
GET    /users/{id}         ← read one
PATCH  /users/{id}         ← partial update
PUT    /users/{id}         ← full replace
DELETE /users/{id}         ← delete

GET    /users/{id}/orders  ← nested resource (one level deep, max)
```

Avoid:
- `/getUsers`, `/createUser` — verbs in URLs
- `/users/{id}/orders/{id}/items/{id}/...` — deep nesting; flatten with query params instead
- `/users/{id}/setActive` — actions; use `PATCH /users/{id}` with `{"active": true}`

When the operation genuinely isn't CRUD (e.g., `/payments/{id}/refund`), use a sub-resource that represents the action's *outcome* as a noun. RPC is fine too — pick consistency over purity.

## HTTP Status Codes That Matter

You don't need all 60. You need these:

| Code | Use for |
|------|---------|
| **200 OK** | Successful GET, PATCH, PUT |
| **201 Created** | Successful POST creating a resource (return Location header) |
| **202 Accepted** | Async work queued; not done yet |
| **204 No Content** | Successful DELETE or PUT with no body to return |
| **400 Bad Request** | Malformed request, validation error |
| **401 Unauthorized** | No or invalid credentials |
| **403 Forbidden** | Authenticated but not permitted |
| **404 Not Found** | Resource doesn't exist (or you're hiding existence from this caller) |
| **409 Conflict** | Request conflicts with current state (duplicate, version mismatch) |
| **422 Unprocessable Entity** | Syntactically valid but semantically wrong |
| **429 Too Many Requests** | Rate limited (include `Retry-After`) |
| **500 Internal Server Error** | Your bug |
| **502/503/504** | Upstream broken, service unavailable, upstream timeout |

Anti-pattern: 200 OK with `{"success": false}` in the body. Use the status code. That's what it's for.

## Error Envelope

Every error response uses the same shape. Pick one and never deviate:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Email is required.",
    "details": [
      { "field": "email", "issue": "required" }
    ],
    "request_id": "req_abc123"
  }
}
```

- `code` is a stable machine-readable string. Never change it; clients depend on it.
- `message` is human-readable, may change.
- `details` is optional structured information for client-side display.
- `request_id` lets the user reference the failure in support tickets.

## Pagination

Three options, pick one per endpoint:

- **Offset/limit** — simple, breaks under inserts, expensive at deep offsets. Fine for admin UIs and small datasets.
- **Cursor-based** — opaque cursor token, stable under inserts, supports forward and backward. Best for feeds and large datasets.
- **Keyset (seek)** — order by an indexed column, paginate using `WHERE created_at > $last`. Fast at any depth; harder to navigate non-sequentially.

Response shape for cursor-based:

```json
{
  "data": [ ... ],
  "page": {
    "next_cursor": "eyJpZCI6MTIzfQ==",
    "has_more": true
  }
}
```

Always indicate whether more results exist. Never make the client guess.

## Idempotency

Any unsafe operation a client might retry needs idempotency.

- `GET`, `PUT`, `DELETE` are idempotent by HTTP definition
- `POST` and `PATCH` are not — make them idempotent via an `Idempotency-Key` header

Server stores the key + response for some window (24h typical). Retry with the same key returns the stored response without re-executing.

Without idempotency keys, retries double-charge customers, double-send emails, and create duplicate records. Bake it in from day one for anything touching money or external side effects.

## Versioning

Pick one strategy and stick with it:

- **URL prefix** — `/v1/users`, `/v2/users`. Simplest. Best for big breaks.
- **Header** — `Accept: application/vnd.example.v2+json`. Cleaner URLs; harder to test in a browser.
- **No versioning, evolve in place** — additive changes only, never remove fields, document deprecations. Works only with disciplined consumers.

**Rules under any strategy:**
- Adding fields is safe; clients ignore unknown keys
- Removing or renaming fields is breaking — needs a new version
- Tightening validation is breaking; loosening is safe
- Document deprecations with a sunset date and a migration path

## Versioning Is Forever

You will live with your v1 longer than you expect. Design it like that.

## Output Format

When designing an API or endpoint:

1. **Resource(s) and their relationships** — what nouns are we modeling?
2. **Endpoint table** — method, path, purpose, status codes
3. **Request and response shapes** — concrete JSON for the happy path
4. **Error cases** — what can go wrong, what status, what code, what message
5. **Idempotency story** — how retries are handled
6. **Pagination** (if applicable) — which style and why
7. **Versioning posture** — current version, deprecation policy

## Hand-Offs

- Database schema → `data-modeling.md`
- Authorization rules → `security.md`
- Throughput/scaling → `system-design.md`
- Frontend consumption patterns → `state-management.md`
