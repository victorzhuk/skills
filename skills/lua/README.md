# Lua Skills

Lua embedded as a sandboxed scripting layer inside Go and Rust hosts.

## Model-invoked

Model- or user-reachable via skill name and trigger phrasing.

- **[z-lua-core](./z-lua-core/SKILL.md)** — Lua embedded as sandboxed scripting in Go or Rust hosts — mlua for Rust, gopher-lua for Go (Lua 5.1 VM, not 5.4/5.5). 1-based indexing, nil-hazard table length, metatable-only extension, allowlisted stdlib.
