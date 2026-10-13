# Hypothesis testing

Write a hypothesis as a mechanism with a falsifiable prediction.

| Record | Content |
|---|---|
| Observation | Exact behavior, environment, input, and time |
| Hypothesis | Mechanism that could produce the observation |
| Prediction | Result expected if the mechanism is active |
| Probe | Smallest permitted observation or controlled change |
| Outcome | Actual result and captured evidence |
| Conclusion | Supported, refuted, or inconclusive |

Prefer probes that distinguish multiple hypotheses without changing several variables. A response trace can separate timeout, rejection, and rendering failures without applying three fixes.

Check causal claims with a counterexample or controlled comparison. A child render occurring beside an object allocation does not prove the allocation caused it; change reference stability while controlling parent behavior.

For nondeterminism, preserve inputs and configuration across bounded repeat runs. Mixed outcomes establish instability, not its cause. Report attempt counts rather than inferring reliability from a few passes.

After a refuted hypothesis, retain the evidence and revise the candidate set. Do not turn the same explanation into new wording and repeat it.
