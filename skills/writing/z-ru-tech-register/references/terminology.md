# Terminology — bilingual RU/EN glossary

The Latin-vs-Cyrillic call is the core of the register. Get it wrong and the post reads as machine-translated. This glossary encodes how the RU tech community actually writes, by theme cluster.

**Convention key:**
- `[LAT]` — keep Latin/English (product names, precise CS/networking terms).
- `[CYR]` — keep Cyrillic (RF legal/fiscal/payment terms, fully naturalized words).
- `[CALQUE]` — accepted Russian translation.
- `[MIX]` — both circulate; Latin in the serious register, transliterated when casual.

Rule of thumb: **product/tech names → Latin. RF law → Cyrillic. Only the connective/casual layer transliterates.**

---

## Cluster 1 — Go / backend / high-load

| Term | Convention | Note |
|---|---|---|
| backend | `[MIX]` | "backend" in serious register; "бэкенд" casual |
| highload / high-load | `[MIX]` | "highload"; adjective → высоконагруженный (высоконагруженные системы) |
| goroutine | `[CYR]` | горутина — fully naturalized ("горутины и каналы") |
| channel (Go) | `[CALQUE]` | канал |
| handler | `[MIX]` | хендлер (casual) / обработчик (formal) |
| runner | `[CYR]` | раннер |
| observability | `[LAT]` | often kept Latin; обсёрвабилити only in speech |
| connection pooling | `[MIX]` | "connection pooling" or пул соединений; pooler → пулер |
| microservice | `[CYR]` | микросервис / микросервисы |
| event-driven | `[LAT]` | event-driven pipeline |
| codegen | `[MIX]` | кодогенерация / codegen |
| JSON | `[MIX]` | JSON written; джейсон spoken only |
| Garbage Collector / GC | `[LAT]` | сборка мусора as calque |
| clean architecture | `[CALQUE]` | чистая архитектура — strongly established |
| hexagonal architecture | `[MIX]` | гексагональная архитектура |
| generics | `[CYR]` | дженерики |
| scheduler | `[CALQUE]` | планировщик |
| tuple | `[CYR]` | кортеж |
| deploy / deployment | `[CYR]` | деплой / выкладка |

Product/lib names always Latin: `ogen`, `sqlc`, `pgx`, `Kafka`, `NATS`, `gRPC`, `protobuf`, `goose`, `testcontainers`, `golangci-lint`, `OpenTelemetry`, `Prometheus`, `Grafana`, `Jaeger`.

## Cluster 2 — Censorship-circumvention / DPI-bypass

| Term | Convention | Note |
|---|---|---|
| обход блокировок | `[CYR]` | canonical community phrase |
| замедление | `[CYR]` | the standard term for throttling (YouTube/Telegram) |
| DPI | `[LAT]` | gloss once as "глубокий анализ пакетов" |
| ТСПУ | `[CYR]` | технические средства противодействия угрозам |
| РКН / Роскомнадзор | `[CYR]` | |
| VLESS, Reality, Vision, XTLS | `[LAT]` | protocol names |
| Xray, sing-box, Shadowsocks, Trojan | `[LAT]` | tool names |
| WireGuard, AmneziaWG | `[LAT]` | |
| zapret | `[LAT]` | project name; "запрет" only in wordplay |
| прокси | `[CYR]` | but MTProto / SOCKS5 stay `[LAT]` |
| маскировка | `[CYR]` | masquerading under legit traffic |
| обфускация | `[CYR]` | |
| fingerprint / uTLS / shortId / flow | `[LAT]` | config terms |
| TPROXY / netns / MTU / DNAT | `[LAT]` | |
| fake / split / desync | `[LAT]` | zapret strategy names |
| КВН | `[CYR]` | community euphemism for VPN |

Framing note: analyze mechanics only. Do not name a service to buy or give acquisition steps (see `register.md`).

## Cluster 3 — Self-hosted infra / DevOps

| Term | Convention | Note |
|---|---|---|
| self-hosted / self-hosting | `[MIX]` | "self-hosted" or селфхостед; "своя инфраструктура" |
| homelab | `[LAT]` | |
| бэкап | `[CYR]` | backup |
| гипервизор, виртуалка, файрвол | `[CYR]` | |
| контейнер, докер | `[CYR]` | but Docker the product → Latin |
| пулер соединений | `[CALQUE]` | connection pooler |
| пул сеансов / пул транзакций | `[CALQUE]` | session pool / transaction pool |
| режим session/transaction | `[MIX]` | pooling mode |
| ingress / CORS | `[LAT]` | |
| strangler-fig | `[LAT]` | pattern name |
| API gateway | `[MIX]` | "API-шлюз" or gateway |
| ядро / сборка ядра | `[CYR/CALQUE]` | kernel / kernel build |

Product names Latin: `Kubernetes`, `Docker`, `Helm`, `Proxmox`, `Traefik`, `PgBouncer`, `PgDog`, `Odyssey`, `pgxpool`, `Supabase`, `Dokploy`, `ingress-nginx`.

## Cluster 4 — AI coding agents

| Term | Convention | Note |
|---|---|---|
| Claude Code / Codex / OpenCode | `[LAT]` | |
| MCP / SWE-bench | `[LAT]` | |
| агент / субагент / мультиагентный | `[CYR/CALQUE]` | |
| скилл | `[CYR]` | skill |
| промт | `[CYR]` | prompt |
| вайбкодинг | `[CYR]` | vibe coding |
| оркестрация / оркестратор | `[CYR/CALQUE]` | |
| spec-driven development | `[LAT]` | |
| контекст / окно контекста | `[CYR]` | |

## Cluster 5 — RF regulatory compliance (highest-value; stays Cyrillic)

| Term | Convention | Note |
|---|---|---|
| 152-ФЗ | `[CYR]` | personal-data localization; "закон о персональных данных" |
| персональные данные (ПДн) | `[CYR]` | |
| оператор ПДн | `[CYR]` | |
| локализация данных | `[CYR]` | |
| трансграничная передача | `[CYR]` | cross-border transfer |
| уведомление в Роскомнадзор | `[CYR]` | |
| 149-ФЗ | `[CYR]` | |
| ОРИ / реестр ОРИ | `[CYR]` | организатор распространения информации |
| 236-ФЗ / приземление | `[CYR]` | platform landing; triggers >500k daily RU users |
| 436-ФЗ / возрастная маркировка | `[CYR]` | age rating |
| 54-ФЗ | `[CYR]` | |
| касса / онлайн-касса / ККТ | `[CYR]` | |
| ОФД | `[CYR]` | оператор фискальных данных |
| фискальный накопитель (ФН) | `[CYR]` | |
| кассовый чек / ФФД | `[CYR]` | |
| ФНС | `[CYR]` | |
| СБП | `[CYR]` | Система быстрых платежей |
| Мир | `[CYR]` | card system |
| эквайринг | `[CYR]` | |
| НСПК | `[CYR]` | |
| ИП / ООО / самозанятый | `[CYR]` | |
| КоАП | `[CYR]` | |
| КЭП | `[CYR]` | квалифицированная электронная подпись |

Even inside compliance posts, developer-facing terms stay Latin/transliterated: `API`, эндпоинт, интеграция.

## PostgreSQL internals (canonical RU source: Егор Рогов, «PostgreSQL 17 изнутри»)

покрывающие индексы (covering indexes), MVCC `[LAT]`, кортеж/tuple, изоляция транзакций, work_mem `[LAT]`, буферный кэш, WAL `[LAT]`, автовакуум/autovacuum `[MIX]`, планировщик запросов, соединения/joins — nested loop / hash join / merge join `[LAT]`.
