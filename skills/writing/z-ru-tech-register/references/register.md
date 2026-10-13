# Register — RU tech community conventions

How the serious-engineering end of RU tech writing (Telegram channels, Habr) structures text, and which sources to mine for current terminology. Use this for structure and tone; `terminology.md` for word-level calls.

## The spectrum

Three register bands across RU tech authors:

- **Compressed analytical** — @usher2 (Филипп Кулин): terse posts citing primary sources (court documents, law texts, RKN registries), dry irony, exact legal and technical terms. The default target band.
- **Warm tutorial** — @ntuzov (Николай Тузов): long educational series, framing devices («надеваем каску инженера»), numbered «Попытка 1/2/3», ASCII diagrams. Mine the mechanics, drop the warmth.
- **Casual DevOps** — @bashdays: first-person «ты», humor and profanity, «Всем привет» openers, aggressive transliteration (девопс, ямл, пайплайн). Authentic, but a different voice — never mix bands within one text.

## Conventions observed across serious channels

Openers, by observed frequency: emoji + bold thesis line («🖥 **Виртуальная vs Физическая память**») — the community default; bold header + problem statement, then numbered «Попытка/Шаг»; «Коротко:»/TL;DR — rarer, for genuinely compressed posts. First-person warm-ups («Всем привет», «На днях…») belong to the casual band.

Body: `————` dividers fencing an aside off the main body; em-dash or emoji (▪️ 🔹) bullets; fenced code blocks for shell/Go/config and ASCII diagrams; bold sub-headers as section pivots; numbered steps for procedures.

Check the current client, account, and publishing API limits before sizing a Telegram post or media caption; those surfaces can differ. Split longreads only when the actual surface requires it.

Closers: hashtag footer plus channel signature line; soft italic closing line. Bookmark/subscribe CTAs are common but read as marketing — omit.

## Serious vs clickbait/infostyle

Adopt: declarative thesis, primary-source links, exact terminology, real code, dry precision, one idea per block.

Avoid: ALL-CAPS, emoji spam, «успей»/«подпишись», motivational filler, «не X, а Y» hype, vague qualifiers without numbers, listicle padding, second sentences that restate the first.

## Anchors — living style/terminology sources by cluster

- **Go/backend**: @ntuzov, @golang_digest; big-tech Go/PostgreSQL/ClickHouse terminology via @ozon_tech and @AvitoTech.
- **Circumvention/DPI**: @usher2 — RKN/ТСПУ/DPI mechanics, legislation, primary sources. Deep protocol material (sing-box, Xray, VLESS+Reality) lives in Habr author series and on the ntc.party forum, not in a single channel.
- **Self-hosting/DevOps**: @srv_admin (ServerAdmin.ru) — dense practical operator posts; @bashdays as the casual-register data point.
- **AI coding agents**: @evocoders — Claude Code skills/subagents, model comparisons, token-cost optimization.
- **PostgreSQL internals**: Егор Рогов, «PostgreSQL 17 изнутри» (Postgres Professional / ДМК Пресс, 2025; free PDF on postgrespro.ru) plus the Habr series on MVCC, indexes, buffer cache, and WAL — the canonical RU terminology source.

Caveats: handles and subscriber counts drift — verify a channel is alive before citing it. @devopsina is a meme channel, not a technical reference. Aggregator feeds (@goproglib, @backenddigest) are content farms, not register models. Роскомсвобода is designated a «foreign agent» in RF — mind how it is referenced.

## Legal caveats — circumvention and compliance content

**Circumvention.** Verify the current law and publication context:

Before publishing legal claims, retrieve the current statute and applicable enforcement decision from primary sources. Record jurisdiction, effective date, exact provision, and the scope it addresses. Advertising rules, information-blocking rules, and administrative penalties are separate questions.

Do not repeat an unverified “first enforcement” claim or infer the scope of a prohibition from a secondary summary. This style reference is not a legal authority.

**Compliance.** Keep a «not legal advice» frame. Date every legal claim; RF internet regulation moves fast — re-verify statute text and enforcement state before publishing.
