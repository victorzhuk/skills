# Anti-Patterns Reference

Common mistakes that destroy skill effectiveness and how to fix them. The first group is specific to authoring skill files; the rest are general prompting mistakes that also bite inside a skill body.

## No-Op

A line that changes nothing versus the model's default behaviour. "Be thorough", "be helpful", "think carefully", "act professionally" — the model already does these. They spend Context Load and dilute the lines that matter.

Test each line: *would the agent behave differently without it?* If no, cut it. Keep only lines that move behaviour — "default to refuted=true when uncertain" moves behaviour; "be rigorous" does not.

## Sediment

Instructions accreted over many edits, now stale or contradicted by newer lines. A skill that grew by appending is full of sediment.

Fix: on every touch, re-read the whole body and delete what the current version no longer needs. Editing a skill means pruning it, not only adding to it.

## Sprawl

Several files or skills covering one concern with no boundary between them, so the agent can't tell which to trust. Two skills that both "review Go code", three reference files that all explain errors.

Fix: merge duplicates, or draw an explicit boundary in each `description` (`Does not cover X; see [[other-skill]]`). One concern, one home.

## Premature Completion

Listing downstream steps makes the agent rush the current step to reach them — it treats "and then N more phases" as pressure to finish fast.

Fix: sharpen the *current* step's completion criterion so it's checkable and exhaustive. Only split work into a visible sequence once a single sharp criterion has failed to hold the agent on the step.

## Over-Prompting

### Symptoms
- Responses become vague or unfocused
- Critical instructions get ignored (especially mid-prompt)
- Increased hallucination rates
- Model seems "confused" about priorities

### Causes
- Context dumping: throwing everything into the prompt
- Defensive over-specification
- Copy-pasting entire documentation
- Accumulating instructions without pruning

### Research Finding
16K tokens with selective RAG outperforms 128K monolithic prompts.

### Fixes

**Before (over-prompted):**
```xml
<instructions>
You are an expert assistant. You should always be helpful and accurate.
When responding, make sure to consider all aspects of the question.
Think carefully before answering. Be thorough but concise.
Always cite sources when available. If you don't know, say so.
Consider the user's perspective. Be professional but friendly.
... [500 more words of generic guidance]
</instructions>
```

**After (focused):**
```xml
<instructions>
Analyze the document for compliance issues.
Flag specific violations with section references.
Categorize by severity: Critical, Major, Minor.
</instructions>
```

## Under-Prompting

### Symptoms
- Non-deterministic outputs (different results each run)
- Claude fills gaps with assumptions
- Output format varies unpredictably
- Edge cases handled inconsistently

### Causes
- Assuming Claude "knows what you mean"
- Relying on implicit conventions
- Missing edge case handling
- Vague output specifications

### Minimum Viable Prompt Checklist

1. [ ] Clear task objective
2. [ ] Output format specification
3. [ ] Length/scope constraints
4. [ ] At least one example (for non-trivial tasks)
5. [ ] Explicit negative constraints (what NOT to do)

### Fixes

**Before (under-prompted):**
```
Summarize this document.
```

**After (complete):**
```xml
<task>Summarize this document</task>

<requirements>
- 3-5 bullet points maximum
- Focus on actionable insights
- Include specific numbers/dates
- Skip background/history sections
</requirements>

<format>
• [Key finding 1]
• [Key finding 2]
...
</format>

<example>
<input>Q3 revenue was $50M, up 25% YoY. New product launched in September with 10K signups. Cost reduction initiative saved $2M.</input>
<output>
• Revenue: $50M (+25% YoY)
• New product: 10K signups since September launch
• Cost savings: $2M from efficiency initiative
</output>
</example>
```

## Lost in the Middle

### The Problem
Research shows models attend less to information in the middle of long prompts. Critical instructions placed mid-prompt get ignored.

