---
name: z-open-graph
description: Open Graph metadata for shared-link previews. Use for og tags, preview images, crawler access, stale previews, or duplicate metadata. Covers protocol fields and platform verification. Entity markup belongs to [[z-schema-org]].
---

# Open Graph previews

Identify the target sharing platforms before choosing image constraints or diagnosing preview behavior.

## Find the metadata owner

- Inspect templates, framework metadata APIs, CMS plugins, and generated image routes.
- Use one authoritative emitter for each page's metadata. Remove conflicting output at its source.
- Derive titles, descriptions, and URLs from the same published content as the page.
- Inspect the HTTP response delivered to the target crawler. A hydrated browser DOM alone is insufficient evidence.
- In Next.js, inspect streaming metadata and bot detection before changing rendering behavior.
- Verify image and page responses through the deployed proxy or CDN when available.

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
- Repeat root properties for multiple values. Put the preferred value first, as the protocol gives it precedence during conflicts.
- Keep `og:url` consistent with the intended canonical page. Exclude transient tracking parameters from object identity.
- Use absolute public HTTPS URLs for page and media resources when preparing public previews.
- Escape dynamic values as HTML attributes. Never concatenate untrusted text directly into markup.

## Verify platform behavior

- Read the target platform's current image dimensions, file-size limits, formats, and cropping rules.
- Distinguish link-sharing requirements from advertising specifications on the same documentation page.
- Treat image dimensions as platform requirements, not universal Open Graph rules.
- Verify redirects, response status, content type, and media bytes without an authenticated browser session.
- Inspect access controls, CDN rules, and crawler-specific responses when a platform cannot retrieve an image.
- For Slack, account for partial page retrieval through HTTP Range requests and separate media retrieval.
- Inspect cache state before declaring that new markup failed. Refresh previews through documented platform tools where available.
- Keep X Cards and other platform extensions separate. Verify current fallback behavior before relying on Open Graph substitution.

## Do not

- Promise a preview merely because the tags are valid.
- Assume all consumers execute JavaScript, honor robots directives, or share the same cache lifetime.
- Add duplicate generators to compensate for stale previews.
- Replace Schema.org entity markup, semantic HTML, or canonical link metadata with Open Graph tags.
- Publish invented authors, dates, images, or site identities.

## Verify

1. Inspect representative page responses with the target crawler's user agent.
2. Verify required tags, escaping, canonical URLs, locale values, and image-property grouping.
3. Retrieve each selected image. Verify its actual format, dimensions, size, and accessibility against the platform's rules.
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
