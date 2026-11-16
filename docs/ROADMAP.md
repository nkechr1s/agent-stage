# Delivered scope and remaining work

The repository was empty. The supplied request is the available specification and roadmap; there was no separate roadmap file.

## Phase 0

Architecture, public API, and the ten required architectural decisions are documented. The implementation keeps the proposed core/adapter split, with additional private modules for JSON validation, grouping and notification isolation.

## Phase 1 and initial vertical slice

Implemented: strict TypeScript package, declarations and ESM exports, six-operation JSON Patch interpreter, pointer utilities, JSON validation and bounds, StateAdapter contract, memory adapter, captured revisions, isolated transactions, dependency grouping, inspection, previews, decisions, atomic commit boundary, structured conflicts/failures, rollback and subscriptions. Unit tests, integration tests and a runnable example accompany the implementation.

No requested Phase 1 implementation tasks remain. Release preparation (not requested): establish a supported runtime CI matrix, decide versioning/release policy, and add CI for that matrix. No commit or publication is performed.

## First integration phase

Implemented: optional `agent-stage/zustand` JSON slice adapter, optional `agent-stage/react` hooks, stable core notification versions, and a runnable React + Zustand dashboard. The dashboard exercises grouped decisions, manual host edits, conflicts, rollback and explicit commit. See [integration contracts](INTEGRATIONS.md).

Next work requires a separate scope: SSR snapshot transfer, additional store/middleware compatibility, and broader browser/runtime CI. Redux and Pinia remain unimplemented. Automatic rebase, conflict resolution, undo/redo, persistence, distributed transactions and AI provider clients remain excluded.

## Cross-framework phase

Implemented: `agent-stage/vue` Composition API bindings, `agent-stage/angular` signal bindings, shared per-lifetime subscriptions, frozen views with capture identity, and a complete Vanilla TypeScript example. See [cross-framework contracts](CROSS-FRAMEWORK.md).

Next: production-readiness work should cover framework component/browser and SSR lifecycles, Angular CLI/AOT builds, a supported peer-version CI matrix, and load/memory behavior. No automatic rebase, persistence, undo/redo or AI providers are introduced.

## Known limits

JSON trees only, with fixed resource limits and forbidden prototype-related keys. Root removal is rejected. Patch extension members are rejected. Array access groups conservatively, and tests make the entire proposal atomic. Conflicting transactions require a fresh capture and explicit new proposal. Captures belong to one stage and cannot be serialized back into valid capture tokens. Retained closed records are bounded by configuration; open/committing records are protected up to the admission capacity; rollback is a terminal status, not history deletion. Disposing does not cancel an adapter commit already in flight. Custom adapters are trusted to meet the atomicity contract; ambiguous remote commit outcomes are not supported. Observer errors are intentionally isolated. The runtime does not sandbox hostile JavaScript Proxy objects; untrusted proposals should enter as parsed JSON.

## Release audit

MIT license selected. See [production readiness assessment](../PRODUCTION-READINESS.md) for the beta decision, measured scaling/retention limits, fixed adapter/Angular issues and remaining production blockers.

## Beta hardening

Finite configurable history/open limits and combined synchronous workload admission are implemented. See [bounded workflow contracts](BOUNDED-WORKFLOWS.md) and [measurements/verification](BETA-HARDENING-VERIFICATION.md). Existing per-operation safety validation is preserved. Byte quotas, caller-held object ownership, rate controls and broad production CI remain application/release work.
