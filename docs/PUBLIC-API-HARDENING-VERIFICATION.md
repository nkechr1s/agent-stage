# Public API hardening verification

## Executed results

- `npm run build`: passed; all five ESM/declaration entry points emitted.
- `npm run typecheck`: passed under the existing strict options.
- `npm run test:types`: passed under both NodeNext and Bundler resolution. Negative @ts-expect-error checks cover root/nested state, arrays and nested elements, previous/proposed values, decisions/indexes, previews, patch outputs, commit/adapter snapshots, tuple inference, mutable inputs and all framework return contracts.
- `npm test`: **155 tests passed across 21 files** (132 baseline cases retained, 23 runtime cases added).
- `npm run test:unit`: **141 passed**.
- `npm run test:integration`: **14 passed**, including React/Vue/Angular components, React concurrency and history/disposal GC tests.
- `npm run demo:build`: passed; the UI handles indeterminate separately and blocks decisions/commit/rollback through the existing open-only controls.
- `npm run check:package`: all five exports passed isolated runtime imports, strict NodeNext and Bundler declaration checks, readonly negative type checks and dependency/circular-import checks.
- Fresh `--install` consumers also passed for root, React, Zustand, Vue and Angular with only their own peers. The sandbox initially blocked registry DNS; the authorized rerun completed successfully.
- `git diff --check`: passed.

No runtime dependency was added. No commit, push, publication, CI setup or release engineering was performed.

## Regression coverage

Twenty core indeterminate cases cover pre/post-application throws, malformed success/failure/unsupported results, invalid snapshots and request-conflict metadata, explicit adapter uncertainty, duplicate prevention, decision/rollback blocking, detached retained diagnostics, terminal notification ordering, capacity release, closed-history pruning, zero retention, disposal during asynchronous uncertainty, unusual exception objects and nonenumerable result envelopes.

Three new Zustand cases cover a callback that writes then throws, a wrapper throwing before its prepared state is published, and a wrapper writing without executing the provided updater. Existing observer-after-publication coverage still confirms committed when publication can be established. The existing throwing-updater test now expects uncertainty while retaining its unchanged-host assertion for that particular callback.

Existing baseline assertions expecting failed/open or locked-committing after unexpected exceptions/malformed responses were migrated to the requested indeterminate semantics. Their lifecycle, no-partial-write, isolation and capacity checks remain and are extended; no test was removed. Valid structured failed/conflict results still leave transactions open.

## Compatibility and limits

The necessary pre-1.0 changes are documented in [the public API migration](PUBLIC-API-HARDENING.md): a fourth CommitResult member, terminal Transaction.status/commitResult, release of open capacity into closed history, deeply readonly outputs, readonly operation inputs, and widened validator parameters. Exhaustive consumers must handle indeterminate; code mutating returned nested values will now fail compilation. Application construction inputs remain mutable and usable.

Readonly is a compile-time contract for core detached views, not new runtime freezing. Framework freezes are unchanged. Type assertions, any, JavaScript and some built-in narrowing patterns can bypass readonly. Adapters remain trusted to tell the truth: a malicious adapter returning a well-formed failed result after applying cannot be detected generically. Unknown outcomes require independent host inspection/reconciliation; there is no retry/idempotency service or automatic recovery. Diagnostics retain code/message, not arbitrary exception objects. Closed-history pruning may remove inspection records; callers retain the returned outcome if required for investigation.

These checks verify this phase's API behavior and existing runtime baseline. They do not establish production or beta readiness, and the full historical browser/AOT version matrix was not rerun in this phase.
