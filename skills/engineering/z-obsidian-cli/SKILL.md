---
name: z-obsidian-cli
description: Use when capturing notes, journaling a session, drafting an ADR/PR, or searching/reading an Obsidian vault from the terminal — triggers like "save to Obsidian", "add to my daily note", "search my vault", "drop this in Obsidian". Covers the official `obsidian` CLI (v1.12+) and per-project vault binding. The target vault must be open in the running Obsidian app, or the CLI returns nothing.
---

# Obsidian CLI

The official `obsidian` CLI (shipped in the desktop app, GA v1.12.4) talks to the **running** Obsidian process and prints to stdout. It reads, creates, appends, searches, and edits notes, properties, and tasks.

**Two hard constraints, both silent when violated:**
1. **Obsidian must be running.** The first command otherwise launches the GUI.
2. **The CLI only operates on a vault that is currently OPEN in a window.** A registered-but-closed vault is recognized but every command returns **empty with no error**. (A genuinely unknown vault prints `Vault not found.`)

Because a vault is just a folder of `.md` files, when the target vault is closed you fall back to operating on disk directly (`rg`, `read`, `Write`) — see [Closed-vault fallback](#closed-vault-fallback).

## When to use

- "Save this to Obsidian", "add to my daily note", "journal this session"
- "Search my vault for X", "what notes mention Y"
- "Draft an ADR / PR / spec note in the vault"
- Reading a vault note into context

Do **not** use for: editing this repo's own `.md` docs (use normal file tools); anything when Obsidian isn't running and the CLI errors — drop to the filesystem fallback.

## Vault resolution (per-project)

Never guess the vault — writing to the wrong vault is the one unrecoverable mistake. Resolve in this order:

1. Caller passed an explicit vault name → use `vault=<name>`.
2. Repo has a `.obsidian-vault` file at its root → its single line is the vault name.
3. CWD is inside a vault folder → the CLI auto-targets it; run without `vault=`.
4. None of the above → **stop and ask** which vault.

`vault=<name>` is the **only** selector — there is no `OBSIDIAN_VAULT` env var. The name is the vault's display name (its folder basename, e.g. `OWN_PROJECT`, `WB_DOCS_HUB`, `"Obsidian Vault"`).

Resolve a vault name to its on-disk path (needed for the fallback) from the registry:

```sh
# name -> path, from Obsidian's vault registry (tolerates a trailing slash)
jaq -r --arg n "$VAULT" '.vaults | to_entries[] | .value.path
  | select(test("/" + $n + "/?$"))' ~/.config/obsidian/obsidian.json
```

Confirm the resolved vault is actually open before trusting CLI output:

```sh
obsidian vault="$VAULT" files total    # empty = closed (use fallback); a number = open
```

Empty output has two causes the probe can't tell apart: the vault is closed, or Obsidian isn't running at all (the next command would launch the GUI). Disambiguate with `obsidian files total` (no `vault=`) — a number means the app is up with some vault active; a GUI launch means it was down.

## Quick reference

All params are `key=value` (no `--`). Flags are bare words. Target a file with `file=<name>` (wikilink-style, no path/extension) **or** `path=<folder/note.md>` (exact, from vault root). Omit both to act on the active file. Multiline `content` accepts `\n` and `\t`. Quote values with spaces: `name="My Note"`.

| Goal | Command |
|---|---|
| Append to today's daily note | `obsidian vault=V daily:append content="- [ ] follow up on X"` |
| Prepend / read daily | `obsidian vault=V daily:prepend content="..."` · `obsidian vault=V daily:read` |
| Read a note | `obsidian vault=V read path=specs/2026-06-08-foo.md` |
| Create a note | `obsidian vault=V create name="2026-06-08 session" path=sessions content="# Log\n\n..."` |
| Append/prepend any note | `obsidian vault=V append path=sessions/log.md content="\n## Update\n- ..."` |
| Search — Obsidian semantics (files) | `obsidian vault=V search query="pgx pool" format=json limit=20` |
| Search — with line context | `obsidian vault=V search:context query="TODO" limit=20` |
| Search — exact/substring (reliable) | `rg -g '*.md' -n pattern "$VAULT_PATH"` (resolve path, see fallback) |
| Move / rename / delete | `obsidian vault=V move path=a.md to=archive/` · `obsidian vault=V delete path=old.md` |
| Frontmatter property | `obsidian vault=V property:set name=status value=draft type=text path=note.md` |
| Tasks | `obsidian vault=V tasks todo format=json` · `obsidian vault=V task ref=note.md:42 done` |
| Show file outline | `obsidian vault=V outline path=note.md format=md` |
| List/count files (open-state probe) | `obsidian vault=V files total` · `obsidian vault=V files folder=specs` |

`daily:append` / `create` / `open` take an optional `open` / `newtab` / `paneType=tab|split|window` to surface the note in the UI — **omit these for background capture** so the app stays quiet. Add `--copy` to any command to also copy its output to the clipboard.

The full surface is ~90 commands (`base:*`, `sync:*`, `history:*`, `backlinks`, `tags`, dev tools like `eval`/`dev:screenshot`/`plugin:reload`). Don't memorize them — run `obsidian help` or `obsidian help <command>` for exact flags.

## Capture pattern (background journaling)

```sh
VAULT="$(cat .obsidian-vault)" || { echo "no .obsidian-vault — ask which vault, don't guess"; exit 1; }
obsidian vault="$VAULT" daily:append content="## $(date +%H:%M) — session
- decoded pgx pool exhaustion (cap=10)
- opened PR #482 for the retry-jitter fix"
```

No `open=` flag, so it writes silently. Multi-line `content` is one quoted string with real newlines (or `\n`). Never substitute a default vault name when the marker is missing — that's resolution step 4 (stop and ask), not a guess.

## Closed-vault fallback

When `files total` comes back empty, the vault is closed. Either ask the user to open it in Obsidian, or operate on disk — the vault is plain Markdown:

```sh
VAULT_PATH="$(jaq -r --arg n "$VAULT" '.vaults|to_entries[]|.value.path|select(test("/"+$n+"/?$"))' ~/.config/obsidian/obsidian.json)"
rg -g '*.md' -n --no-heading "pgx pool" "$VAULT_PATH"     # search
# read / append with normal file tools against "$VAULT_PATH/<relative>.md"
```

Daily notes default to `$VAULT_PATH/YYYY-MM-DD.md`, but a `.obsidian/daily-notes.json` (or the Periodic Notes plugin) can override the folder and format — and templates only run inside the app. So for daily notes or templated notes, prefer asking the user to open the vault rather than reconstructing placement on disk.

## Hard rules

- **Confirm the vault is open** (`files total` returns a number) before trusting any CLI output. Empty output is a closed vault, not an empty vault.
- **Never invent a parameter.** If a flag isn't here, check `obsidian help <command>`; if it's not listed, the CLI doesn't accept it.
- **Read before you destroy.** Never `create ... overwrite` or `delete` a file you haven't `read` first.
- **Quote/escape `content`.** Use double quotes (with `\n`/`\t`) or single quotes; never leave a value unquoted.
- **Background capture stays quiet** — omit `open`/`newtab`/`paneType` for agent-driven journaling.

## Common mistakes

| Mistake | Fix |
|---|---|
| `export OBSIDIAN_VAULT=...` | No such env var. Use `vault=<name>` or a `.obsidian-vault` marker. |
| Treating empty output as "vault is empty" | It means the vault is **closed**. Open it or use the fallback. |
| `printf`/`xargs` gymnastics for newlines | `content="line1\nline2"` works directly. |
| Assuming only daily notes can be appended | `append`/`prepend` work on any `file=`/`path=`. |
| Running CLI commands in CI/sandbox | No GUI there → they hang or error. Use `rg` over the vault path. |
| Trusting `obsidian search` like grep | It uses Obsidian's search index, not substring matching — it can return **nothing** for a term `rg` finds 20×. For exact/substring search use `rg -g '*.md'` over `$VAULT_PATH`. |
