---
name: z-ts-telegram-mini-app
description: "Build Telegram Mini App clients with TypeScript. Use for initData, viewport and theme changes, BackButton, MainButton, haptics, or Stars invoices. See [[z-go-telegram-bot]] for server validation and payments. See [[z-ts-core]] for TypeScript."
---

# Telegram Mini Apps

## Select the SDK

Read the package name and installed major version. Use the project's existing SDK. For a new bundled app, consider `@tma.js/sdk` and its React adapter. A static page can use `window.Telegram.WebApp` directly. Older SDKs have different method names.

## Send identity to the server

Send the unmodified launch string over HTTPS when the backend needs Telegram identity. Handle missing data as an unauthenticated launch. Use the authorization scheme agreed with the backend.

```ts
import { retrieveRawInitData } from '@tma.js/sdk';

const initDataRaw = retrieveRawInitData();
if (initDataRaw) {
  await fetch('/api/me', { headers: { Authorization: `tma ${initDataRaw}` } });
}
```

Keep bot tokens on the server. Verify the signature, freshness, and permissions before accepting the identity. Subsequent requests can use the authenticated server session. [Telegram validation procedure](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

## Initialize the UI

Initialize the SDK, then mount the components the screen uses. Await asynchronous mounts. Handle mount failure with a visible fallback. Signal readiness once the first usable screen can appear.

```ts
import { init, backButton, miniApp, viewport, themeParams } from '@tma.js/sdk';

const dispose = init();
if (backButton.isSupported()) backButton.mount();
if (miniApp.isSupported()) miniApp.mount();
await viewport.mount();
themeParams.mount();

renderApp(); // Signal readiness after the first usable screen renders

miniApp.ready();
const unbindViewport = viewport.bindCssVars();
const unbindTheme = themeParams.bindCssVars();
```

Release event handlers and CSS bindings when the screen closes. Unmount owned components and dispose of the SDK when the application closes. Inspect method support in the installed SDK and client.

## Size and theme the viewport

Use `stableHeight` for settled layout and `height` for changes during a drag. Expansion and fullscreen are different modes. Test for fullscreen support before requesting it.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Keep essential content inside the device safe area and outside Telegram's controls. Inspect both insets before combining them. The CSS example uses the larger bottom inset.

```css
.app {
  padding-bottom: max(env(safe-area-inset-bottom), var(--tg-viewport-content-safe-area-inset-bottom, 0px));
}
```

Bind theme variables and set CSS `color-scheme` for native controls. Test dark and light themes with the keyboard open.

## Connect native controls

Mount supported buttons before setting their state. Subscribe once and remove listeners on teardown. Synchronize the BackButton with the router's initial state and later navigation.

```ts
const offClick = backButton.onClick(() => router.back());
function syncBackButton() {
  if (router.canGoBack()) backButton.show();
  else backButton.hide();
}
syncBackButton();
const unsubscribe = router.subscribe(syncBackButton);
```

Enable the main button for valid input. Disable it and show progress while the request runs. Restore its state from the current form when the request ends. Use a supported secondary button for an alternate action.

```ts
mainButton.mount();
mainButton.setParams({ text: 'Continue', isVisible: true, isEnabled: true });
mainButton.onClick(handleSubmit);

async function handleSubmit() {
  mainButton.setParams({ isEnabled: false, isLoaderVisible: true });
  try {
    await submit();
  } finally {
    mainButton.setParams({ isEnabled: isFormValid(), isLoaderVisible: false });
  }
}
```

Use haptics for an outcome, impact, or picker change. Choose the method that matches the interaction.

```ts
if (hapticFeedback.isSupported()) {
  hapticFeedback.notificationOccurred('success');
}
```

Enable closing confirmation while unsaved changes exist. Disable competing vertical swipe behavior only where a gesture requires it. Restore both settings on exit.

## Open a Stars invoice

Have the backend create the invoice link. Open it with the SDK or the supported raw `WebApp.openInvoice` callback. Treat its outcome as UI feedback.

```ts
import { invoice } from '@tma.js/sdk';

if (!invoice.isSupported()) throw new Error('Invoices are unavailable in this client');
const status = await invoice.openUrl(invoiceUrl); // 'paid' | 'cancelled' | 'failed' | 'pending'

switch (status) {
  case 'paid':
    refreshOrderFromServer();
    break;
  case 'pending':
    pollOrderStatus(); // Stars can settle after the promise resolves
    break;
  default:
    onCancelledOrFailed(status);
}
```

Fulfill an order only after the backend verifies the matching payment. Use the bot's `successful_payment` update or reconcile a verified Stars transaction. See [[z-go-telegram-bot]].

## Verify

Use an HTTPS endpoint reachable from a production Telegram client. Configure the Mini App or menu button in BotFather. Telegram's separate test environment permits HTTP. Restrict SDK mocks to development builds.

```sh
# No init-data field trusted for auth without a backend round-trip
rg -n 'retrieveLaunchParams|retrieveRawInitData' src/ -A3

# Inspect capability guards and mounted-state prerequisites against the installed SDK
rg -n 'isSupported|mount|bindCssVars' src/

# No stray mockTelegramEnv import outside a dev-only branch
rg -n 'mockTelegramEnv' src/
```

Exercise launch failure, teardown, remount, and old-client fallbacks. Test safe areas, keyboard resizing, storage failure, theme changes, native buttons, and payments in supported clients. A browser mock cannot exercise Telegram's native UI.
