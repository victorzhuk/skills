---
name: z-ts-telegram-mini-app
description: Telegram Mini App client development in TypeScript — SDK choice (@tma.js/sdk vs raw WebApp), lifecycle/viewport/theme handling, BackButton/MainButton wiring, and Stars payments. initData is untrusted client-side — forward as an opaque token, never parse for authorization. Triggers on "telegram mini app", "tma.js", "WebApp.ready", "initData", "BackButton", "openInvoice". Does not cover server-side validation or TS conventions; see [[z-go-telegram-bot]], [[z-ts-core]].
---

# Telegram Mini App (TypeScript)

Client side only. The bot token, `createInvoiceLink`, and initData HMAC/Ed25519
verification live server-side — see [[z-go-telegram-bot]].

## SDK choice

| Option | Pick when |
|---|---|
| `@tma.js/sdk` (+ `@tma.js/sdk-react` for React) | Default. Any Mini App with a bundler — typed, tree-shakeable (`sideEffects: false`), one component per concern (`backButton`, `mainButton`, `viewport`, `themeParams`, `hapticFeedback`, `invoice`) |
| Raw `window.Telegram.WebApp` | A single static page with one or two calls (`ready()`, `expand()`) and no bundler in play |
| Existing SDK | Preserve it unless a required feature or support issue justifies migration |

Check the installed package name and major version against its migration guide. Tutorials for `@telegram-apps/sdk` or an earlier `@tma.js/sdk` major are not interchangeable API contracts. The examples below illustrate the component-style SDK; adapt them to verified installed signatures.

## initData is untrusted

`retrieveRawInitData()` returns the exact query string Telegram signed. Send
it to your backend on every request that needs the Telegram identity —
`Authorization: tma <raw-init-data>` is the common convention. Do not decode
`user`/`auth_date` client-side and act on them; the client can forge any field
it likes before your backend ever sees it.

```ts
import { retrieveRawInitData } from '@tma.js/sdk';

const initDataRaw = retrieveRawInitData();
fetch('/api/me', { headers: { Authorization: `tma ${initDataRaw}` } });
```

