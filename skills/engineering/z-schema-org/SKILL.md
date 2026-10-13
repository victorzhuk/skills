---
name: z-schema-org
description: Schema.org structured data for web content. Use for JSON-LD, Microdata, RDFa, rich results, or structured-data validation. Covers entity types, stable identifiers, truthful markup, and consumer requirements. JSON payload validation belongs to [[z-json-schema]].
---

# Schema.org structured data

Describe the page's actual entities with verified Schema.org terms and facts from the same source as the visible content.

## Establish the target

- Identify the page template, primary entity, content source, rendering framework, and consuming service.
- Inspect existing markup from templates, plugins, and client code before adding another emitter.
- Read the current Schema.org type and property pages. Verify expected value types and term status.
- Read the consumer's documentation separately. Schema.org vocabulary support does not imply eligibility for a search feature.

## Model the entities

- Choose the most specific type supported by the content. Do not force every page into `Product` or `Article`.
- Distinguish the page from the entity it describes, such as an organization, event, product, or person.
- Preserve existing stable `@id` values. Derive new identifiers from verified canonical URLs and a consistent fragment convention.
- Reuse identifiers for shared entities. Use `@graph` when several linked entities need separate definitions.
- Use `sameAs` only for verified identity links, not arbitrary related pages.
- Represent dates, durations, quantities, and enumerations according to each property's documented value types.
- Omit unsupported facts. Never invent prices, availability, reviews, ratings, credentials, or business details.

## Emit the markup

- Prefer JSON-LD for new integrations unless the consumer requires another encoding.
- Preserve working Microdata or RDFa unless migration serves a concrete requirement.
- For JSON-LD, use `@context: "https://schema.org"` and an `application/ld+json` script element.
- Serialize an object instead of concatenating JSON strings.
- Use a serializer safe for HTML script contents. Plain JSON serialization alone does not prevent script termination by untrusted text.
- Generate markup from the same content model as the page. Update both when prices, dates, or availability change.
- Inspect the rendered page for duplicate or contradictory entities after plugins and hydration run.

## Do not

- Treat Schema.org as a JSON Schema validation dialect.
- Promise rankings, indexing, or rich results because markup passes validation.
- Assume a valid Schema.org type has a supported Google rich result.
- Add hidden claims or misleading entities solely to qualify for search features.
- Replace semantic HTML, accessible content, or canonical metadata with JSON-LD.

## Verify

1. Inspect the selected encoding in the rendered page. For JSON-LD, parse the emitted JSON.
2. Verify entity relationships, identifiers, and vocabulary with the Schema Markup Validator.
3. For Google Search, verify current feature requirements and run the Rich Results Test.
4. Compare markup values with visible content on representative pages, including missing optional fields.
5. For JSON-LD, test untrusted text containing a script-closing sequence against the serializer.
6. Report syntax, vocabulary, and consumer results separately. Name verification steps that require deployment or external access.

## References

- [Schema.org vocabulary and encodings](https://schema.org/docs/gs.html)
- [JSON-LD identifiers and graphs](https://www.w3.org/TR/json-ld11/)
- [Schema Markup Validator](https://validator.schema.org/)
- [Google structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Google structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [JSON-LD script safety in Next.js](https://nextjs.org/docs/app/guides/json-ld)

Use [[z-json-schema]] for payload contracts and [[z-react-core]] for React rendering conventions.
Use [[z-open-graph]] for shared-link previews and crawler metadata.
