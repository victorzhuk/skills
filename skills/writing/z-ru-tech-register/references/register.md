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

Length on Telegram: ~4096 chars for a text post, 1024 as a media caption. Longreads split into numbered parts («Часть 1/3») or move to Telegraph/Teletype/blog with a link post.

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

**Circumvention.** RF law has hardened:

- Advertising circumvention tools is banned by ч.10.8 ст.5 закона «О рекламе» and penalized under ч.18 ст.14.3 КоАП (introduced by № 281-ФЗ of 31.07.2025, in force 01.09.2025): fines 50–80 тыс. ₽ for individuals, 80–150 тыс. ₽ for officials, 200–500 тыс. ₽ for legal entities.
- п.1 ч.5 ст.15.1 149-ФЗ bans instructions, guides, and service lists for circumvention; non-removal is penalized under ст.13.41 КоАП with fines up to 4 млн ₽.
- First FAS enforcement: January 2026, Волгоградское УФАС (Решение № 035/05/5-1030/2025) — a blog owner fined as an individual, on the reading that any VPN advertising violates the ban.

Write circumvention content as neutral engineering analysis of mechanics only. Never recommend a service, never give acquisition or setup steps framed as «how to get access».

**Compliance.** Keep a «not legal advice» frame. Date every legal claim; RF internet regulation moves fast — re-verify statute text and enforcement state before publishing.
