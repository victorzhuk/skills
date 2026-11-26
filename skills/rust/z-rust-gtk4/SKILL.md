---
name: z-rust-gtk4
description: "Build GTK4 desktop interfaces in Rust with relm4 and libadwaita. Use for message-driven components, preferences dialogs, widget updates, or system trays. See [[z-rust-core]] for Rust ownership and async work."
---

# Rust GTK4 with relm4

## Route messages to the model

Use `init()` to build the initial model and widget tree. Send typed messages from signal handlers. Update the model in `update()`. Bind dependent properties with `#[watch]` in `view!`.

| Trait | Use |
|---|---|
| `SimpleComponent` | Synchronous updates without command outputs |
| `Component` | Background commands that return typed outputs to `update_cmd()` |
| `AsyncComponent` | Component initialization or updates that must await work |

```
User action (signal) → sender.input(Msg::X)         → update()     → model mutates → view re-renders
Background task      → sender.oneshot_command(...)  → update_cmd() → sender.input(...) / model mutates
```

Keep GTK widget access on its main thread. Send background results to the component. Ignore stale results when a newer request supersedes them.

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

Route sibling messages through the parent with `sender.output()`. Name widgets with `#[name = "my_widget"]` when the component needs a widget reference.

## Choose widgets

Keep the existing window layout. A vertical box or `AdwToolbarView` can hold the header and content.

```
AdwApplicationWindow
└── gtk::Box (vertical)
    ├── AdwHeaderBar
    └── AdwToastOverlay
        └── [primary content]
```

Use `AdwPreferencesDialog` with libadwaita 1.5 or later. For older targets, use `AdwPreferencesWindow`. GNOME deprecated the window in 1.6.

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

Use a status page for an empty collection, a banner for an actionable failure, and a toast for a brief confirmation.

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
    #[watch]
    set_revealed: model.has_error,
    set_button_label: Some("Retry"),
    connect_button_clicked[sender] => move |_| sender.input(Msg::Retry),
}
```

```rust
adw::ToastOverlay {
    // wraps main content; show toasts programmatically:
}

// In update():
self.toast_overlay.add_toast(
    adw::Toast::new("Settings saved")
);
```

Connect signals to typed input messages.

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

See [component patterns](references/component-patterns.md) and the [widget catalog](references/adwaita-widgets.md) for other layouts.

## Connect a tray

Check the desktop's tray protocol. With `ksni`, keep the tray state independent of GTK objects and send actions to the component.

```rust
use std::sync::Arc;
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

## Check the desktop build

Check compatible crate versions, enabled features, and native library versions. This manifest example targets one platform configuration.

```toml
[dependencies]
relm4 = { version = "0.11", features = ["gnome_49", "libadwaita"] }
tokio = { version = "1", features = ["full"] }
ksni  = "0.3"
```

```rust
use relm4::gtk;
use relm4::adw;
```

Build against the oldest supported runtime. Open the preferences dialog and exercise the success, empty, and failure states. Test tray actions on each supported desktop.
