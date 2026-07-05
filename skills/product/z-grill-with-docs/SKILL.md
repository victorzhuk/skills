---
name: z-grill-with-docs
description: Relentless one-question-at-a-time interview that stress-tests an idea or plan against the project's existing glossary and ADRs, researching the codebase and the web before asking rather than guessing, and updates CONTEXT.md and docs/adr/ inline as terms and decisions crystallize. Use when the user wants to grill an idea, stress-test a plan, mentions "grill with docs" or "grill me", or asks to sharpen a design before building anything. Does not define bounded contexts or aggregate boundaries; see [[z-domain-modeling]]. Does not turn the resulting idea into a PRD; see [[z-to-prd]].
---

# Grill with docs

Interview the user about every aspect of the idea until shared understanding is reached. Walk each branch of the design tree depth-first, resolving dependencies between decisions one by one. One question per turn, each with a recommended answer.

## Rules

- One question per turn — bundled questions get shallow answers.
- Every question ships with a recommended answer and a one-line rationale, never a bare "what do you think?".
- When the answer folds into 2–4 concrete options, call the native `ask` tool with the question and the options as structured choices. Do not emit the options as prose in the response. Recommended option first, marked "(Recommended)", each option with a one-line trade-off. Use prose only for genuinely open-ended questions.
- If research can answer the question, research instead of asking; present the finding for confirmation.
- Finish a branch before opening the next. Ask A before B when B depends on A.
- Track resolved decisions; when a later answer contradicts an earlier one, surface the conflict immediately.

## Research before asking

Resolve in this order, and ask the user only what remains:

1. The codebase — if the code already decides the question, show the evidence instead of asking.
2. Existing records — `CONTEXT.md`, `docs/adr/`, `openspec/` specs; challenge new statements against what is already written.
3. Library and platform docs — verify capabilities and constraints before proposing them as options.
4. Web search — prior art, competing approaches, known failure modes of the approach under discussion.

## Update docs as you go

- When a term conflicts with the recorded glossary, call it out ("CONTEXT.md defines *cancellation* as X; you seem to mean Y — which is it?").
- When a term is vague or overloaded, propose one canonical term and record rejected synonyms as *avoid* entries.
- Stress-test domain relationships with concrete scenarios that probe edge cases.
- When the user states how something works, check whether the code agrees; surface contradictions.
- Update `CONTEXT.md` the moment a term is resolved — don't batch. File format: [references/context-format.md](references/context-format.md). It stays a glossary, free of implementation detail.
- Offer an ADR only when the decision is hard to reverse, surprising without context, and the result of a real trade-off — all three. File format: [references/adr-format.md](references/adr-format.md).

Term and boundary judgment — what deserves a glossary entry, where a context boundary runs — is [[z-domain-modeling]]'s territory; this skill supplies the interview loop and the file formats.

## Closing

Done when every opened branch is resolved and every crystallized term or decision is recorded. Summarize terms added, ADRs written, and open items. Then hand off: [[z-design-brief]] if the idea has a UI surface, [[z-to-prd]] once decisions are thick enough to write down. Offer the next step and stop — take it only when the user says so; never start designing or implementing off the back of the interview.

## Do not

- Ask what research can answer.
- Bundle questions or omit the recommended answer.
- Emit an option question as prose instead of calling the native `ask` tool.
- Reduce an option question to bare yes/no — options are cases with trade-offs, not confirmation prompts.
- Batch doc updates for the end of the session.
- Write ADRs for reversible or obvious decisions.
- Let CONTEXT.md accumulate implementation detail — it is a glossary, not a spec or scratch pad.
- Keep grilling past shared understanding; stop when new answers stop changing decisions.

## Verify

    fd -d 2 CONTEXT.md          # glossary exists if any term was resolved
    fd -e md . docs/adr/        # ADR numbering sequential, no gaps

- Every question asked was one the codebase, docs, and web could not answer.
- Every resolved term is in CONTEXT.md with its avoid-list; every qualifying decision has an ADR.

see [[z-domain-modeling]], [[z-design-brief]], [[z-to-prd]]
