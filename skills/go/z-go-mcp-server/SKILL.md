---
name: z-go-mcp-server
description: MCP (Model Context Protocol) server authoring in Go — SDK choice, transport selection, stdio discipline, tool design, and testing. Use when building or extending a Go MCP server — modelcontextprotocol/go-sdk vs mark3labs/mcp-go, stdio vs streamable HTTP, agent-actionable tool/error descriptions. Does not cover consuming/calling LLMs from Go; see [[z-go-llm-streaming]]. Does not cover context propagation; see [[z-go-context]].
---

# Go MCP server

Build MCP servers with the official SDK by default. Treat every tool as a workflow contract for the calling model, not a REST mirror.

## SDK choice

| | `modelcontextprotocol/go-sdk` | `mark3labs/mcp-go` |
|---|---|---|
| Status | v1.0+ released with an explicit no-breaking-API-changes guarantee; maintained with Google | v0.55+, still pre-1.0 — API can still shift |
| Adoption | ~4.8k stars, 63 open issues | ~8.9k stars, 23 open issues, longer track record |
| Spec conformance | full conformance suite runs on every PR | good coverage, no formal conformance gate |
| Batteries | leaner core; client-side OAuth landed recently (stable since v1.5.0) | richer out of the box — middleware chain, session helpers, in-process test client |
| Go floor | 1.25 | 1.25 |

Default to the official SDK for anything new and long-lived: the v1.0 release commits to backward compatibility, and it tracks the spec first. Reach for `mark3labs/mcp-go` when a team already runs servers on it, or needs one of its conveniences badly enough to accept a pre-1.0 API.

The rest of this skill uses the official SDK's API. The concepts — transport choice, tool design, the error split — carry over 1:1 to `mark3labs/mcp-go`.

## Transport choice

| Transport | Use when | Avoid when |
|---|---|---|
| stdio (`mcp.StdioTransport`) | Local subprocess launched by one client — CLI tools, editor/agent integrations. The spec's default; clients SHOULD support it | Multiple concurrent clients, or the server runs remotely |
| Streamable HTTP (`mcp.NewStreamableHTTPHandler`) | Remote server, multiple concurrent sessions, runs behind a load balancer or in Kubernetes | A single local subprocess covers the need — HTTP adds session-id and origin-validation plumbing for nothing |
| SSE-only (the 2024-11-05 transport) | Never for a new server | Always — superseded by streamable HTTP in spec 2025-03-26; keep it only to serve clients stuck on the old transport |

Streamable HTTP is a single endpoint accepting POST and GET; sessions are tracked via an `Mcp-Session-Id` header the server sets on `initialize` and the client echoes on every later request. The SDK already rejects mismatched-Host localhost requests by default (`DisableLocalhostProtection` is `false` unless you opt out); it does NOT validate `Origin` for you — `StreamableHTTPOptions.CrossOriginProtection` is deprecated, so wrap the handler yourself: `protection := http.NewCrossOriginProtection(); handler = protection.Handler(handler)` (stdlib, Go 1.25+). Current spec is 2025-11-25; a 2026-07-28 revision in release candidate drops session management entirely — including this `Mcp-Session-Id` mechanic — for a stateless core routed by `Mcp-Method`/`Mcp-Name` headers, so recheck this section once that ships.

This server-side streamable-HTTP SSE is internal transport plumbing, not an app-level streaming feature — for hand-rolled SSE to a browser client, see [[z-go-llm-streaming]].

## stdio discipline

Stdout carries protocol JSON-RPC only. Anything else on stdout — a stray `fmt.Println`, a dependency that logs to stdout by default, a panic trace — corrupts the stream and the client can't parse it.

- Build `slog` on `os.Stderr` explicitly: `slog.New(slog.NewJSONHandler(os.Stderr, nil))`. Don't rely on a package default you haven't checked.
- Route or silence any third-party logger that defaults to stdout.
- `mcp.StdioTransport` owns stdout once connected — never write to it yourself.

## Tool design

The model is the caller. Design tools it can pick correctly and recover from when it picks wrong.

- **Name as `service_verb_noun`**: `excursions_search`, `excursions_get_booking`, not `search` or `getData`. A consistent prefix lets an agent juggling several MCP servers disambiguate at a glance.
- **Shape tools around a workflow, not an endpoint.** A tool mirroring `GET /bookings/{id}/legs` 1:1 forces three round trips for one task; a tool returning "booking + legs + cancellation window" together is a better contract. When unsure, favor coverage over cleverness — an under-fitted workflow tool blocks real tasks.
- **Write the description for the model, not a teammate**: what it does, every parameter's meaning and constraints, one example call. Skip adjectives that don't change behavior.
- **Paginate and filter server-side.** Never hand back a raw ClickHouse result set or full Postgres row — cap page size, project only the fields the task needs, summarize the rest.
- **Eval against real tasks before shipping**: write 5-10 realistic, independently verifiable prompts a user would give an agent, run them against the server, and fix whichever tool the model picks wrong or misuses.

