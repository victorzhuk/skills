# Examples

## Golden post — annotated

The reference post. Every structural and register choice below is deliberate.

```
**Как распространять EU-hosted продукт в России и не перевозить весь backend.**

Коротко: **152-ФЗ не требует держать весь сервер в РФ**. Требование другое — первичная запись и master-copy персональных данных российских пользователей должны быть в российской базе.

Это можно закрыть тонким `identity-perimeter`.

В РФ живёт маленький узел:

— `tg_id`
— имя
— `user_uuid`
— billing/receipts, если есть СБП или Мир

В EU остаётся основной backend: задачи, прогресс, скоринг, аналитика, observability и вся продуктовая логика.

Через границу уходит не личность пользователя, а псевдоним и учебное состояние. EU brain не знает, кто это в реальности.

Отдельно разобрал ОРИ. Если не строить внутри приложения user-to-user messaging, а оставить общение в Telegram, можно не попадать в контур 149-ФЗ: реестр, хранение сообщений, FSB-access и всё остальное.

Leaderboard тоже не бесплатный с точки зрения privacy. Реальные имена и Telegram usernames — это персональные данные. Лучше рейтинг на никнеймах и `user_uuid`.

**Самая сложная часть — не данные, а платежи.**

**Stars-only** — проще юридически: остаёшься foreign entity, без российской кассы, СБП и Мир.

**СБП + Мир** — нужен российский контур: ИП/ООО, счёт, агрегатор, 54-ФЗ, чеки, ОФД или проверка образовательного исключения.

Но даже в этом варианте backend не обязан переезжать. В РФ остаются identity, billing и fiscalization. Product brain остаётся в EU.

**Главный вывод:** сервер не переезжает. Переезжает только identity boundary.

__The server doesn't move. Only the pseudonym travels.__

https://victorzh.uk/slog/russia-thin-identity-perimeter
```

**Why it works:**
- Thesis line carries the whole claim, no emoji.
- `Коротко:` states the real constraint flat, correcting the naive reading.
- `` `code` `` on every identifier: `tg_id`, `user_uuid`, `identity-perimeter`.
- Em-dash bullets only where enumeration earns it (the node contents).
- Register: RF legal in Cyrillic (`152-ФЗ`, `СБП`, `Мир`, `ОРИ`, `ИП/ООО`, `54-ФЗ`, `ОФД`), tech in English inline (`backend`, `observability`, `foreign entity`, `identity boundary`, `leaderboard`, `fiscalization`).
- Payments handled as paired `**bold**`-headed blocks, not a table.
- `**Главный вывод:**` compresses to one line.
- `__italic__` English aphorism restates the thesis in a fresh frame.
- Bare blog URL last.
- No "not X but Y", no tutorial glue, no CTA.

## Skeleton

```
**{thesis — the whole claim in one line}**

Коротко: **{real constraint, stated flat}**. {one clarifying sentence}

{setup line}:

— {point}
— {point}
— {point}

**{section pivot}**
{declarative body, one fact per sentence}

**{section pivot}**
{body}

**Главный вывод:** {takeaway in one line}

__{English aphorism restating the thesis}__

https://victorzh.uk/slog/{slug}
```

Drop any block the post doesn't need. Floor: thesis line, body, link.
