---
name: z-go-security
description: "Review Go-specific controls for commands, SQL, filesystem access, TLS, passwords, and HTTP limits. Use [[z-security-hardening]] for shared threat modeling and authorization policy."
---

# Go Security

Apply Go-specific controls here. Use [[z-security-hardening]] for threat modeling, authorization boundaries, and LLM prompt-injection defenses.

## Quick Reference

| Severity | Vulnerability | Fix |
|---|---|---|
| Critical | SQL injection | Parameterized queries — never concatenate |
| Critical | Command injection | `exec.Command(bin, arg1, arg2)` — never `bash -c` |
| Critical | Hardcoded secret | env var or secret manager — never in source |
| Critical | Ignored crypto error | Stop the operation on failure |
| High | `math/rand` for tokens | `crypto/rand` — `math/rand` output is predictable |
| High | Unauthenticated encryption | Use an approved authenticated mode such as GCM |
| High | Fast password hashes | Use Argon2id for new systems. Migrate existing bcrypt hashes on successful authentication. |
| High | Path traversal | Use `os.Root` on Go 1.24+ or a reviewed traversal-resistant open operation on older versions. |
| High | Secret `==` comparison | `crypto/subtle.ConstantTimeCompare` — `==` leaks timing |
| High | Data race | Synchronize access and exercise it with `-race` |
| High | Trusting client headers | `X-Forwarded-For`, `X-Is-Admin` are trivially forged |
| Medium | TLS misconfiguration | Set the required TLS version at the actual client or termination point |
| Medium | Sensitive client error | Return a generic message and log safe diagnostic context |
| Medium | Unintended network exposure | bind only where required and restrict ingress |

## Injection

**SQL** — parameterized always:

```go
// bad
db.QueryContext(ctx, "SELECT * FROM users WHERE id = '"+id+"'")

// good
db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", id)
```

Pass command arguments separately. Check option-like input. Use an end-of-options delimiter only for a command that supports it.

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

Use a unique nonce for each GCM operation with a key. For random nonces, stay within the limit of 2^32 messages per key. Go 1.24 added [NewGCMWithRandomNonce](https://pkg.go.dev/crypto/cipher#NewGCMWithRandomNonce).

Password hashing:

Prefer Argon2id for new password stores. Use a maintained password-storage implementation with random per-password salts, encoded parameters, and constant-time verification. Benchmark work factors under expected authentication load and bound concurrent hashing. Store the algorithm, salt, and parameters with each hash so verification and upgrades remain possible. Follow [OWASP's current parameter guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

For existing bcrypt hashes, migrate on successful authentication. Enforce the 72-byte input limit without truncation. Measure the work factor on deployment hardware. The example uses 12.

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

Use a traversal-resistant open operation for untrusted paths. Lexical checks cannot establish where symlinks lead.
Avoid resolving a pathname and then opening it separately. The filesystem can change between operations.
See [Go's traversal-resistant file APIs](https://go.dev/blog/osroot) for `os.Root` semantics and platform limits.

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

Check the TLS termination point and protect each sensitive hop. Enforce the deployment's minimum TLS version and certificate checks.
Set header and idle timeouts. Bound ordinary request reads and response writes.
Choose per-request limits for uploads and streams. A short global write timeout can interrupt a healthy stream.
See [Go server deadlines](https://pkg.go.dev/net/http#Server) and [[z-go-llm-streaming]].

Limit inbound bodies before decoding, independently of `Content-Length`:

```go
r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
defer r.Body.Close()
```

Handle `*http.MaxBytesError`. Limit decompressed data separately when accepting compressed bodies.
Bound header size and concurrency. Match rate-limit scope to the quota. A per-process limiter cannot enforce a fleet-wide quota.
Select browser headers for the actual content and TLS deployment. Protect cookie-authenticated mutations against CSRF.
Use [[z-go-http-client]] for outbound destination checks.

## Concurrency

Synchronize shared authorization state. Run the project's bounded race checks over relevant concurrent operations.

## Error Handling

Return safe errors to callers. Redact credentials, URLs, and provider bodies before logging diagnostic context. Handle cryptography and TLS errors explicitly.

## Do not

- Use `math/rand` for anything security-relevant.
- Concatenate user input into SQL, shell commands, or file paths.
- Compare tokens or secrets with `==`.
- Use ECB or unauthenticated CBC encryption modes.
- Rely on `filepath.Clean` + `strings.HasPrefix` for path validation.
- Log passwords, tokens, or PII — scrub before passing to `slog`.
- Ignore errors from `crypto/rand`, cipher operations, or TLS setup.
- Trust client-supplied headers (`X-Forwarded-For`, `X-Is-Admin`) — check server-side.
- Share secrets across environments — staging breach → production compromise.
- Roll your own crypto — use `crypto/aes` GCM and `golang.org/x/crypto/argon2`.

## Verification

```sh
# Known CVEs in dependencies — standalone CI step
govulncheck ./...

# SAST + security linters — gosec runs as a golangci-lint linter, not standalone;
# enable it in .golangci.yml's linters list alongside bodyclose/errcheck/nilerr
golangci-lint run

# Race detector
timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./...
```

Test rejected authorization, oversized bodies, path escapes, invalid signatures, and malformed password hashes at the changed boundary. For LLM features, enforce tool permissions outside the model. See [[z-security-hardening]].
