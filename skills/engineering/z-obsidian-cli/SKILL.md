---
name: z-obsidian-cli
description: "Capture, read, or search Obsidian notes. Resolve the vault before a daily-note update or search. Check the installed CLI or use a verified filesystem path."
---

# Obsidian CLI

Check the installed Obsidian CLI version and command help. Use the intended vault for authorized work.

## Resolve the target

1. Use the caller's explicit vault.
2. Otherwise read an existing project vault binding such as `.obsidian-vault`.
3. If the current directory belongs to a vault, resolve its ID and path.
4. Resolve remaining ambiguity before writing.

Place `vault=<name>` or `vault=<id>` before the command if the installed version supports it. Use the ID when names collide.

## Check availability

Inspect whether the app and CLI are available. Use a read-only command against the intended vault before writing.

On empty output, inspect the exit status, installed help, and app state. Read a known note to establish access.

If the app cannot access the target, locate the exact vault before editing files directly. Inspect the platform's actual configuration. Compare path basenames literally and resolve duplicate names before writing.

## Commands

Compare each form with installed command help.

| Operation | Shape |
|---|---|
| Read exact path | `obsidian vault=V read path=folder/note.md` |
| Search | `obsidian vault=V search query="term" format=json` |
| Append note | `obsidian vault=V append path=folder/note.md content="text"` |
| Daily append | `obsidian vault=V daily:append content="text"` |
| Create exact file | `obsidian vault=V create path=folder/note.md content="text"` |
| Set property | `obsidian vault=V property:set name=status value=draft type=text path=note.md` |

Use verified vault and path values. `file=` uses link-style name resolution. `path=` selects an exact vault-relative file. Specify a target for unattended edits.

Pass content as a safely quoted argument. Double quotes alone do not prevent shell expansion of dollar expressions or backticks. Prefer an argument-vector interface when available.

## Background capture

Omit options that open notes or tabs unless the caller wants that. Preserve the existing daily-note folder, date format, template, and plugin convention.

A filesystem append does not run app templates or plugin hooks. When these are part of the requested result, use the running app or report that prerequisite.

For exact text search, use the host's file search over the verified vault path. Obsidian search follows its own query/index semantics.

## Do not

- Guess a vault or silently choose among matching names.
- Treat empty stdout as a complete diagnosis.
- Overwrite or delete a note without inspecting its exact path and the authorized scope.
- Reconstruct daily-note placement from an assumed date format.
- Expose note content through unsafe shell interpolation.

## Checks

Read the changed note through the intended access path. Check the vault ID, file path, preserved content, and requested update. Report unavailable template or plugin behavior.

[Official Obsidian CLI](https://obsidian.md/help/cli).
