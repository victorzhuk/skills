---
name: z-obsidian-cli
description: "Capture, read, and search Obsidian notes through the installed official CLI or a verified filesystem fallback. Use for \"save to Obsidian\", \"add to my daily note\", or \"search my vault\". Resolve vault identity and current CLI behavior first. Repository docs use ordinary file tools."
---

# Obsidian CLI

Use the installed official Obsidian CLI for authorized vault work. Confirm its version and command help; app state and CLI behavior can differ by release.

## Resolve the target

1. Use the caller's explicit vault.
2. Otherwise read an existing project vault binding such as `.obsidian-vault`.
3. If the current directory is inside a vault, verify that identity.
4. Resolve remaining ambiguity before writing.

Current official help supports `vault=<name>` and `vault=<id>`, placed before the command. Prefer a verified ID when names collide. Do not assume a universal environment variable selects a vault.

## Check availability

Inspect whether the app and CLI are available. Use a read-only command against the intended vault before writing.

Empty output alone does not prove that a vault is closed or empty. Check command status, installed help, app state, and a known existing note. A historical silent-output defect is not a permanent CLI contract.

If the app cannot service the target, use direct file access only when the exact vault path and intended operation are established. Do not use an ambiguous basename match. Registry locations vary by platform; discover the actual configuration and compare path basenames literally, not through an unescaped regex.

## Commands

Verify these forms with the installed help:

| Operation | Shape |
|---|---|
| Read exact path | `obsidian vault=V read path=folder/note.md` |
| Search | `obsidian vault=V search query="term" format=json` |
| Append note | `obsidian vault=V append path=folder/note.md content="text"` |
| Daily append | `obsidian vault=V daily:append content="text"` |
| Create exact file | `obsidian vault=V create path=folder/note.md content="text"` |
| Set property | `obsidian vault=V property:set name=status value=draft type=text path=note.md` |

Replace `V` and paths with verified values. A `file=` argument uses link-style name resolution; `path=` selects an exact vault-relative file. Omitting both may target the active note, so specify a target for unattended edits.

Pass content as a safely quoted argument. Double quotes alone do not prevent shell expansion of dollar expressions or backticks. Prefer an argument-vector interface when available.

## Background capture

Omit options that open notes or tabs unless the caller wants that. Preserve the existing daily-note folder, date format, template, and plugin convention.

A filesystem append does not run app templates or plugin hooks. When these are part of the requested result, use the running app or report that prerequisite.

For exact text search, use the host's file search over the verified vault path. Obsidian search follows its own query/index semantics.

## Do not

- Guess a vault or silently choose among matching names.
- Treat empty stdout as a complete diagnosis.
- Overwrite or delete a note before inspecting it and confirming the intended scope.
- Reconstruct daily-note placement from an assumed date format.
- Expose note content through unsafe shell interpolation.

## Verify

Read the changed note through the intended access path. Confirm vault identity, file path, preserved content, and requested update. Report any template/plugin behavior that could not run.

[Official Obsidian CLI](https://obsidian.md/help/cli).
