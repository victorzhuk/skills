---
name: z-net-core
description: "Diagnose network routes, DNS, tunnel addressing, or path MTU. Use for CIDR, VPN, routing tables, dig, ss, or mtr. See [[z-selfhost-deploy]] and [[z-k8s-deploy]] for deployment."
---

# Network diagnosis

## Trace the connection

1. Record the source, destination, port, protocol, and symptom. Check the service listener with `ss -tulnp` on Linux.
2. Inspect the route with `ip route get <address>` on Linux or `route print` on Windows. Check source-based rules when applicable.
3. Check DNS through the application's resolver. Compare the result with `dig <host> @<resolver>`.
4. Compare the destination result with intermediate hops using `mtr <host>`. Routers can rate-limit probe responses while forwarding traffic.
5. Inspect packets for the failing exchange when necessary. A missing response alone cannot identify a faulty firewall or router.

## Addressing and routing

- Conventional IPv4 multi-access subnets reserve network and broadcast addresses. A /24 has 254 usable addresses, /25 has 126, and /29 has six.
- Account for /31 point-to-point links and /32 host routes separately. IPv6 has no broadcast address.
- Compare both tunnel endpoints' prefixes for overlap. Check effective routes after enabling a VPN.
- Within the selected routing table, the longest matching prefix wins. A default route matches when no longer prefix applies.
- Check policy routing, route metrics, and source address when several paths exist. See [tunnel guidance](references/tunnels.md).

## DNS and path MTU

Inspect local hosts files, resolver caches, split DNS, and application DNS settings. A successful `dig` query tests only its selected resolver.
Check which resolver receives a query when investigating a DNS leak.

Compare small and large transfers on the same path. A handshake that succeeds before a large transfer stalls can indicate an MTU issue.
Use the platform's path-MTU probe. Linux IPv4 example: `ping -M do -s <payload-size> <host>`.
Account for protocol headers and tunnel overhead. Check delivery of IPv4 fragmentation-needed or IPv6 Packet Too Big messages.
Retest the actual application. Filtering, TLS, and application failures can cause similar symptoms.

## Check the affected path

Check the listener, selected route, resolver answer, and end-to-end application response from the affected client.
Use [router guidance](references/routers.md) or [routing protocols](references/routing-protocols.md) when observations implicate network equipment.
