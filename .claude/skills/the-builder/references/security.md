# Security

**Trigger:** Apply baseline security practices to any user-facing or networked system — input validation, authentication vs authorization, secret management, OWASP top issues (injection, XSS, CSRF, broken access control), rate limiting, dependency hygiene. Load whenever shipping code that touches the internet, handles user input, stores secrets, manages identities, or accepts payments. Security is not optional and must not be bolted on after launch.

## The Floor

Security is not a feature. It's a precondition for shipping anything user-facing. The list below is the floor — not the ceiling, not optional.

## Assume Hostile Input

Every input from outside the trust boundary is hostile until proven otherwise. The trust boundary is your process — everything else (HTTP requests, query strings, cookies, headers, file uploads, environment variables, message-queue payloads) is suspect.

Validation rules:
- Validate at the boundary, where input enters the system
- Validate type, range, length, format, and *intent*
- Reject by default; allowlist what you accept, don't denylist what you don't
- Re-validate at every privileged boundary, not just the outermost

Never trust:
- Client-side validation (it's a UX hint, not a security measure)
- Hidden form fields ("the user can't see them")
- Headers like `X-Forwarded-For` unless a trusted proxy set them
- HTTP referer, user-agent, or any client-controllable field as authentication

## AuthN and AuthZ Are Different

**Authentication**: who are you?
**Authorization**: what are you allowed to do?

These get conflated in code. Separate them. After authentication, the user has an identity. Before any action, check authorization against that identity *for that action*.

Authorization patterns:
- **Role-based** — user has role X, role X can do Y. Simple, common, fine for most apps.
- **Attribute-based** — decisions based on attributes of the user, resource, and action. More flexible, more complex.
- **Policy-based** — explicit policies (Open Policy Agent, Cedar, etc.). Worth it when authz logic is complex enough to need its own DSL.

**Always check authz on the server.** Client-side checks are UI hints. The API endpoint must independently verify the user is allowed before performing the action.

## The Most Common Failures (OWASP, condensed)

### Broken Access Control

A user accesses data they shouldn't. Almost always: the API endpoint reads an ID from the URL and returns the data without checking the caller owns it.

```ts
// Insecure
app.get('/orders/:id', async (req, res) => {
  const order = await db.findOrder(req.params.id);
  res.json(order);
});

// Secure
app.get('/orders/:id', async (req, res) => {
  const order = await db.findOrder(req.params.id);
  if (order.userId !== req.user.id) {
    return res.status(404).send(); // 404, not 403 — don't reveal existence
  }
  res.json(order);
});
```

Test this with two users and a swapped ID. Every privileged endpoint.

### Injection (SQL, Command, LDAP, etc.)

Caused by concatenating untrusted input into a query or command.

Always use parameterized queries:
```python
# SQL injection
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# Parameterized
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```

For shell commands: avoid `shell=True`, pass args as a list, never concatenate.

### XSS (Cross-Site Scripting)

Caused by rendering untrusted input as HTML.

- Use a templating engine that escapes by default (most modern ones do)
- In React/Vue/Svelte: don't use `dangerouslySetInnerHTML` / `v-html` / `{@html}` on untrusted content
- If you must render user HTML, sanitize with a vetted library (DOMPurify), not regex

Set a strict Content Security Policy header. It's a second line of defense when escaping is missed.

### CSRF (Cross-Site Request Forgery)

A malicious site causes the user's browser to make an authenticated request to your site.

Defenses:
- `SameSite=Lax` or `SameSite=Strict` on session cookies (defaults in modern browsers, but verify)
- CSRF tokens on state-changing forms if you use cookie auth
- Don't accept GET for state-changing operations
- API tokens in headers (not cookies) sidestep CSRF entirely

### Insecure Deserialization

Deserializing untrusted data with formats that can carry executable references (Python pickle, Java serialization, PHP unserialize).

Use safe formats for untrusted input: JSON, MessagePack, Protocol Buffers. Reserve native serialization for trusted internal data.

## Secrets

Never:
- Commit secrets to git (even briefly; treat as compromised if you do)
- Log secrets (including tokens in URLs, Authorization headers, request bodies)
- Email or Slack secrets (especially to AI assistants)
- Hardcode secrets in client-side code

Always:
- Use a secret manager (Vault, AWS Secrets Manager, GCP Secret Manager, Doppler, 1Password CLI)
- Inject via environment at deploy time
- Rotate periodically (especially on team changes)
- Scope tokens to the minimum permissions needed

If a secret leaks, rotate it immediately. It is compromised regardless of who "saw" it.

## Authentication Implementation

Default: use a vetted library or service.

- Passwords: hash with Argon2id (or bcrypt as second choice). Never SHA-256 + salt — that's not what password hashing means.
- Sessions: cryptographically random IDs (≥128 bits), stored server-side or as signed cookies, marked `HttpOnly`, `Secure`, `SameSite=Lax`
- JWTs: fine for stateless APIs, but understand the trade-offs (no easy revocation, secret management matters, must validate algorithm — pin to one)
- MFA: TOTP at minimum; WebAuthn/passkeys preferred for new builds
- OAuth/OIDC: use a known provider (Auth0, Clerk, Supabase Auth, Cognito) unless you have specific reasons to roll your own

Rolling your own auth is the most common way teams ship a critical vulnerability.

## Rate Limiting

Every public endpoint needs a rate limit. Without one, you have:
- Credential stuffing on `/login`
- Enumeration on `/users/{id}` or `/forgot-password`
- Resource exhaustion on expensive endpoints
- Abuse of cost-driving endpoints (email sends, SMS, AI calls)

Implement per-IP and per-user limits. Return `429 Too Many Requests` with `Retry-After`. Use a real library or a gateway (Cloudflare, Nginx, API Gateway) — application-layer counters race-condition under load.

## Security Headers

The minimum for any HTTP service:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: [strict policy specific to your app]
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: [restrict what your app does not use]
```

Plus, for cookies: `Secure`, `HttpOnly`, `SameSite=Lax`.

## Dependency Hygiene

Most vulnerabilities ship in libraries you didn't write:

- Pin dependency versions (lockfiles)
- Run automated vulnerability scanning (`npm audit`, `pip-audit`, `cargo audit`, GitHub Dependabot, Snyk)
- Update regularly — old dependencies accumulate known CVEs
- Be cautious with new dependencies; each one is supply-chain surface area

Audit production dependencies more strictly than dev dependencies, but don't ignore either.

## Pre-Ship Security Checklist

Before shipping anything user-facing:

1. **Inputs validated at the boundary?** — Every endpoint, every parameter.
2. **Authentication required where needed?** — Public endpoints explicitly marked.
3. **Authorization checked for every privileged action?** — Especially fetches by ID.
4. **Parameterized queries everywhere?** — No string concatenation into SQL/shell.
5. **Output escaping on by default?** — No raw HTML rendering of user content.
6. **Secrets out of code and logs?** — Not even temporarily.
7. **Rate limits on public endpoints?** — Especially auth and expensive ones.
8. **Security headers set?** — HSTS, CSP, etc.
9. **Dependencies scanned?** — Recent audit passes.

## Hand-Offs

- Compliance frameworks (SOC2, HIPAA, PCI specifics) — need dedicated knowledge
- Cryptography implementation — use libraries, don't invent
- Penetration testing — distinct discipline
- Threat modeling at the architectural level — adjacent to `architecture.md`