### High-Risk Positions
```
[System prompt - HIGH attention]
[Beginning of context - HIGH attention]
...
[Middle of context - LOW attention] ← Instructions here get lost
...
[End of context - MODERATE attention]
[User query - HIGH attention]
```

### Fixes

**Structure for attention:**
1. Put longform documents at the TOP
2. Put critical instructions at the END (just before user query)
3. Use XML tags to mark critical sections
4. Repeat key constraints near the end

**Attention anchoring:**
```xml
<documents>
[Long document content here - at the top]
</documents>

<critical_instructions>
<!-- These are placed AFTER documents, BEFORE query -->
IMPORTANT: Only use information from the documents above.
Never fabricate citations or sources.
If information is not in the documents, say "Not found in provided documents."
</critical_instructions>

<query>[User's actual question]</query>
```

## Subjective Terms

### The Problem
Terms like "professional," "better," "comprehensive," "appropriate" mean different things to different people and contexts.

### Examples of Subjective Terms

| Subjective | Concrete Alternative |
|------------|---------------------|
| "professional" | "formal tone, no contractions, third person" |
| "better" | "faster execution, lower memory usage" |
| "comprehensive" | "covers all 5 required sections with 2+ paragraphs each" |
| "appropriate" | "suitable for C-level audience, no jargon" |
| "brief" | "under 100 words" |
| "detailed" | "include code examples, error handling, edge cases" |
| "good code" | "passes linting, has tests, follows Go conventions" |

### Fixes

**Before:**
```
Write a professional email.
```

**After:**
```xml
<email_style>
- Formal greeting (Dear [Name])
- No contractions
- 3 paragraphs maximum
- Clear call-to-action in final paragraph
- Professional sign-off (Best regards)
</email_style>
```

## Redundancy and Repetition

### The Problem
Saying the same thing multiple ways wastes tokens and can cause confusion about priority.

### Before (redundant):
```
Be accurate. Make sure your responses are correct.
Don't make mistakes. Verify information before responding.
Accuracy is important. Double-check your work.
```

### After (consolidated):
```
Verify all factual claims before including them.
If uncertain, state confidence level.
```

## Conflicting Instructions

### The Problem
Contradictory rules force Claude to choose, often inconsistently.

### Before (conflicting):
```
Be concise. Keep responses brief.
Be thorough. Cover all aspects comprehensively.
Include examples for every point.
Limit response to 200 words.
```

### After (clear priority):
```xml
<response_rules>
Target: 200-300 words
Priority order when space is limited:
1. Direct answer to the question
2. One supporting example
3. Key caveats or exceptions
4. Additional context (if space permits)
</response_rules>
```

## Format Specification Failures

### Vague Format (produces inconsistent output):
```
Return the results in a structured format.
```

### Precise Format (produces consistent output):
```xml
<output_format>
Return results as JSON:
{
  "status": "success" | "error",
  "findings": [
    {
      "issue": "string - description of issue",
      "severity": "critical" | "major" | "minor",
      "location": "string - file:line or section reference",
      "suggestion": "string - how to fix"
    }
  ],
  "summary": "string - one sentence overview"
}
</output_format>
```

## Complexity Creep

### Symptoms
- Skill takes multiple readings to understand
- Nested conditionals and exceptions
- Instructions reference other instructions
- Difficult to predict behavior

### The Rule
If instructions are hard for a human to follow, they're impossible for Claude to follow consistently.

### Fixes
- Decompose into multiple smaller skills
- Use reference files for variant-specific details
- Create decision trees for complex branching
- Test with someone unfamiliar with the domain

## Prevention Checklist

Before finalizing any skill:

1. [ ] Can a stranger understand the intent on first read?
2. [ ] Are all subjective terms replaced with concrete specifications?
3. [ ] Is the same instruction stated only once?
4. [ ] Are there any contradictory rules?
5. [ ] Is the output format precisely specified?
6. [ ] Are critical instructions positioned at the end?
7. [ ] Is the skill under 500 lines?
8. [ ] Do edge cases have explicit handling?
