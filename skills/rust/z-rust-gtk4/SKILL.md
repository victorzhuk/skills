---
name: z-rust-gtk4
description: This skill should be used when the user asks to "build a GTK4 app in Rust", "create a libadwaita UI", "use relm4", "build a Linux desktop app with Rust", "implement a GTK4 widget", "create a preferences dialog", "add system tray", or mentions relm4 components, AdwApplicationWindow, AdwPreferencesPage, gtk rust, adwaita, desktop gui rust, or message-driven GTK4 UI patterns.
---

# Rust GTK4 (relm4 + libadwaita)

Build HIG-compliant GTK4 desktop apps with the relm4 Elm-style loop: message-driven, composable components with clean separation between model state and view rendering.

## Core Architecture: relm4 Elm Pattern

relm4 implements an Elm-like model-update-view loop:

- **`Component::init()`** — construct initial model state + build widget tree
- **`Component::update()`** — receive a typed message, mutate model
- **`view!` macro** — declarative widget tree; auto-syncs to model on `#[watch]` fields

The `#[relm4::component]` macro generates the boilerplate; the `view!` macro is the widget DSL.

## Key Concepts

### Sync vs Async Components

| Trait | When to use |
|---|---|
| `SimpleComponent` | No async work; instant model updates |
| `Component` | Background commands via `type CommandOutput` + `sender.oneshot_command(...)` — the pattern used everywhere below |
| `AsyncComponent` | `update()` itself is async; reach for it only if `Component` + `oneshot_command` genuinely can't fit |

### Message Flow

```
User action (signal) → sender.input(Msg::X)         → update()     → model mutates → view re-renders
Background task      → sender.oneshot_command(...)  → update_cmd() → sender.input(...) / model mutates
```

### Background Work Pattern

Never block `update()`. Dispatch an async block with `sender.oneshot_command()`; the block's return value becomes the `CommandOutput` message, handled in `update_cmd()`:

```rust
fn update(&mut self, msg: Self::Input, sender: ComponentSender<Self>, _root: &Self::Root) {
    match msg {
        Msg::Refresh(id) => {
            let svc = self.service.clone();
            sender.oneshot_command(async move {
                match svc.fetch(id).await {
                    Ok(data) => CmdOut::FetchDone(id, data),
                    Err(e) => CmdOut::FetchFailed(id, e),
                }
            });
        }
    }
}

fn update_cmd(&mut self, msg: Self::CommandOutput, sender: ComponentSender<Self>, _root: &Self::Root) {
    match msg {
        CmdOut::FetchDone(id, data) => self.apply(id, data),
        CmdOut::FetchFailed(_, err) => {
            let _ = sender.output(Output::Notice(err.to_string()));
        }
    }
}
```

## libadwaita Widget Hierarchy

Real apps compose the shell by hand rather than reaching for `AdwToolbarView`:

```
AdwApplicationWindow
└── gtk::Box (vertical)
    ├── AdwHeaderBar
    └── AdwToastOverlay
        └── [primary content]
```

`AdwHeaderBar` and `AdwToastOverlay` are plain siblings inside a vertical `gtk::Box`, not `add_top_bar`/content slots of a `ToolbarView` — libadwaita ships `AdwToolbarView` for the same shell, but it sees no real use here; the manual `gtk::Box` composition is what production code runs.

### Preferences Dialog Structure

```
AdwPreferencesDialog
└── AdwPreferencesPage (tab)
    └── AdwPreferencesGroup (section)
        ├── AdwActionRow (entry, switch suffix)
        └── AdwSwitchRow
```

```rust
let dialog = adw::PreferencesDialog::new();
dialog.set_title("Preferences");
dialog.add(&page);       // one add() per AdwPreferencesPage
dialog.present(Some(&parent_window));
```

`AdwPreferencesWindow` is deprecated since libadwaita 1.6 in favor of `AdwPreferencesDialog` (same page/group/row API, presented as a dialog instead of a standalone window). Only reach for `PreferencesWindow` when targeting pre-1.6 libadwaita.

### Empty + Loading States

