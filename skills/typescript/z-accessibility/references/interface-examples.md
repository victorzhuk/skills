# Accessible interface examples

Use the examples for the control under review. Each code block illustrates a separate case unless adjacent blocks use the same IDs.

## Perceivable

### Text alternatives (1.1)

Give informative images a text equivalent. Use empty alt text for decorative images.
```html
<!-- Incorrect: Missing alt -->
<img src="chart.png">

<!-- ✅ Descriptive alt -->
<img src="chart.png" alt="Bar chart showing 40% increase in Q3 sales">

<!-- ✅ Decorative image (empty alt) -->
<img src="decorative-border.png" alt="" role="presentation">

<!-- ✅ Complex image with longer description -->
<figure>
  <img src="infographic.png" alt="2024 market trends infographic"
       aria-describedby="infographic-desc">
  <figcaption id="infographic-desc">
    <!-- Detailed description -->
  </figcaption>
</figure>
```

Give icon buttons an accessible name.
```html
<!-- Incorrect: No accessible name -->
<button><svg><!-- menu icon --></svg></button>

<!-- ✅ Using aria-label -->
<button aria-label="Open menu">
  <svg aria-hidden="true"><!-- menu icon --></svg>
</button>

<!-- ✅ Using visually hidden text -->
<button>
  <svg aria-hidden="true"><!-- menu icon --></svg>
  <span class="visually-hidden">Open menu</span>
</button>
```

**Visually hidden class:**
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Text contrast (1.4.3, 1.4.6)

| Text Size | AA minimum | AAA enhanced |
|-----------|------------|--------------|
| Normal text (< 24 CSS px regular / < 18.67 CSS px bold) | 4.5:1 | 7:1 |
| Large text (≥ 18pt regular / ≥ 14pt bold) | 3:1 | 4.5:1 |

```css
/* Incorrect: Low contrast (2.85:1) */
.low-contrast {
  color: #999;
  background: #fff;
}

/* ✅ Sufficient contrast (12.63:1) */
.high-contrast {
  color: #333;
  background: #fff;
}

/* ✅ Focus states need contrast too */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

**Don't rely on color alone:**
```html
<!-- Incorrect: Only color indicates error -->
<input class="error-border">
<style>.error-border { border-color: red; }</style>

<!-- Color, text, and a programmatically associated label -->
<div class="field-error">
  <label for="contact-email">Email</label>
  <input id="contact-email" type="email" aria-invalid="true" aria-describedby="email-error">
  <span id="email-error" class="error-message">
    <svg aria-hidden="true"><!-- error icon --></svg>
    Please enter a valid email address
  </span>
</div>
```

### Media alternatives (1.2)

```html
<!-- Video with captions -->
<video controls>
  <source src="video.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English" default>

</video>

<a href="video-described.mp4">Watch the version with audio description</a>

<!-- Audio with transcript -->
<audio controls>
  <source src="podcast.mp3" type="audio/mp3">
</audio>
<details>
  <summary>Transcript</summary>
  <p>Full transcript text...</p>
</details>
```

## Operable

### Keyboard accessible (2.1)

Use native controls first. A native button handles Enter and Space. A second key handler can trigger the action twice.

```html
<button type="button" id="action">Run action</button>
```

Attach one click handler to the button. For custom widgets, implement the matching WAI-ARIA Authoring Practices keyboard pattern.

For modal dialogs, prefer native `dialog.showModal()` or the project's maintained primitive. Verify initial focus, background isolation, Escape behavior, focus restoration, and the case with no focusable child. A Tab handler alone is not a complete dialog implementation.

### Focus visible (2.4.7)

```css
/* Incorrect: Never remove focus outlines */
*:focus { outline: none; }

/* Preserve the default indicator and enhance visible focus */

:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* ✅ Or custom focus styles */
button:focus-visible {
  outline: 3px solid #005fcc;
}
```

### Skip links (2.4.1)

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header><!-- navigation --></header>
  <main id="main-content" tabindex="-1">
    <!-- main content -->
  </main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Timing (2.2)

```javascript
// Allow users to extend time limits
function showSessionWarning() {
  const modal = createModal({
    title: 'Session Expiring',
    content: 'Your session will expire in 2 minutes.',
    actions: [
      { label: 'Extend session', action: extendSession },
      { label: 'Log out', action: logout }
    ],
    timeout: 120000 // 2 minutes to respond
  });
}
```

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .slide-panel { transition: none; }
  html { scroll-behavior: auto; }
}
```

## Understandable

### Page language (3.1.1)

```html
<!-- Incorrect: No language specified -->
<html>

<!-- ✅ Language specified -->
<html lang="en">

<!-- ✅ Language changes within page -->
<p>The French word for hello is <span lang="fr">bonjour</span>.</p>
```

### Consistent navigation (3.2.3)

```html
<!-- Navigation should be consistent across pages -->
<nav aria-label="Main">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

### Form labels (3.3.2)

```html
<!-- Incorrect: No label association -->
<input type="email" placeholder="Email">

<!-- ✅ Explicit label -->
<label for="email">Email address</label>
<input type="email" id="email" name="email"
       autocomplete="email" required>

<!-- ✅ Implicit label -->
<label>
  Email address
  <input type="email" name="email" autocomplete="email" required>
</label>

```

Connect visible help text to its field with `aria-describedby`.

```html
<label for="display-name">Display name</label>
<input id="display-name" name="displayName" maxlength="40"
       aria-describedby="display-name-help">
<p id="display-name-help">Use up to 40 characters.</p>
```

### Error handling (3.3.1, 3.3.3)

```html
<!-- State after validation identifies an invalid email address -->
<form id="contact-form" novalidate>
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required
         aria-invalid="true" aria-describedby="email-error">
  <p id="email-error">Enter a valid email address, such as name@example.com.</p>
  <button type="submit">Send</button>
</form>
```

```javascript
// Run after validation updates aria-invalid and the field descriptions.
function focusFirstInvalidField(form) {
  form.querySelector('[aria-invalid="true"]')?.focus();
}
```

## Robust

### Valid HTML

WCAG 2.2 removed 4.1.1 Parsing. Validate markup because broken structure can still violate other criteria. Do not report 4.1.1 as a 2.2 failure.

```html
<!-- Incorrect: Duplicate IDs -->
<div id="content">...</div>
<div id="content">...</div>

<!-- Incorrect: Invalid nesting -->
<a href="/"><button>Click</button></a>

<!-- ✅ Unique IDs -->
<div id="main-content">...</div>
<div id="sidebar-content">...</div>

<!-- ✅ Proper nesting -->
<a href="/" class="button-link">Click</a>
```

### ARIA usage (4.1.2)

**Prefer native elements:**
```html
<!-- Incorrect: ARIA role on div -->
<div role="button" tabindex="0">Click me</div>

<!-- ✅ Native button -->
<button>Click me</button>

<!-- Incorrect: ARIA checkbox -->
<div role="checkbox" aria-checked="false">Option</div>

<!-- ✅ Native checkbox -->
<label><input type="checkbox"> Option</label>
```

The markup below shows the selected tab. Add arrow-key navigation and roving tabindex. Update selection and panel visibility together.
```html
<!-- Custom tabs component -->
<div role="tablist" aria-label="Product information">
  <button role="tab" id="tab-1" aria-selected="true"
          aria-controls="panel-1">Description</button>
  <button role="tab" id="tab-2" aria-selected="false"
          aria-controls="panel-2" tabindex="-1">Reviews</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  <!-- Panel content -->
</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  <!-- Panel content -->
</div>
```

### Live regions (4.1.3)

```html
<!-- Status updates -->
<div id="polite-announcer" role="status">
  <!-- Content updates announced to screen readers -->
</div>

<!-- Urgent alerts -->
<div id="assertive-announcer" role="alert">
  <!-- Interrupts current announcement -->
</div>
```

```javascript
// Announce dynamic content changes
function showNotification(message, type = 'polite') {
  const container = document.getElementById(`${type}-announcer`);
  container.textContent = message;
}
```

---
