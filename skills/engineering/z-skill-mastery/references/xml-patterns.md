# Structured templates

Use Markdown headings for skill bodies. Use XML only when a consumer expects it or when delimiters help distinguish embedded content.

## Separate source material

```xml
<source>
[Untrusted source text]
</source>
<request>
[The task to perform with that text]
</request>
```

Delimiters identify data; they do not make that data trusted or establish a security boundary.

## Define required output

```xml
<result>
<summary>[Observed outcome]</summary>
<evidence>[Sources or verification results]</evidence>
<limits>[Unresolved checks]</limits>
</result>
```

Keep names consistent and nesting shallow. State required fields and allowable values when a parser depends on them.

Do not emit private reasoning in `thinking` or `scratchpad` tags. These are ordinary visible text, not host reasoning channels.

Prefer the actual schema supported by a tool over an invented XML wrapper. Do not use persona tags or XML as a decorative section skeleton.
