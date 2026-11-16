# Security model

The untrusted input boundary is parsed JSON state and JSON Patch operations. Adapters, selectors, update/validation callbacks, subscriptions, and application code are trusted JavaScript. This library does not sandbox functions, getters supplied outside validated JSON, hostile Proxies, middleware, or an already-compromised JavaScript realm.

## Library guarantees under the adapter contract

- No eval or generated code execution from proposals.
- Prototype-related keys and pointer segments are rejected, including source paths and nested patch values.
- JSON validation rejects unsupported instances, accessors, cycles, sparse/decorated arrays, nonfinite numbers and non-JSON primitives.
- Shared acyclic references are copied into independent JSON paths.
- Fixed limits: 1,000 operations; 100 levels; 100,000 JSON nodes; 1,000,000 string/key code units; pointer length 16,384. These are allocation/validation bounds, not CPU-time or total-session quotas.
- Patches run on detached trees. Accepted groups reach the adapter only after all groups have explicit decisions.
- Expected revision comparison and all-or-nothing publication belong to the adapter. A conforming adapter cannot silently overwrite intervening host edits.
- Transaction and change IDs resolve internal maps/arrays. Fabricated capture objects are rejected; returned views cannot change stored decisions.

## Application responsibilities

Authorize paths and values for the authenticated user **before proposing**. Approval in this runtime is not authentication or authorization. A root replacement or deletion of a legitimate property can be perfectly valid JSON Patch yet unacceptable for your business. Validate schemas, ranges and domain invariants. The optional Zustand validator supports such checks but does not supply a schema.

Limit transport body size before parsing JSON, rate-limit requests, bound proposal count and workflow duration, and dispose stages when workflows finish. Closed history retains up to the configured count (default 50); open/committing capacity defaults to 100. Caller-held captures and views still need host ownership limits. Do not expose arbitrary stage methods or a low-level adapter.commit endpoint to untrusted callers. Treat state, previews, logs and errors as potentially sensitive; the library supplies no redaction or persistence security.

Observer exceptions are isolated, but recursively mutating subscribers can create infinite notification loops. Subscribers must be bounded and should avoid feedback loops. Vue/Angular setup and cleanup must follow their framework lifecycles. Zustand users must use immutable writes and synchronous publication; middleware and external observers must not suppress change delivery.

## Adapter outcomes

An adapter returning `failed` or `conflict`, or throwing, promises it did not publish. A malformed returned result violates the contract: the core returns `failed / INVALID_ADAPTER` and keeps the transaction locked in `committing` to prevent a duplicate write. Inspect the real host and fix the adapter; discard/dispose that stage when safe. This is an indeterminate outcome, not proof of rollback. No automatic retry is safe after an ambiguous remote write. The library cannot repair a malicious or non-atomic adapter.

## Findings from the release audit

| Severity | Finding | Disposition |
| --- | --- | --- |
| Medium | Malformed adapter results escaped structured handling or reopened transactions despite an unknown host outcome | Fixed: validate result envelopes and snapshot state; lock malformed outcomes against retry |
| Medium | Formerly unlimited retained history permitted cumulative memory exhaustion | Addressed by finite closed/open counts; host byte/rate quotas and disposal still required |
| Low | Angular component DestroyRef identities defeated subscription sharing | Fixed: one stage subscription with independently disposed reactive consumers |
| Informational | Current patch dialect intentionally rejects root removal and unknown operation members | Documented; not full unrestricted RFC conformance |

No prototype pollution or proposal-code-execution exploit was reproduced in the executed tests. This is a focused source/test audit, not independent penetration testing or a formal proof.

Stage admission now additionally bounds operation count and estimated cumulative work. It rejects the previously unrestricted 20,000-element/1,000-operation workload under defaults. This is not a sandbox or a wall-clock guarantee; see [bounded workflows](BOUNDED-WORKFLOWS.md).
