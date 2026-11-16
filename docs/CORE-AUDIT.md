# Core correctness audit

Date: 2026-11-15. Scope: existing core and memory adapter only. No integrations or runtime dependencies were added.

## Confirmed defects and fixes

1. **Shared references changed unrelated JSON paths.** `assertJson` accepted acyclic JavaScript graphs but `structuredClone` preserved aliases. With `{a: shared, b: shared}`, replacing `/a/n` also changed `/b/n`. The same defect existed inside inserted operation values. Validated inputs now use tree copying at state, capture and patch boundaries; shared references become independent JSON values. Generic cloning remains for already normalized transaction records.
2. **Pending changes became unusable after commit.** Successful commit previously closed a transaction even when some changes remained pending. Commit now returns `failed / UNRESOLVED_CHANGES` before calling the adapter whenever any decision is pending. The transaction and all decisions remain open and intact. Every group must be accepted or rejected, or the transaction explicitly rolled back. Fully decided transactions apply only accepted groups; all-rejected and empty proposals can close after revision checking.
3. **Removed subscription callbacks still ran.** Notification iterated a copied listener array even after an earlier callback disposed the stage or unsubscribed another observer. Dispatch now verifies membership immediately before each callback. Observer exceptions remain isolated.
4. **Malformed operation names escaped structured validation.** Coercing `{op: {toString: null}}` to a string raised a raw TypeError. Operation names are now required to be strings before matching supported operations.
5. **Disposed stages retained inaccessible private state.** Disposal left transaction records and the capture WeakMap reachable, including capture values whose tokens remained with callers. Disposal now clears records and replaces the capture map. In-flight commit completion cannot repopulate disposed records. A child-process test with explicit GC confirms release while the stage and a capture remain reachable; the same test fails against a temporary source copy with private-record cleanup removed.

The first regression run reproduced five failing tests across the first four defects (two tests exercise aliasing). The disposal regression separately reproduced the fifth defect. All regressions pass with the fixes.

## Additional verification

The audit adds 17 tests, covering aliasing in host state and patch values, custom adapter capture isolation, mixed/all-pending/all-rejected decisions, reentrant subscription removal and disposal, malformed operation names, delayed adapter rejection, in-flight disposal, private memory release, asynchronous competing commits completed in reverse order, failure after removing a move source, ordered root and escaped-pointer operations, noncanonical array indexes, detached decision arrays and capture reuse. The existing integration test now verifies pending rejection before explicitly resolving its remaining decision.

The existing suite continues to cover all six patch operations, array ordering, pointer escaping, root versus empty-name properties, dependency grouping, all eight approval subsets of three independent groups, immutable host previews, stale revisions, atomic patch failure and duplicate-commit locking. Root removal remains intentionally rejected because a missing document is outside the JsonValue adapter contract.

## Executed results

- `npm test`: **72 passed across seven files** (68 unit tests, four integration tests).
- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm run example`: passed; only accepted budget changed and revision advanced once.

## Remaining risks and next-phase assessment

The core is suitable to proceed to the next development phase with these contracts and tests as the baseline. This is not a production-readiness certification.

Custom adapters still must guarantee atomic expected-revision checking and application. A remote adapter that applies a write and then throws has an ambiguous outcome that this MVP cannot recover from. Disposing does not cancel a commit already started. Active stages retain transaction history until disposal; there is no bounded history/pruning policy. GC behavior was tested in Node 22.22.1, not across a runtime matrix. No external RFC conformance suite, load benchmark, hostile Proxy sandbox test, or production store integration was performed. JSON limits, conservative array grouping, forbidden prototype-related keys, root-removal rejection and the absence of rebase remain deliberate constraints.
