---
name: z-go-telegram-bot
description: >
  Hand-rolled Telegram Bot API client in Go for MarkdownV2/Mini-App/Stars-level
  control. Covers the minimal Bot struct over net/http, common methods
  (sendMessage, sendPhoto, answerCallbackQuery), MarkdownV2 escaping (reserved
  character set and escape helper), webhook secret-token and Mini App initData
  HMAC validation, and Telegram Stars payment calls (createInvoiceLink,
  answerPreCheckoutQuery, RefundStarPayment). For simpler polling/webhook-only
  bots, the `github.com/go-telegram/bot` library is a fine alternative — reach
  for the hand-rolled client once you need that level of control. Use when
  adding a bot method, formatting MarkdownV2 text, validating a Telegram Mini
  App's initData, or wiring Stars payments. Triggers on "telegram bot api",
  "sendMessage", "MarkdownV2", "initData", "X-Telegram-Bot-Api-Secret-Token",
  "createInvoiceLink", "Telegram Stars". Does not cover general request
  hardening; see [[z-go-security]].
---

# Telegram Bot API Client

Two real patterns, pick by complexity. Simple polling/webhook-only bots can
use `github.com/go-telegram/bot`. Once you need MarkdownV2 formatting, Mini
App initData validation, or Stars payments, hand-roll a client instead: every
call is a POST to `https://api.telegram.org/bot<token>/<method>`. Place the
client in your infrastructure layer (e.g., `internal/infra/telegram/`).

## Client

```go
type Bot struct {
	token  string
	client *http.Client
}

func NewBot(token string, client *http.Client) *Bot {
	return &Bot{token: token, client: client}
}
```

### Per-method request/response (real default)

Each method marshals its body, POSTs, and decodes the `{ok, result,
description}` envelope inline. This is what real code does — repeated
boilerplate per method, no shared helper:

```go
func (b *Bot) SendMessage(ctx context.Context, chatID int64, text, parseMode string) error {
	body, err := json.Marshal(map[string]any{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": parseMode,
	})
	if err != nil {
		return fmt.Errorf("sendMessage: marshal: %w", err)
	}
	u := "https://api.telegram.org/bot" + b.token + "/sendMessage"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("sendMessage: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.client.Do(req)
	if err != nil {
		return fmt.Errorf("sendMessage: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	var envelope struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return fmt.Errorf("sendMessage: decode: %w", err)
	}
	if !envelope.OK {
		return fmt.Errorf("sendMessage: %s", envelope.Description)
	}
	return nil
}
```

`SendPhoto` is the same marshal/request/decode/OK-check shape as `SendMessage`
above — only the request body and the method name (`sendPhoto`) differ:

```go
"chat_id": chatID,
"photo":   photo,
"caption": caption,
```

The `photo` field accepts a `file_id`, a URL, or an `InputFile` upload.
Error prefix convention: `"<methodName>: <step>: %w"` — lowercase, no
trailing period.

### Generic helper (optional DRY-up)

Once enough methods repeat the same shape, collapse it into one generic
helper — this is an improvement to reach for, not the assumed default:

```go
func call[T any](ctx context.Context, b *Bot, method string, body any) (T, error) {
	var zero T
	encoded, err := json.Marshal(body)
	if err != nil {
		return zero, fmt.Errorf("%s: marshal: %w", method, err)
	}
	u := "https://api.telegram.org/bot" + b.token + "/" + method
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(encoded))
	if err != nil {
		return zero, fmt.Errorf("%s: new request: %w", method, err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.client.Do(req)
	if err != nil {
		return zero, fmt.Errorf("%s: %w", method, err)
	}
	defer func() { _ = resp.Body.Close() }()
	var envelope struct {
		OK          bool   `json:"ok"`
		Result      T      `json:"result"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return zero, fmt.Errorf("%s: decode: %w", method, err)
	}
	if !envelope.OK {
		return zero, fmt.Errorf("%s: %s", method, envelope.Description)
	}
	return envelope.Result, nil
}
```

For methods with no meaningful return value use `call[json.RawMessage]` and
discard the result; the envelope's `description` still surfaces error detail.
The rest of this skill shows methods built on `call[T]` for brevity — both
patterns produce the same wire behavior.

## Common methods

```go
func (b *Bot) AnswerCallbackQuery(ctx context.Context, queryID, text string, showAlert bool) error {
	_, err := call[json.RawMessage](ctx, b, "answerCallbackQuery", map[string]any{
		"callback_query_id": queryID,
		"text":              text,
		"show_alert":        showAlert,
	})
	return err
}
```

## Dev mode / no-op

When no token is configured, swap in a no-op that satisfies the same narrow
interface the use case consumes:

```go
type NoopBot struct{ log *slog.Logger }

func (n *NoopBot) SendMessage(_ context.Context, chatID int64, text, _ string) error {
	n.log.Debug("noop send message", "chat_id", chatID, "text", text)
	return nil
}
```

Nil-guard the real `*Bot` at the composition root; do not bury the check
inside bot methods.

## MarkdownV2 escaping

MarkdownV2 reserves these characters — all must be backslash-escaped outside
formatting contexts:

```
_ * [ ] ( ) ~ ` > # + - = | { } . !
```

An escape helper walks the string rune by rune, prefixing reserved characters
with a backslash:

```go
const mdv2Reserved = "_*[]()~`>#+-=|{}.!"

