---
name: z-go-llm-streaming
description: >
  Wire an LLM chat feature end-to-end in Go — decorate an SDK's own chat-model
  interface (or a hand-rolled ChatCompleter when no SDK is in play), a
  resilience decorator, SDK callback-based instrumentation, and Server-Sent
  Events streaming with named events to HTTP clients. Use when adding a
  streaming or non-streaming AI capability, choosing between decorating an SDK
  interface vs a custom abstraction, wiring eino's callback handler, or
  streaming named SSE events to a client. Triggers on "llm streaming",
  "ChatCompleter", "SSE", "text/event-stream", "http.Flusher", "decorator",
  "resilient chat", "stream chunks", "chat completer", "eino callbacks". Does
  not cover provider SDK setup (eino, OpenAI client, etc.) or prompt
  engineering. See also [[z-go-observability]] for OTel span and metrics
  wiring, [[z-go-context]] for context propagation rules.
---

# LLM Streaming

Pick the right abstraction boundary first, then add resilience, instrumentation, and SSE
streaming on top of it.

## Interface: decorate the SDK, don't wrap it again

When a provider SDK is already in play (eino, an OpenAI client, etc.), decorate its own
interface directly instead of adding a redundant custom abstraction. The real case here
decorates eino's own `model.ToolCallingChatModel`:

```go
type resilientChatModel struct {
    model.ToolCallingChatModel
}

func (m *resilientChatModel) Generate(ctx context.Context, msgs []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    // retry/fallback around m.ToolCallingChatModel.Generate
    return m.ToolCallingChatModel.Generate(ctx, msgs, opts...)
}
```

Embedding promotes every method you don't override; overriding `Generate`/`Stream` adds
retries or fallback without a second interface the rest of the codebase has to learn. One
gotcha: `WithTools` returns the embedded `ToolCallingChatModel`, not `*resilientChatModel`
— calling it on the wrapper silently drops the decoration. Re-wrap the result if the
feature calls `WithTools` after decorating.

## Hand-rolled ChatCompleter — no SDK in play

Reach for a custom `ChatCompleter` only when there's no SDK to decorate — talking to a
provider's raw HTTP API directly, or abstracting over multiple unrelated SDKs behind one
seam:

```go
type Chunk struct {
    Delta string
    Done  bool
}

type Message struct {
    Role    string // "system", "user", "assistant"
    Content string
}

type Request struct {
    Messages  []Message
    MaxTokens int
}

type ChatCompleter interface {
    Complete(ctx context.Context, req Request) (string, error)
    Stream(ctx context.Context, req Request) (iter.Seq2[Chunk, error], error)
}
```

A typed `StatusError{Code int; Body string}` surfaced by the concrete provider for
non-2xx responses lets callers classify 401/403 (fatal) from 429/5xx (retryable) without
inspecting raw HTTP.

## Resilience decorator

Whichever interface is being decorated, a resilience layer classifies provider errors,
retries transient ones (429, 5xx, network) with exponential backoff and jitter, and falls
back to an alternate implementation when the primary is exhausted:

```go
raw   := newOpenAIProvider(cfg)
resil := newResilientChat(raw, resilientOptions{MaxRetries: 3, Fallback: fallback})
```

A cumulative token-budget cap (an `ErrBudgetExceeded`-style sentinel) is a natural
extension of this layer but not yet built anywhere — add it once a feature needs a hard
spend ceiling, don't build it speculatively.

## Instrumentation: use the SDK's callback mechanism when one exists

Don't wrap a third decorator around the chat model for instrumentation if the SDK already
exposes a hook. eino's `utils/callbacks` package builds a `callbacks.Handler` from
per-component function fields — register it once and every `Generate`/`Stream` call
through the model is instrumented, no extra interface layer required:

```go
handler := callbacksutil.NewHandlerHelper().
    ChatModel(&callbacksutil.ModelCallbackHandler{
        OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *model.CallbackInput) context.Context {
            return ctx // start span / record start time
        },
        OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *model.CallbackOutput) context.Context {
            return ctx // record latency, end span
        },
        OnError: func(ctx context.Context, info *callbacks.RunInfo, err error) context.Context {
            return ctx // record error, set span status
        },
    }).
    Handler()

ctx = callbacks.InitCallbacks(ctx, &callbacks.RunInfo{
    Component: components.ComponentOfChatModel,
    Name:      "chat",
}, handler)

msg, err := chatModel.Generate(ctx, messages)
```

