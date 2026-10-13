# Skill anti-patterns

| Pattern | Failure | Repair |
|---|---|---|
| No-op | Generic praise or “be thorough” consumes context | Keep instructions that change an observable action |
| Sediment | Old exceptions contradict the current procedure | Read and reconcile the whole file on each edit |
| Duplication | Several copies of one rule drift | Give the rule one owner and link to it |
| Sprawl | Several skills fire for the same decision | State boundaries or merge truly identical scopes |
| Over-prompting | Tutorials obscure the action | Keep the common path in the body; move useful rare detail |
| Under-prompting | Missing inputs or finish criteria force guesses | Name prerequisites, output, and verification |
| Subjective rule | “Clean” or “professional” has no measurable meaning | Name the behavior, format, or constraint |
| Host assumption | A tool, memory file, or question API is presumed available | Discover the installed contract and provide a fallback |
| Imported authority | A reference starts tasks or adds approval gates | Preserve caller scope and host ownership |
| False verification | A command cannot prove the claimed result | Exercise the actual artifact and a negative case |
| Historical anecdote | “No project uses X” becomes universal policy | Discover the current repository; label preferences as defaults |

## Review checklist

- Does each description identify an action, trigger, and boundary?
- Can the loaded body finish the task without guessing required decisions?
- Does the procedure preserve caller approval and existing project conventions?
- Do examples match current verified APIs and execute the checks they claim?
- Are references linked and worth their extra context?
- Are repeated rules owned by one skill?
- Does verification distinguish failure, success, and unavailable evidence?

Test representative invocations and failure paths. File length and validator success alone do not establish useful behavior.