func EscapeMarkdownV2(s string) string {
	var b strings.Builder
	for _, r := range s {
		if strings.ContainsRune(mdv2Reserved, r) {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}
```

Call `EscapeMarkdownV2` on every dynamic value (user names, IDs, numbers
formatted as strings). Static decoration characters in the template (`*bold*`,
`_italic_`) are already written escaped by hand.

## Webhook security

### Secret-token header

Set a secret token when registering the webhook with `setWebhook`. Validate it
before processing the body:

```go
func validateWebhookSecret(r *http.Request, expected string) bool {
	got := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
	return subtle.ConstantTimeCompare([]byte(got), []byte(expected)) == 1
}
```

`subtle.ConstantTimeCompare` is constant-time — never `==` for secret
comparison. Reserve `hmac.Equal` for comparing two already-computed HMAC
digests against each other, as in the initData check below — not general
secret comparison (see [[z-go-security]]).

### Mini App initData

Telegram Mini Apps pass `initData` as a URL-encoded query string. Validate the
HMAC-SHA256 signature before trusting any field in it:

```go
func ValidateInitData(initData, botToken string, maxAge time.Duration, now time.Time) error {
	vals, err := url.ParseQuery(initData)
	if err != nil {
		return fmt.Errorf("parse initData: %w", err)
	}
	hash := vals.Get("hash")
	vals.Del("hash")

	pairs := make([]string, 0, len(vals))
	for k, vs := range vals {
		pairs = append(pairs, k+"="+vs[0])
	}
	sort.Strings(pairs)
	dataCheck := strings.Join(pairs, "\n")

	secretKey := deriveInitDataKey(botToken)
	mac := hmac.New(sha256.New, secretKey)
	mac.Write([]byte(dataCheck))
	expected := mac.Sum(nil)

	got, err := hex.DecodeString(hash)
	if err != nil {
		return fmt.Errorf("decode hash: %w", err)
	}
	if !hmac.Equal(expected, got) {
		return errors.New("initData: invalid signature")
	}

	authDate, err := strconv.ParseInt(vals.Get("auth_date"), 10, 64)
	if err != nil {
		return fmt.Errorf("parse auth_date: %w", err)
	}
	if now.Sub(time.Unix(authDate, 0)) > maxAge {
		return errors.New("initData: expired")
	}
	return nil
}

func deriveInitDataKey(botToken string) []byte {
	mac := hmac.New(sha256.New, []byte("WebAppData"))
	mac.Write([]byte(botToken))
	return mac.Sum(nil)
}
```

The HMAC key is derived as `HMAC-SHA256("WebAppData", botToken)`. Validate at
the transport boundary on every request — do not re-validate inside use cases.

## Telegram Stars / Payments

Stars use currency code `"XTR"` and an empty `provider_token`:

```go
type LabeledPrice struct {
	Label  string `json:"label"`
	Amount int    `json:"amount"` // in Stars (smallest unit for XTR)
}

func (b *Bot) CreateInvoiceLink(
	ctx context.Context,
	title, description, payload string,
	prices []LabeledPrice,
) (string, error) {
	return call[string](ctx, b, "createInvoiceLink", map[string]any{
		"title":          title,
		"description":    description,
		"payload":        payload,
		"provider_token": "", // must be empty string for Stars, not omitted
		"currency":       "XTR",
		"prices":         prices,
	})
}

func (b *Bot) AnswerPreCheckoutQuery(ctx context.Context, queryID string, ok bool, errMsg string) error {
	body := map[string]any{
		"pre_checkout_query_id": queryID,
		"ok":                    ok,
	}
	if !ok {
		body["error_message"] = errMsg
	}
	_, err := call[json.RawMessage](ctx, b, "answerPreCheckoutQuery", body)
	return err
}

func (b *Bot) RefundStarPayment(ctx context.Context, userID int64, chargeID string) error {
	_, err := call[json.RawMessage](ctx, b, "refundStarPayment", map[string]any{
		"user_id":                    userID,
		"telegram_payment_charge_id": chargeID,
	})
	return err
}
```

`AnswerPreCheckoutQuery` must be called within 10 seconds of receiving the
`pre_checkout_query` update — Telegram cancels the payment automatically if
the deadline is missed. `RefundStarPayment` reverses a completed Stars
payment given the charge ID from the successful-payment update.

## Do not

- Compare secrets or tokens with `==` — use `subtle.ConstantTimeCompare` for
  secret/token comparison, `hmac.Equal` only for digest-vs-digest checks.
- Omit `provider_token` from Stars invoice requests — it must be `""`, not absent.
- Embed dynamic values in MarkdownV2 text without `EscapeMarkdownV2`.
- Call `context.Background()` inside bot methods — propagate `ctx` from the caller.
- Skip `defer resp.Body.Close()` — leaks the HTTP connection.
- Skip `auth_date` expiry check — initData without an age gate is replayable indefinitely.
- Reach for the hand-rolled client's full surface (MarkdownV2, initData, Stars)
  when a simpler polling/webhook-only library already covers the bot's needs.

## Verify

```sh
# Confirm webhook secret comparison uses subtle.ConstantTimeCompare, never ==
rg 'subtle\.ConstantTimeCompare' internal/

# Confirm no bare == on secret/token strings
rg '(secret|hash|token).*==|== .*(secret|hash|token)' internal/

go test -race ./internal/infra/telegram/...
```

## See also

- [[z-go-security]] — constant-time comparison, TLS config, general request hardening
- [[z-go-env-v11]] — loading bot token and webhook secret from environment
- [[z-go-context]] — context propagation through bot method calls
