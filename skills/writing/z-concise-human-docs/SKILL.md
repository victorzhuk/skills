---
name: z-concise-human-docs
description: "Write or edit guides, specifications, runbooks, and code comments for clarity. Preserve technical terms, conditions, and the document's language. See [[z-fuck-slop]] for publication style."
---

# Write and edit technical documentation

## Preserve the contract

Read the source material and any existing passage. Identify the reader, action, conditions, exceptions, and expected result.
Preserve the document's language and established technical terms. Keep commands, flags, configuration keys, status names, and quoted output exact.

## Edit the prose

1. Put the action or observable result first.
2. Use one instruction per sentence. Keep an exception next to the rule it qualifies.
3. Remove repeated explanations, promotional adjectives, and statements that add no decision or fact.
4. Keep reasons that affect safety, interpretation, or the reader's choice.
5. Use a table for alternatives and a numbered list for ordered steps.
6. Preserve uncertainty. Replace a qualified claim with a rule only when the evidence establishes deterministic behavior.

For example, “The user can see inconsistent behavior when the cache is stale” names the condition and outcome.
Russian example before editing — «После создания заказа нельзя ломать оплату только потому, что seller/product позже скрыли».

After editing — «После создания заказа оплата не зависит от текущей публичной видимости seller/product».

For implementation comments, follow [[z-zero-comments]]. Preserve public contracts, tool markers, and operator guidance.

## Check the result

Compare the revised text with the source. Check every condition, exception, consequence, and technical name.
Check that a reader can perform the task using the revised text. Keep words that resolve ambiguity.
