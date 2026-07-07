---
name: z-ru-tech-register
description: Russian tech prose in the native senior-engineer register — Latin-vs-Cyrillic term choice, serious-register structure, erasing tells that mark a text as machine-written. Use writing or reviewing any Russian technical text — post, article, doc, README, comment. Triggers on "напиши по-русски", "чтобы не выглядело как нейрослоп". Owns the bilingual RU/EN glossary by theme. Telegram voice is [[z-tg-post]]; AI-fingerprint removal [[z-fuck-slop]]; English docs [[z-concise-human-docs]].
---

# RU Tech Register

Write Russian technical text the way a senior RU engineer writes for peers: compressed declaratives, Russian prose carrying Latin tech terms, primary sources, zero infostyle. The register is what makes text read community-native instead of machine-translated.

## The one load-bearing rule — Latin vs Cyrillic

Product names and precise CS/networking terms stay Latin. RF legal, fiscal, and payment terms stay Cyrillic. Only the casual connective layer transliterates — and the serious register uses even that sparingly.

- Latin inline: `backend`, `observability`, `connection pooling`, `event-driven`, `Garbage Collector`, `DPI`, `sing-box`, `VLESS+Reality`, `Claude Code`, `MCP`, `PgBouncer`, `Kubernetes`.
- Cyrillic: `152-ФЗ`, `54-ФЗ`, `ОРИ`, `СБП`, `касса`, `ОФД`, `Роскомнадзор`, `ТСПУ` — plus fully naturalized words: горутина, микросервис, обход блокировок, замедление.
- Transliterated (casual layer only): бэкенд, хендлер, деплой, поды, бэкап.

The per-term call is not guessable — check `references/terminology.md` (glossary by theme cluster) before finalizing.

## Structure — serious register

Openers, in order of preference:

1. Bold thesis line — the whole claim in one sentence.
2. «Коротко:» / TL;DR — one flat sentence stating the real constraint.
3. Emoji + bold thesis (`🖥 **…**`) — the community default on Telegram; acceptable, never required.

Body:

- One idea per block. Declarative sentences: what happens, where, under which condition.
- Em-dash `—` bullets only when enumeration genuinely earns it; prose otherwise. Never fragment prose into bullet stubs.
- Numbered «Попытка 1/2/3» or «Шаг 1/2/3» for a debugging or iteration arc.
- Fenced code blocks for shell/Go/config; inline code for commands, flags, filenames.
- Link primary sources — official docs, law texts, source code — not blog re-tellings.

Closers: end on the takeaway or a dry one-liner. No motivational filler, no subscribe/bookmark CTA, no hashtag spam.

## Do not — RU neuro-slop tells

Erase on sight; each marks the text as generated or machine-translated:

- **Infostyle openers**: «В современном мире…», «Не секрет, что…», «Давайте разберёмся», «В этой статье мы рассмотрим». Open with the thesis instead.
- **Filler connectives**: «стоит отметить», «важно понимать», «как мы видим», «итак», «подводя итог», «в заключение». Delete — the sentence survives.
- **Bureaucratic calque**: «данный» for «этот», «осуществлять» for a plain verb, «является» chains. Use the plain verb.
- **«не X, а Y» hype parallelism** — the RU twin of "not X but Y". Make the direct claim.
- **Translated-tutorial voice**: «Вы можете использовать…», «выполните следующие шаги», English word order. Imperative or declarative instead.
- **Wrong-script terms**: обсёрвабилити or кубернетес in serious prose; Cyrillic product names; Latin for RF law («FZ-152»).
- **Clickbait furniture**: ALL-CAPS, emoji spam, «успей», «подпишись», rhetorical-question padding, second sentences that restate the first.
- **Uniform cadence** — every sentence the same length and shape. Vary; let a two-word sentence land.

## Sensitive topics — legal framing

Circumvention/DPI content: neutral engineering analysis of mechanics only. Never recommend a service, never give acquisition or setup steps framed as getting access — RF law penalizes both advertising (ч.18 ст.14.3 КоАП) and how-to instructions (п.1 ч.5 ст.15.1 149-ФЗ). Compliance content: keep a «not legal advice» frame and date every legal claim. Statutes, fines, and enforcement state: `references/register.md`.

## Verify

Before delivering:

1. Every term checked against the Latin/Cyrillic rule (`references/terminology.md`).
2. No tell from the Do-not list survives.
3. The opener is a thesis, not a warm-up.
4. Each claim traces to a primary source or stated first-hand experience; laws cited with number and date.
5. Circumvention/compliance framing applied where the topic touches those clusters.

## References

- `references/terminology.md` — bilingual RU/EN glossary by theme cluster; the Latin/Cyrillic call per term.
- `references/register.md` — community register anchors (channels, books), serious-vs-infostyle contrast, legal caveats with current enforcement.

Telegram post format and the author's channel structure: [[z-tg-post]]. Statistical AI fingerprints regardless of language: [[z-fuck-slop]]. Concise English docs: [[z-concise-human-docs]].