For a hand-rolled `ChatCompleter` with no SDK callback mechanism, fall back to an
instrumentation decorator outermost (`instrumented → resil → raw`) — one span covers the
complete call including every retry attempt. Resilience outermost inverts that trade-off:
each retry attempt gets its own span, useful for debugging retry storms, at the cost of
the aggregate per-request view.

## Streaming vs non-streaming HTTP clients

This split applies to hand-rolled clients that own their `http.Client`. Never set
`Timeout` on the client used for streaming — the deadline fires mid-response and severs
the connection:

```go
streamClient    := &http.Client{Transport: transport}                              // no Timeout
nonStreamClient := &http.Client{Timeout: cfg.ChatTimeout, Transport: transport}
```

When an SDK owns the transport — the real case configures one `Timeout` on the SDK's
client for both streaming and non-streaming calls — this split doesn't apply; the SDK is
trusted to handle its own streaming deadlines.

For non-streaming calls, apply `context.WithTimeout` at the use-case level. For streaming
calls, rely on the HTTP handler's `r.Context()` — the server cancels it on client
disconnect, which propagates through the call chain.

## SSE handler: named events

Real streaming responses emit named SSE events (`event: token` / `error` / `answer` /
`question`) with a JSON payload, driven from a callback/emit function — not a bare
`data: %s\n\n` + `[DONE]` loop:

```go
type event struct {
    Name string
    Data any
}

func emitSSE(w http.ResponseWriter, flusher http.Flusher, ev event) error {
    payload, err := json.Marshal(ev.Data)
    if err != nil {
        return fmt.Errorf("marshal event: %w", err)
    }
    if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", ev.Name, payload); err != nil {
        return fmt.Errorf("write event: %w", err)
    }
    flusher.Flush()
    return nil
}

func streamToClient(ctx context.Context, w http.ResponseWriter, emit func(func(event) error) error) error {
    flusher, ok := w.(http.Flusher)
    if !ok {
        return errors.New("streaming unsupported")
    }
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.WriteHeader(http.StatusOK)

    return emit(func(ev event) error {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }
        return emitSSE(w, flusher, ev)
    })
}
```

Emit `token` events per delta, `question`/`answer` for structured turns the feature
defines, and a terminal `error` event for a failure — the client's `EventSource` (or
equivalent) dispatches on `event.type` instead of parsing a sentinel out of `data`.

Only add `X-Accel-Buffering: no` if a real deployment actually sits behind an
nginx-buffering ingress — don't add it speculatively.

## Feature telemetry

A per-feature string constant for Prometheus/OTel label breakdown earns its keep once a
second LLM feature exists and needs cost/latency broken down per capability. With one
feature in production there's nothing to break down yet — don't add the constant or the
histogram ahead of that need.

## Do not

- Add a custom `ChatCompleter` on top of an SDK's own chat-model interface — decorate the
  SDK interface directly.
- Wrap a third decorator around the chat model for instrumentation when the SDK already
  exposes a callback/hook mechanism.
- Call `WithTools` on a decorated `ToolCallingChatModel` without re-wrapping the result —
  it returns the undecorated inner model.
- Build a cumulative token-budget cap before a feature actually needs a spend ceiling.
- Emit bare `data: %s\n\n` + `[DONE]` SSE framing when the feature has more than one kind
  of event to distinguish — use named `event:` lines instead.
- Add `X-Accel-Buffering: no` without a real nginx-buffering deployment behind it.
- Add per-feature telemetry constants before a second LLM feature needs the breakdown.
- Set `Timeout` on a hand-rolled streaming `http.Client` — it terminates mid-response.
- Omit the `ctx.Done()` check in a hand-rolled SSE loop — the upstream LLM call continues
  billing after the client disconnects.

## Verify

```sh
# confirm named SSE events and per-chunk flushing
curl -N -H "Accept: text/event-stream" http://localhost:8080/api/v1/chat/stream
# expected: interleaved  event: token\ndata: {...}\n\n  blocks, terminated by an
# event: answer  or  event: error  block

# confirm client-disconnect terminates the upstream call
# cancel curl mid-stream; the service should log no further chunk emissions
# and the LLM API request should close promptly
```
