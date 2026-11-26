---
name: z-go-llm-streaming
description: "Implement Go chat streaming with an SDK or HTTP client. Use for SSE events, request cancellation, provider errors, retries, and telemetry. See [[z-go-context]] and [[z-go-observability]]."
---

# LLM Streaming

Select the model interface and the client-visible stream contract before implementing retries.

## Trust boundary

Build privileged instructions and trusted history on the server. Do not decode a public request directly into the internal `Request` below: clients cannot select system/developer roles, replace stored tool results, or raise server-owned limits. Authorize conversation and retrieval access per caller and tenant.

Keep retrieved documents, user content, and tool results separate from trusted instructions. Authorize tool arguments at execution. Structured output and prompt delimiters cannot enforce permissions.

Check content before sending it to a tool, renderer, or user. Buffer the response when policy requires whole-response review. Restrict destinations for Markdown links and images. Exclude prompts, responses, and secrets from routine logs. See [[z-security-hardening]].

## Extend an SDK interface

Use the installed SDK's interface when it supports the feature. This example extends Eino's `model.ToolCallingChatModel`.

```go
type resilientChatModel struct {
    model.ToolCallingChatModel
}

func (m *resilientChatModel) Generate(ctx context.Context, msgs []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    // retry/fallback around m.ToolCallingChatModel.Generate
    return m.ToolCallingChatModel.Generate(ctx, msgs, opts...)
}
```

Embedding promotes methods that the wrapper does not override.
If `WithTools` returns an undecorated model, wrap that result before returning it.

## Define an HTTP client interface

Use a narrow interface for a raw HTTP provider or a shared operation across unrelated SDKs.

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

Use a typed status error to distinguish authentication failures from temporary failures. Keep raw response bodies bounded and private. Retry only within the remaining budget when replay is safe.

## Resilience decorator

Classify failures before retrying. Retry a transient failure only when replay is safe and the remaining budget permits it.
After emitting output, resume only when the protocol can prevent duplicate tokens or actions.

```go
raw   := newOpenAIProvider(cfg)
resil := newResilientChat(raw, resilientOptions{MaxRetries: 3, Fallback: fallback})
```

Limit input, output, tool calls, retries, concurrency, and spending on the server. Charge retries and fallback providers to the same allowance. Reserve capacity before concurrent work. Reconcile actual usage after completion, including timed-out requests. [OWASP GenAI](https://genai.owasp.org/)

## Instrument model calls

Use existing SDK callbacks when they expose the required measurements. Eino registers these callbacks with a handler.

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

An outer span can cover the logical request. Use child spans or callbacks for individual attempts.

## Streaming vs non-streaming HTTP clients

`http.Client.Timeout` includes response-body reads. For a long stream, bound connection setup, response headers, time to first token, idle time, and total lifetime. Propagate the caller’s cancellation.

Use a separate client when streaming requires different limits. Test stalled reads, caller cancellation, and expired stream deadlines with the pinned SDK. After sending output, retry only if the protocol can resume without duplicates.

## Send named SSE events

Use server-defined event names when clients must distinguish tokens, questions, answers, and errors. Encode each event payload as JSON.

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

Close the client's `EventSource` after the terminal event. Bind reconnections to an operation identity before replaying any output.
Use Go 1.20+ response-controller support for per-write deadlines. Check middleware support and the deployment's slow-client policy.
Cancel upstream work after a write or flush fails. Bound stream lifetime, tokens, tool calls, retries, and spending across providers.
An interrupted connection can prevent the terminal event from reaching the client.
Configure `X-Accel-Buffering` only for an ingress that uses it.

## Feature telemetry

Use bounded feature labels only when the product needs separate cost or latency measurements.

## Verification

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