```rust
// Empty state
adw::StatusPage {
    set_icon_name: Some("document-open-symbolic"),
    set_title: "No Items",
    set_description: Some("Add an item to get started"),
}

// Inline alert
adw::Banner {
    set_title: "Connection failed",
    set_revealed: model.has_error,
    set_button_label: Some("Retry"),
    connect_button_clicked[sender] => move |_| sender.input(Msg::Retry),
}
```

### Toast Notifications

```rust
adw::ToastOverlay {
    // wraps main content; show toasts programmatically:
}

// In update():
self.toast_overlay.add_toast(
    adw::Toast::new("Settings saved")
);
```

## Signal → Message Pattern

All signals close over `sender` and call `sender.input()`:

```rust
gtk::Button {
    set_label: "Connect",
    connect_clicked[sender] => move |_| {
        sender.input(AppMsg::Connect);
    }
}

gtk::Entry {
    connect_changed[sender] => move |entry| {
        sender.input(AppMsg::SetUrl(entry.text().to_string()));
    }
}

adw::SwitchRow {
    set_title: "Auto-restart",
    set_active: model.auto_restart,
    connect_active_notify[sender] => move |row| {
        sender.input(AppMsg::SetAutoRestart(row.is_active()));
    }
}
```

## System Tray Integration

Use `ksni` — a pure-Rust StatusNotifierItem implementation, no GTK/AppIndicator dependency. Implement `Tray` on a plain struct, spawn it to get a `Handle<T>`, and mutate state through `handle.update()`:

```rust
use ksni::{Handle, Tray, TrayMethods};
use ksni::menu::{MenuItem, StandardItem};

struct AppTray {
    connected: bool,
    on_action: Arc<dyn Fn(TrayAction) + Send + Sync>,
}

impl Tray for AppTray {
    fn id(&self) -> String {
        "myapp".into()
    }

    fn icon_name(&self) -> String {
        if self.connected { "myapp-connected" } else { "myapp-disconnected" }.into()
    }

    fn menu(&self) -> Vec<MenuItem<Self>> {
        let cb = Arc::clone(&self.on_action);
        vec![StandardItem {
            label: "Quit".into(),
            activate: Box::new(move |_| (cb)(TrayAction::Quit)),
            ..Default::default()
        }
        .into()]
    }
}

let handle: Handle<AppTray> = AppTray { connected: false, on_action }.spawn().await?;

handle.update(|tray| tray.connected = true).await;
```

`AppIndicator`/`libayatana-appindicator` plus a `gio::Menu` model is the older GTK-native alternative — no real use in this corpus; reach for it only if a target desktop lacks StatusNotifierItem support.

## Cargo.toml Dependencies

relm4 re-exports `gtk4` and `libadwaita` — declare it once with the GNOME-runtime feature you target plus `libadwaita`, and don't add `gtk4`/`libadwaita`/`glib`/`gio` as separate deps:

```toml
[dependencies]
relm4 = { version = "0.10", features = ["gnome_48", "libadwaita"] }
tokio = { version = "1", features = ["full"] }
ksni  = "0.3"
```

```rust
use relm4::gtk;
use relm4::adw;
```

Pick the `gnome_NN` feature matching the minimum GNOME runtime you support (e.g. `gnome_46`, `gnome_48`) — it pulls in the matching gtk4/libadwaita version pin so widget APIs line up with what's actually on the target system.

## Edge Cases

If a component needs to talk to a sibling: use `ComponentSender::output()` to emit upward; parent routes messages downward.

If the view needs to reference a named widget outside the macro: use `#[name = "my_widget"]` annotation inside `view!`.

If GTK panics with "assertion failed: is_main_thread": ensure all GTK calls happen on the GLib main thread — never from `tokio::spawn`.

If a widget or method needs a newer GNOME runtime than your current `gnome_NN` feature provides: bump the `gnome_NN` feature on the `relm4` dep, not a separate `gtk4`/`libadwaita` version pin.

For deep widget patterns, component composition, and real-world relm4 structure: see the reference files below.

## References

- [Component Patterns](references/component-patterns.md)
- [libadwaita Widget Catalog](references/adwaita-widgets.md)
