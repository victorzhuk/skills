---
name: z-net-core
description: Network fundamentals and debugging discipline — subnetting/CIDR judgment, routing-table reads, DNS resolution chain, MTU/fragmentation hazards, mtr/tcpdump/ss/dig triage. Triggers on subnet, routing table, tunnel, router config, DNS resolution, MTU. Does not cover server deploy; see [[z-selfhost-deploy]], [[z-k8s-deploy]].
---

# Network core

Read the routing table before touching anything else — most "network is broken" reports are a routing or DNS problem wearing a different costume.

## Subnetting and CIDR — quick judgment

- CIDR notation is prefix length, not a mask to memorize per case: /24 = 256 addresses (254 usable), /25 = 128 (126 usable), /29 = 8 (6 usable) — the host count halves each time the prefix grows by one bit
- Conventional IPv4 multi-access subnets reserve network and broadcast addresses. `/31` point-to-point links and `/32` host routes are exceptions; IPv6 has different addressing rules and no broadcast address.
- size a subnet to the actual host count plus growth headroom, not a round number out of habit — a /24 for a 5-host VLAN wastes 250 addresses and widens the broadcast domain for no reason
- overlapping subnets across a VPN/tunnel is the single most common "why can't I reach X" bug — check both sides' CIDR ranges before anything else when a tunnel is involved

## Routing-table reading

- `ip route` (Linux) / `route print` (Windows) — read for longest-prefix match: the most specific matching route wins, not the first one listed
- traffic with no matching entry falls to the default route (`0.0.0.0/0` / `::/0`) — missing or wrong, and everything off-subnet breaks
- a VPN pushing `0.0.0.0/0` silently rewrites the default route through the tunnel — check `ip route` after bringing up any VPN client rather than assuming only tunnel-destined traffic changed
- policy/split routing (route by source, not just destination) is how one host reaches two networks through two different gateways at once — see [references/tunnels.md](references/tunnels.md) for the tunnel-specific pattern

## DNS resolution chain

- Inspect the client's actual resolver configuration: NSS, local caches, split DNS, and application-level DNS can change the path. `dig` queries DNS and does not prove that an application used `/etc/hosts` or the same resolver.
- a DNS leak is the resolver silently querying the ISP/default server while everything else routes through a tunnel — the most common "the VPN doesn't work right" bug that isn't actually a routing bug
- `dig +short <host>` and `dig <host> @<specific-resolver>` isolate whether the problem is resolution itself or a stale/split-horizon answer

## MTU and fragmentation

- default Ethernet MTU is 1500; every layer of encapsulation (VPN, VLAN tag, PPPoE) eats into that budget — a WireGuard tunnel over a PPPoE uplink can need MTU 1412 or lower, not the tunnel's own default
- the tell for an MTU mismatch: small packets (ping, DNS, SSH handshake) work, large ones (file transfer, TLS handshake with a big cert chain) hang or reset — that split, not general flakiness, is the symptom
- Path MTU Discovery depends on ICMP "fragmentation needed" getting through — a firewall blocking all ICMP breaks PMTUD silently and produces exactly that large-packet-hangs symptom
- nested tunnels (VPN inside VPN, VPN over a mobile hotspot) compound the overhead — lower the MTU and retest rather than guessing the exact number

## Triage order

1. `ss -tulnp` — is the service actually listening, on the expected interface and port
2. routing table — is traffic leaving toward the right gateway
3. `dig` — does the name resolve to the expected address
4. `mtr <host>` — compare intermediate results with destination loss; routers may rate-limit probe responses while forwarding normally
5. `tcpdump -i <iface> host <ip>` — use packet evidence to test hypotheses. A missing SYN-ACK may involve routing, filtering, or the server; a later hang can involve TLS or application behavior as well as MTU.

Escalate to device config only after this chain rules out the host: [references/routers.md](references/routers.md) for RouterOS/OpenWrt, [references/routing-protocols.md](references/routing-protocols.md) for switch/multi-router topologies.

## Do not

- guess the MTU — measure with a fragmentation-probing ping (`ping -M do -s <size>`) instead of picking a round number and hoping
- treat a routing problem and a firewall problem as interchangeable — the routing table and the firewall ruleset answer different questions; check both before concluding either
- treat "connection refused" and "connection timed out" as the same failure — refused means something answered and said no (wrong port, service down); timeout means nothing answered (firewall drop, routing black hole, wrong address)

## Verify

- Confirm end-to-end connectivity and application behavior; do not treat loss reported only by an intermediate `mtr` hop as forwarding loss.
- `dig` returns the expected address from the resolver the network/tunnel is supposed to use
- `ss -tulnp` confirms the service listens where the routing table expects it to be reachable

Boundary: server-side deploy discipline is [[z-selfhost-deploy]]; Kubernetes cluster networking is [[z-k8s-deploy]].
