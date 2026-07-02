---
name: z-concise-human-docs
description: Write and edit documentation, comments, guides, runbooks, specs, and explanatory prose in a concise human style. Use whenever writing or rewriting docs/comments in any language.
---

<objective>
Write documentation and comments in a short, direct, human style in any language: Russian, English, or the language already used by the file.

The style is factual and compressed. It avoids inflated explanations, tutorial tone, and second sentences that only explain the first sentence again.
</objective>

<core_rules>
- Preserve the document language. If the file is Russian, write Russian. If English, write English. If mixed, keep established technical names and write prose in the dominant language.
- Prefer one precise sentence over two explanatory sentences.
- Prefer facts over advice. State what happens, where, and under which condition.
- Cut filler: "легко", "просто", "важно", "поэтому", "следствие простое", "it is important", "simply", "note that", "as a result".
- Avoid motivational or tutorial phrasing. Do not explain obvious consequences.
- Do not write "human-sounding" slang. Keep it dry, but not bureaucratic.
- Keep technical names as-is when they connect to code, API, flags, statuses, or configs.
- Do not translate domain terms if translation makes the text less searchable.
- Use short paragraphs. Split dense docs with tables or bullets, not with long narration.
- For comments, write only WHY, invariant, edge case, or non-obvious constraint. If the comment explains WHAT, rename code or delete the comment.
</core_rules>

<style_pass>
Before finalizing docs or comments, run this pass:

1. Remove the second sentence if it only justifies the first.
2. Replace "может / should / should not" with the actual rule when the behavior is deterministic.
3. Replace "because / поэтому / для этого" explanations with a shorter condition-result form.
4. Remove adjectives that do not change behavior: "главный", "важный", "простой", "фактический", "полноценный" unless the contrast is needed.
5. Check every paragraph for one job. If it has setup, rule, and exception in one paragraph, split or table it.
6. Keep examples only when they clarify a real decision. Remove generic examples.
</style_pass>

<patterns>
Bad:
`Модерация размазана по трем сервисам, но роли у них разные. Если смешать эти роли, легко начать чинить баг не там.`

Good:
`Модерация распределена между office, client и admin; у каждого сервиса своя зона ответственности.`

Bad:
`This is important because otherwise the user may see inconsistent behavior.`

Good:
`The user can see inconsistent behavior when the cache is stale.`

Bad:
`После создания заказа нельзя ломать оплату только потому, что seller/product позже скрыли. Поэтому часть кода читает данные без публичного фильтра.`

Good:
`После создания заказа оплата не зависит от текущей публичной видимости seller/product.`
</patterns>

<comments>
Use the same style for code comments:

- Good comment: `// retry uses a fresh context because shutdown cancels the request context`
- Bad comment: `// create a new context`
- Good comment: `// keep legacy documents visible while strict moderation is disabled`
- Bad comment: `// check if strict moderation is disabled`

If a comment is needed, keep it one sentence unless it documents an invariant or a migration hazard.
</comments>

<success_criteria>
- Text is shorter after editing unless new facts were added.
- No sentence exists only to explain that the previous sentence matters.
- The reader can identify the rule, condition, and consequence without reading around filler.
- Technical terms stay searchable.
- Comments explain WHY, not WHAT.
</success_criteria>
