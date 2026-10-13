---
name: z-go-llm-streaming
description: Wire an LLM chat feature end-to-end in Go — decorate an SDK's chat-model interface (or a hand-rolled ChatCompleter), a resilience decorator, callback instrumentation, and Server-Sent Events streaming. Use when adding a streaming AI capability. Triggers on "llm streaming", "ChatCompleter", "SSE", "text/event-stream", "eino callbacks", "resilient chat". Does not cover SDK setup or OTel/context wiring; see [[z-go-observability]], [[z-go-context]].
---

# LLM Streaming

Pick the right abstraction boundary first, then add resilience, instrumentation, and SSE
streaming on top of it.

## Trust boundary

Build privileged instructions and trusted history on the server. Do not decode a public request directly into the internal `Request` below: clients cannot select system/developer roles, replace stored tool results, or raise server-owned limits. Authorize conversation and retrieval access per caller and tenant.

Keep retrieved documents, user content, and tool results separate from trusted instructions. Treat generated tool arguments as proposals: validate and authorize them at execution, outside the model. Structured output and prompt delimiters do not enforce permissions. Shared defenses and adversarial checks belong to [[z-security-hardening]].

Validate output before it reaches a tool, renderer, or external destination. If policy requires whole-response review, buffer until review completes. Once streamed, content cannot be recalled. Treat Markdown links and images as possible outbound requests; prevent unauthorized destinations and secret disclosure. Exclude raw prompts, responses, credentials, and provider bodies from routine telemetry.

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

A typed provider status error lets callers classify authentication failures separately from transient failures. Keep raw response bodies bounded and private; do not include them in client errors or routine logs. Retry only when replay is safe and the shared request budget remains.

## Resilience decorator

Whichever interface is being decorated, a resilience layer classifies provider errors,
retries transient ones (429, 5xx, network) with exponential backoff and jitter, and falls
back to an alternate implementation when the primary is exhausted:

```go
raw   := newOpenAIProvider(cfg)
resil := newResilientChat(raw, resilientOptions{MaxRetries: 3, Fallback: fallback})
```

For exposed features, enforce server-owned input/output, retry, tool-chain, concurrency, and spending limits. Count retries and fallbacks against the same allowance; switching providers must not reset it. Reuse existing quota controls and reserve capacity atomically before concurrent work. Reconcile actual usage afterward and do not assume a timeout means the provider incurred no cost. See [OWASP GenAI Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/).

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

Choose streaming deadlines deliberately. A short `http.Client.Timeout` covers body reading and will cut off a healthy long stream. A zero client timeout is acceptable only with explicit connection/header, first-token, idle and maximum-stream budgets. Derive the request context from the caller so disconnect cancellation propagates; disconnect alone does not bound a stalled upstream.

Use separate clients/configurations when streaming and bounded calls need different limits. Inspect the pinned SDK's transport and cancellation behavior; do not assume it supplies idle deadlines. Test a server that sends headers then stalls, cancellation during reading, and a stream exceeding the maximum lifetime. Once output has been emitted, do not transparently retry the whole request unless the protocol supports resumable delivery without duplicate tokens.

## SSE handler: named events

Real streaming responses emit named SSE events (`event: token` / `error` / `answer` /
`question`) with a JSON payload, driven from a callback/emit function — not a bare
`data: %s\n\n` + `[DONE]` loop:

```go
type event struct {
    Name string
    Data any
}

func emitSSE(w http.ResponseWriter, ev event) error {
    switch ev.Name {
    case "token", "error", "answer", "question":
    default:
        return errors.New("invalid event name")
    }
    payload, err := json.Marshal(ev.Data)
    if err != nil {
        return fmt.Errorf("marshal event: %w", err)
    }
    if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", ev.Name, payload); err != nil {
        return fmt.Errorf("write event: %w", err)
    }
    if err := http.NewResponseController(w).Flush(); err != nil {
        return fmt.Errorf("flush event: %w", err)
    }
    return nil
}

func streamToClient(ctx context.Context, w http.ResponseWriter, writeTimeout time.Duration, emit func(func(event) error) error) error {
    if writeTimeout <= 0 {
        return errors.New("write timeout must be positive")
    }
    controller := http.NewResponseController(w)
    if err := controller.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
        return fmt.Errorf("set stream write deadline: %w", err)
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
        if err := controller.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
            return fmt.Errorf("set stream write deadline: %w", err)
        }
        return emitSSE(w, ev)
    })
}
```

Emit `token` events per delta, `question`/`answer` for structured turns the feature
defines, and a terminal `error` event for a failure — the client's `EventSource` (or
equivalent) dispatches on `event.type` instead of parsing a sentinel out of `data`.

Close the client's `EventSource` after a terminal event. Its automatic reconnection must not start another billable generation; use an explicit operation identity and replay policy when reconnection is supported.

Keep event names server-owned; JSON encoding protects data, not SSE field names. The example requires Go 1.20+ response-controller support, including deadline support through middleware. Choose the write timeout from the deployment's slow-client policy. The emitter must use the same cancellable context for upstream work, stop on callback errors, and enforce maximum stream lifetime and output size. Cancel upstream work when this function returns. Send only safe terminal errors; failed writes may prevent any terminal event.

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
- Let retry, fallback, or tool loops bypass the caller's quota and authorization.
- Emit bare `data: %s\n\n` + `[DONE]` SSE framing when the feature has more than one kind
  of event to distinguish — use named `event:` lines instead.
- Add `X-Accel-Buffering: no` without a real nginx-buffering deployment behind it.
- Add per-feature telemetry constants before a second LLM feature needs the breakdown.
- Use a short bounded-call timeout for a long stream, or disable it without replacement limits.
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

Test forged roles/history, unauthorized conversation access, malformed event names, failed writes/flushes, slow clients, and exhausted limits across retries/fallbacks. Include split-chunk Markdown injection and malicious retrieved/tool content. Assert that protected actions and outbound requests remain denied, rather than grading only the model's refusal text.
