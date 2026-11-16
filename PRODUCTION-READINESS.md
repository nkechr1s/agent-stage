# First public release assessment

Historical audit baseline: bounded-history and workload blockers below were subsequently addressed with finite defaults and admission controls. See [beta hardening verification](docs/BETA-HARDENING-VERIFICATION.md) for current behavior and measurements. This historical report does not establish a later production-release certification.

Date: 2026-11-16. Outcome: **READY FOR PUBLIC BETA** within the documented client/runtime, JSON, workload and adapter contracts. **Not ready for a general production-release claim.** No package was published, pushed or committed.

## 1. Executive summary

The architecture is coherent and the transactional behavior is exercised across real framework consumers. This audit reproduced and fixed malformed adapter-result handling and duplicate Angular component subscriptions. The MIT license was added with the owner's approval. All existing tests were retained, with stronger component, concurrency, security and package checks added.

Beta use should be restricted to bounded workflows with immutable host writes, explicit schema/path authorization, pure synchronous Zustand callbacks, and reliable stage disposal. Large state/operation combinations can block the JavaScript thread, and closed history has no pruning mechanism. SSR/hydration is explicitly excluded.

## 2. Architecture and API assessment

The host remains authoritative. Core imports no frontend framework; optional entry points are independently packaged and typed. All framework views delegate decisions, patches, revision checking and commits to the same core. StateAdapter retains getSnapshot/subscribe/commit; no integration replaces host actions or stores.

Public APIs and existing valid transaction behavior remain compatible. The result validation fix changes only invalid adapter behavior: INVALID_ADAPTER indicates an unknown host outcome and leaves the transaction locked in committing. This prevents duplicate retry but is an API ergonomics risk before 1.0: a dedicated indeterminate outcome may eventually be clearer. Ordinary failed/conflict results remain retryable/open under the adapter contract.

Core snapshots/views are detached; framework views are additionally deeply frozen. Public readonly annotations are shallow: nested mutation can typecheck and then throw for a frozen framework view. This distinction is documented; callers should treat all views as read-only. Capture objects are identity-bound to one stage. Transaction/change IDs are scoped to that stage and must not be transferred between stages.

Angular originally cached by DestroyRef identity. Real components returned separate DestroyRefs for the three helpers, defeating sharing. A shared physical subscription per stage now fans out to independently disposed consumers; destroyed contexts no longer receive updates. Vue continues to share by effect scope. No core transaction redesign was needed.

## 3. Security findings

| Severity | Finding | Status |
| --- | --- | --- |
| Medium | Invalid adapter results could escape as arbitrary objects, throw TypeError, or leave retry semantics inconsistent | Fixed and regression-tested; invalid envelopes fail closed with an unknown outcome |
| Medium | Unbounded transaction count/history can retain unlimited base snapshots | Confirmed by measurements; host quotas and workflow disposal required; general long-session production blocker |
| Medium | Valid large-state/large-operation combinations block the JS thread | Measured at about 1.49 s for the combined benchmark; host workload budgets required; general interactive production blocker |
| Low | Angular component helpers created redundant subscriptions | Fixed using lifecycle-owned consumers on a shared subscription; real component cleanup tested |
| Informational | JSON validity/approval is not authorization, domain validation, or remote commit reconciliation | Explicitly documented trusted/application boundary |

Existing and added tests exercise malformed operations, dangerous keys/source pointers, escaped/root pointers, aliases, unsupported prototypes, depth/size limits, forged capture metadata, reentrant commits, async failures and disposal. No prototype pollution or proposal-code execution exploit was reproduced. Proxy traps, arbitrary trusted callback behavior, compromised globals and a non-atomic/malicious adapter cannot be contained by this library. Input body limits must precede JSON parsing. See [security model](docs/SECURITY.md).

## 4. Performance and memory

Reproduce with `npm run build && npm run benchmark`. Recorded on Node 22.22.1, macOS arm64, single process. Results are descriptive samples, not latency guarantees or cross-hardware thresholds. Raw data: [benchmarks/results.json](benchmarks/results.json).

| Workload | Median ms | p95 ms |
| --- | ---: | ---: |
| Small capture + proposal | 0.018 | 0.164 |
| 2,000 nested records capture + proposal | 8.607 | 9.952 |
| 20,000-element array capture + proposal | 7.562 | 9.338 |
| Nested preview | 3.150 | 4.731 |
| Array preview | 3.339 | 3.805 |
| Small commit only | 0.012 | 0.039 |
| Nested commit only | 5.509 | 7.689 |
| Array commit only | 7.272 | 10.719 |
| 1,000 independent small transactions | 2.373 | 2.998 |
| Proposal/grouping with 1,000 operations | 44.268 | 44.737 |
| Notification to 1,000 trivial subscribers, including empty proposal | 0.008 | 0.038 |

Accept/reject pairs measured below 0.001 ms median for these small group counts. A single combined sample with 20,000 array elements and 1,000 operations took **1,493 ms**. Per-operation full-tree validation and dependency grouping account for scaling risk; no speculative optimization was introduced.

3,000 closed transactions with 10 KB base payloads increased measured heap from **4.62 MB to 35.65 MB**; disposal reduced it to **4.70 MB** after forced GC. Across 20 additional dispose/recreate cycles, each with 200 transactions and ten subscribers, measured heap moved from **4.70 MB to 4.77 MB**. This supports cleanup under the tested workload; it is not a multi-day soak or a proof of zero leaks. Existing WeakRef/GC disposal regressions also pass.

## 5. Framework compatibility

