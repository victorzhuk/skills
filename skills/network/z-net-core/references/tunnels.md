# Tunnels reference

## WireGuard baseline

- key pairs are Curve25519: each peer holds a private key and publishes its public key — the private key never leaves the device; config files holding one need locked-down permissions (`chmod 600`) and must never land in a public repo
- generate with `wg genkey | tee privatekey | wg pubkey > publickey` — the private key is the file that stays secret; the public key is the one exchanged with peers
- a config is `[Interface]` (this peer's own private key, address, listen port, DNS) plus one or more `[Peer]` blocks (that peer's public key, endpoint, `AllowedIPs`, optional `PersistentKeepalive`) — the shape is symmetric, each side configures the other as a peer
- `AllowedIPs` does two jobs at once: it's both the routing-table entry for what goes into the tunnel and the cryptokey-routing filter for what's accepted as coming from a given peer. A peer's `AllowedIPs` must match its actual assigned address(es) — too broad and it can spoof traffic for ranges it shouldn't own, too narrow and legitimate traffic gets dropped as unrecognized
- site-to-site: `AllowedIPs` = the peer's whole subnet. Full-tunnel client: `AllowedIPs = 0.0.0.0/0, ::/0`. Split-tunnel client: list only the specific subnets that should route through the tunnel
- `PersistentKeepalive = 25` (seconds) is needed on any peer behind NAT that doesn't itself initiate outbound-only connections — without it, the NAT mapping times out (typically 30s+) and the far side can't reach back in until the near side sends traffic again
- WireGuard is stateless about roaming: a peer's endpoint address updates automatically the moment a valid handshake arrives from a new source — that's what makes it survive a client's Wi-Fi-to-cellular switch without reconnecting, but it also means two peers behind separate NATs with neither holding a stable public endpoint can't establish a session without a relay or a rendezvous point
- WireGuard's own default MTU is 1420, sized for a clean path with no extra encapsulation. Every additional layer (PPPoE, another VPN, a VLAN tag) eats into that — measure, don't assume. A too-high MTU produces the classic "small packets work, big ones hang" symptom (see the core skill's MTU section)

## xray/v2ray-class proxies — concept level

- these are TLS-camouflage proxies, not standard VPN tunnels: they wrap traffic to look like ordinary HTTPS to a censor doing deep packet inspection, rather than relying on a recognizable VPN protocol signature the way WireGuard or IPsec do
- VLESS is the lightweight transport protocol — no encryption of its own, it defers entirely to the TLS layer carrying it. It runs on Xray-core, the actively maintained fork of the v2ray lineage; "v2ray" colloquially still refers to this proxy family even when the actual server is Xray-core
- REALITY is the current-generation camouflage layer: instead of terminating TLS with a self-signed or Let's-Encrypt certificate a censor can fingerprint as proxy infrastructure, it borrows the TLS handshake of a real, innocuous target site so the connection is indistinguishable from a normal visit to that site
- transport choice sits underneath the protocol: raw TCP+TLS is simplest; WebSocket+TLS behind a CDN adds a layer that survives some blocking of the origin IP directly; gRPC is another disguise option. Pick based on what's actually being blocked in the deployment's threat model, not by default
- a fallback path (unrecognized or non-matching traffic gets proxied through to a real website instead of erroring) is what keeps casual probing from fingerprinting the server as proxy infrastructure — configuring one is part of the setup, not optional hardening
- verify exact protocol/feature names (Vision flow control, REALITY parameters) against the Xray-core project's own docs before configuring anything — this space iterates fast and specifics age out quickly

## Split/policy routing patterns

- split-tunnel: only specific destination subnets route through the tunnel, everything else uses the normal default route — lower latency for non-tunneled traffic, but leaks metadata about which sites aren't tunneled
- policy routing: route by source address or firewall mark rather than destination alone (Linux `ip rule` plus multiple routing tables, `fwmark` set by `iptables`/`nftables`) — the pattern behind "this app's traffic goes through the tunnel, everything else doesn't" on a single host
- per-app routing on Linux typically layers on top of policy routing: a cgroup or process-owner match sets the fwmark, the fwmark selects the routing table, the routing table points at the tunnel — three separate mechanisms working together, and a break in any one looks like "the tunnel just doesn't apply to this app"
- full-tunnel is the default-safe choice when the threat model includes local-network observers; split-tunnel is the default when the goal is only to reach specific remote resources without paying the latency cost everywhere

## DNS-leak discipline

- a tunnel that only handles IP traffic but leaves the OS resolver pointed at the ISP's DNS leaks every hostname looked up outside the tunnel, even though the actual connection may end up going through it
- IPv6 is a common blind spot: a config that tunnels IPv4 correctly but doesn't handle IPv6 (either tunneling it too or disabling it) leaks over IPv6 whenever the destination and path both support it — "no DNS leak" tested only over IPv4 isn't verified
- fix at the source: push the tunnel's own DNS server via the tunnel config (WireGuard `DNS =`, or a proxy's own DNS-over-tunnel setting) rather than trying to firewall off port 53 after the fact
- transparent DNS interception (redirecting all port-53 traffic to the tunnel's resolver regardless of what the client asked for) is a stronger backstop than trusting every client to be configured correctly, at the cost of breaking clients that hardcode a specific DNS server and expect to reach it directly
- verify with a DNS-leak test that reports the resolver actually used, not just whether traffic is tunneled — the two questions have different answers when DNS is misconfigured

## Kill switch

- a kill switch blocks all traffic when the tunnel drops, instead of silently falling back to the normal unprotected route — without one, a dropped tunnel is a silent leak, not a loud failure
- implement as a firewall rule that only permits traffic out the tunnel interface (plus the tunnel's own handshake traffic), applied whether or not the tunnel is currently up — not as an application-level check, which races the actual network state and can miss the window between drop and detection
- decide fail-closed vs fail-open explicitly and document which: fail-closed (default for a privacy/security threat model) blocks everything on tunnel failure; fail-open (acceptable for some availability-first internal use cases) falls back to the normal route. The undocumented default is whatever the OS/client happens to do, which is rarely the intended choice
- test it directly: bring the tunnel interface down (not just disconnect the client cleanly) and confirm no traffic escapes — a kill switch that's never been tested against an actual interface failure, only a graceful disconnect, is unverified
