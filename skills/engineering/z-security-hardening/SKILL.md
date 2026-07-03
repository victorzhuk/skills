---
name: z-security-hardening
description: Language-agnostic security hardening for code that touches untrusted input, auth, secrets, or external systems — threat-model first (trust boundaries, assets, STRIDE, abuse cases), then the non-negotiables (validate at boundaries, parameterize queries, encode output, hash passwords, security headers), plus SSRF allowlisting, supply-chain hygiene, and treating LLM output as untrusted input. Use when building or reviewing input handling, authn/authz, file uploads, webhooks, secrets management, or AI features, or when the user asks for a security review. Triggers on "threat model", "STRIDE", "SSRF", "prompt injection", "rate limiting", "secrets in git". Does not cover Go-specific hardening recipes; see [[z-go-security]].
---

# Security hardening

Treat every external input as hostile, every secret as sacred, every authorization check as mandatory. Security is a constraint on every line that touches user data, auth, or external systems — not a phase.

## Threat model first

Controls without a threat model are guesses. Five minutes before hardening:

1. **Map trust boundaries** — where untrusted data enters: HTTP requests, form fields, uploads, webhooks, third-party APIs, queues, and LLM output. Every boundary is attack surface.
2. **Name the assets** — what's worth stealing or breaking: credentials, PII, payment data, admin actions, money movement.
3. **Run STRIDE over each boundary** — Spoofing → authentication/signatures; Tampering → integrity checks, parameterized queries, TLS; Repudiation → audit logs of security events; Information disclosure → encryption, field allowlists, generic errors; Denial of service → rate limits, size caps, timeouts; Elevation of privilege → authorization checks, least privilege.
4. **Write abuse cases next to use cases** — "how would I misuse this?" becomes the first test.

Can't name the trust boundaries? Not ready to secure the feature — most breaches begin in design, not code.

## Always / ask / never

**Always (no exceptions):** validate all external input at the system boundary; parameterize every database query; encode output via the framework's auto-escaping; TLS for all external traffic; hash passwords with bcrypt/scrypt/argon2; security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options); httpOnly + secure + sameSite session cookies; dependency audit before release.

**Ask the user first:** new or changed auth flows; storing new categories of sensitive data; new external integrations; CORS changes; file-upload handlers; rate-limit changes; granting elevated roles.

**Never:** secrets in version control; sensitive data in logs; client-side validation as a security boundary; `eval`/`innerHTML` with user data; auth tokens in client-accessible storage; stack traces or internals in user-facing errors.

## Recurring patterns

- **Authorization, not just authentication** — every endpoint checks that *this* user may act on *this* resource (`ownerId` match, role check); 403 otherwise.
- **Schema validation at the boundary** — parse external input into a typed, validated shape (zod, JSON Schema, validator of the stack) before any business logic touches it; reject with 422 and field-level detail.
- **File uploads** — allowlist MIME types, cap size, never trust the extension; check magic bytes when it matters.
- **SSRF** — server fetching a user-influenced URL (webhooks, import-from-URL, previews) must allowlist scheme and host, resolve DNS and reject private/reserved ranges (cloud metadata `169.254.169.254` is the #1 target), and forbid redirects. DNS rebinding remains — for high-risk surfaces, pin the resolved IP or front with a filtering agent.
- **Rate limiting** — general API limit plus a much stricter one on auth endpoints.
- **Secrets** — only `.env.example` with placeholders is committed; real env files and key material are gitignored. A secret that ever reached a remote is compromised: rotate first, then purge history. Before committing: `git diff --cached | grep -iE 'password|secret|api_key|token'`.
- **Supply chain** — commit the lockfile, install with the locked command (`npm ci` etc.) in CI, review new dependencies (maintenance, downloads, postinstall scripts), watch for typosquats. Audit findings triage by severity × reachability: critical/high and reachable → fix now; dev-only or unreachable → scheduled; deferred fixes get a documented reason and review date.

## LLM features

An app calling an LLM inherits a new attack surface:

- **Model output is untrusted input.** Never pass it into `eval`, SQL, a shell, `innerHTML`, or a file path — parse defensively, validate against a schema, run only allowlisted actions.
- **Prompts can be hijacked.** Any untrusted text in the context can carry instructions; the system prompt is not a security boundary — enforce permissions in code.
- **Keep secrets and other users' data out of prompts** — anything in the context can be echoed back.
- **Constrain agent tools** — minimum scope, confirmation for destructive actions, validate every tool argument.
- **Bound consumption** — cap tokens, request rate, and loop depth.
- **Isolate retrieval data** — partition RAG embeddings per tenant; validate documents before indexing.

## Review

For a structured pass over an existing feature, work through [references/checklist.md](references/checklist.md) — auth, authz, input, data, infrastructure, supply chain, LLM.

## Do not

- Skip the threat model because "it's an internal tool" or "just a prototype" — internal tools get compromised and prototypes ship.
- Bolt security on later — retrofitting costs ten times more than building it in.
- Trust the framework to be secure by default without using its mechanisms correctly.
- Treat LLM output as "just text" — that text can be a SQL statement or a script tag.
- Expose why authentication failed, which fields exist, or internal errors.

## Verify

- No secrets in source or history; staged-diff grep is clean.
- Every protected endpoint checks both authentication and authorization.
- All external input crosses a validation schema before business logic.
- Dependency audit shows no reachable critical/high findings.
- Security headers present in responses; error bodies expose no internals.

see [[z-go-security]], [[z-go-http-client]], [[z-verify-before-done]]
