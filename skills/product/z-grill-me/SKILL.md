---
name: z-grill-me
description: "Grills a request before it is built: sharpens a weak prompt into a brief, checks that brief against the code and the project's records, then interviews one question per turn until nothing stays vague. Triggers on 'grill me', 'grill this', sharpen a prompt, de-vague a task. Records nothing; see [[z-grill-with-docs]]."
---

# Grill me

A vague request grilled turn by turn wastes the interview on things the repo already
answers. Run four stages in order; each one narrows what the next has to ask.

| Stage | What it does | Who answers |
|---|---|---|
| 0 Sharpen | the raw ask becomes a working brief | you |
| 1 Grill the brief | the brief is checked against the code | the codebase |
| 2 Grill the record | the brief is checked against the project's own documents | CONTEXT.md, ADRs, PRDs, specs |
| 3 Grill me | what nothing else can answer | the user |
| 4 Close | decision list plus the next rung | you |

Stages 1 and 2 are not optional politeness — every question they kill is a turn the user
does not spend, and a question asked from ignorance gets a guess for an answer.

## Stage 0 — Sharpen

Turn the dump into a brief before questioning it. Keep the user's intent, drop the noise:

- **goal** in one line, in the user's terms;
- **why now** — the trigger or pain, one line;
- **context** — the paths, systems and prior art the dump names, each *verified* by opening
  it; a wrong path is corrected in place, an unfindable one is flagged, never carried;
- **requirements**, numbered, each one testable;
- **constraints** — only real ones (tech, compatibility, budget, style);
- **out of scope** — the non-goals the dump implies;
- **unknowns** — everything the brief cannot state yet. This list is the interview's agenda.

Show the brief. A user who wanted only a better prompt stops here and has one.

## Stage 1 — Grill the brief

Attack the brief with the codebase, not with questions:

1. Every backticked symbol, file, flag and command in it either resolves in the repo or is
   tagged **new**. A symbol that resolves nowhere and is not new is a defect in the brief.
2. Where the code already decides an unknown, close it and show the evidence
   (`path:line`), do not ask.
3. Where the code contradicts the brief, say so plainly — that contradiction is the most
   valuable thing this stage produces.
4. Library, platform and API behaviour comes from current docs, never memory; check
   capabilities before they become options in a question.

## Stage 2 — Grill the record

The project's own documents are a second, cheaper user. Read what exists — `CONTEXT.md`,
`docs/adr/`, `docs/prd/`, `docs/brainstorms/`, design briefs, `openspec/` specs — and grill
the brief against them:

- a term the glossary already defines is used the glossary's way, or the conflict is raised
  ("the glossary defines *cancellation* as X, this asks for Y — which?");
- a decision an ADR already took is presented for confirmation, never re-asked;
- a record the code has since outgrown is reported as **stale**, with the evidence;
- two records that disagree with each other are reported as a contradiction to resolve.

Findings from stages 1 and 2 enter the interview as confirmations — one line, already
answered, awaiting a yes — not as questions.

## Stage 3 — Grill me

What survives belongs to the user. Interview depth-first until answers stop changing
decisions:

- One question per turn. Bundled questions get shallow answers.
- Every question ships a recommended answer and a one-line rationale — never a bare
  "what do you think?".
- When the answer folds into 2–4 concrete cases, call the native `ask` tool with them as
  structured options: recommended first, marked "(Recommended)", each with a one-line
  trade-off. Do not spell the options out as prose instead. Prose questions are for
  genuinely open ends.
- An option question is never reduced to bare yes/no — options are cases with trade-offs.
- Finish a branch before opening the next; ask A before B when B depends on A.
- Track resolved decisions. When a later answer contradicts an earlier one, surface the
  conflict in that turn.
- Stop when new answers stop changing decisions. Grilling past shared understanding is
  where interviews start inventing requirements.

## Stage 4 — Close

Print the decision list: every resolved point in one line, open items flagged, assumptions
labelled as assumptions. Then name the rung that follows and **offer** it — a task spec for
an agent with no session context, [[z-to-prd]] when the decisions are thick enough to write
down, [[z-design-brief]] when the idea has a UI surface, [[z-grill-with-docs]] when terms or
hard-to-reverse decisions crystallized and nothing recorded them. Take the step only when
the user says so; never start designing or implementing off the back of the interview.

## Do not

- Ask what the code, the records, or current docs can answer.
- Bundle questions, or omit the recommended answer.
- Emit an option question as prose instead of calling the native `ask` tool.
- Carry an unverified path, symbol or capability from the dump into the brief.
- Invent a requirement the user never stated to fill a gap — an unknown stays an unknown.
- Keep grilling once answers stop changing decisions.

## Verify

- Every symbol in the brief resolves in the repo or is tagged new.
- Every question asked was one the code, the records and the docs could not answer.
- Every stated fact traces to a path, a record, or the user's own words.
- The decision list distinguishes decided, assumed and open.

see [[z-grill-with-docs]], [[z-to-prd]], [[z-design-brief]], [[z-domain-modeling]]
