# Security review checklist

For each applicable item, record pass with evidence, an open gap, or unknown. Explain exclusions. An unchecked item needs investigation.

## Authentication and authorization

- [ ] Password storage uses reviewed algorithms, salts, encoded parameters, and measured work factors; legacy upgrade policy is explicit.
- [ ] Session and CSRF controls match browser flows; login, recovery, and token endpoints have abuse limits.
- [ ] Reset and verification tokens expire, are single-use, and do not appear in logs.
- [ ] Protected operations verify actor, action, resource, tenant, and sensitive fields server-side.
- [ ] Tests cover allowed access, cross-user/tenant denial, revoked access, and privilege escalation.

## Input, output, and data

- [ ] External input has enforced type, field, range, byte, and processing limits.
- [ ] Database queries use parameters; rendered output uses context-appropriate encoding.
- [ ] Uploads validate supported content, bound decompression, and prevent unintended execution or disclosure.
- [ ] URL fetching enforces destination policy at connection time, including redirects and internal/metadata addresses.
- [ ] Responses expose only authorized fields; errors follow the contract without disclosing internals.
- [ ] Sensitive data has appropriate transport, storage, access, retention, and deletion controls.
- [ ] Secret scanning covers the changed scope; known exposure has a revocation and investigation record.
- [ ] Logs record useful security decisions without credentials or unnecessary payloads; log access is restricted.

## Deployment and dependencies

- [ ] Browser headers, CORS, and cookie policies fit the deployed authentication flow.
- [ ] Requests, concurrency, retries, and expensive operations have enforced limits.
- [ ] Dependencies and executable scripts come from reviewed sources; locked installs are used where supported.
- [ ] Vulnerabilities are assessed for runtime and build-time exposure; deferred fixes have owners and review dates.
- [ ] New/changed skills and tool definitions are reviewed before activation; detection-only scanners are identified as such.

## LLM and agents

Use [Agent security](agent-security.md) for control ownership and the abuse-case matrix.

- [ ] Trusted roles and history are server-owned; external content cannot grant permission or redefine the task.
- [ ] Tool execution verifies identity, resource scope, arguments, and allowed destinations outside the model.
- [ ] Required approvals bind the actual action; changed arguments, expiry, and replay cannot widen authorization.
- [ ] Sensitive context is limited to authorized data and destinations, including fallback providers and outbound tools.
- [ ] Retrieval enforces current ACLs before context assembly; revocation reaches chunks, indexes, and caches.
- [ ] Persistent memory retains provenance and scope; retrieved instructions cannot become durable policy or user approval.
- [ ] MCP token audiences, downstream credentials, and resource permissions are validated; tool annotations do not grant authority.
- [ ] Resource limits apply across model calls, retries, tool chains, and fallbacks; cancellation reaches active work.
- [ ] Tests inspect actual effects for injection, disclosure, approval bypass, and budget exhaustion, with benign controls.
- [ ] Incident procedures can stop affected capabilities, revoke credentials, and recover approved state without destroying necessary evidence.

---

Checklist adapted from addyosmani/agent-skills security-and-hardening (<https://github.com/addyosmani/agent-skills>, MIT).
