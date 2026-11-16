# Beta hardening verification

The history and workload changes preserve the adapter contract and transaction decisions. The new optional second createAgentStage argument is additive, but its finite defaults intentionally change admission and historical lookup behavior. Clients retaining transaction IDs indefinitely must handle NOT_FOUND after closure/pruning. See [complete contracts](BOUNDED-WORKFLOWS.md).

## Reproducible comparison

Same Node 22.22.1/macOS arm64 process model and benchmark scenarios, measured before and after the change. Before used a copied pre-change build. Times are median / p95 milliseconds; they are not universal latency promises. Full snapshots and operation validation remain enabled.

| Scenario | Before median / p95 | After median / p95 | After outcome |
| --- | ---: | ---: | --- |
| small proposal | 0.008 / 0.182 | 0.021 / 0.399 | executed |
| small repeated preview | 0.003 / 0.028 | 0.003 / 0.004 | executed |
| medium proposal | 1.518 / 1.978 | 1.959 / 3.816 | executed |
| medium repeated preview | 1.381 / 1.563 | 1.916 / 3.024 | executed |
| large array proposal | 4.695 / 8.212 | 5.316 / 7.503 | executed |
| large array repeated preview | 3.383 / 5.033 | 3.767 / 4.356 | executed |
| large batch proposal | 0.403 / 0.709 | 0.497 / 0.812 | executed |
| large batch repeated preview | 0.263 / 0.514 | 0.239 / 0.951 | executed |
| combined proposal | 1659.965 / 1751.024 | 0.003 / 0.004 | rejected |
| 1000 sequential transactions | 2.540 / 2.809 | 3.357 / 4.007 | executed |

The formerly expensive combined workload is now **rejected**, not executed with a speedup. Raising only maxOperations still triggers the combined-work guard: median 0.849 ms, including patch validation and preparation. Both rejection paths created no transaction or host mutation in tests.

Small accepted workloads have minor overhead/noise; no claim of algorithmic speedup is made. Patch validation, per-operation JSON validation and detached execution remain unchanged. No speculative patch/grouping optimization was introduced.

## Admission analysis alternatives

- alternative: recount base for each admission: median 1.722750 ms; p95 2.292125 ms.
- alternative: reuse validated capture size: median 0.000333 ms; p95 0.002333 ms.
The size is now measured during required capture validation and kept with immutable capture context, avoiding an additional state traversal during admission. This metadata cannot be changed by mutating the caller capture.

## Memory

Before: 3,000 closed transactions with 10 KB base payload: heap before 3.738 MB, retained 34.784 MB, after disposal 3.804 MB. Retained growth 31.046 MB.

After: 3,000 closed transactions with 10 KB base payload: heap before 4.965 MB, retained 5.563 MB, after disposal 5.034 MB. Retained growth 0.597 MB.

The new default retains at most 50 closed transactions rather than all 3,000. Measurements use forced GC; exact heap figures vary. A GC-enabled regression verifies release of private bases and operations after pruning while the stage and original capture token stay reachable. Another test repeats 20 create/use/dispose cycles with 200 transactions each and subscribers. Existing asynchronous-disposal and GC tests remain unchanged.

## Verification

- Full build and strict typecheck: passed.
- Full suite: **132 tests passed across 20 files**, including all 115 baseline tests.
- Unit/security suite: **118 passed**. Integration/compatibility suite: **14 passed**.
- Added **17 tests**: history/default/zero retention, closure-order pruning, unique IDs, notifications, open/committing capacity, conflict/indeterminate protection, option validation, workload count/size/copy/path/string rejection, explicit configuration and selective normal commits, plus GC/repeated-disposal coverage.
- Existing React, Zustand, Vue, Angular, real-component and concurrent React tests passed without changes to their integration implementations.
- Existing React/Zustand demo production build: passed.
- Both benchmark commands completed and wrote raw JSON measurements.
- All five packed exports passed runtime smoke tests, strict NodeNext and Bundler declaration checks, and import graph isolation checks. Fresh isolated npm installations with only the relevant peers also passed, including the new options and zero-retention behavior in the core consumer.
- git diff whitespace checks passed.

Network-restricted consumer installation was rerun successfully with permission. No commit, push or publication was performed. Previous browser/AOT matrix results remain historical; this phase reran the full component/regression suite and demo build rather than claiming a new browser/AOT matrix run.

## Remaining limits

Record count limits are not byte quotas. Caller-held capture/view/result references, callback/subscriber execution, adapter work and the frequency of preview calls remain application responsibilities. Fixed JSON safety limits remain unchanged. Work-unit estimates conservatively overestimate copy/replacement growth, may reject cheap valid patches, and are not a wall-clock deadline. Larger explicit finite limits re-enable larger synchronous workloads at the application's risk. Direct applyPatch and adapter.commit callers remain trusted low-level consumers outside stage admission. SSR and existing framework/middleware restrictions are unchanged.
