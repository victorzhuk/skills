# XML Tag Patterns Reference

XML tag vocabulary for the cases where a skill genuinely orchestrates model reasoning (a review, a QA pass, an embedded template the agent must reproduce). **This is not the default skill skeleton** — house-style skills use plain Markdown headings (`## Core rules`, `## Do not`, `## Verify`). Reach here only when a skill emits or wraps structured content.

Note: the `<role>` examples below illustrate nesting only. Skills instruct, they do not roleplay — do not open a skill with a persona (see the No-Op failure mode in `anti-patterns.md`).

## Core Tag Patterns

### Input Separation

Wrap external content to distinguish from instructions:

```xml
<document>
[User-provided document content]
</document>

<context>
[Background information for the task]
</context>

<user_query>
[The actual question or request]
</user_query>
```

### Reasoning Space

Enable chain-of-thought without polluting output:

```xml
<thinking>
[Internal reasoning process]
- Analyze the problem
- Consider approaches
- Evaluate options
</thinking>

<answer>
[Final response to user]
</answer>
```

Alternative tags: `<scratchpad>`, `<analysis>`, `<reasoning>`

### Output Structuring

Control response format:

```xml
<response>
<summary>[Brief overview]</summary>
<details>[Full explanation]</details>
<next_steps>[Recommended actions]</next_steps>
</response>
```

### Examples Container

Wrap few-shot demonstrations:

```xml
<examples>
<example>
<input>[Sample input]</input>
<output>[Expected output]</output>
</example>
<example>
<input>[Edge case input]</input>
<output>[Edge case handling]</output>
</example>
</examples>
```

## Nesting Patterns

### Hierarchical Content

```xml
<task>
<objective>Analyze customer feedback</objective>
<requirements>
<requirement>Identify sentiment</requirement>
<requirement>Extract key themes</requirement>
<requirement>Prioritize issues</requirement>
</requirements>
<constraints>
<constraint>Use only provided data</constraint>
<constraint>Maximum 500 words</constraint>
</constraints>
</task>
```

### Conditional Sections

```xml
<instructions>
<always>
[Instructions that always apply]
</always>
<if_code_review>
[Additional instructions for code review tasks]
</if_code_review>
<if_documentation>
[Additional instructions for documentation tasks]
</if_documentation>
</instructions>
```

## Advanced Patterns

### Multi-Document Processing

```xml
<documents>
<document id="1" source="quarterly_report.pdf">
[Content]
</document>
<document id="2" source="competitor_analysis.xlsx">
[Content]
</document>
</documents>

<query>
Compare findings from document 1 and document 2.
</query>
```

### Structured Output Specification

```xml
<output_schema>
{
  "summary": "string, 2-3 sentences",
  "sentiment": "positive|negative|neutral",
  "confidence": "number 0-1",
  "key_points": ["array of strings, max 5 items"],
  "action_required": "boolean"
}
</output_schema>
```

### Role with Constraints

```xml
<role>
You are a senior code reviewer specializing in Go.
<expertise>
- Clean Architecture patterns
- Performance optimization
- Security best practices
</expertise>
<style>
- Direct and constructive
- Cite specific code lines
- Provide corrected examples
</style>
</role>
```

## Tag Naming Guidelines

| Content Type | Recommended Tags |
|--------------|------------------|
| User input | `<input>`, `<query>`, `<request>` |
| Documents | `<document>`, `<file>`, `<content>` |
| Instructions | `<instructions>`, `<task>`, `<directive>` |
| Constraints | `<constraints>`, `<rules>`, `<limits>` |
| Examples | `<examples>`, `<demonstrations>` |
| Output | `<output>`, `<response>`, `<answer>` |
| Reasoning | `<thinking>`, `<analysis>`, `<scratchpad>` |

## Common Mistakes

**Don't:**
- Use generic tag names like `<data>` or `<info>` for everything
- Create deeply nested structures (>3 levels)
- Forget to close tags
- Use inconsistent naming (mixing `<doc>` and `<document>`)

**Do:**
- Use descriptive, specific tag names
- Keep nesting shallow and logical
- Reference tags in instructions: "Using the content in `<document>` tags..."
- Maintain consistent conventions throughout the skill
