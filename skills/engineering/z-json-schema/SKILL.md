---
name: z-json-schema
description: JSON Schema contracts for configuration and payload validation. Use for schema authoring, dialect migration, $ref resolution, or compatibility analysis. Covers required fields, composition, formats, and validator behavior. Web entity markup belongs to [[z-schema-org]].
---

# JSON Schema contracts

Select the dialect and validator before writing constraints. Verify the accepted data, not only the schema's syntax.

## Establish the contract

- Inspect existing schemas, validators, generator inputs, and producer and consumer versions.
- Preserve the project's dialect unless migration is required. For new contracts, prefer Draft 2020-12 when all consumers support it.
- Declare `$schema` explicitly. Use `https://json-schema.org/draft/2020-12/schema` for Draft 2020-12.
- In Draft 2020-12, use `$id` for schema identity and `$defs` for reusable definitions.
- Preserve older dialect keywords where required, including Draft 4 `id` and Draft 7 `definitions`.
- Resolve relative `$ref` values against the applicable base URI. Verify every reference resolves in the deployed environment.
- Distinguish standalone JSON Schema from a host specification's dialect, including OpenAPI Schema Objects.
- OpenAPI 3.1 uses a dialect based on Draft 2020-12. Do not assume OpenAPI 3.0 schemas have the same semantics.

## Express constraints deliberately

| Requirement | Rule |
|---|---|
| Object shape | Declare `type: "object"`. `properties` alone does not require an object. |
| Required field | List it in `required`. Declaring a property does not require its presence. |
| Nullable field | Include `"null"` in the allowed types. Missing and null are different cases. |
| Unknown fields | Choose an explicit compatibility policy before closing the object. |
| Simple closed object | Use `additionalProperties: false` where its properties are declared. |
| Closed composition | Consider `unevaluatedProperties: false` with a supporting dialect and validator. |
| Alternatives | Use `anyOf` for one or more matching branches, `oneOf` for exactly one. |
| Combined constraints | Use `allOf` for intersection. It does not merge objects or override constraints. |
| Homogeneous array | Use `items` with one schema. |
| Tuple in Draft 2020-12 | Use `prefixItems`, then `items` for remaining elements. Specify length constraints separately. |

Do not place `additionalProperties: false` inside a base schema and expect `allOf` to permit undeclared extensions.
Test conditional schemas when the discriminator is absent. Include `required` in `if` when its presence controls the branch.

## Control validator behavior

- Verify whether the validator enforces `format`. Draft 2020-12 separates format annotations from assertions.
- Treat `default`, `examples`, and `description` as annotations, not automatic data mutation or validation rules.
- Keep coercion, default insertion, and removal of unknown fields disabled unless the contract explicitly requires them.
- Resolve external schemas from pinned local resources where possible. Do not fetch arbitrary untrusted `$ref` targets.
- Bound validation work for untrusted schemas and large inputs. Review regular expressions for excessive runtime.

## Evolve the contract

- Name the compatibility direction: old data with a new reader, or new data with an old reader.
- Assess added required fields, narrowed enums, stricter bounds, and changed unknown-field policies against that direction.
- Test old and new fixtures with both relevant schema versions. Do not infer compatibility from a version label.

## Do not

- Confuse JSON Schema with Schema.org vocabulary or database migrations.
- Assume generated language types enforce runtime constraints.
- Silently upgrade a dialect or accept unsupported keywords.
- Maintain a second handwritten schema when the repository already generates its contract from an authoritative source.

## Verify

1. Run meta-schema validation for the selected dialect.
2. Compile it with the exact production validator and options.
3. Exercise valid data, missing required fields, nulls, wrong types, unknown fields, and boundary values.
4. Exercise ambiguous alternatives, unresolved references, and each conditional branch when used.
5. Verify invalid formats fail when the contract requires format enforcement.
6. Run through the repository's bounded test wrapper. Report the dialect, validator configuration, and compatibility results.

## References

- [Draft 2020-12 core](https://json-schema.org/draft/2020-12/json-schema-core)
- [Draft 2020-12 validation](https://json-schema.org/draft/2020-12/json-schema-validation)
- [Objects and composition boundaries](https://json-schema.org/understanding-json-schema/reference/object)
- [Boolean schema composition](https://json-schema.org/understanding-json-schema/reference/combining)
- [OpenAPI 3.1 Schema Object](https://spec.openapis.org/oas/v3.1.1.html#schema-object)

Use [[z-go-api-design]] for HTTP contracts and [[z-schema-org]] for web entity markup.
