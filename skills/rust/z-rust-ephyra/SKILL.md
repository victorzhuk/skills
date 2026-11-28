---
name: z-rust-ephyra
description: "Write Rust metamorphic properties with Ephyra. Use for bounded generators, shrink-preserving input constraints, and replaying reduced counterexamples. See [[z-testing-strategy]] for choosing test depth."
---

# Check a Rust metamorphic relation

Name the risk that existing examples miss. Define valid inputs, a transformation, and the expected relationship between outputs.
Derive the relationship from the public contract. Check the crate's resolved Ephyra version and features.

## Write the property

Reversing the input must preserve the result of an ascending integer sort.
A constant output also satisfies that relation. Check ordering and element multiplicities to detect that defect.

```rust
#[test]
fn sorting_ignores_input_order() {
    use ephyra::{check, gens, Config};
    use std::collections::BTreeMap;

    fn counts(xs: &[i8]) -> BTreeMap<i8, usize> {
        let mut result = BTreeMap::new();
        for &x in xs {
            *result.entry(x).or_default() += 1;
        }
        result
    }

    let inputs = gens::vec(gens::int(-8i8..=8)).len(0..=32);
    let report = check(&Config::default().tests(200), inputs, |mut xs| {
        let expected = counts(&xs);
        let mut reversed = xs.clone();
        reversed.reverse();
        sorter::sort(&mut xs);
        sorter::sort(&mut reversed);
        assert_eq!(xs, reversed);
        assert!(xs.windows(2).all(|pair| pair[0] <= pair[1]));
        assert_eq!(counts(&xs), expected);
    });
    report.assert_passed();
}
```

Adapt the sorter entry point to the target crate. Bound collection length and recursion depth before allocation.
For custom shrinkers, verify each candidate stays in the input domain and decreases a declared size measure.
For test-only requests return the requested Rust test module.

## Replay and triage

```sh
timeout 60s cargo test --locked -j 1 --test properties sorting_ignores_input_order -- --exact --test-threads=1
```

Record the reduced input and exact printed `EPHYRA_REPLAY` value. Set that variable for the same targeted command.
Compare the outputs with the contract. Repair a confirmed implementation defect within scope. Replay, then unset the variable for fresh cases.
If the property is wrong or the contract ambiguous, preserve the test and submit the counterexample for review.
Include the violated assertion, observed outputs, and contract evidence.

Use the optional shell adapter in [[z-qa-debugger]] for bounded output. [Ephyra API](https://docs.rs/ephyra/) · [Replay](https://github.com/datadog-labs/ephyra)
