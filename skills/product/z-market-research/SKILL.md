---
name: z-market-research
description: Competitor and market research method — discovery, pricing teardown, positioning read, demand signals, then an ICP hypothesis validated per source. Use to research a market, size competitors, or validate an ICP before a launch or pricing call. Every claim needs a URL and fetch date. Does not design pricing or GTM.
---

# Market Research

Scan a market in a fixed order, evidence every claim, and hand back a digest — not a strategy essay.

## Scan order

1. **Competitor discovery** — direct search patterns (`"<category> software"`, `"<category> tools 2026"`), comparison/review sites (G2, Capterra, AlternativeTo), launch platforms (Product Hunt, BetaList, Show HN), and `"<competitor> alternative"` / `"<competitor> vs"` queries to surface who else gets compared against whom.
2. **Pricing-page teardown** — capture every tier verbatim: name, price, billing period, currency, seat/usage limits, feature gates. Don't normalize currency or round numbers; record what the page shows, note the annual-vs-monthly toggle discount if present.
3. **Positioning read** — pull the vendor's own headline, tagline, and top feature callouts. Label these as vendor claims, not verified fact — a pricing page describes intent, not measured outcomes.
4. **Demand signals** — search-volume proxies (cite the tool used, e.g. Google Trends direction, a keyword tool's estimate), community threads (Reddit/HN/niche Discord/Slack search for the pain, quote representative complaints with links), job postings (a company hiring for a role tied to the problem signals budget exists).

## ICP hypothesis

For each candidate ICP state: **who** (role, company size, vertical), **pain** (the specific job-to-be-done), **current workaround** (spreadsheet, manual process, a competitor, nothing). Treat it as a hypothesis until at least one source — a community thread, a job post, or a competitor's own positioning — backs it. An ICP guess with zero backing sources is a gap, not a finding.

## Evidence rules

- Every claim carries a URL and the date it was fetched.
- Absence of data is a finding: state what was searched and that nothing turned up, don't skip the question.
- No numbers from memory — pricing, volumes, and benchmarks come from the fetch, not recall.

## Digest output format

Reproduce this shape for the final digest:

<digest-template>
## Question
<the question this research answers>

## Answer
<2-5 deciding facts, each with an inline source link>

## Competitors
| Name | Positioning | Pricing (verbatim) | Source |
|---|---|---|---|

## Gaps
<what was searched and came back empty, or where confidence is low>

## Sources
<title>(<url>) — fetched <date>
</digest-template>

## Do not

- Pull pricing, volumes, or feature claims from memory instead of a live fetch.
- State a vendor's marketing copy as fact instead of labeling it a claim.
- Skip the Gaps section because nothing was found — absence of data is the finding.
- Write a strategy recommendation, pricing model, or GTM plan — that's downstream work.

## Verify

- Every row in the competitor table has a source URL and fetch date.
- Every ICP hypothesis names at least one backing source or sits in Gaps.
- The digest has all five sections, even when a section is short.

does not design pricing or GTM; it supplies the market facts
