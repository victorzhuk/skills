---
"victorzhuk-skills": minor
---

Resource-limit floor for dev test runs across the catalog. `z-testing-strategy` gains a per-runner limits table (timeouts plus worker caps) and the ask-then-tune rule for projects whose runner has no limits configured. Stack and QA skills now carry the limits in every test invocation: `z-go-testing`, `z-go-makefile` (`GOTESTFLAGS ?= -timeout 2m`), `z-go-ci`, `z-go-troubleshooting`, `z-go-bdd`, `z-qa-orchestrator`, `z-qa-debugger`, `z-qa-api`, `z-qa-browser` (`--workers=2`), `z-ts-core` (vitest `maxWorkers`), `z-rust-core` (`timeout(1)` wrap + `--test-threads`), `z-py-core` (pytest-timeout).
