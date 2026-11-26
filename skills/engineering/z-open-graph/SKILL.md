---
name: z-open-graph
description: "Implement Open Graph metadata for shared-link previews. Diagnose crawler access, stale previews, image selection, or duplicate tags. Use [[z-schema-org]] for entity markup."
---

# Open Graph previews

Identify the target sharing platforms before choosing image constraints or diagnosing preview behavior.

## Find the metadata owner

- Identify each emitter in templates, framework metadata, CMS plugins, and image routes. Resolve conflicts at the source.
- Derive page titles, descriptions, and URLs from the published content.
- Inspect the response that the sharing crawler receives. For Next.js, account for metadata streaming and bot detection.

## Implement the protocol

Emit Open Graph metadata with `property` and `content` attributes in the document head.

| Property | Rule |
|---|---|
| `og:title` | Require a truthful title for the shared object. |
| `og:type` | Require a supported type. Verify any additional properties that type requires. |
| `og:image` | Require a representative image URL. |
| `og:url` | Require the object's canonical URL and stable identity. |
| `og:description` | Add a concise description supported by the page content. |
| `og:site_name` | Use the verified site name when appropriate. |
| `og:locale` | Use `language_TERRITORY` syntax when supplied. |
| `og:locale:alternate` | Repeat for alternate locales that actually exist. |

- Include `og:image:alt` describing the image.
- Supply verified image dimensions and media type through the corresponding structured properties.
- Place each image's structured properties immediately after its `og:image` tag.
- Repeat root properties for multiple values. Put the preferred value first. It takes precedence in a conflict.
- Keep `og:url` consistent with the intended canonical page. Exclude transient tracking parameters from object identity.
- Use absolute public HTTPS URLs for page and media resources when preparing public previews.
- Escape dynamic values as HTML attributes. Never concatenate untrusted text directly into markup.

## Verify platform behavior

- Read the sharing platform's media limits and crop rules. Advertising specifications can differ from link-sharing requirements.
- Retrieve the page and media without application credentials. Inspect status, redirects, content type, and bytes.
- Inspect access controls, CDN rules, and crawler-specific responses when a platform cannot retrieve an image.
- For Slack, account for partial page retrieval through HTTP Range requests and separate media retrieval.
- Inspect cache state before declaring that new markup failed. Refresh previews through documented platform tools where available.
- Keep X Cards and other platform extensions separate. Verify current fallback behavior before relying on Open Graph substitution.

## Do not

- Promise a preview merely because the tags are valid.
- Assume all consumers execute JavaScript, honor robots directives, or share the same cache lifetime.
- Replace Schema.org entity markup, semantic HTML, or canonical link metadata with Open Graph tags.
- Publish invented authors, dates, images, or site identities.

## Verify

1. Inspect representative page responses with the target crawler's user agent.
2. Verify required tags, escaping, canonical URLs, locales, and image-property grouping.
3. Compare each retrieved image's format, dimensions, and byte count with the platform's limits.
4. Exercise missing optional content, special characters, alternate locales, and multiple images when supported by the site.
5. Inspect an actual platform preview or its diagnostic tool after deployment when authorized.
6. Report protocol validation, retrieval, and platform rendering separately. Name unavailable external verification steps.

## References

- [Open Graph protocol](https://ogp.me/)
- [Next.js metadata and crawler handling](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata)
- [LinkedIn sharing requirements](https://www.linkedin.com/help/linkedin/answer/a521928/making-your-website-shareable-on-linkedin)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Slack retrieval and caching](https://api.slack.com/robots)

Use [[z-schema-org]] for entity markup and search rich results, and [[z-react-core]] for React rendering conventions.
