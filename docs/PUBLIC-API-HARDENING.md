# Commit outcomes and deeply readonly views

This is a necessary pre-1.0 public contract change. No recovery protocol, automatic retry, undo, or exactly-once guarantee is added.

## CommitResult

| status | Meaning | Transaction after result |
| --- | --- | --- |
| committed | Adapter confirms atomic publication and supplies a valid detached snapshot | committed, closed history |
| conflict | Adapter confirms it did not apply this commit because expected revision mismatched | open |
| failed | Adapter confirms no application, or the stage rejects unresolved decisions before invoking it | open |
| indeterminate | Application cannot reliably be established | indeterminate, terminal closed history |

`indeterminate` has `{status, code, message}`. Codes emitted by the stage are ADAPTER_ERROR for an unexpected commit exception and INVALID_ADAPTER for malformed/unsupported results, invalid success snapshots, result-copy failures, or conflict metadata that does not match the request. An adapter may explicitly return indeterminate with its own code/message (for example a remote timeout). Every unexpected exception is indeterminate, even if it happened before application in a particular test: the engine has no general proof of that.

The transaction view stores a detached `commitResult` diagnostic for terminal indeterminate outcomes. It retains the base revision, operations and decisions for inspection. Returned diagnostics cannot mutate the retained diagnostic. Diagnostic code and message are retained, not arbitrary exception objects, stacks or unserializable transport metadata; attach additional investigation context in application logs with appropriate redaction.

A commit transitions open → committing → one final status. The terminal update, diagnostic, closed-history enqueue and capacity release happen before one terminal notification. There is still a committing notification, and adapters may independently emit host notifications. “One terminal notification” does not mean one notification for the entire commit lifecycle.

An indeterminate transaction cannot commit again, change decisions, or roll back: these operations throw/reject StageError with INVALID_STATUS. Rollback never undoes host state. Indeterminate transactions release open capacity and share the configured closed-history FIFO with committed/rolled-back records. At zero closed retention they disappear immediately, but the commit call still returns the diagnostic. Pruned lookups return NOT_FOUND. Disposal may remove a transaction while an adapter call is in flight; its result still resolves, without recreating records or notifying disposed listeners.

Applications must inspect and reconcile the real host independently before capturing fresh state and proposing again. Automatically generating a new proposal from an old intent can repeat an already-applied mutation. IDs and revisions are not idempotency keys for remote writes.

## Adapter contract

A structured failed result is a positive guarantee that the adapter did not mutate host state. Conflict similarly guarantees this commit was not applied, though other host writers may have changed state. Neither an exception nor a malformed response supplies that guarantee. Adapters should return indeterminate whenever their own write outcome is unknown. Atomic revision checking/publication remains mandatory; the core cannot repair a broken adapter.

The memory adapter returns failed for validation errors before publication and indeterminate for unexpected errors after publication. Zustand returns failed for known pre-publication patch/schema/update rejection under its existing pure-callback contract. Unexpected callback/store-wrapper exceptions are indeterminate unless the adapter can confirm its prepared state was published (for example an observer throwing while that exact state is current). No new promise of compatibility with asynchronous or state-mutating middleware is made. Pure callbacks, immutable host writes and synchronous vanilla publication are still required.

## Stable library error codes

| code | Use |
| --- | --- |
| INVALID_INPUT | Invalid JSON/patch/pointer or configuration |
| INVALID_BASE | Capture is not issued by this stage |
| NOT_FOUND | Unknown or pruned transaction/change ID |
| INVALID_STATUS | Decision/commit/rollback attempted outside open lifecycle |
| DISPOSED | Stage/adapter lifetime ended |
| UNRESOLVED_CHANGES | Commit failed before adapter invocation because decisions remain pending |
| OPEN_TRANSACTION_LIMIT_EXCEEDED | Proposal rejected at open/committing capacity |
| WORKLOAD_LIMIT_EXCEEDED | Proposal rejected by synchronous work admission |
| ADAPTER_ERROR | Unexpected adapter exception; indeterminate outcome when publication cannot be confirmed |
| INVALID_ADAPTER | Invalid snapshot contract, or malformed commit response (indeterminate during commit) |
| INVALID_PATCH | Memory adapter patch rejection before publication |
| INVALID_SLICE / INVALID_UPDATE | Zustand candidate rejection under the pure callback contract |
| INVALID_SCOPE | Vue composable called outside an active effect scope |

