# API

`createMemoryAdapter(initial)` creates a revision-aware host store. `createAgentStage(adapter, options?)` creates its staging runtime. `AgentStageOptions` configures maxClosedTransactions (default 50; 0 disables retention), maxOpenTransactions (default 100, including committing), and workload.maxOperations/maxWorkUnits (defaults 200/250,000). See [bounded workflows](BOUNDED-WORKFLOWS.md) for admission formulas and limits. Public types are exported from the package root.

- `getVersion()` returns a stable numeric notification version for external-store subscriptions; it advances before transaction/host listeners run.
- `capture()` returns a detached snapshot `{state, revision}`. Pass this exact object to `propose`; do not fabricate or transfer captures between stages.
- `propose({base, operations})` validates the complete ordered patch and returns a detached transaction view with `id`, `base`, `operations`, `changes`, and `status`.
- `getTransaction(id)` returns a detached view. Each logical change has an `id`, operation indexes and a `pending | accepted | rejected` decision.
- `preview(id, mode?)` returns detached proposed state. Mode is `all` (default) or `accepted`.
- `acceptChange(id, changeId)` / `rejectChange(id, changeId)` update a group's decision. Neither writes host state.
- `commit(id)` resolves to `{status: 'committed', snapshot}`, `{status: 'conflict', expectedRevision, actualRevision}`, `{status: 'failed', code, message}`, or `{status: 'indeterminate', code, message}`. Any pending change blocks commit with `{status: 'failed', code: 'UNRESOLVED_CHANGES', message}` before invoking the adapter, leaving all decisions and host state unchanged. Accept or reject every change, or explicitly roll back. Successful commits apply accepted groups, omit explicitly rejected groups, and close the transaction. Ordinary conflict/failure results leave it open for inspection or rollback; exceptions/malformed adapter results produce terminal indeterminate outcomes and diagnostics because the host outcome is unknown; retrying a stale base does not rebase it.
- `rollback(id)` closes an open transaction without changing the host. Closed transactions remain inspectable while retained; oldest closed records are automatically pruned in closure order. Pruned lookups throw NOT_FOUND.
- `subscribe(listener)` returns an unsubscribe function. Listeners receive invalidation notifications; read the current transaction or capture for details. `dispose()` removes the host subscription and listeners and releases private transaction records and captures; subsequent stage use throws. An already-started adapter commit may still finish, but cannot recreate disposed records or notify listeners. Unsubscribing or disposing during a notification skips removed callbacks later in that notification.

`StateAdapter` exposes `getSnapshot()`, `subscribe(listener)`, and `commit({expectedRevision, operations})`. Commit may be synchronous or asynchronous. A success returns a detached snapshot; conflict returns both revisions. Failure must leave host state unchanged. Custom adapter implementations must clone snapshots, isolate subscriber exceptions, use unique revisions, and atomically compare/apply/publish. The exported `applyPatch` helper performs validation and detached application but does not implement concurrency control.

Invalid inputs and invalid lifecycle operations throw `StageError` with `code` and `message`. Unresolved decisions and known no-write adapter failures return failed results. Unexpected exceptions, malformed results and explicit unknown adapter outcomes return indeterminate. Empty proposals and fully decided all-rejected proposals are allowed; the memory adapter checks revision without incrementing it for an empty patch.

Optional integrations are documented in [React and Zustand](INTEGRATIONS.md).

Vue, Angular and framework-free examples are documented in [Cross-framework APIs](CROSS-FRAMEWORK.md).

Transaction/change IDs are stage-local. Core views are detached copies; framework views are also deeply frozen. Public state, operation and result data are recursively readonly; mutable inputs remain separate.

Capacity failures throw OPEN_TRANSACTION_LIMIT_EXCEEDED. Oversized proposals throw WORKLOAD_LIMIT_EXCEEDED before candidate execution, transaction creation or host writes. Open and committing records are never automatically pruned. Closure/pruning shares one notification after the history change is visible.

See [commit outcomes and readonly contracts](PUBLIC-API-HARDENING.md) for the four outcomes, terminal reconciliation lifecycle, error codes and migration.
