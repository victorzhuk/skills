---
name: z-go-telegram-bot
description: "Implement Telegram Bot API calls in Go. Use for MarkdownV2, Mini App initData, webhook validation, or Stars payments. See [[z-go-security]] for HTTP hardening."
---

# Telegram Bot API Client

Use the project's client if it supports the required Bot API methods. Otherwise implement the missing methods behind a narrow Go interface. Keep the bot token in the infrastructure client.

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

Telegram puts the token in the URL path. Remove the URL from transport and request-construction error messages. Preserve the cause for `errors.Is` and `errors.As`. Do not log the wrapped cause. `URL.Redacted` only masks userinfo passwords.

```go
type transportError struct {
    message string
    cause   error
}

func (e *transportError) Error() string { return e.message }
func (e *transportError) Unwrap() error { return e.cause }

func safeTransportError(err error) error {
    var ue *url.Error
    if errors.As(err, &ue) {
        err = ue.Err
    }
    return &transportError{message: "telegram transport failed", cause: err}
}
```

Check a nonempty token at configuration time. Test transport and URL-parse failures with a synthetic token and assert no returned message contains it.

### Per-method request/response

For a small client, each method can marshal its body, POST, and decode the
`{ok, result, description}` envelope inline. Share the transport/error handling
once repetition would make fixes drift between methods:

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
		return fmt.Errorf("sendMessage: new request: %w", safeTransportError(err))
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.client.Do(req)
	if err != nil {
		return fmt.Errorf("sendMessage: %w", safeTransportError(err))
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
		return zero, fmt.Errorf("%s: new request: %w", method, safeTransportError(err))
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.client.Do(req)
	if err != nil {
		return zero, fmt.Errorf("%s: %w", method, safeTransportError(err))
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

For methods without a meaningful result, use `call[json.RawMessage]`. Discard the result after checking the error.

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

Select a no-op client only in an explicit development mode. Reject a missing token when the service must deliver messages.

```go
type NoopBot struct{ log *slog.Logger }

func (n *NoopBot) SendMessage(_ context.Context, _ int64, _, _ string) error {
	n.log.Debug("noop send message")
	return nil
}
```

Check the bot configuration when the service starts.

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
		if r == '\\' || strings.ContainsRune(mdv2Reserved, r) {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}
```

Escape dynamic values in ordinary MarkdownV2 text with `EscapeMarkdownV2`. Keep template markup separate. Apply the rules for each context to code blocks and link destinations.

## Webhook security

### Secret-token header

Set a secret token when registering the webhook with `setWebhook`. Check it
before processing the body:

```go
func validateWebhookSecret(r *http.Request, expected string) bool {
	got := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
	return expected != "" && subtle.ConstantTimeCompare([]byte(got), []byte(expected)) == 1
}
```

`subtle.ConstantTimeCompare` compares equal-length inputs in constant time. Use `hmac.Equal` for the HMAC below. See [[z-go-security]].

### Mini App initData

Telegram Mini Apps pass `initData` as a URL-encoded query string. Check the
HMAC-SHA256 signature before trusting any field in it:

```go
func ValidateInitData(initData, botToken string, maxAge time.Duration, now time.Time) error {
	vals, err := url.ParseQuery(initData)
	if err != nil {
		return fmt.Errorf("parse initData: %w", err)
	}
	for _, values := range vals {
		if len(values) != 1 {
			return errors.New("initData: repeated field")
		}
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
	issued := time.Unix(authDate, 0)
	if maxAge <= 0 || issued.After(now) || now.Sub(issued) > maxAge {
		return errors.New("initData: invalid age")
	}
	return nil
}

func deriveInitDataKey(botToken string) []byte {
	mac := hmac.New(sha256.New, []byte("WebAppData"))
	mac.Write([]byte(botToken))
	return mac.Sum(nil)
}
```

Derive the HMAC key with `HMAC-SHA256("WebAppData", botToken)`. Check each request at the transport boundary.

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
		"provider_token": "", // Stars use no payment-provider token
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

Answer `pre_checkout_query` within 10 seconds. Before fulfillment, check the amount, currency, and invoice payload in `successful_payment`. Record `telegram_payment_charge_id` so repeated updates cannot deliver the order twice. Use this ID for a Stars refund. [Stars payment flow](https://core.telegram.org/bots/payments-stars)

## Do not

- Use ordinary string equality for secret checks.
- Supply a payment-provider token for Stars. Follow the [sendInvoice parameters](https://core.telegram.org/bots/api#sendinvoice).
- Embed dynamic values in MarkdownV2 text without `EscapeMarkdownV2`.
- Call `context.Background()` inside bot methods — propagate `ctx` from the caller.
- Skip `defer resp.Body.Close()` — leaks the HTTP connection.
- Skip `auth_date` expiry check — initData without an age gate is replayable indefinitely.
- Log message bodies, bot tokens, or Mini App initData.

## Verification

Test the webhook with valid and invalid secrets. Reject repeated initData fields, expired signatures, and future timestamps. Replay a successful payment and check a single delivery.

```sh

timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./internal/infra/telegram/...
```

## See also

- [[z-go-security]] — constant-time comparison, TLS config, general request hardening
- [[z-go-env-v11]] — loading bot token and webhook secret from environment
- [[z-ts-telegram-mini-app]] — the client side: SDK choice, initData retrieval, viewport/theme handling
- [[z-go-context]] — context propagation through bot method calls
