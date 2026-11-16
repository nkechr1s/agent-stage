# Architecture

`src/core` owns immutable transaction records, validation, pointers, patches and grouping. `src/adapters` defines the host boundary and provides a reference memory implementation. The core never treats mutation of a local preview as a host commit.

The host adapter supplies snapshots with opaque string revisions. Revisions must never be reused for distinct host states (including changes that restore an earlier value). Commit compares the expected revision and applies the entire patch atomically. A custom adapter must enforce these requirements itself; a core-side preflight check cannot prevent a race.

Capture returns a detached snapshot. Propose requires the exact capture object from this stage; the stage retains its original private snapshot context so caller mutations cannot change its meaning. Transactions retain private copies of their base and operations and receive independent IDs. Inspection and previews return detached values. Validated JSON input is copied as a tree, duplicating shared JavaScript references so one JSON path cannot alias another.

All six JSON Patch operations are supported. The document must remain a JSON value, so removing the root is rejected. Approval groups connect overlapping ancestor/descendant paths, source paths for move/copy, and accesses within the same array. This intentionally includes nonstructural array edits. Test operations conservatively join the entire proposal, preserving preconditions. Grouping uses sequential document states so created arrays are also detected. Original operation order is preserved at commit.

Preview defaults to the whole proposal; accepted-only preview is explicit. Neither changes the host. Decisions can change while a transaction is open. Commit blocks while any change is pending, returning UNRESOLVED_CHANGES without invoking the adapter. Once every change is accepted or rejected, a successful commit applies only accepted groups and closes the transaction, including an explicitly all-rejected proposal. Rollback is the explicit way to abandon unresolved changes. Stale commits return a conflict and leave the transaction open. Rollback discards an open transaction logically and never undoes host state.

Stage subscriptions notify on transaction changes and host notifications. Observer exceptions are isolated from mutation outcomes. Removed callbacks are skipped during an ongoing notification. Disposal clears private captures and transaction records and prevents an in-flight completion from repopulating them. A commit marks its transaction committing before invoking the adapter, preventing concurrent decisions or duplicate commits. Known no-write adapter failures remain open; unexpected exceptions or malformed responses become terminal indeterminate outcomes. Indeterminate records retain diagnostic code/message in bounded closed history and release open capacity; ambiguous remote outcomes require a future protocol.

JSON validation rejects unsupported prototypes, accessors, cycles, nonfinite numbers, sparse arrays, unsafe keys and excessive depth/size. Proposals are limited to 1,000 operations and JSON trees to 100 levels and 100,000 nodes / 1,000,000 string code units. Limits apply before cloning. These are fixed MVP limits, not a streaming or hostile Proxy sandbox.

## Optional integration boundary

The React/Zustand phase adds three hooks and a slice adapter under separate package exports. Only a notification `getVersion()` method is added to the core. The transaction rules above remain unchanged. See [ADR 0002](DECISIONS/0002-react-zustand.md) and [integration contracts](INTEGRATIONS.md).

Vue and Angular use the same versioned notifications through scope-owned refs/signals and computed frozen views. They share stage notifications with lifecycle-owned cleanup and add no core transaction behavior. See [ADR 0003](DECISIONS/0003-cross-framework.md).

The release audit corrected Angular subscription sharing: one physical subscription per stage fans out to consumers individually registered with DestroyRef; destroying one consumer does not keep it reactive through another context.

## Bounded transaction ownership and admission

AgentStageOptions sets finite closed/open capacities and synchronous workload budgets. A FIFO stores only closed IDs; pruning deletes complete private transaction records before notifying. Open and committing records cannot enter that FIFO. Validated capture context stores immutable size metadata for deterministic proposal admission before grouping or candidate execution. Patch validation and atomic adapter revision checks are unchanged. See [bounded workflows](BOUNDED-WORKFLOWS.md).

Returned public values are recursively readonly in TypeScript, with mutable JSON/operation inputs kept separate. No extra runtime freezing is applied in core; framework freezes remain in place. See [public API hardening](PUBLIC-API-HARDENING.md).
