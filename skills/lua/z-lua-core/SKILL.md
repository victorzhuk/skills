---
name: z-lua-core
description: "Embed Lua with mlua or gopher-lua. Use for host callbacks, sequence indexing, resource limits, and sandbox design. See [[z-go-safety]] or [[z-rust-core]] for host code."
---

# Embed Lua

## Match the runtime

Inspect the binding version and selected VM. In Rust, `mlua` supports selectable Lua, LuaJIT, and Luau backends.
In Go, `gopher-lua` implements Lua 5.1 with selected extensions, including `goto`.
Check the chosen runtime before using later syntax, integer operations, or garbage collector options.

## Convert values

- Lua sequences conventionally start at one. Convert indexes only when mapping a sequence to a zero-based host collection.
- Preserve arbitrary table keys as keys. Zero and negative integers can be valid keys.
- For tables with holes, `#t` does not count all entries. Track the logical size explicitly.
- Use `table.pack(...).n` for argument counts where supported. Lua 5.1 lacks the standard `table.pack`.
- Use metatables for `__index`, `__newindex`, and `__call`. Keep the lookup path short.
- Document whether each exported collection is a copy or a view. Synchronize access to shared mutable storage.

## Restrict the host interface

1. Start untrusted scripts with an allowlist of functions. Review `io`, `os`, `debug`, loaders, and `require` before granting access.
2. Expose typed callbacks. Check inputs before using host resources.
3. Set execution and memory limits. Use process isolation when the binding cannot enforce the required limits.
4. Propagate cancellation into host I/O. VM hooks cannot interrupt a blocked host callback.
5. Schedule asynchronous work through the host. Lua coroutines yield cooperatively.
6. Preserve stack balance and return counts at raw C boundaries. Use the typed mlua API or gopher-lua's documented callback convention.

## Check the host binding

Exercise scripts through the host binding. Include a sparse table, a rejected capability, resource exhaustion, and a cancelled callback.
Run the project's Lua linter on maintained scripts. [Lua reference manual](https://www.lua.org/manual/5.4/manual.html#2.1)
