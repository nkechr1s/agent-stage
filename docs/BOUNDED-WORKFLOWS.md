# Bounded workflows and synchronous workload admission

`createAgentStage(adapter, options?)` now accepts optional `AgentStageOptions`. Existing one-argument calls use finite defaults:

```ts
const stage = createAgentStage(adapter, {
  maxClosedTransactions: 50,
  maxOpenTransactions: 100,
  workload: { maxOperations: 200, maxWorkUnits: 250_000 },
});
```

## History lifecycle

- New proposals are open. Pending, accepted and rejected are decisions on logical groups, not transaction statuses. Even an all-rejected proposal remains open until explicit commit or rollback.
- Open transactions never expire or get pruned automatically. Committing transactions remain protected. Indeterminate outcomes are terminal and enter closed history.
- Successful commit, indeterminate commit and explicit rollback close a transaction. Ordinary conflict/failure leaves it open.
- Closing appends the ID to a FIFO in **closure order**, regardless of creation order. When the configured closed limit is exceeded, the oldest closed records are deleted before the closure notification runs.
- Retained closed transactions remain inspectable/previewable. Pruned IDs throw the same `StageError / NOT_FOUND` as unknown IDs. IDs are never reused within a stage, even after pruning; the sequence uses BigInt internally and stays a public string.
- `maxClosedTransactions: 0` disables closed history. The commit result remains available to the caller even though getTransaction will fail immediately after closure. Framework consumers displaying closed records must handle selection of pruned IDs (for example by clearing selection); bindings retain their documented NOT_FOUND behavior.
- Closing/pruning causes one normal stage notification, with pruning already visible. There is no separate event schema.
- The open limit counts open **and committing** transactions. Indeterminate outcomes release that capacity and count against closed retention. New proposals fail with `OPEN_TRANSACTION_LIMIT_EXCEEDED` at capacity; existing transactions are never removed to make room. Closing frees capacity. Invalid/rejected proposals consume no slot or ID and emit no notification.
- Limits are copied at construction. Closed count must be a nonnegative safe integer; open count a positive safe integer. Infinity is intentionally unsupported. Applications can choose larger finite limits.

Deleting a record releases its private base snapshot and operations once no in-flight work references them. Caller-held transaction copies, previews, captures, commit results and logs remain the caller's memory responsibility. A retained capture token keeps its separate private capture context alive through the WeakMap; pruning a transaction does not invalidate captures or prevent their reuse. Dispose clears all history/captures/listeners. Always unmount framework consumers first, then dispose their stage and external adapter.

## Workload budget

The fixed JSON safety limits remain in force: depth 100, nodes 100,000, characters/key units 1,000,000, pointer length 16,384 and 1,000 operations. A configured maxOperations may be at most 1,000. maxWorkUnits is a positive finite safe integer. Raising the admission budget cannot disable validation, pollution protection or JSON bounds.

Admission is synchronous and deterministic, not a wall-clock deadline:

1. Reject operation arrays exceeding maxOperations before validating/cloning the patch.
2. Fully validate the patch with the existing JSON/Patch checks.
3. Estimate work using the immutable private capture's validated size and operation paths/values, before candidate cloning, sequential application or dependency grouping.
4. Throw `WORKLOAD_LIMIT_EXCEEDED` if over budget. No transaction, decision, ID, notification or host write is created.

A size unit is `nodes + ceil(characterCodeUnits / 64)`, measured during the already required capture validation. Let `D` start at the capture's units and `W = D`. For each operation, add its value units to D (if any), double D for copy, and add `2 * D` to W. Removals/replacements do not subtract; this conservatively accounts for intermediate document sizes and validation/copying. Path cost P sums `1 + tokenCount + ceil(decodedPathLength / 64)` over destination/source paths. Reject if `W + P * operationCount > maxWorkUnits`. All quantities are monotonic; checking can stop as soon as the limit is exceeded.

Copy uses a whole-document growth bound even when its actual source is small. This can reject valid cheap patches: the budget is deliberately conservative. It is a resource-admission score, not a precise count of instructions or a proven CPU bound. JSON object key costs, array shifts, garbage collection and hardware still affect latency.

The same admitted operations/base govern previews and accepted commits. Any subset's growth/path estimate is no larger than the admitted full proposal. Preview still executes the existing detached patch validation/application; it is not cached or mutable. Revision checking and atomic publication remain exclusively the adapter's responsibility. Stale commits still return conflicts. Trusted direct use of exported applyPatch or low-level adapters is outside stage workload admission; host applications must budget those entry points themselves.

## Measured supported profile

Under defaults, the measured profile includes small data with 200 simple operations; 500 nested records with ten scalar replacements; a 20,000-element array with one scalar replacement; and 1,000 sequential transactions that are closed as they finish. A 20,000-element array with 1,000 operations is rejected immediately by the count guard, and is still rejected by the work-unit guard if maxOperations is raised to 1,000. Many copy or deep-path operations may require a smaller batch.

Use bounded JSON slices, keep proposals short, and rate-limit repeated proposals/previews/subscriber work in the host. Admission limits are per call, not request-rate quotas. They do not bound caller-held objects or arbitrary adapter/subscriber JavaScript. A 100-open/50-closed record count is finite but not a byte cap: large permitted states can still consume substantial memory. Lower counts and budgets for constrained devices.

## Performance changes

No patch correctness checks, per-operation tree validation, isolation clones or dependency grouping were removed. No workers or background execution were added. The only reused analysis is capture-size metadata gathered during required validation. The benchmark compares recounting on each proposal with reusing immutable capture metadata. Retention pruning and early rejection are protective behavior, not claims that the formerly expensive workload now executes faster.

Run `npm run build && npm run benchmark:hardening`. The script also accepts a previous build's absolute entry point and an output JSON path, allowing the same scenarios to be measured against another artifact. Before/after results are recorded in `benchmarks/hardening-before.json` and `benchmarks/hardening-after.json`. The before artifact was copied to `/private/tmp/agent-stage-before-hardening` before source changes; the original release benchmark is preserved in `benchmarks/pre-hardening-results.json`. Warmups precede median/p95 samples; rejected rows report rejection time, not execution time. Single-machine results are descriptive and cannot promise universal latency.
