---
name: z-go-security
description: >
  Go security hardening — injection prevention, crypto, path traversal, secrets,
  timing safety, and race-free concurrency. Triggers on "sql injection",
  "exec.Command", "crypto/rand", "path traversal", "hardcoded secret", "race
  condition". Does not cover database query patterns; see [[z-go-sqlc]]. Does
  not cover config/secret loading; see [[z-go-env-v11]].
---

# Go Security

## Quick Reference

| Severity | Vulnerability | Fix |
|---|---|---|
| Critical | SQL injection | Parameterized queries — never concatenate |
| Critical | Command injection | `exec.Command(bin, arg1, arg2)` — never `bash -c` |
| Critical | Hardcoded secret | env var or secret manager — never in source |
| Critical | Ignoring crypto errors | always check; fail closed, never open |
| High | `math/rand` for tokens | `crypto/rand` — `math/rand` output is predictable |
| High | AES without GCM | GCM provides auth+encrypt; ECB/CBC do not |
| High | MD5/SHA1 for passwords | `bcrypt` (house default, cost 12) — fast hashes are brute-forceable; `argon2id` is a documented alternative |
| High | Path traversal | Go 1.24+: `os.Root`; pre-1.24: `filepath.IsLocal` + `filepath.Rel` |
| High | Secret `==` comparison | `crypto/subtle.ConstantTimeCompare` — `==` leaks timing |
| High | Race condition | `sync.Mutex` or channels; test with `-race` |
| High | Trusting client headers | `X-Forwarded-For`, `X-Is-Admin` are trivially forged |
| Medium | TLS misconfiguration | outbound clients: `tls.Config{MinVersion: tls.VersionTLS12}`; server-side TLS usually terminates at ingress |
| Medium | Detailed error to client | log detail server-side; return generic message |
| Medium | Binding `0.0.0.0` | bind to specific interface |

## Injection

**SQL** — parameterized always:

```go
// bad
db.QueryContext(ctx, "SELECT * FROM users WHERE id = '"+id+"'")

// good
db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", id)
```

**Command** — separate args, never shell interpolation:

```go
// bad — shell parses metacharacters
exec.Command("bash", "-c", "convert "+userInput)

// good
exec.Command("convert", userInput)
```

**HTML/template** — use `html/template`, never `text/template` for user-visible output.

## Cryptography

Random tokens — `crypto/rand` only:

```go
b := make([]byte, 32)
if _, err := rand.Read(b); err != nil {
    return fmt.Errorf("generate token: %w", err)
}
token := hex.EncodeToString(b)
```

Encryption — AES-GCM (authenticated):

```go
block, err := aes.NewCipher(key)   // key must be 16, 24, or 32 bytes
gcm, err := cipher.NewGCM(block)
nonce := make([]byte, gcm.NonceSize())
rand.Read(nonce)
ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
```

Password hashing:

```go
// bcrypt — house default, cost 12
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
if err != nil {
    return fmt.Errorf("hash password: %w", err)
}
err = bcrypt.CompareHashAndPassword(hash, []byte(password)) // nil on match

// argon2id — documented alternative, stronger against GPU cracking
hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
```

Constant-time comparison for secrets, tokens, and webhook checks —
`subtle.ConstantTimeCompare` is the default for any two values one of which
didn't come from your own HMAC computation:

```go
if subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
    return ErrUnauthorized
}
```

`hmac.Equal` is for the narrower case of comparing two already-computed HMAC
digests against each other (e.g. a signature you computed vs. one a provider
sent you) — not a general substitute for `ConstantTimeCompare`:

```go
if !hmac.Equal(computedDigest, receivedDigest) {
    return ErrInvalidSignature
}
```

## Path Traversal

Go 1.24+:

```go
root, err := os.OpenRoot("/var/uploads")
f, err := root.Open(userFilename)  // rejects ".." and absolute paths
```

Pre-1.24:

```go
clean := filepath.Join(root, userFilename)
rel, err := filepath.Rel(root, clean)
if err != nil || !filepath.IsLocal(rel) {
    return ErrForbidden
}
// do not use strings.HasPrefix — it's suffix-unsafe
```

## Secrets

Never commit credentials. Inject via env or secret manager:

```go
type Config struct {
    DBPassword string `env:"DB_PASSWORD,notEmpty"`
    APIKey     string `env:"API_KEY,notEmpty"`
}
```

Use `,notEmpty` not `,required` — required accepts empty strings (see [[z-go-env-v11]]).

## HTTP Security

Outbound HTTP clients: set `tls.Config{MinVersion: tls.VersionTLS12}` on the
`http.Transport`. Server-side, TLS usually terminates at the ingress/load
balancer in front of the service — a Go `http.Server` rarely needs its own
`tls.Config`; if it does terminate TLS directly, apply the same `MinVersion`
there. Regardless of where TLS terminates, always set the server's four
timeouts (`ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout`).
Set headers: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'self'`.
Rate-limit with `golang.org/x/time/rate`.

## Concurrency

Protect shared state with `sync.RWMutex` or channels; a race under auth logic can bypass authorization. Run `go test -race ./...` in CI — treat every race as high-severity.

## Error Handling

Log full detail server-side; return a generic message to the caller. Never swallow errors from `crypto/rand`, cipher operations, or TLS setup — always fail closed.

## Do not

- Use `math/rand` for anything security-relevant.
- Concatenate user input into SQL, shell commands, or file paths.
- Compare tokens or secrets with `==`.
- Use ECB or unauthenticated CBC encryption modes.
- Rely on `filepath.Clean` + `strings.HasPrefix` for path validation.
- Log passwords, tokens, or PII — scrub before passing to `slog`.
- Ignore errors from `crypto/rand`, cipher operations, or TLS setup.
- Trust client-supplied headers (`X-Forwarded-For`, `X-Is-Admin`) — verify server-side.
- Share secrets across environments — staging breach → production compromise.
- Roll your own crypto — use `crypto/aes` GCM and `golang.org/x/crypto/argon2`.

## Verify

```sh
# Known CVEs in dependencies — standalone CI step
go tool govulncheck ./...

# SAST + security linters — gosec runs as a golangci-lint linter, not standalone;
# enable it in .golangci.yml's linters list alongside bodyclose/errcheck/nilerr
golangci-lint run

# Race detector
go test -race ./...
```
