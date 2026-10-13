---
name: z-cloudevents
description: CloudEvents envelopes and protocol mappings. Use for event identity, structured or binary HTTP mode, data_base64, or event schema evolution. Payload validation belongs to [[z-json-schema]]. Go delivery patterns belong to [[z-go-messaging]].
---

# CloudEvents

Separate the event envelope, payload contract, and transport binding. Use the released CloudEvents 1.0.2 specification with `specversion: "1.0"`.

## Establish the contract

- Inspect producers, consumers, intermediaries, and the existing SDK before changing an event format.
- Identify the transport binding and supported content modes at every hop.
- Preserve the payload contract when adding an envelope to an existing integration.
- Prefer the project's CloudEvents SDK for encoding and decoding. Verify its binding and version support.

## Define identity and context

| Attribute | Rule |
|---|---|
| `specversion` | Require the string `"1.0"`. Do not use the specification's patch release number. |
| `id` | Require a nonempty string. Make the pair `source` + `id` unique for each distinct event. |
| `source` | Require a nonempty URI-reference. Prefer an absolute URI. |
| `type` | Require a nonempty event-type string. Document its meaning for consumers. |
| `subject` | Use for the affected subject within the source context. It does not replace event identity. |
| `time` | Use an RFC 3339 timestamp when supplied. Document the timestamp policy. |
| `datacontenttype` | Describe the payload's media type. |
| `dataschema` | Identify the payload schema with a nonempty URI when supplied. |

- Preserve `source` and `id` when retrying the same event. Deduplicate by both values when sources share a consumer.
- Create a new identity when producing a distinct derived event. Do not reuse an entity ID for every occurrence.
- Use lowercase ASCII letters and digits for extension names. Keep extensions outside payload fields.
- Retain unknown extensions when forwarding events without semantic changes.

## Encode deliberately

| HTTP mode | Representation |
|---|---|
| Structured JSON | Put the envelope and payload in the body. Use `Content-Type: application/cloudevents+json`. |
| Binary | Put payload bytes in the body and context in `ce-*` headers. `Content-Type` represents `datacontenttype`. |

- Do not emit `ce-datacontenttype` in HTTP binary mode.
- Apply the HTTP binding's percent encoding to attribute values, including spaces, quotes, percent signs, and Unicode.
- Decode quoted header values before one percent-decoding pass. Reject invalid UTF-8 sequences.
- Detect mode from the binding's content-type rules. A JSON body alone does not identify a structured CloudEvent.
- In JSON event format, encode binary payloads as `data_base64`. Never emit both `data` and `data_base64`.
- Store JSON payloads directly in `data`. Do not serialize an object into a JSON string a second time.
- Preserve the distinction between absent `data` and explicit JSON null.
- Decode null context attributes as absent. Required attributes must still have valid non-null values.
- Treat omitted `datacontenttype` as JSON for JSON event format. Make that implied type explicit when transcoding.
- Use batching only when the selected binding and receiving implementation support it. HTTP batching must also be solicited.

## Evolve and process

- Change `dataschema` when the payload contract changes incompatibly. Agree on event-type versioning with consumers.
- Verify the envelope and payload independently. A valid envelope does not establish payload validity or publisher authenticity.
- Keep retry, ordering, acknowledgement, and transactional guarantees in the transport and application contract.
- Apply the smallest payload and metadata limits across the actual route.
- Resolve schema URIs through trusted, pinned resources. Do not automatically fetch arbitrary received URIs.

## Do not

- Treat CloudEvents as an exactly-once delivery mechanism.
- Use `id` as an entity identifier, partition key, or global deduplication key without verifying the contract.
- Rewrite event identity during a transport-only conversion.
- Copy credentials or sensitive payload fields into routable context metadata.

## Verify

1. Round-trip representative events through the production encoder and decoder in each supported mode.
2. Exercise missing required attributes, empty identifiers, invalid attribute types, and unsupported spec versions.
3. Accept optional context attributes encoded as null. Exercise JSON, binary, absent, and null payloads separately.
4. Reject conflicting `data` and `data_base64` members. Test HTTP header escaping, quoted values, and invalid UTF-8.
5. Verify unsupported or unsolicited HTTP batching stays disabled.
6. Verify retries preserve identity and equal IDs from different sources remain distinct.
7. Verify extensions and payload meaning survive the actual intermediary path.
8. Run bounded contract tests through the repository wrapper. Report the binding, SDK version, modes, and results.

## References

- [CloudEvents 1.0.2 core](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md)
- [JSON event format](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/formats/json-format.md)
- [HTTP binding](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [Design and versioning guidance](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/primer.md)

Use [[z-json-schema]] for JSON payload constraints and [[z-go-messaging]] for Go delivery and consumer patterns.
