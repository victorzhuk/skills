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

Apply Go-specific controls here. Use [[z-security-hardening]] for threat modeling, authorization boundaries, and LLM prompt-injection defenses.

## Quick Reference

| Severity | Vulnerability | Fix |
|---|---|---|
| Critical | SQL injection | Parameterized queries — never concatenate |
| Critical | Command injection | `exec.Command(bin, arg1, arg2)` — never `bash -c` |
| Critical | Hardcoded secret | env var or secret manager — never in source |
| Critical | Ignoring crypto errors | always check; fail closed, never open |
| High | `math/rand` for tokens | `crypto/rand` — `math/rand` output is predictable |
| High | AES without GCM | GCM provides auth+encrypt; ECB/CBC do not |
| High | Fast password hashes | Argon2id for new systems; preserve and migrate approved legacy bcrypt |
| High | Path traversal | Go 1.24+: `os.Root`; older Go: a vetted traversal-resistant open implementation |
| High | Secret `==` comparison | `crypto/subtle.ConstantTimeCompare` — `==` leaks timing |
| High | Race condition | `sync.Mutex` or channels; test with `-race` |
| High | Trusting client headers | `X-Forwarded-For`, `X-Is-Admin` are trivially forged |
| Medium | TLS misconfiguration | outbound clients: `tls.Config{MinVersion: tls.VersionTLS12}`; server-side TLS usually terminates at ingress |
| Medium | Detailed error to client | log safe diagnostic context; return generic message |
| Medium | Unintended network exposure | bind only where required and restrict ingress |

## Injection

**SQL** — parameterized always:

```go
// bad
db.QueryContext(ctx, "SELECT * FROM users WHERE id = '"+id+"'")

// good
db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", id)
```

**Command** — separate args, never shell interpolation. Also reject option injection: allowlist argument shapes and use an end-of-options delimiter only where the selected command supports it. Separate arguments alone do not make arbitrary input safe:

```go
// bad — shell parses metacharacters
exec.Command("bash", "-c", "convert "+userInput)

// avoids shell parsing; validate the argument shape separately
exec.Command("convert", userInput)
```

**HTML/template** — use `html/template`, reserve `text/template` for non-HTML output.

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
block, err := aes.NewCipher(key)
if err != nil {
    return nil, fmt.Errorf("create cipher: %w", err)
}
gcm, err := cipher.NewGCM(block)
if err != nil {
    return nil, fmt.Errorf("create gcm: %w", err)
}
nonce := make([]byte, gcm.NonceSize())
if _, err := rand.Read(nonce); err != nil {
    return nil, fmt.Errorf("create nonce: %w", err)
}
ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
```

Never reuse a GCM nonce with a key; rotate before the random-nonce bound of 2^32 messages per key. Go 1.24+ also offers [NewGCMWithRandomNonce](https://pkg.go.dev/crypto/cipher#NewGCMWithRandomNonce), which manages the nonce in the ciphertext.

Password hashing:

Prefer Argon2id for new password stores. Use a maintained password-storage implementation with random per-password salts, encoded parameters, and constant-time verification. Benchmark work factors under expected authentication load and bound concurrent hashing. Store the algorithm, salt, and parameters with each hash so verification and upgrades remain possible. Follow [OWASP's current parameter guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

For an existing bcrypt store, preserve compatibility and plan upgrades on successful authentication. Validate the 72-byte input limit without truncation; bytes are not characters. Choose the work factor from measured latency and capacity, with OWASP's minimum of 10. This example uses 12:

```go
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
if err != nil {
    return fmt.Errorf("hash password: %w", err)
}
err = bcrypt.CompareHashAndPassword(hash, []byte(password)) // nil on match
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

Use `os.Root` on Go 1.24+ to enforce containment during the open operation:

```go
root, err := os.OpenRoot(uploadDir)
if err != nil {
    return fmt.Errorf("open upload root: %w", err)
}
defer root.Close()
f, err := root.Open(userFilename)
if err != nil {
    return fmt.Errorf("open upload: %w", err)
}
defer f.Close()
```

Root rejects escapes through relative paths and symlinks; safe `..` traversal within the root is allowed. On older Go, use a vetted traversal-resistant open implementation or raise the minimum version. `filepath.IsLocal` and `filepath.Rel` only check names lexically; they cannot prevent symlink escapes. Resolve-then-open also races filesystem changes. See [Go's traversal-resistant file APIs](https://go.dev/blog/osroot).

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

Require verified TLS for sensitive connections. Set a minimum of TLS 1.2 or a stricter deployment policy; never disable certificate verification. Identify the actual TLS termination point and protect the hop behind it according to the trust boundary.

Set header and idle timeouts. Bound body reads and response writes for each endpoint. Ordinary endpoints can use `ReadTimeout` and `WriteTimeout`; uploads and streams need deliberate per-request limits. A short global write timeout can terminate a healthy stream. See [Go server deadlines](https://pkg.go.dev/net/http#Server) and [[z-go-llm-streaming]].

Limit inbound bodies before decoding, independently of `Content-Length`:

```go
r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
defer r.Body.Close()
```

Choose `maxRequestBytes` from the endpoint contract, handle `*http.MaxBytesError`, and reject oversize requests. Limit decompressed data separately when accepting compressed bodies. Set appropriate header limits and bound concurrent work. Apply rate limits per authenticated principal where possible; a process-local limiter does not enforce a fleet-wide quota.

For browser-facing responses, select CSP, framing, MIME-sniffing, and HSTS policies for the served content and TLS deployment. Do not copy a blanket policy into every API. For cookie-authenticated mutations, enforce CSRF protection. For outbound URLs, use the SSRF controls in [[z-go-http-client]].

## Concurrency

Protect shared state with `sync.RWMutex` or channels; a race under auth logic can bypass authorization. Run `timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./...` in CI — treat every race as high-severity.

## Error Handling

Log safe diagnostic context server-side; return a generic message to the caller. Error chains can contain credentials, URLs, or provider bodies: redact before logging. Never swallow errors from `crypto/rand`, cipher operations, or TLS setup — always fail closed.

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
govulncheck ./...

# SAST + security linters — gosec runs as a golangci-lint linter, not standalone;
# enable it in .golangci.yml's linters list alongside bodyclose/errcheck/nilerr
golangci-lint run

# Race detector
timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./...
```

Exercise rejected authorization, oversized bodies, path escapes, invalid signatures, and malformed password hashes at the changed boundary. For LLM features, verify tool authorization independently of the model's refusal text; see [[z-security-hardening]].
