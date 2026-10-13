---
name: z-react-core
description: React and Next.js conventions beyond TypeScript tooling — App Router, server components by default ('use client' only at interaction leaves), server data fetching, URL/server state before client stores, server actions, suspense/error boundaries. Does not cover tsconfig/zod; see [[z-ts-core]].
---

# React / Next.js core

Server-first by default: render on the server, fetch on the server, ship a client component only where the page needs interactivity. [[z-ts-core]] covers tsconfig, zod, and general TS conventions this skill assumes.

## App Router structure

File-system routing under `app/` — a folder is a route segment, `page.tsx` makes it navigable, `layout.tsx` wraps it and persists across sibling navigations:

```
app/
  layout.tsx          # root layout — <html>, <body>, shared chrome
  page.tsx             # /
  orders/
    layout.tsx          # shared UI for every /orders/* route
    page.tsx             # /orders
    [orderId]/
      page.tsx             # /orders/:orderId
      loading.tsx          # streamed fallback while page.tsx's data resolves
      error.tsx            # catches a throw from this segment and below
```

Route groups (`(marketing)/`) organize without adding a URL segment; parallel/intercepting routes (`@modal`, `(.)photo`) exist for modal-over-page and split-view patterns — reach for either only once a plain nested layout can't express the UI, not as the default routing shape.

## Server components by default

App Router pages and layouts are Server Components by default. The module graph and directives determine other components' execution environment. A Server Component can be `async`, await a database call, and read server-only configuration:

```tsx
// app/orders/page.tsx — Server Component, no directive needed
export default async function OrdersPage() {
  const orders = await getOrders();
  return <OrderList orders={orders} />;
}
```

`'use client'` defines a client module boundary: its imports enter the client bundle. Client Components can still be rendered on the server for the initial HTML; access browser-only globals in event handlers or after mount:

```tsx
// components/order-row.tsx
'use client';

export function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  return <button onClick={() => setExpanded(!expanded)}>{order.id}</button>;
}
```

Put `'use client'` on the leaf that actually needs `useState`/`useEffect`/an event handler/a browser API — not on a page or layout that merely renders one. Marking a whole page `'use client'` because one button inside it needs `onClick` drags every server-renderable child down into the client bundle with it.

## Data fetching

Fetch where the data lives — in the Server Component that needs it, in parallel with its siblings, not in a client-side `useEffect` that fires after mount:

```tsx
// good — parallel, resolved before the page streams
async function OrdersPage() {
  const [orders, customer] = await Promise.all([getOrders(), getCustomer()]);
  ...
}

// bad — client waterfall: mount, then fetch, then render, then maybe fetch again
useEffect(() => { fetchOrders().then(setOrders); }, []);
```

A client component that needs live, post-mount data (polling, a value only known in the browser) is the legitimate exception — don't reach for `useEffect` fetching as the default because it's the pattern from a pre-Server-Components codebase.

## State judgment

Prefer the state that already has a home, in this order: URL (`searchParams` — shareable, back-button-correct) → server state (refetched on navigation/revalidation) → client store. Reach for a client store (Context, Zustand-class) only once prop-drilling past three or more levels is a real, present problem — not for state a URL param or a server re-fetch already covers.

```tsx
// filter state that belongs in the URL, not useState
const searchParams = useSearchParams();
const status = searchParams.get('status') ?? 'all';
```

## Forms and server actions

A Server Action (`'use server'`) is a function the client can call directly without hand-wiring a route handler and a fetch call — the framework generates both:

```tsx
// actions.ts
'use server';

export async function createOrder(formData: FormData) {
  const actor = await requireUser();
  const parsed = orderSchema.parse(Object.fromEntries(formData));
  await authorizeOrderCreation(actor, parsed.customerId);
  await db.orders.create(parsed);
  revalidatePath('/orders');
}
```

```tsx
<form action={createOrder}>
  <input name="customerId" />
  <button type="submit">Create</button>
</form>
```

The authentication and authorization helpers above are illustrative project functions. Implement both checks on every action invocation; never trust a submitted customer or tenant ID. Validate the payload on the server even when the form validates it too. Forms rendered by Server Components support submission before hydration; verify the actual flow when a Client Component owns the form.

## Suspense and error boundaries

`loading.tsx` wraps the segment's page and descendants in a Suspense boundary. `error.tsx` must be a Client Component and catches failures below its boundary, but not its own segment's layout. Use a parent boundary for that layout; root layout failures need `global-error.tsx`.

Place both at the segment that can actually fail or actually takes time — a boundary around the whole app hides which part is slow or broken; one per meaningfully-independent section gives a useful partial-failure and partial-loading UI.

## Component file discipline

Colocate a component with its owning route until another route needs it. Prefer direct imports to avoid accidental client/server boundary mixing and unnecessary module traversal. A barrel does not inherently defeat tree shaking; preserve deliberate public entry points.

## Testing

`vitest` + `@testing-library/react`, querying by role/label/text the way a user would (`getByRole('button', { name: /submit/i } )`), not by test id or implementation detail:

```tsx
test('submits the order form', async () => {
  render(<OrderForm />);
  await userEvent.click(screen.getByRole('button', { name: /create/i }));
  expect(await screen.findByText(/order created/i)).toBeInTheDocument();
});
```

Playwright for a real end-to-end flow that crosses a Server Action or a route boundary — a unit test can't exercise the actual server round-trip a form submission makes. [[z-testing-strategy]] covers how much of either a change actually needs.

## Boundary

- Shared-link metadata and preview verification: [[z-open-graph]].
- tsconfig, zod, Biome/vitest defaults, general error handling: [[z-ts-core]].
- Telegram Mini App specifics (SDK, initData, viewport): [[z-ts-telegram-mini-app]] — a Mini App webview is a different rendering target than a Next.js server-rendered page.

## Do not

- Put `'use client'` on a page or layout instead of the specific leaf component that needs interactivity.
- Fetch in a client `useEffect` when the data is available at render time on the server.
- Reach for a global client store before prop-drilling or URL state has actually become a real problem.
- Skip server-side validation in a Server Action because the calling form already validates client-side.
- Add a barrel `index.ts` that re-exports a component directory.
- Wrap the entire app in one `error.tsx`/`loading.tsx` instead of placing boundaries at the segments that actually fail or actually stream.

## Verify

```sh
rg -n "'use client'" app/ | grep -v '_components\|components/'   # client directive outside a leaf component dir
rg -n 'useEffect.*fetch' app/                                     # client-side fetch waterfalls
timeout 5m vitest run --maxWorkers=50% --testTimeout=5000
```

Prefer the existing bounded test wrapper. Exercise an unauthorized action and a cross-tenant request as well as the successful form flow when changing authorization.

see [[z-ts-core]], [[z-ts-telegram-mini-app]], [[z-testing-strategy]]
