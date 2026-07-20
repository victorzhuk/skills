# Routing protocols reference

## OSPF vs BGP — when each

- OSPF (interior gateway protocol): use inside a single administrative domain — one organization's network, all routers trusting each other, fast convergence on link failure. It computes shortest path by link cost, not policy
- OSPF areas exist for scale: a single-area design (everything in backbone area 0) is simplest and fine until the link-state database gets too large for fast convergence; multi-area design (area 0 as backbone, other areas attached to it) contains that growth by summarizing routes at area boundaries — don't reach for multi-area until single-area actually shows convergence or database-size problems
- BGP (exterior/interior gateway protocol): use between administrative domains — different organizations, or internal zones large enough that policy, not just shortest path, needs to control routing. BGP is policy-first: it picks routes by configured preference, not automatically by "shortest," and that's the point of reaching for it
- the practical line: a single site or a small number of sites under one team's control rarely needs BGP internally — OSPF, or even static routes at small enough scale, is simpler and does the job. BGP earns its complexity at multi-homed internet edges, multi-site policy control, or when peering with an actual external network

## BGP session and policy hygiene — concept level

- a BGP session is a TCP connection between two routers (peers) exchanging route advertisements — before touching policy, confirm the session itself is up and stable; a flapping session before policy is even set is a lower-layer problem, not a policy one
- filter both directions: filter what's accepted from a peer (don't blindly trust routes announced to you) and what's advertised to a peer (don't leak internal-only routes outward) — an unfiltered session is how routing leaks happen
- set a max-prefix limit on every session — a peer that starts announcing far more routes than expected (misconfiguration on their end, or a route leak/hijack in progress) should tear the session down past a sane threshold rather than silently accepting an outsized routing table
- prefer explicit deny-by-default filter lists over "filter the bad stuff seen so far" — an allowlist's failure mode is refusing something legitimate (loud, fixable); a denylist's failure mode is leaking something nobody thought to block (silent, damaging)
- local preference and AS-path prepending are the two levers for influencing inbound/outbound path selection — know which lever affects which direction before reaching for either

## L2 hygiene

- Spanning Tree Protocol (STP) prevents loops in a switched network with redundant physical links — a network without STP, or a misconfigured one, plus a redundant cable is a broadcast storm waiting to happen, not a resilience feature
- STP convergence has a cost: a topology change (a link going up or down) triggers a recalculation with real, if brief, traffic disruption — edge-port/PortFast marking on end-device ports (never inter-switch links) avoids unnecessary convergence delay
- storm control (broadcast/multicast/unknown-unicast rate limiting per port) contains a loop or a misbehaving device before it saturates the whole L2 domain — a backstop for when STP configuration, or a rogue device, still lets a storm start

## Managed-switch judgment

- unmanaged switches are fine for a flat, single-VLAN, no-policy segment — the moment VLANs, port security, or per-port policy are needed, that's the line to a managed switch
- a managed switch whose firewall/management plane was never hardened (default credentials, management VLAN exposed on a user-facing port) is a bigger attack surface than an unmanaged one, not a smaller one — managed capability requires managed discipline
- device-specific CLI syntax for any of this lives with the vendor's own documentation — the concepts here (chain evaluation order, filtering direction, loop prevention) transfer across vendors, the exact commands don't

## When this doesn't apply

- most home and small-office networks never need any of the above — a single router with a static default route and no redundant links has no loops to prevent and no policy decision that OSPF or BGP would improve
- reach for this material when a second router/link appears (redundancy, multi-homing) or when peering with a network outside the organization's own control — using OSPF or BGP below that threshold is complexity added for its own sake, not because the network needs it
