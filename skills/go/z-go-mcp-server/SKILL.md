---
name: z-go-mcp-server
description: "Build a Go Model Context Protocol server. Use for SDK selection, stdio or HTTP transports, tool schemas, authorization, errors, and client tests. See [[z-go-llm-streaming]] for LLM clients."
---

# Go MCP server

Design each tool around a task the client can complete with its granted permissions.

## SDK choice

Record the Go version, pinned SDK, protocol revisions, transports, and client versions.
Preserve a working SDK when it supports the required capabilities. The examples use the official SDK's session API.

## Transport choice

| Transport | Use when | Avoid when |
|---|---|---|
| stdio (`mcp.StdioTransport`) | One client starts a local subprocess. Check support for the selected revision. | Multiple concurrent clients, or the server runs remotely |
| Streamable HTTP (`mcp.NewStreamableHTTPHandler`) | Remote server, multiple concurrent sessions, runs behind a load balancer or in Kubernetes | A single local subprocess covers the need — HTTP adds authentication and origin-validation requirements |
| Legacy SSE | Required by an existing client | New integrations that support Streamable HTTP |

Select the lifecycle by negotiated protocol revision.
The [2026-07-28 specification](https://modelcontextprotocol.io/docs/2026-07-28/learn/versioning) specifies discovery and per-request protocol metadata.
Earlier revisions use `initialize` and may use `Mcp-Session-Id`. Test the revision your SDK and client actually support.
Check HTTP Origin and Host handling against that revision. Authenticate the caller and authorize each operation.

## Security boundary

- Derive caller and tenant identity from verified authentication. Authorize the requested action and resource on every call, including read-only tools.
- For OAuth, check issuer, audience, expiry, and scopes. Accept tokens for this server. Use separate credentials for upstream APIs.
- Check tool arguments in code, including ranges, paths, URLs, and ownership. Schema descriptions, tool annotations, and model confidence are not permission checks.
- Treat returned documents, upstream errors, and tool metadata as untrusted content. Keep result data separate from trusted instructions. Do not accept model-supplied approval flags as authorization.
- For consequential actions, check the caller's approval policy at execution time and bind any approval to the exact operation and arguments. Preserve existing valid authorization.
- Limit request/result bytes, execution time, concurrency, and downstream work. Apply [[z-go-http-client]] destination controls to tools that fetch URLs.
- Restrict the stdio process to the files, network, and credentials it needs. Stdio provides no process isolation.

Use [[z-security-hardening]] for shared prompt-injection defenses and [MCP security guidance](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices) for the selected protocol's authorization requirements.

Use [[z-go-llm-streaming]] for application-level SSE output.

## Keep stdio protocol output clean

Reserve stdout for JSON-RPC. Send application diagnostics to stderr. Check dependency logging before starting a stdio server.

- Build `slog` on `os.Stderr` explicitly: `slog.New(slog.NewJSONHandler(os.Stderr, nil))`. Don't rely on a package default you haven't checked.
- Route or silence any third-party logger that defaults to stdout.
- `mcp.StdioTransport` owns stdout once connected — never write to it yourself.

## Tool design

The model is the caller. Design tools it can pick correctly and recover from when it picks wrong.

- **Name as `service_verb_noun`**: `excursions_search`, `excursions_get_booking`, not `search` or `getData`. A consistent prefix lets an agent juggling several MCP servers disambiguate at a glance.
- Give each tool a task-sized result. Include the fields clients need without exposing unrelated resources.
- **Write the description for the model, not a teammate**: what it does, every parameter's meaning and constraints, one example call. Skip adjectives that don't change behavior.
- Filter and paginate results on the server. Return only the fields and rows the task needs.
- Try representative requests and invalid arguments. Check tool selection and the visible result for each.

## Input schemas from Go structs

`mcp.AddTool` is generic over the input and output types and derives the JSON Schema from the struct — no separate schema to keep in sync:

```go
type SearchParams struct {
	City    string `json:"city" jsonschema:"IATA city code, e.g. LON"`
	Checkin string `json:"checkin" jsonschema:"date in YYYY-MM-DD"`
	Limit   int    `json:"limit,omitempty" jsonschema:"max results from 1 to 100, default 20"`
}

mcp.AddTool(server, &mcp.Tool{
	Name:        "excursions_search",
	Description: "Search bookable excursions for a city and date, paginated.",
}, func(ctx context.Context, req *mcp.CallToolRequest, in SearchParams) (*mcp.CallToolResult, SearchResult, error) {
	if in.Limit == 0 {
		in.Limit = 20
	}
	if in.Limit < 1 || in.Limit > 100 {
		return nil, SearchResult{}, errors.New("limit must be between 1 and 100")
	}
	...
})
```

Use `json` tags for field names. Use `jsonschema` tags for descriptions.
Enforce limits and resource ownership in the handler. Pass the normalized limit to the query. Check both schema and runtime behavior.

Register tools before serving requests. Test discovery for each supported revision. Older clients can derive capabilities during initialization.

## Errors the agent can act on

MCP splits failures into two channels — pick the right one:

| Channel | When | Go SDK behavior |
|---|---|---|
| Protocol error (JSON-RPC `error`) | Unknown tool, malformed request, server fault — not something the model can fix by retrying | Only the raw `Server.AddTool(ToolHandler)` path sends this when it returns `error` |
| Tool execution error (`isError: true` in the result) | Bad input, upstream API failure, business-rule violation — the model can retry with different arguments | `mcp.AddTool`'s generic handler packs a returned Go `error` here automatically |

Use `mcp.AddTool` for ordinary tool errors. Return a safe error code and a recovery action. Keep raw upstream errors, tokens, and user instructions out of error messages.

## Cancellation and shutdown

- Pass the call context to downstream work. Exit loops on cancellation. Join workers before the call returns.
- stdio: `ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)`, `defer stop()`, then `server.Run(ctx, &mcp.StdioTransport{})`. `Run` blocks until the client disconnects or its context ends, and closes the session either way.
- Streamable HTTP: `mcp.NewStreamableHTTPHandler` is a plain `http.Handler` — wrap it in `http.Server` and drain with `srv.Shutdown(ctx)` like any other HTTP service.

## Testing

Skip subprocess plumbing — connect a client and server over an in-memory pipe and drive real tool calls:

```go
ct, st := mcp.NewInMemoryTransports()
srv := mcp.NewServer(&mcp.Implementation{Name: "excursions", Version: "test"}, nil)
mcp.AddTool(srv, &mcp.Tool{Name: "excursions_search"}, searchHandler)
ss, err := srv.Connect(ctx, st, nil)
require.NoError(t, err)
defer ss.Close()

cli := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "v0"}, nil)
session, err := cli.Connect(ctx, ct, nil)
require.NoError(t, err)
defer session.Close()
result, err := session.CallTool(ctx, &mcp.CallToolParams{
	Name:      "excursions_search",
	Arguments: map[string]any{"city": "LON"},
})
```

Check the actual client result, including `IsError` and content. Distinguish tool failures from protocol failures for the pinned revision.

Use the in-memory client for handler tests. Reserve JSON-RPC frame fixtures for wire compatibility across SDKs.

## Do not

- Ship a tool whose only documentation is its name — the model has nothing else to pick with.
- Duplicate each REST or gRPC endpoint as a tool. Expose the operations the workflow needs.
- Return a bad-input failure through the raw `ToolHandler` protocol-error path — the model reads a protocol error as unfixable and gives up instead of retrying.
- Write anything but JSON-RPC frames to stdout in a stdio server, including via a dependency's default logger.
- Build a new server on the 2024-11-05 SSE-only transport.
- Expose a remote server before implementing the selected protocol/client authentication contract and per-tool authorization. Keep local stdio setup scoped to the user who started the process.

## Verification

```sh
go build ./...
timeout 5m go test -parallel 4 -p 2 -timeout 2m ./... -run TestMCP -v
```

Test discovery, version negotiation, and tool schemas for each supported SDK and protocol revision. Exercise cancellation, malformed input, and HTTP Origin rejection. Record unsupported revisions.

Reject wrong-audience or expired tokens, cross-tenant reads, invalid limits, forbidden destinations, and missing approvals. Assert that rejected requests never call the protected dependency. Test authorization even when a tool result contains hostile instructions.
