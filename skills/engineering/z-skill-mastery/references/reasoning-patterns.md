# Reasoning Patterns Reference

Chain-of-thought and verification techniques for skills that orchestrate model reasoning (review, QA, multi-step analysis). Optional — most knowledge skills need none of this; modern models reason internally by default. Reach here when a skill must make reasoning visible or auditable.

Note: the `<role>` example under "Combining Patterns" shows nesting only — skills instruct, they do not roleplay.

## Chain-of-Thought Levels

### Level 1: Basic CoT

Simple instruction addition:

```
Analyze this contract for risks. Think step by step before providing your assessment.
```

Best for: Straightforward reasoning tasks where any logical approach works.

### Level 2: Guided CoT

Explicit reasoning steps:

```xml
<instructions>
Analyze this contract for risks by following these steps:
1. Identify all parties and their obligations
2. Find clauses with potential liability exposure
3. Check for missing standard protections
4. Assess enforceability concerns
5. Prioritize risks by potential impact
</instructions>
```

Best for: Domain-specific tasks where expert reasoning patterns are known.

### Level 3: Structured CoT

Separated reasoning with tagged output:

```xml
<instructions>
<thinking_process>
Before responding, work through this analysis in <thinking> tags:
- What type of request is this?
- What are the key requirements?
- What constraints apply?
- What approach is most appropriate?
- What could go wrong?
</thinking_process>

<output_rules>
After your thinking, provide the response in <answer> tags.
Only the content in <answer> tags will be shown to the user.
</output_rules>
</instructions>
```

Best for: Complex tasks requiring visible reasoning or audit trails.

## Claude 4.x Thinking Depth

Keywords calibrate internal reasoning effort:

| Keyword | Depth | Use Case |
|---------|-------|----------|
| "think" | Standard | Normal reasoning tasks |
| "think hard" | Extended | Multi-step problems |
| "think harder" | Deep | Complex analysis |
| "ultrathink" | Maximum | Hardest problems |

Example:
```
This is a complex architectural decision. Think harder about the tradeoffs before recommending an approach.
```

## Self-Reflection Patterns

### Post-Generation Review

```xml
<instructions>
After generating your initial response, review it in <reflection> tags:
- Does it fully address the question?
- Are there logical gaps or contradictions?
- Is the reasoning supported by evidence?
- What could be improved?

Then provide your final answer incorporating any improvements.
</instructions>
```

### Explicit Verification

```xml
<verification_protocol>
Before finalizing:
1. Re-read the original request
2. Check each requirement is addressed
3. Verify factual claims are supported
4. Confirm output format matches specification
5. Assess confidence level (high/medium/low)
</verification_protocol>
```

## Task Decomposition

### Sequential Chaining

```xml
<workflow>
<step id="1">
Extract all numerical data from the document.
Output: JSON array of numbers with context.
</step>
<step id="2">
Using output from step 1, calculate summary statistics.
Output: Mean, median, range, outliers.
</step>
<step id="3">
Using outputs from steps 1 and 2, generate insights.
Output: 3-5 key findings with supporting data.
</step>
</workflow>
```

### Parallel Analysis

```xml
<parallel_tasks>
<task id="sentiment">Analyze overall sentiment</task>
<task id="entities">Extract named entities</task>
<task id="topics">Identify main topics</task>
</parallel_tasks>

<synthesis>
Combine results from all parallel tasks into unified analysis.
</synthesis>
```

### Skeleton-of-Thought

```xml
<instructions>
First, generate an outline of your response with section headers only.
Then fill in each section.

<outline_format>
## [Section 1 Title]
## [Section 2 Title]
## [Section 3 Title]
</outline_format>

<expansion>
Now expand each section with 2-3 paragraphs of content.
</expansion>
</instructions>
```

## Error Recovery Patterns

### Graceful Degradation

```xml
<error_handling>
If unable to complete the full analysis:
1. Complete as much as possible
2. Clearly mark incomplete sections with [INCOMPLETE: reason]
3. Suggest what additional information would help
4. Provide partial confidence score
</error_handling>
```

### Uncertainty Acknowledgment

```xml
<confidence_protocol>
For each claim or recommendation:
- HIGH confidence: Strong evidence, multiple sources agree
- MEDIUM confidence: Some evidence, reasonable inference
- LOW confidence: Limited evidence, significant assumptions

Always state confidence level when making factual claims.
</confidence_protocol>
```

## When NOT to Use Explicit CoT

- Simple factual questions
- Direct format conversions
- Tasks where Claude 4.x's internal reasoning suffices
- Time-sensitive requests where latency matters
- Tasks where reasoning process isn't needed for verification

## Combining Patterns

Most effective prompts combine multiple patterns:

```xml
<role>
You are a senior financial analyst.
</role>

<task>
Analyze this earnings report for investment implications.
</task>

<reasoning_steps>
1. Identify key financial metrics
2. Compare to previous quarters and guidance
3. Assess market reaction factors
4. Evaluate risks and opportunities
</reasoning_steps>

<output_structure>
<thinking>[Your analysis process]</thinking>
<summary>[2-3 sentence overview]</summary>
<metrics>[Key numbers with YoY comparison]</metrics>
<assessment>[Bull/bear case]</assessment>
<recommendation>[Action with confidence level]</recommendation>
</output_structure>
```
