---
"victorzhuk-skills": minor
---

Add `z-go-entrypoint` for Go entrypoints: a thin `main` driver over a testable
`run` harness, with injected args and streams, `flag.ContinueOnError` bound to
stderr, `signal.NotifyContext`, and explicit dependency construction. Update the
Go domain index, the top-level catalog, and the provenance inventory.