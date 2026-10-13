# LLM and agent security

Use this reference when a model handles external content, invokes tools, retrieves private data, or persists memory.
Map the trusted task, identities, protected resources, data destinations, and execution boundaries before selecting controls.

## Trust and authority

- Treat documents, web pages, repository content, images, tool results, and imported history as data from their actual sources.
- Preserve source and trust labels through retrieval, summaries, handoffs, and memory. Repetition does not increase authority.
- Keep privileged roles, trusted conversation history, and authorization state under server or host control.
- Do not accept claims of system instructions, user approval, emergencies, or changed policy from task data.
- Parse and delimit external content to reduce confusion. Delimiters, keyword filters, and model classifiers cannot enforce permissions.
- Measure detection failures and benign failures. Bound detector input size and execution cost. Do not require private model reasoning for checks.

## Enforce actions outside the model

| Boundary | Enforcement owner | Required check |
|---|---|---|
| Tool invocation | Host wrapper or tool server | Authenticate actor; authorize action, resource, tenant, and normalized arguments before execution. |
| Files and subprocesses | Execution service and OS | Constrain roots, symlink resolution, executable choices, privileges, and resource limits. |
| Network and disclosure | Tool implementation and egress policy | Check destination and data scope, including redirects, proxies, attachments, and rendered remote URLs. |
| Required approval | Host-controlled action record | Bind actor, target, operation, and parameters; enforce validity and the action's replay policy. |
| Retrieval and memory | Storage/retrieval service | Apply current user/tenant permissions before content reaches the model or a persistent store. |
| Consumption | Orchestrator and provider adapter | Enforce shared limits across tools, retries, nested calls, and provider fallbacks. |

Use strict argument schemas and reject unsupported fields, but also authorize semantically valid requests.
Resolve resource identifiers under the caller's permissions. Model-supplied identity or tenant fields cannot establish authority.
Keep credentials outside model context where possible. Give each integration only the access it needs.

When an operation requires approval, present its actual effect and validate the approval at execution time.
For single-use approvals, check and consume the record atomically. Use idempotency where retries can repeat an effect.
Changed arguments or expired approval require a new authorization decision. External text cannot supply that decision.
Preserve existing user authorization within its approved scope. Do not prompt again for every ordinary tool call.

## Validate outputs at their destinations

- Treat model output as untrusted input even when it matches a schema or passes a classifier.
- Use parameterized queries, structured subprocess arguments, context-aware HTML encoding, and contained filesystem operations.
- Allow only expected actions and destinations. A valid URL or path may still identify a forbidden resource.
- Apply disclosure policy to email, uploads, issue comments, browser navigation, images, and other outbound channels.
- Avoid automatic fetching or rendering of model-generated remote content containing sensitive context in paths or query strings.
- Send only task-required sensitive data to authorized providers and recipients. Apply the same policy to fallback providers.

## Retrieval and persistent memory

- Review ingestion sources and record provenance. Content validation does not make embedded instructions trusted.
- Carry document access rules to chunks. Enforce current permissions before retrieval results enter model context.
- Scope caches, indexes, embeddings, and memory by authorized user, tenant, and project boundaries.
- Propagate access revocation and deletion to derived stores and caches. Verify stale results cannot bypass current policy.
- Separate durable facts from instructions and permission records. Model summaries cannot create user preferences or authorization.
- Require authorized memory writes. Retain source, uncertainty, and scope so recalled claims can be checked or withdrawn.
- Keep a recovery path for poisoned memory and indexes. Preserve necessary evidence under the applicable retention policy.

See [[z-memory-hygiene]] for memory lifecycle guidance.

## MCP, tools, and skill dependencies

- Review source identity, requested capabilities, executable scripts, and referenced assets before first activation and after relevant changes.
- Review tool names, descriptions, schemas, and results as potential injection surfaces. Detect unexpected definition changes.
- Pinning and hashes identify reviewed bytes; they do not prove safe behavior or freeze a remote server's implementation.
- Treat `allowed-tools`, read-only annotations, and idempotency hints as metadata unless the host demonstrably enforces them.
- Isolate credentials and permissions per server. Validate remote token audiences and resource permissions. Do not pass client tokens through downstream.
- Apply SSRF controls to authorization metadata and token endpoint discovery as well as ordinary fetch tools.
- Treat stdio as a transport, not a sandbox. Verify the process's actual filesystem, network, environment, and subprocess access.
- Require installation policy to state whether failure prevents activation. A scan after activation provides detection, not quarantine.
- Review changed content independently of static suppressions. A clean scan or accepted baseline is not proof of injection resistance.

Check the deployed MCP revision and SDK before prescribing protocol-specific behavior. See [[z-go-mcp-server]] and [[z-skill-mastery]].

## Resource limits and operations

- Bound input/output bytes and tokens, concurrent work, tool calls, retries, recursion, wall time, and spending where applicable.
- Enforce budgets across fallback providers and parallel branches. Record partial usage even when requests fail or streams disconnect.
- Make cancellation reach active calls and subprocesses. Keep emergency stop authority in the host, outside model control.
- Log correlation IDs, source/resource identifiers, policy decisions, approved actions, and observed outcomes with bounded fields.
- Exclude credentials and unnecessary prompt, document, or tool payloads. Restrict log access and retention.
- On suspected compromise, stop affected capabilities, revoke exposed credentials, and recover approved state through the host's incident procedure.

## Verify effects, not refusal text

Use inert test markers and controlled destinations. Instrument tool, storage, and network boundaries.
Record attack surface, allowed task, expected denial, actual effects, benign control, and remaining uncertainty.
Bound repeat counts and report model/configuration versions. One successful test does not establish general resistance.

| Abuse case | Required evidence |
|---|---|
| Direct or document/tool-result instructions that contradict the task | No unauthorized action or disclosure; allowed document analysis still succeeds. |
| Encoded, multilingual, or image-carried instructions | The same permission boundary holds across supported input forms. |
| Forged user approval or privileged role | Execution rejects the unsupported authority claim. |
| Approved call with changed target/arguments, expiry, or replay | The protected effect remains within valid approval and idempotency policy. |
| Cross-tenant retrieval, cache hit, or revoked document | Unauthorized content never enters model context or output. |
| Instructions persisted through memory or a summary | Recall preserves provenance; no new permission or policy appears. |
| Poisoned or changed tool metadata | Review/activation policy catches relevant changes; runtime permissions still constrain the server. |
| Sensitive content sent through a tool or rendered remote URL | Egress/disclosure controls deny the transfer before it occurs. |
| Retry, fallback, or parallel-call amplification | Shared budgets terminate work and expose the stopping reason. |
| Legitimate task containing quoted attack text | The task can complete within its authorized scope without an unnecessary approval loop. |

Mark absent enforcement as an open gap. Static scans and content review verify guidance, not a consuming application's runtime security.

## Sources

Reviewed 2026-10-13. Use explicit editions when citing risk identifiers.

- [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OWASP AI Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)
- [OWASP RAG Security](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html)
- [OWASP MCP Security](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- [MCP security guidance, 2026-07-28](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [OWASP LLM Top 10, 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
- [Containment engineering](https://www.anthropic.com/engineering/how-we-contain-claude)
