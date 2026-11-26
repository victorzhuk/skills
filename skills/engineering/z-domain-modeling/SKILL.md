---
name: z-domain-modeling
description: "Define domain terms, bounded contexts, aggregate boundaries, and invariants. Update the project's existing glossary or specification. See [[z-deep-modules]] for module interfaces."
---

# Model the domain

## Establish the vocabulary

1. Read the project's glossary, specification, and existing decisions. In an OpenSpec project, use its capability specs and change designs for terms and decisions.
2. Ask how the business names each concept. Record the term, its meaning, and any ambiguous synonyms.
3. Use each term consistently within its context. For example, a billing account and an authentication account can have different invariants.
4. Identify mismatches in code, tests, or contracts. For public names, plan compatibility before a rename.
5. Update the authoritative record when a definition changes. Keep one glossary for the same context.

## Define boundaries

Group state that must satisfy an invariant in one transaction. Identify the aggregate root responsible for maintaining that invariant.
Translate concepts explicitly when crossing contexts. Use an adapter for external formats, database rows, or generated transport types.
Record the decision, alternatives, and reason for significant boundaries. Use the project's spec, decision table, or ADR convention.

Use [[z-deep-modules]] to evaluate interfaces. For Go layer dependencies and naming, see [[z-go-clean-arch-di]] and [[z-go-naming]].
Use [[z-creating-flow-doc]] to document a specific operation.

## Check the model

Trace a real operation through its domain terms, state changes, and boundary translations.
Check that each invariant has an owner and that its normal and exceptional cases agree with the recorded model.
Check external compatibility before changing an established identifier.
