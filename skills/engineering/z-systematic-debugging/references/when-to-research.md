# Research during debugging

Research a concrete knowledge gap, then return to the probe.

| Gap | Primary source |
|---|---|
| Installed API or flag | Local help, source, versioned official reference |
| Behavior after upgrade | Release notes and migration guide for the installed versions |
| Suspected library defect | Upstream issue with matching version and reproduction |
| Protocol behavior | Published specification and implementation documentation |
| Project business rule | Current spec, tests, records, and caller clarification |

Use available documentation tools and discover their current names/schemas. Do not hard-code an MCP method from an older integration.

Search with the exact error and installed version. Treat issue comments and workarounds as hypotheses until reproduced. Check publication dates before presenting a historical report as current behavior.

Read local code first when the uncertainty is its control flow or data. External documentation cannot establish what this deployment executed.

Stop researching when the next experiment is clear. Record the source and the version-sensitive claim it supports.
