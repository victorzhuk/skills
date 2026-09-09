# Product Skills

Skills for turning a raw idea into a shippable OpenSpec change — grilling, design briefs, cloud-design handoff, and PRD authoring. They chain: grill → brief → handoff → PRD → OpenSpec changes; each hands off to the next via its closing links.

## Model-invoked

Model- or user-reachable via skill name and trigger phrasing.

- **[z-market-research](./z-market-research/SKILL.md)** — Competitor and market research method — discovery, pricing teardown, positioning read, demand signals, then an ICP hypothesis validated per source.
- **[z-grill-me](./z-grill-me/SKILL.md)** — Grills a request before it is built: sharpens a weak prompt into a brief, checks that brief against the code and the project's records, then interviews one question per turn until nothing stays vague.
- **[z-grill-with-docs](./z-grill-with-docs/SKILL.md)** — The z-grill-me interview that writes as it runs: a resolved term lands in CONTEXT.md at once, a hard-to-reverse trade-off gets an ADR.
- **[z-design-brief](./z-design-brief/SKILL.md)** — Turns a grilled idea into a design brief by walking through each screen one at a time — what it shows, what a user can act on, how screens connect — then writes docs/design/{slug}-brief.md.
- **[z-design-handoff](./z-design-handoff/SKILL.md)** — Turns a design brief into a tool-agnostic handoff package for a cloud design tool (Figma Make, Google Stitch, v0, Lovable) — a design-system spec of tokens, component inventory, states…
- **[z-to-prd](./z-to-prd/SKILL.md)** — Synthesizes the grilled idea, design brief, and any returned prototype into a PRD — problem statement, solution, user stories, implementation/testing decisions, out of scope — written to docs/prd/{slug}.md.
- **[z-prd-to-openspec](./z-prd-to-openspec/SKILL.md)** — Decomposes a PRD into OpenSpec change proposals using vertical slices — each cuts through every layer end-to-end and is independently verifiable — then writes proposal.md, design.md, tasks.md…
