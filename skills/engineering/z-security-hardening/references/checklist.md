# Security review checklist

Work through every section that applies to the touched surface. Each unchecked box is a finding, not a formality.

## Authentication

- [ ] Passwords hashed with bcrypt/scrypt/argon2 (work factor current, e.g. bcrypt cost ≥ 12)
- [ ] Session tokens httpOnly, secure, sameSite
- [ ] Login and token endpoints rate-limited
- [ ] Password-reset and verification tokens expire and are single-use

## Authorization

- [ ] Every endpoint checks permissions, not just identity
- [ ] Users can reach only their own resources (ownership/tenancy check)
- [ ] Admin actions verify the admin role server-side

## Input

- [ ] All external input validated against a schema at the boundary
- [ ] Database queries parameterized — no string concatenation
- [ ] HTML output encoded/escaped; no raw interpolation into markup
- [ ] File uploads: MIME allowlist, size cap, extension not trusted
- [ ] Server-side URL fetches allowlisted — scheme, host, resolved IP not private/reserved, redirects forbidden

## Data

- [ ] No secrets in code or version-control history
- [ ] Sensitive fields excluded from API responses (explicit public shape)
- [ ] Sensitive data absent from logs
- [ ] PII encrypted at rest where required

## Infrastructure

- [ ] Security headers configured (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] CORS restricted to known origins — no wildcard with credentials
- [ ] Error responses generic; stack traces never reach the client
- [ ] Rate limiting active, stricter on auth

## Supply chain

- [ ] Lockfile committed; CI installs with the locked command (`npm ci` or equivalent)
- [ ] Dependency audit run; critical/high findings fixed or documented with a review date
- [ ] New dependencies reviewed: maintenance, downloads, postinstall scripts, typosquat check

## AI / LLM (if used)

- [ ] Model output validated and encoded before use — never into eval/SQL/shell/innerHTML/file paths
- [ ] Secrets and cross-tenant data kept out of prompts
- [ ] Tool/agent permissions minimal; destructive actions require confirmation; tool arguments validated
- [ ] Token, rate, and loop-depth caps in place
- [ ] RAG stores partitioned per tenant; documents validated before indexing

---

Checklist adapted from addyosmani/agent-skills security-and-hardening (<https://github.com/addyosmani/agent-skills>, MIT).
