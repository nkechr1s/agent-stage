# ADR 0004: Finite transaction ownership and deterministic admission

Status: accepted.

Add an optional second argument to createAgentStage. Retain 50 closed transactions and allow 100 open/committing transactions by default. Prune closed records in closure order; never evict active work. Zero closed retention is supported. Capacity exhaustion rejects new proposals with a structured error. Closure and pruning are one observable state transition. IDs remain stage-local unique strings.

Preserve sequential candidate validation, grouping, patch isolation and revision/approval semantics. Reject workloads before that execution using an operation-count cap and conservative cumulative size/path score. Default limits are 200 operations and 250,000 work units. Fixed JSON safety validation remains independently enforced.

Measure size once in the required capture validation and retain only metadata with the private capture context. A benchmark comparing recount-per-proposal with reuse shows the additional recount is avoidable; immutable private snapshots make reuse safe. No candidate-state cache, validation removal, worker, persistence or new committed-state mirror is introduced.

Finite counts are not byte/rate quotas, and work units are not latency guarantees. Applications must still own caller references, adapter/callback work and workflow frequency. Larger explicit finite settings are supported at the application's cost. Before/after results and supported profiles are documented in BOUNDED-WORKFLOWS and BETA-HARDENING-VERIFICATION.
