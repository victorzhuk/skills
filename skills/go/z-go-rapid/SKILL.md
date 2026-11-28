---
name: z-go-rapid
description: "Test Go state transitions with a Rapid model. Use for randomized action sequences, invariants after each step, or replaying a shrunk Rapid failure. See [[z-go-testing]] for native fuzzing and table tests."
---

# Check a Go state machine with Rapid

Name the sequence risk that existing acceptance tests miss. Derive transitions, results, and invariants from the project contract.
Use BMAD story criteria when available. Check the module's Rapid version and Go requirement.

## Write the test

Create fresh state inside each `rapid.Check` callback so replay and shrinking start from the same state.
Model observable behavior independently. Draw inputs with stable labels. Keep an eligible action in each reachable state.

This FIFO example checks insertion order and empty removal. Adapt its API to the target package.

```go
package queue

import (
    "testing"

    "pgregory.net/rapid"
)

func TestQueueModel(t *testing.T) {
    rapid.Check(t, func(t *rapid.T) {
        q := NewQueue()
        var model []int
        t.Repeat(map[string]func(*rapid.T){
            "": func(t *rapid.T) {
                if q.Len() != len(model) {
                    t.Fatalf("length %d, want %d", q.Len(), len(model))
                }
            },
            "push": func(t *rapid.T) {
                v := rapid.IntRange(-8, 8).Draw(t, "value")
                q.Push(v)
                model = append(model, v)
            },
            "pop": func(t *rapid.T) {
                v, ok := q.Pop()
                if ok != (len(model) > 0) {
                    t.Fatalf("pop success %t at length %d", ok, len(model))
                }
                if ok {
                    if v != model[0] {
                        t.Fatalf("pop %d, want %d", v, model[0])
                    }
                    model = model[1:]
                }
            },
        })
    })
}
```

The empty action checks initial state and state after each completed transition.
For test-only requests return the requested `_test.go` file.

## Replay and triage

```sh
timeout 60s go test -count=1 -timeout=45s -p=1 -parallel=1 -run '^TestQueueModel$' .
```

Record the shrunk actions and reported failfile or seed. Repeat the command with the printed Rapid flag.
Compare the first divergence with the contract. Repair a confirmed implementation defect within scope.
Replay the same case, then run fresh sequences. If the model is wrong or the contract ambiguous, preserve the test.
Report the trace, observed result, model expectation, and contract evidence for review.

Use the optional shell adapter in [[z-qa-debugger]] for bounded output. [Rapid state machines](https://pkg.go.dev/pgregory.net/rapid@v1.3.0#T.Repeat)
