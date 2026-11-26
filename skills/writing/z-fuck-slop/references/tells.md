# Editorial search patterns

Use the regular expressions with GNU grep. Copy the expressions from one section into the pattern list.

```bash
grep -Ein -f /dev/stdin draft.txt <<'PATTERNS'
<paste patterns from a section below, one per line>
PATTERNS
```

For a passage in chat, inspect the same patterns directly. For each match, follow “Edit by meaning” in the skill.

## 1. Negative parallelism — the "not X but Y" family

Keep a contrast when the reader needs the distinction.

```
not (just|only|merely|simply|solely) [^.;]{2,80}(but|it'?s| — )
isn'?t (just|only|merely|simply|about) 
it'?s not (a|an|the|that|about|just) [^.;]{2,80}(it'?s|but)
(is|was|are|were)n'?t about [^.;]{2,60}\. (it|this|that)'?s about
less about [^.;]{2,60}(than|and more about)
more than (just|a mere|simply) 
not because [^.;]{2,80}but because
the (question|point|issue|problem|goal|real [a-z]+) is(n'?t| not) (whether|about|just|if)
(doesn'?t|don'?t|didn'?t|won'?t) (just|merely|simply) [^.;]{2,80}(it|they|he|she|we) 
no [a-z]+, no [a-z]+(, no [a-z]+)?[,.]? just 
— not [^—.;]{2,60}, but 
not only [^.;]{2,80}but (also )?
we'?re not (just )?(talking about|looking at|dealing with)
gone are the days
(here|this)'?s the (thing|kicker|catch|twist)
```

Rhetorical-question variant (regex-resistant; check by hand): a one-line question immediately answered by a one-word or one-clause sentence. *"The result? Chaos."* / *"Sound familiar?"*

## 2. Puffery and inflated vocabulary

Inspect each match for an unsupported claim. Replace inflated language with a concrete fact when one is available.

```
\b(delve|delving)\b
\btapestry\b
\b(testament|stands as)\b
\bseamless(ly)?\b
\b(pivotal|paramount|crucial)\b
\bunderscore(s|d)?\b
\b(landscape|realm|sphere) of\b
\bnavigat(e|ing) the\b
\bfoster(s|ing)?\b
\bleverage(s|d)?\b
\bmeticulous(ly)?\b
\bintricate\b
\bboasts\b
\bgame.?chang(er|ing)\b
\b(seismic|monumental|transformative) (shift|change)\b
\bunwavering\b
\bcommendable\b
\belevate(s|d)? (the|your)\b
\bshowcas(e|es|ing)\b
\bresonate(s|d)?\b
\bcompelling\b
\brich (cultural )?(heritage|history|tradition)\b
\bvibrant\b
\bplays? a (vital|key|crucial|pivotal) role\b
\bdeep(er)? dive\b
\bunlock(s|ing)? (the|your)\b
\bharness(es|ing)? the\b
\bembark(s|ed|ing)? on\b
\bever.?(evolving|changing)\b
\bfast.?paced (world|environment)\b
\bin today'?s\b
\bat the end of the day\b
\bwhen it comes to\b
\bcutting.?edge\b
\brobust\b
\bholistic\b
\bsynergy\b
\bempower(s|ing|ment)?\b
```

## 3. Hedging, both-sidesing, throat-clearing

Remove repeated softeners that add no meaning. Preserve uncertainty, limitations, and material counterarguments.

```
it'?s (worth|important) (to note|noting|to remember|to consider)
(that|it) (being )?said,
while (it'?s|this is) (true|important)
arguably
in many ways
to some (extent|degree)
on the other hand
at its core
in essence
essentially,
ultimately,
in conclusion
in summary
to sum(marize| up)
overall,
in the end,
needless to say
as (we|you) (can see|know|all know)
let'?s (dive|unpack|explore|take a (look|closer look))
whether you('re| are) [^.;]{2,60} or 
```

## 4. False ranges and rule-of-three

**False range** — a "from X to Y" with no actual spectrum between X and Y:

```
from [^.;]{3,50} to [^.;]{3,50}
```

Triage by hand: if you can name a meaningful midpoint, it's a real range and stays. If X and Y are just two loosely related examples, name them plainly or cut one.

**Lists of three** — Inspect each item for a distinct contribution. The patterns below match simple lists.

```
\b\w+, \w+, and \w+[.!?]
\b(\w+ \w+), (\w+ \w+), and (\w+ \w+)
```

Keep each item that adds information. Combine overlapping items.

## 5. Punctuation and formatting

Inspect repeated em dashes when they make a sentence hard to follow.

- More than ~1 em dash per 150 words.
- Two em dashes in one sentence.
- `— not X, but Y` (already in section 1).
- Em dash used for punchy emphasis where a comma works: `[a-z] — [a-z][^—]{1,25}\.$`

Review formatting in context. Keep structure that helps the reader navigate.

- **Bold scattered through prose** like a textbook highlighting itself: `\*\*[^*]{2,40}\*\*` appearing more than ~once per 3 paragraphs of body prose.
- **Definition lists** — Check whether each label helps the reader find a term.
- **Emoji headers/bullets** (🚀, ✅, 💡): needs PCRE, not `-E` — `LC_ALL=C.UTF-8 grep -Pn '^\s*[-*#]+\s.*[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' draft.txt`.
- **Headers on short texts** — section headers on anything under ~400 words.
- **Repeated summaries** — Remove an introduction or conclusion that adds no information.
- **Numbered lists where a paragraph would do.**
- Match quotation marks and apostrophes to the publication’s conventions.

## 6. Cadence and statistical shape

Read several consecutive paragraphs aloud or measure sentence length.

- **Uniform sentence length** (a style heuristic, not an origin test): a run of 3+ consecutive sentences within ±4 words of each other, paragraph after paragraph of 18–24-word sentences. Quick measurement on a file:

  ```bash
  tr '\n' ' ' < draft.txt | sed 's/[.!?] /\n/g' | awk '{print NF}'
  ```

  Vary the sentence length when repetition obscures emphasis.
- **Uniform sentence shape**: every sentence opens subject-first; no fragments, no questions, no inversions.
- **Uniform paragraph length**: every paragraph 3–4 sentences.
- **Low specificity** — Verify claims such as “studies show” against the actual source. Preserve the limits of the evidence.
- **Register** — Compare the passage with an authorized voice sample when available.

## 7. Genre conventions

Use the [genre profiles](voices.md) when a passage needs more context.

- **Reddit/forums**: bold mid-comment, bullet-pointed comments, "Hope this helps!", perfectly balanced takes.
- **Tweets/X**: "🧵", "Let that sink in", line-broken one-clause-per-line cadence, ending on a question to drive engagement.
- **LinkedIn**: one-sentence paragraphs stacked vertically, "Agree?", the not-X-but-Y move (its natural habitat).
- **Academic**: "delve", "novel insights", puffed significance claims ("crucial implications for the field"), citation-free superlatives.
- **Email**: "I hope this email finds you well", restating the recipient's question back at them, three-paragraph symmetry for a one-line answer.