## Input schemas from Go structs

`mcp.AddTool` is generic over the input and output types and derives the JSON Schema from the struct — no separate schema to keep in sync:

```go
type SearchParams struct {
	City    string `json:"city" jsonschema:"IATA city code, e.g. LON"`
	Checkin string `json:"checkin" jsonschema:"date in YYYY-MM-DD"`
	Limit   int    `json:"limit,omitempty" jsonschema:"max results, default 20"`
}

mcp.AddTool(server, &mcp.Tool{
	Name:        "excursions_search",
	Description: "Search bookable excursions for a city and date, paginated.",
}, func(ctx context.Context, req *mcp.CallToolRequest, in SearchParams) (*mcp.CallToolResult, SearchResult, error) {
	...
})
```

`json` tags name the fields; `jsonschema` tags supply the description the model reads — write that string by the same rule as the tool description above.

Add every tool with `mcp.AddTool` before calling `Connect` or `Run` — the tools capability advertised in `initialize` is derived from what's registered at that point; a tool added afterward still works but was never advertised to that session.

## Errors the agent can act on

MCP splits failures into two channels — pick the right one:

| Channel | When | Go SDK behavior |
|---|---|---|
| Protocol error (JSON-RPC `error`) | Unknown tool, malformed request, server fault — not something the model can fix by retrying | Only the raw `Server.AddTool(ToolHandler)` path sends this when it returns `error` |
| Tool execution error (`isError: true` in the result) | Bad input, upstream API failure, business-rule violation — the model can retry with different arguments | `mcp.AddTool`'s generic handler packs a returned Go `error` here automatically |

Prefer the generic `mcp.AddTool` path so ordinary failures land as tool errors: `return nil, out, fmt.Errorf("checkin %s is in the past, pick a future date", in.Checkin)`. That string is what the model sees and retries against — write it as an instruction, not a stack trace.

## Cancellation and shutdown

- Tool handlers get the call's `context.Context`; a client cancellation notification cancels it. Check `ctx.Err()` in any loop and return early — don't leave a detached goroutine running past a cancelled call.
- stdio: `ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)`, `defer stop()`, then `server.Run(ctx, &mcp.StdioTransport{})`. `Run` blocks until the client disconnects or `ctx` is cancelled, and closes the session either way.
- Streamable HTTP: `mcp.NewStreamableHTTPHandler` is a plain `http.Handler` — wrap it in `http.Server` and drain with `srv.Shutdown(ctx)` like any other HTTP service.

## Testing

Skip subprocess plumbing — connect a client and server over an in-memory pipe and drive real tool calls:

```go
ct, st := mcp.NewInMemoryTransports()
srv := mcp.NewServer(&mcp.Implementation{Name: "excursions", Version: "test"}, nil)
mcp.AddTool(srv, &mcp.Tool{Name: "excursions_search"}, searchHandler)
ss, _ := srv.Connect(ctx, st, nil)
defer ss.Close()

cli := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "v0"}, nil)
session, _ := cli.Connect(ctx, ct, nil)
result, err := session.CallTool(ctx, &mcp.CallToolParams{
	Name:      "excursions_search",
	Arguments: map[string]any{"city": "LON"},
})
```

This exercises the real handshake, schema validation, and dispatch — no mocking the protocol layer. Assert on `result.IsError` and `result.Content`, the same shape the model receives. One test per tool's happy path, one per validation failure that should surface as a tool error.

Reach for golden JSON-RPC frame fixtures only for cross-SDK wire-compatibility regression tests; the in-memory client above already exercises real serialization, so it stays the default for ordinary handler tests.

## Do not

- Ship a tool whose only documentation is its name — the model has nothing else to pick with.
- Mirror every REST or gRPC endpoint 1:1 "for completeness" — collapse the common workflow into one tool, add the rest only when a real task needs them.
- Return a bad-input failure through the raw `ToolHandler` protocol-error path — the model reads a protocol error as unfixable and gives up instead of retrying.
- Write anything but JSON-RPC frames to stdout in a stdio server, including via a dependency's default logger.
- Build a new server on the 2024-11-05 SSE-only transport.
- Add OAuth or a multi-tenant session store before a concrete client needs them — start with stdio and API-key/env auth, grow from there.

## Verify

```sh
go build ./...
go test ./... -run TestMCP -v
```

Confirm `initialize` negotiates the expected `protocolVersion` and advertises the `tools` capability, and that `tools/list` returns the schema you expect, before wiring a real client to the server.
