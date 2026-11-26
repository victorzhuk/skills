---
name: z-react-core
description: "Build React interfaces for the Next.js App Router, Pages Router, or a client-side SPA. Use for component boundaries, fetching, forms, state, and rendering. See [[z-ts-core]] for TypeScript tools."
---

# React and Next.js

## Identify the rendering model

Read the framework version and route tree. Select the route that owns the change. A project can use both Next.js routers.

| Target | Procedure |
|---|---|
| App Router | Fetch on the server when possible. Move browser behavior into a Client Component. |
| Pages Router | Use the existing page data methods and API routes. |
| Client-side SPA | Use the configured client router and data layer. Load large routes on demand. Cancel or ignore stale effect requests. |

## Build an App Router route

Use `page.tsx` for a navigable segment and `layout.tsx` for shared UI. Route groups organize files without changing the URL. Use parallel or intercepting routes when a flow needs them.

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

Keep secrets and database access in server modules. Pages and layouts are Server Components by default.

```tsx
// app/orders/page.tsx — Server Component, no directive needed
export default async function OrdersPage() {
  const orders = await getOrders();
  return <OrderList orders={orders} />;
}
```

Place `'use client'` at the import boundary for interactive code. Imported dependencies can enter the client bundle. Client Components can render initial HTML on the server. Read browser globals after mount or in event handlers.

```tsx
// components/order-row.tsx
'use client';
import { useState } from 'react';

export function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{order.id}</button>
      {expanded && <OrderDetails order={order} />}
    </>
  );
}
```

Start independent reads together. Use the client data layer for live updates or information available only in the browser.

```tsx
// good — parallel, resolved before the page streams
async function OrdersPage() {
  const [orders, customer] = await Promise.all([getOrders(), getCustomer()]);
  return <OrderList orders={orders} customer={customer} />;
}

// bad — client waterfall: mount, then fetch, then render, then maybe fetch again
useEffect(() => { fetchOrders().then(setOrders); }, []);
```

Use URL state for shareable filters. Keep fetched records in the data layer. Keep temporary state in the component. Add a shared store when separate consumers need the same client state.

```tsx
// filter state that belongs in the URL, not useState
const searchParams = useSearchParams();
const status = searchParams.get('status') ?? 'all';
```

## Submit a form

Parse the payload against its schema inside each Server Action. Authenticate the caller and authorize the operation on the submitted resource before changing data. Return the user-visible result. Refresh affected routes or cached data as needed.

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
  <label>Customer ID <input name="customerId" required /></label>
  <button type="submit">Create</button>
</form>
```

Test submission before hydration when the flow requires it. Place `loading.tsx` and `error.tsx` near independent loading and failure states. Make `error.tsx` a Client Component. Its boundary excludes its own segment layout. Root layout failures need `global-error.tsx`.

## Control render cost

Keep components near their routes and preserve public imports. Derive values during render. Keep ordinary Hooks at the component's top level. Follow the special rules for React's `use` API.

Profile expensive renders before adding memoization or hoisting stable objects. Use `useTransition` or `useDeferredValue` to keep input responsive. For long pages, test `content-visibility: auto` with an intrinsic size.

## Verify

Query by role, label, or visible text in component tests.

```tsx
test('submits the order form', async () => {
  render(<OrderForm />);
  await userEvent.click(screen.getByRole('button', { name: /create/i }));
  expect(await screen.findByText(/order created/i)).toBeInTheDocument();
});
```

```sh
rg -n "'use client'" app/
rg -n 'useEffect.*fetch' app/                                     # inspect client fetches
timeout 5m vitest run --maxWorkers=50% --testTimeout=5000
```

Use the project's bounded test command. Search results identify candidates for inspection. Exercise a route or Server Action through the browser. Cover unauthorized and cross-tenant requests when access changes.

See [[z-testing-strategy]] for test depth, [[z-interface-kit]] for components, and [[z-accessibility]] for audits. Use [[z-web-performance]] for page measurements, [[z-open-graph]] for previews, and [[z-ts-telegram-mini-app]] for Telegram clients.
