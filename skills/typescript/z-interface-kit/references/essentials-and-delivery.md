# Interface Essentials and Delivery

## Accessibility Essentials

### Semantic HTML First

Use `<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>` before reaching for ARIA. A `<button>` gives you keyboard handling, focus management, and screen reader semantics for free. A `<div onClick>` gives you none of that.

### Keyboard Navigation

- **Tab / Shift+Tab**: move between focusable elements
- **Enter / Space**: activate buttons and links
- **Arrow keys**: navigate within lists, menus, tabs, radio groups
- **Escape**: close modals, popovers, dropdowns
- **Home / End**: jump to first/last item in lists

### Focus Management

- Visible focus rings on all interactive elements — NEVER use `outline: none` without a replacement
- Trap focus inside modals (Tab wraps within the modal, not behind it)
- Restore focus to the trigger element when a modal/popover closes
- Use `focus-visible` to show rings only for keyboard users, not mouse clicks:

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### ARIA Attributes

- `aria-label` for icon-only buttons: `<button aria-label="Close menu">X</button>`
- `aria-labelledby` to associate headings with sections
- `aria-describedby` to link help text or error messages to inputs
- `aria-live="polite"` for dynamic content updates (toast messages, form errors)
- `aria-hidden="true"` for decorative elements (icons next to text labels)
- `aria-expanded` for toggleable elements (dropdowns, accordions)

### Color and Contrast

- WCAG AA: 4.5:1 for normal text, 3:1 for large text
- Never use color as the sole indicator — pair with icons, text, or patterns
- Test in both light and dark modes

### Images and Media

- Descriptive `alt` text for meaningful images: `alt="Dashboard showing 23% revenue growth"`
- Empty `alt=""` for purely decorative images
- Captions for video, transcripts for audio

### Navigation Aids

- **Skip link**: first focusable element, hidden until focused:

```html
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

- **Heading hierarchy**: sequential h1 through h6, no level skips. One `<h1>` per page.

### Touch Targets

- Minimum 44x44px interactive area
- 8px minimum spacing between adjacent touch targets
- Extend small visual elements with invisible padding or pseudo-elements

### Testing

- **Automated**: axe-core in CI, Lighthouse accessibility score 90+
- **Manual**: full keyboard-only navigation test
- **Screen reader**: test with VoiceOver (macOS) or NVDA (Windows)
- **Visual**: zoom to 200%, check nothing breaks or overlaps

Reference `accessibility-checklist.md` for the full audit guide with pass/fail criteria.

---

## Pre-Delivery Review

Run through this checklist before considering any UI implementation complete:

### Typography
- [ ] Font smoothing applied (`-webkit-font-smoothing: antialiased`)
- [ ] Headings use `text-wrap: balance`
- [ ] Dynamic numbers use `font-variant-numeric: tabular-nums`

### Color
- [ ] All colors referenced via semantic tokens, no hardcoded hex in components
- [ ] Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
- [ ] Dark mode tested separately for contrast

### Spatial
- [ ] Nested rounded elements use concentric border radius
- [ ] Spacing follows 4px / 8px scale consistently
- [ ] Interactive elements have 44x44px minimum hit area
- [ ] Shadows used instead of borders where appropriate

### Motion
- [ ] Animation frequency matches usage frequency (no animation on high-frequency actions)
- [ ] No `transition: all` anywhere — specific properties only
- [ ] Enter animations split and staggered where multiple elements appear
- [ ] `prefers-reduced-motion` respected

### Accessibility
- [ ] All interactive elements keyboard accessible
- [ ] Focus rings visible on keyboard navigation (never `outline: none` without replacement)
- [ ] Semantic HTML used before ARIA
- [ ] `aria-live` on dynamic content updates

Reference `review-checklist.md` for the extended 30-item checklist with severity ratings and automated testing commands.
