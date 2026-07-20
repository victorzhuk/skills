# Routers reference

## RouterOS and OpenWrt — which is which

- RouterOS (MikroTik, current stable line 7.x) — CLI/Winbox-driven, with its own firewall/routing abstraction (chains, address-lists, mangle for policy routing)
- OpenWrt (current stable line 25.x) — Linux-based, config lives in UCI (`/etc/config/*`) with `iptables` or `nftables` underneath depending on release — check which firewall backend the target OpenWrt release uses before writing raw rules
- both: never rely on memory for exact syntax — option names and defaults shift between major versions; check the installed version's own docs before writing rules

## First-boot and default-credential hardening

- change the default admin username/password on first boot, before the device ever reaches a production network — a default-credential router facing the internet gets found and probed within hours, not weeks
- disable unencrypted/legacy management services (Telnet, plain HTTP admin UI, unencrypted Winbox) in favor of their encrypted equivalents (SSH, HTTPS, Winbox over TLS) — legacy services usually stay enabled by default for compatibility, not because they're safe
- restrict management access to a specific VLAN or source-address list rather than leaving the admin interface reachable from every network the device serves — the LAN-side admin panel doesn't need to be reachable from the guest VLAN

## VLAN segmentation

- one VLAN per trust zone, not per device type out of habit — the question is "what should never talk to what," not "how many device categories exist"
- trunk ports carry multiple tagged VLANs (inter-switch/router links); access ports carry exactly one untagged VLAN (end-device links) — assigning a device to the wrong port type is the most common VLAN misconfiguration, not a mistagged VLAN ID
- an untagged/native VLAN on a trunk port is an easy misconfiguration to miss — traffic without a tag lands on whatever VLAN is native, silently bypassing the segmentation someone assumed was there
- inter-VLAN routing goes through the router/firewall by design — that's the enforcement point; a switch that routes between VLANs without the firewall in the path defeats the segmentation

## Firewall rule ordering — chain concepts

- rules evaluate top to bottom, first match wins (both RouterOS chains and iptables/nftables chains) — a broad accept above a narrow drop makes the drop dead code
- RouterOS ships three built-in chains: `input` (traffic destined for the router itself — management access, routing protocol sessions), `forward` (traffic passing through the router between networks — this is where most LAN/WAN policy lives), `output` (traffic the router itself originates) — writing a LAN-isolation rule into `input` instead of `forward` is a common miss that leaves the actual pass-through traffic unfiltered
- default chain policy matters as much as the rules in it: an input chain with no explicit default and no final drop is an open chain, not a secured one
- order by specificity and cost: cheap, high-traffic matches (established/related connection state) first, so most packets short-circuit before hitting expensive rules further down
- log-then-drop for anything under active debugging, not a bare drop — logging without an eventual bound (rate limit or removal) fills disk/syslog fast

## NAT patterns

- masquerade/SNAT for outbound: many internal addresses share one public address, state tracked by the NAT table — this is why NAT state-table exhaustion under high connection-count load looks like random connection failures
- DNAT/port forwarding for inbound: a specific external port maps to a specific internal host:port — every forwarded port is attack surface; forward the minimum, prefer a VPN over exposing a service directly when the access pattern allows it
- hairpin NAT (NAT reflection): a LAN client reaching a forwarded service via the router's public IP, from inside the LAN, needs an explicit hairpin rule — without it, the LAN-side request goes out and never routes back in correctly, and it looks like the port forward itself is broken when only the internal-access path is
- double NAT (a router behind an ISP's own NAT/CGNAT) breaks inbound port forwarding entirely from the LAN-side router — shows up as "I set up port forwarding and it still doesn't work," and the fix is bridge mode on the ISP device or a VPN-based workaround, not more forward rules

## Config backup and versioning

- export the running config on every change (RouterOS `/export`, OpenWrt `sysupgrade -b` or a UCI export) before touching anything, not just before major changes — a router failure without a recent export means rebuilding from memory
- schedule automated exports (RouterOS scheduler running `/export` to a file, or a cron job pulling config off an OpenWrt box) rather than relying on remembering to do it manually before every change — the manual habit fails exactly when someone's in a hurry
- keep configs in version control like any other infrastructure-as-code artifact, with secrets (Wi-Fi passwords, VPN keys) separated out or encrypted, not committed in plaintext
- name and date backups so a rollback target is unambiguous — an undated "config-final-v2" is not a versioning scheme

## Safe-mode and rollback habits

- RouterOS Safe Mode (or an equivalent scheduled-revert script) reverts an in-progress config change automatically if the session disconnects before confirming — use it for any change to the interface/rule currently in use, since a bad firewall rule can lock out the only path back in
- test destructive changes (firewall chain rewrites, VLAN reassignment) during a window with physical/console access available, not remote access only — remote-only access plus a lockout means a truck roll
- keep the previous known-good config export reachable outside the device itself, not just on the device's own flash, so a bricked or rolled-back device still has a recovery path
- know the device's actual recovery path (serial console, reset-to-defaults button, netinstall/TFTP recovery) before it's needed — reading the recovery procedure for the first time during an outage costs more than the outage itself

## Guest/IoT isolation

- guest and IoT networks get their own VLAN with client isolation (peer devices on the same VLAN can't reach each other) and a firewall default-deny toward the main LAN — the working assumption is that every IoT device gets compromised eventually
- allow only the specific outbound an IoT device needs (its cloud API, NTP, DNS) rather than unrestricted internet — a compromised device with unrestricted egress is a much bigger problem than one confined to its actual function
- guest Wi-Fi gets internet-only access and its own DHCP/DNS scope, with no route back to LAN-side services (printers, NAS, admin panels) by default
- DNS-based filtering (a Pi-hole-class resolver as the segment's DNS server) is a useful additional layer for ad/tracker/known-bad-domain blocking, but it's a convenience layer, not a security boundary — it's trivially bypassed by any client that hardcodes a different DNS server or uses DoH, so it never substitutes for the VLAN/firewall isolation above