The backend must use Telegram's documented HMAC-SHA256 or Ed25519 validation procedure as appropriate, enforce freshness, and authorize the resulting identity. Never expose a bot token to the client. See [Telegram's validation instructions](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

## Lifecycle: init → mount → ready

Call `ready()` after your first real paint, not right after `init()` — call it
too early and the loading placeholder disappears onto blank content.

```ts
import { init, backButton, miniApp, viewport, themeParams } from '@tma.js/sdk';

init();
backButton.mount();
miniApp.mount();
await viewport.mount();
themeParams.mount();

renderApp(); // your UI is now on screen

if (miniApp.ready.isAvailable()) miniApp.ready();
const unbindViewport = viewport.bindCssVars();
const unbindTheme = themeParams.bindCssVars();
```

Await asynchronous mounts before calling APIs that require mounted state. Catch initialization failures and show a usable error state. Dispose CSS bindings and event subscriptions on teardown. Use the installed SDK's capability checks for version-dependent methods; not every helper exposes `.isAvailable()`.

`viewport.expand()` grows to the maximum available height;
`viewport.requestFullscreen()` (Bot API 8.0+) goes further and hides the
Telegram header — set a header color with `miniApp.setHeaderColor` first,
since the header is transparent in fullscreen.

## Viewport and safe area

| Signal | CSS var (after `bindCssVars()`) | Meaning |
|---|---|---|
| `viewport.height` | `--tg-viewport-height` | Live height, changes mid-gesture |
| `viewport.stableHeight` | `--tg-viewport-stable-height` | Settled height — size layout off this, not `height` |
| `viewport.safeAreaInsets()` | `--tg-viewport-safe-area-inset-*` | Device notch/home-indicator area |
| `viewport.contentSafeAreaInsets()` | `--tg-viewport-content-safe-area-inset-*` | Area Telegram's own UI (header, bottom bar) overlays |

Device notch and Telegram's UI chrome are different insets. Use the installed SDK's documented CSS bindings, and verify the resulting layout rather than blindly adding overlapping values.
The device notch also needs the page-level opt-in:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.app {
  padding-bottom: max(env(safe-area-inset-bottom), var(--tg-viewport-content-safe-area-inset-bottom, 0px));
}
```

## Theme and dark mode

Bind the installed SDK's theme variables and update them on theme changes. Confirm which component owns color-scheme binding; do not assume theme binding also creates `--tg-color-scheme`. Set the page's CSS `color-scheme` appropriately and test native controls in light and dark themes on supported clients.

## Navigation: BackButton

Wire it to your router, not to `window.history` directly — show it exactly
when there's somewhere to go back to:

```ts
backButton.onClick(() => router.back());

router.subscribe((location) => {
  if (router.canGoBack(location)) backButton.show();
  else backButton.hide();
});
```

## MainButton / SecondaryButton as the primary CTA

Treat it as a state machine, not a fire-and-forget button — the states that
matter are text, enabled, and progress:

| State | `text` | `isEnabled` | `isLoaderVisible` |
|---|---|---|---|
| idle | "Continue" | `true` | `false` |
| submitting | "Continue" | `false` | `true` |
| blocked (validation) | "Continue" | `false` | `false` |

```ts
mainButton.setParams({ text: 'Continue', isVisible: true, isEnabled: true });
mainButton.onClick(handleSubmit);

async function handleSubmit() {
  mainButton.setParams({ isEnabled: false, isLoaderVisible: true });
  try {
    await submit();
  } finally {
    mainButton.setParams({ isEnabled: true, isLoaderVisible: false });
  }
}
```

`secondaryButton` shares the same `setParams` shape plus `position` (`"left"`
/ `"right"` / `"top"` / `"bottom"`, Bot API 7.10+) — use it for a dismiss or
skip action next to the primary CTA, not for a second equally-weighted action.

## Haptics

Fire haptics on a completed meaningful action (submit succeeded, item added,
selection made) — not on every tap, which just feels noisy:

```ts
if (hapticFeedback.notificationOccurred.isAvailable()) {
  hapticFeedback.notificationOccurred('success');
}
```

`impactOccurred('light' | 'medium' | 'heavy' | 'rigid' | 'soft')` for physical
collisions/drags, `notificationOccurred('error' | 'success' | 'warning')` for
outcome feedback, `selectionChanged()` only for picker-style value changes —
not for confirming a selection the user already committed to.

## Closing behavior

Two independent guards:

- `enableClosingConfirmation()` — prompts before closing when the user has
  unsaved state (a draft, a mid-flow form). Don't enable it globally; toggle
  it on when there's something to lose and off once saved.
- `swipeBehavior.disableVertical()` (Bot API 7.7+, raw
  `WebApp.disableVerticalSwipes()`) — mobile clients minimize the Mini App on
  a vertical swipe from the header area by default; disable it when your own
  UI has a competing vertical drag/scroll gesture near the top of the screen.

## Platform verification

Test supported Telegram clients and launch modes directly. Embedded browser engines, storage quotas, WebGL support, and available native controls vary by client, OS, and version. Feature-detect browser capabilities and use Telegram/SDK capability checks; the platform string alone is not a capability guarantee. Verify safe areas, keyboard resizing, storage failures, theme changes, and native button behavior.

## Stars payments (client flow)

Your backend creates the invoice link (`createInvoiceLink` — Bot API call,
[[z-go-telegram-bot]]). The client only opens it and reacts to the result:

```ts
import { invoice } from '@tma.js/sdk';

const status = await invoice.openUrl(invoiceUrl); // 'paid' | 'cancelled' | 'failed' | 'pending'

switch (status) {
  case 'paid':
    onPaid();
    break;
  case 'pending':
    pollOrderStatus(); // Stars can settle after the promise resolves
    break;
  default:
    onCancelledOrFailed(status);
}
```

Falling back to raw `Telegram.WebApp.openInvoice(url, callback)` gives the
same four statuses through a callback instead of a promise — same handling,
different shape. Never mark an order paid from this client-side status alone;
confirm server-side against the `successful_payment` update or a Stars
transaction lookup, since this event only reflects what the client observed.

## Local dev

Telegram requires HTTPS with a valid cert (test environment excepted) to open
a web app at all, so plain `localhost` never works inside a real client:

1. Run the dev server over HTTPS, or tunnel it (`ngrok http --domain=<static-domain> <port>`, or an equivalent tunnel).
2. Register the tunnel URL with @BotFather — `/newapp` for a bot-attached Mini
   App (`t.me/<bot>/<shortname>`), or `/setmenubutton` for the persistent menu
   button.
3. Reopen the bot in Telegram after every tunnel URL change — clients cache
   the previous URL.
4. Telegram's test environment (a separate login, "Test Server" in Telegram
   Desktop's account switcher) accepts plain HTTP and bare IPs — faster
   iteration than re-tunneling on every restart, at the cost of testing
   against a different backend.

For browser-only development, use the installed SDK's documented environment mock and a development-only entry point. Environment detection and mocking signatures vary by major; verify them before use. Ensure the production bundle cannot enable mocks.

What breaks outside Telegram even with a mock: haptics (no-op, nothing to
verify), Stars invoices (no real Bot API session), and any BackButton/
MainButton chrome — mock the signals, don't expect the native UI to render in
a plain browser tab.

## Do not

- Trust `initData` fields for authorization on the client — validate
  server-side, every request, before honoring the identity in it.
- Call `ready()` before the UI is actually paintable — that just moves the
  blank-screen flash from "placeholder" to "your own blank page".
- Call version-dependent SDK methods without the installed version's supported capability check.
- Style off a hardcoded palette when `--tg-theme-*` vars exist — it breaks the
  instant a user switches Telegram's theme.
- Fire haptics on every tap — reserve them for outcomes, not input events.
- Leave `mockTelegramEnv` reachable in a production bundle.
- Treat `invoiceClosed`/`invoice.openUrl()`'s status as payment confirmation —
  it's a client-observed hint; the source of truth is the backend's
  `successful_payment` update.

## Verify

```sh
# No init-data field trusted for auth without a backend round-trip
rg -n 'retrieveLaunchParams|retrieveRawInitData' src/ -A3

# Inspect capability guards and mounted-state prerequisites against the installed SDK
rg -n 'isAvailable|mount|bindCssVars' src/

# No stray mockTelegramEnv import outside a dev-only branch
rg -n 'mockTelegramEnv' src/
```

Searches are review aids, not proof. Exercise initialization failure, teardown/remount, old-client fallbacks, and real-client viewport/theme changes. Check server authorization and payment confirmation independently of client signals.

## See also

- [[z-go-telegram-bot]] — server-side initData HMAC validation, Bot API calls
  (`createInvoiceLink`, `answerPreCheckoutQuery`, `refundStarPayment`).
- [[z-ts-core]] — general TypeScript conventions this skill assumes.