Adapter-defined failed/indeterminate codes are also allowed; application code must have a fallback for unknown codes. Angular injection-context misuse retains Angular's native error. Invalid lifecycle calls throw synchronously, except async commit rejects its promise; actual commit outcomes resolve as CommitResult.

## DeepReadonly

`DeepReadonly<T>` recursively maps properties, arrays and tuples to readonly equivalents while retaining concrete field types. The unbounded JSON union uses the exported recursive `ReadonlyJsonValue` form to avoid TypeScript's infinite conditional-type expansion. `DeepReadonly<JsonValue>` resolves to that form.

Public immutable views include Snapshot.state, Transaction.base/operations/changes, ReadonlyOperation.value, previews, applyPatch outputs, and successful CommitResult snapshots. Adapter getSnapshot and all React/Vue/Angular return types carry those same contracts. There are no separate previous/proposed value properties: prior data is transaction.base.state and proposed data is transaction.operations/preview; both are recursively readonly.

`JsonValue` and `Operation` remain convenient construction inputs with mutable nested data. Proposals accept readonly operation views as inputs too; patch execution always validates and detaches them. createMemoryAdapter and applyPatch accept readonly JSON so a snapshot can be used as input without casting away readonly. Zustand schema validation accepts ReadonlyJsonValue; validators typed only for mutable JsonValue should widen their parameter (or accept unknown and check a schema).

No runtime freezing is added to core returns. Core guarantees detached copies, and TypeScript prevents ordinary mutation through their public types. Framework views remain deeply frozen at runtime. Explicit casts, any, JavaScript code and TypeScript's built-in narrowing rules can bypass compile-time readonly; they do not change the runtime isolation contract. Build an explicit mutable application value when editing a returned view, and pass a fresh proposal or host action to apply intended changes. Do not clone a capture token and pass it back as a stage-issued base.

## Handling results

```ts
const result = await stage.commit(transactionId);
switch (result.status) {
  case 'committed':
    renderCommitted(result.snapshot);
    break;
  case 'conflict':
    showConflict(result.expectedRevision, result.actualRevision);
    break;
  case 'failed':
    showNotApplied(result.code, result.message);
    break;
  case 'indeterminate':
    showReconciliationRequired(result.code, result.message);
    // Inspect/reconcile host independently. Do not retry or “undo” this transaction.
    break;
}
```

The render/show functions above represent application code. They are not new library APIs.

## Migration and verification

- Handle the fourth CommitResult discriminant in exhaustive switches and result UI.
- Handle terminal Transaction.status === indeterminate and inspect commitResult if the record remains retained.
- Stop treating thrown adapters as failed/open; a known no-write failure must be returned explicitly.
- Treat all returned nested data as readonly; normal mutable proposal input construction remains supported.
- Indeterminate records now free open slots and count against closed retention rather than remaining locked committing records.

`npm run test:types` compiles negative mutation/inference fixtures under both NodeNext and Bundler. The fixtures use @ts-expect-error: an unexpectedly accepted mutation fails compilation. Runtime tests exercise malformed success/failure, explicit indeterminate results, throws before/after writes, duplicate prevention, decision/rollback rejection, diagnostics, pruning, capacity and notification ordering. Packed consumers additionally compile readonly checks against emitted declarations.

Actual results for this phase are recorded in [public API verification](PUBLIC-API-HARDENING-VERIFICATION.md); no readiness decision is inferred from the test count.
