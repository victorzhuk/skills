---
name: z-tg-post
description: Write, rewrite, or review short-form posts for the author's Telegram tech blog in his voice. Use whenever drafting a Telegram post, TG channel post, or "пост в телегу" on backend/Go, PostgreSQL, self-hosted infra, DPI-bypass tooling, AI coding agents, or Russian regulatory compliance. Handles Telegram formatting and the Russian-prose-with-inline-English-terms register from [[z-ru-tech-register]]. Not for long-form blog articles; see [[z-concise-human-docs]].
---

# Telegram Post — Author Voice

Write Telegram posts the way the author writes them: compressed, declarative, Russian prose with English technical terms kept inline, one bilingual aphorism as the close. This skill adds the Telegram format and the RU/EN register; the prose discipline (no filler, no tutorial glue, no "not X but Y") is inherited from z-concise-human-docs — apply that pass too.

## When to use

Any request to produce or fix a Telegram post: "напиши пост", "пост в телегу/канал", "draft a TG post", "rewrite this as Victor", "review my post". Topics cluster around Go/backend, high-load, PostgreSQL, self-hosted infra/DevOps, circumvention tooling, AI coding agents, and RF regulatory compliance.

Do not use for full blog articles (long-form → z-concise-human-docs), code comments, or commit messages.

## Workflow

**New post from a topic:**
1. Pull the technical substance first — from the current thread, past conversations, or the linked blog draft. Never invent architecture, law numbers, or config.
2. Draft in the structure below. One idea per line block.
3. Run the register pass ([[z-ru-tech-register]], its `references/terminology.md`) and the anti-slop pass (z-concise-human-docs style_pass).
4. Deliver the post in a fenced block ready to paste, plus a two-line note on any judgment calls.

**Rewriting the author's own draft:** make the smallest set of changes that fixes the problem. Keep his wording. List each change with a one-line reason. Never silently rewrite his voice — flag and let him decide.

**Reviewing:** name the specific register/voice drifts (bullet stubs, tutorial connective tissue, English where Cyrillic belongs or vice versa), then show the fix.

## Format — Telegram user-Markdown (author posts as a user)

The author posts by typing/pasting into the Telegram app, not through a bot. The target is Telegram's client-side Markdown, which converts on send. Supported: `**bold**`, `__italic__`, `` `code` ``, ` ```pre``` `, `~~strike~~`, `||spoiler||`.

- `**bold**` — thesis headline, section pivots, the final takeaway line.
- `` `code` `` — identifiers, config keys, filenames, protocol/tool names inline (`tg_id`, `user_uuid`, `identity-perimeter`, `default_pool_size`, `sing-box`).
- ` ```pre``` ` — multi-line shell/Go/config blocks and ASCII diagrams.
- `__italic__` — the single closing aphorism, and rare soft asides.
- Bullets are em-dash `—` at line start. Never `-`, `*`, or `•`.
- Comparison tables render poorly in Telegram — use paired **bold**-headed blocks instead.
- Length caps: ~4096 chars for a text post, 1024 when attached to media. For a longread, split into numbered parts or link the blog.

Two constraints specific to user-side posting:

- **Links have no Markdown form.** `[text](url)` renders literally. The canonical blog URL goes bare on the last line and auto-links; for a rare inline link, use the app's formatting menu / Ctrl+K.
- **No backslash-escaping.** That is Bot-API MarkdownV2 only. Typed or pasted user-side, `**`, `__`, and `` ` `` convert as-is. Paste as plain text and send in one go — pasting from a rich editor (Word/Notion) strips the markers.

Posting via a bot/API instead? Switch to HTML parse mode: `<b>`, `<i>`, `<code>`, `<pre>`, `<a href="">`, `<blockquote>`, `<tg-spoiler>`. HTML is the more forgiving mode for automated pipelines.

## Structure

```
**Thesis headline — the whole claim in one line.**

Коротко: **one-sentence TL;DR**. The real constraint, stated flat.

Setup line. Then the enumerated core:

— point one
— point two
— point three

**Section pivot.**
Body. Declarative. One fact per sentence.

**Section pivot.**
Body.

**Главный вывод:** the takeaway compressed to one line.

__English aphorism that restates the thesis in a different frame.__

https://victorzh.uk/slog/<slug>
```

Not every post needs every block. Minimum viable post: thesis line, body, link. The `Коротко:` opener and the `__italic__` closer are the two signature moves — use them when the post earns them.

The author's register drops the emoji-thesis opener common in RU tech channels. Bold thesis line, no leading emoji. Keep it clean.

## Register — Latin vs Cyrillic

The single rule that makes prose read as community-native: **product names and precise CS/networking terms stay Latin; RF legal and payment terms stay Cyrillic; only the casual connective layer transliterates.**

- Latin/English inline: `backend`, `observability`, `connection pooling`, `foreign entity`, `leaderboard`, `identity boundary`, `event-driven`, `sing-box`, `Xray`, `VLESS+Reality`, `Claude Code`, `MCP`, `PgBouncer`.
- Cyrillic (legal/fiscal/payment): `152-ФЗ`, `149-ФЗ`, `54-ФЗ`, `ОРИ`, `СБП`, `Мир`, `касса`, `ОФД`, `ИП/ООО`, `Роскомнадзор`.
- Transliterated (casual only): бэкенд, хендлер, деплой, горутина, поды, бэкап — use sparingly; the serious register keeps most of these Latin.

Full glossary by theme cluster: [[z-ru-tech-register]], `references/terminology.md`. Consult it before finalizing any post — the Latin/Cyrillic call per term is not guessable.

## Voice

- Compressed declaratives. State what happens, where, under which condition.
- No "not X but Y". Make the hard cut instead.
- No tutorial glue: важно, просто, поэтому, note that, as a result, the point is.
- No motivational filler, no bookmark/subscribe CTAs.
- Bilingual is the point — Russian prose carrying English terms, closed by an English aphorism.
- Bullets only when enumeration genuinely earns it. Prose otherwise. Never fragment prose into bullet stubs.

## Sensitive topics

Circumvention/DPI-bypass content: frame as neutral engineering analysis, never as promotion or a how-to-obtain guide. RF law (ст.14.3 КоАП, 149-ФЗ) restricts advertising and step-by-step instructions for such tools. Analyze mechanics; do not recommend a service or walk a reader through acquiring access. Current statutes and enforcement state: [[z-ru-tech-register]], `references/register.md`.

Compliance posts: keep the "not legal advice" framing the author uses, and don't assert current legal specifics without a date — RF internet regulation moves fast.

## Before sending — checklist

1. [ ] All formatting is Telegram user-Markdown (`**`, `__`, `` ` ``); no HTML tags, no `[text](url)` links.
2. [ ] Bullets are `—`.
3. [ ] Every term checked against the Latin/Cyrillic rule.
4. [ ] Thesis line is one line and carries the whole claim.
5. [ ] No "not X but Y", no tutorial filler, no CTA.
6. [ ] Closing `__italic__` aphorism restates the thesis in a fresh frame (if used).
7. [ ] Canonical URL bare on the last line.
8. [ ] Nothing references AI, generated-ness, or these rules.

## References

- `references/examples.md` — annotated golden post + skeleton template.
- [[z-ru-tech-register]] — RU/EN glossary, community register conventions, author anchors, legal caveats. Load it alongside this skill.