| Consumer | Actually executed |
| --- | --- |
| React 18.3.1 | Hook/demo tests, Strict Mode cleanup/remount, suspended concurrent render, explicit SSR rejection; isolated production Vite build and headless Chrome approval/commit |
| React 19.3.1 | Eight hook/demo/concurrent/SSR tests; isolated production Vite build and headless Chrome approval/commit |
| Zustand 5.1.0 | Real vanilla stores, preserved actions, immutable external writes, stale commits, reentrant host writes, subscribeWithSelector middleware; existing dashboard DOM workflow |
| Vue 3.5.45 | Real mounted/unmounted component tests, scopes and reactive IDs, actual SFC production compilation and Chrome lifecycle |
| Vue 3.2.47 | Isolated SFC production build and Chrome lifecycle; earlier scope compatibility suite recorded separately |
| Angular 17.3.12 | Fresh CLI 17 consumer, TypeScript 5.4.5, strict templates, optimized AOT build and Chrome lifecycle |
| Angular 21.2.26 | Real component/injection/DestroyRef tests; fresh CLI 21 consumer, TypeScript 5.9.3, strict templates, optimized AOT build and Chrome lifecycle |

`node scripts/framework-builds.mjs` recreates these temporary apps and checks. Browser automation used the installed headless Chrome via Playwright. Browser workflows verify selected committed data and transaction status after explicit approval/commit, and fail on page errors; they are smoke tests, not exhaustive UX tests. Angular consumers used synchronous Zone.js application bootstrapping, while unit component tests also exercised zoneless configuration. Angular Core 21 is the current maximum declared supported major; no claim is made for Angular 22+ or every intervening patch release. Historical peers/CLI dependencies may carry upstream advisories and are compatibility fixtures, not deployment recommendations.

Arbitrary Zustand middleware is not guaranteed. Wrappers must preserve synchronous functional-updater publication, complete notifications and immutable writes. External subscribers that throw before the adapter sees a change can hide intermediate ABA history. Direct object mutation is unsupported.

## 6. SSR and runtime contract

SSR/hydration is explicitly excluded from initial framework support. React server rendering fails without a server-snapshot function, as tested. Vue/Angular evaluation on a server does not establish a capture-token or transaction hydration contract. A complete future design must define request-local ownership, serialized state transfer and identity reconstruction. The core can run in Node with isolated per-request/workflow state. See [runtime boundaries](docs/RUNTIMES.md).

Tests ran on one Node/macOS architecture and one browser engine. Safari, Firefox, edge runtimes, other operating systems and long-running server deployments remain outside the executed matrix.

## 7. Package and release verification

All five exports passed fresh temporary npm consumer installations using the packed tarball and only their own optional frontend peers. Core installs/runs/typechecks with no framework. Both **NodeNext and Bundler** strict declaration checks passed. Runtime smoke tests and static JS/declaration import-graph checks passed; no circular imports or unexpected external framework imports were found. Package runtime dependencies remain empty; Angular/compiler/browser/Vue compiler tools are development-only or temporary consumer dependencies.

The package is ESM-only and includes JS, declarations, source maps and their referenced source. MIT LICENSE and metadata are present. A prepack build prevents packaging stale dist output. No automatic publishing configuration was introduced. Version remains 0.1.0: use an explicit beta channel/version for the first public candidate and pin consumers; this report does not establish stable 1.0 compatibility. The exact registry naming/ownership, release provenance and CI publishing credentials were not configured or verified.

## 8. Documentation status

README now covers local tarball installation before publication, optional peer installation, quick start and release status. Existing core/React/Zustand/Vue/Angular guides were retained and updated for corrected Angular sharing and malformed-result behavior. Added adapter-development, threat-model and runtime/SSR guides. Historical verification reports remain historical; this report is the current assessment. Examples use implemented APIs and the standalone Vanilla command was rerun successfully in this audit, and the full suite also executes its lifecycle runner.

## 9. Fixed issues and tests

- Malformed adapter output validation, including a maximum-size legitimate state boundary regression.
- Angular component subscription sharing using real component injection behavior, with retained injector cleanup assertions.
- MIT license and prepack build.
- Reproducible benchmarks, real framework CLI/SFC/browser consumers, fresh package-install mode and Bundler declaration checks.
- Added component, concurrent-render, SSR rejection, supported middleware, reentrant host and security tests.

Final executed totals: **115 tests in 18 files**; **102 unit/security tests** and **13 integration/compatibility tests**. The full build, strict typecheck, React demo build, standalone Vanilla command, all five packed entry-point checks (NodeNext and Bundler), and git diff whitespace check passed. React 19 separately passed eight hook/demo/concurrent/SSR tests before restoring React 18.3.1. Six isolated production-build/browser consumers passed: React 18/19, Vue 3.2/3.5, Angular 17/21. The final npm audit reported zero known vulnerabilities in the repository's development dependency installation. Temporary historical framework consumers were installed without audit and are not covered by that zero-advisory claim.

## 10. Release blockers and decision

**No known unresolved blocker for a scoped public beta under these documented contracts.** Before a production-release claim:

1. Define and implement/test a bounded history policy or formally constrain workflow lifetimes for long-lived apps; disposal alone is insufficient for unlimited sessions.
2. Address or enforce documented workload budgets for combined large states and many operations; current limits permit frame-blocking work.
3. Establish CI across the supported framework/runtime/browser matrix, with release provenance and peer-version upgrade checks.
4. Stabilize pre-1.0 API decisions, including indeterminate adapter outcomes, deep-readonly typing and request/SSR boundaries if SSR becomes a supported feature.
5. Run sustained application soak tests and independent security review appropriate to the deployment threat model.

SSR, distributed transactions, arbitrary middleware and automatic conflict resolution remain excluded capabilities, not partially implemented promises. Public beta feedback should inform the bounded-history/API work before 1.0.
