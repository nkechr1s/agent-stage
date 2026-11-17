# Final release gate audit

Audit date: **2026-11-17**. Decision: **NOT READY**.

Follow-up: [security remediation](SECURITY-REMEDIATION.md) subsequently removed 21 of the 35 historical High/Critical findings, including both Critical advisories. Its current counts and dependency changes supersede the fixture inventory below. This document retains the original audit evidence and external release blockers.

Subject: `71ec1b51af4426f322d73a1ae6a6e519f0d7470a` on `master`. The remote HEAD matched this commit. Production source, tests, workflow definitions, lockfiles, peer ranges and version were unchanged during this audit. The audit adds documentation only. Hosted evidence below applies to that commit; the new audit documents have not been committed or run on GitHub.

## Executive assessment

The rerun found no new reproducible beta-blocking defect in the transactional runtime. Both declared Node matrix points passed the full 155-test suite, builds, strict checks, type tests and package imports. All nine framework application fixtures passed declaration checks, production compilation, browser approval/commit behavior and unmount subscription cleanup. Package isolation and deterministic local artifact checks passed.

Public distribution is still blocked by external release gates. The registry name is already registered and this environment cannot demonstrate publishing authority. After the owner made the repository public, GitHub confirmed that `master` is unprotected and there are no rulesets. Required passing checks are therefore not enforced. No repository setting, registry credential or publishing configuration was changed.

Historical compatibility fixtures also retain substantial upstream advisories. Their constrained execution paths and read-only privileges reduce exposure, but do not make vulnerable dependencies safe. The full per-advisory assessment is in [the advisory appendix](FINAL-RELEASE-ADVISORIES.md).

## Actual regression verification

Local platform: macOS arm64; Node **22.22.1** and **24.22.3**. The declared range remains `>=22.22.1 <23 || >=24.22.3 <25`. Only these pinned points were executed; other patches in those majors are compatibility intent, not separately measured evidence.

| Check | Executed result |
| --- | --- |
| `HUSKY=0 npm ci` | Passed; committed root lockfile used |
| `npm run validate:release` | Passed, including lint, build, strict typecheck, both type-test resolutions, all tests, real isolated installs, integrity, demo and Vanilla example |
| `npm test` | **155 passed**, 21 test files; includes unit, integration, security and framework component tests |
| `npm run test:security` | **9 passed**, rerun separately |
| Node 24 build, typecheck, `test:types`, `npm test`, `check:package` | Passed; **155 tests** on this second Node version |
| `npm run test:types` | NodeNext and Bundler checks passed, including recursive readonly negative assertions |
| `npm run check:package:install` | Five actual temporary consumer installations/imports passed, each with only its relevant optional peers |
| `npm run check:package` | Five runtime/declaration imports and dependency/circular-import graph checks passed on both Node points |
| Full `scripts/framework-builds.mjs` nine-fixture matrix | All production builds, NodeNext/Bundler declarations, browser interactions and cleanup checks passed |
| React dashboard production build | Passed |
| `npm run example:vanilla` | Passed: independent transactions, selective approval, conflict and cleanup lifecycle |
| `npm run check:hooks` | Passed: real generated Husky shim, actual lint failure/success propagation, non-Git/CI installation skips; no commit created |
| `npm run lint` | Passed over maintained source, tests, examples and tooling |
| `actionlint` 1.7.7 | Passed all workflow definitions; separate from hosted execution evidence |
| `npm run check:integrity` | Passed clean-output removal, repeat build/pack byte identity, export/declaration/file allowlist, metadata, MIT license and dependency checks |
| Exact prerelease expression from release workflow | Exited **1** on current `0.1.0`, as required; no distribution candidate created by that gate |
| Fresh root `npm audit --json` | **0 vulnerabilities** |
| `npm run benchmark`, `npm run benchmark:hardening`, `npm run soak` | Completed, with raw JSON and correctness assertions |

Network installation and browser checks required execution outside the restricted network sandbox. The initial sandbox DNS failure was not counted as a passing check; the complete release-validation command was rerun successfully with network access. Raw logs/results are retained locally under `artifacts/final-audit/` and the refreshed fixture audit under `artifacts/compatibility-audit.json`; these ignored artifacts are excluded from the package.

## Framework compatibility evidence

Each row used its committed exact manifest and lockfile in a temporary consumer of the packed package. React uses a real Zustand vanilla store with an action function; Vue compiles an actual SFC; Angular uses CLI production/AOT compilation with strict templates. Browser checks inspect committed host state and require zero active subscriptions after unmount. React also mounts under Strict Mode; the existing suite exercises concurrent rendering, remount and host edits while proposals are pending.

| Fixture | Framework | Additional version boundary | Result |
| --- | --- | --- | --- |
| react18 | React/DOM 18.3.1 | Zustand 5.1.0; TS 5.9.3 | Passed |
| react19 | React/DOM 19.3.1 | Zustand 5.1.0; TS 5.9.3 | Passed |
| vue32 | Vue 3.2.47 | TS 5.9.3; client-only SFC | Passed |
| vue | Vue 3.5.45 | TS 5.9.3; client-only SFC | Passed |
| angular17 | Angular 17.3.12 | CLI/build 17.3.17; TS 5.4.5 | Passed |
| angular18 | Angular 18.2.14 | CLI/build 18.2.21; TS 5.5.4 | Passed |
| angular19 | Angular 19.2.25 | CLI/build 19.2.27; TS 5.8.3 | Passed |
| angular20 | Angular 20.3.35 | CLI/build 20.3.43; TS 5.9.3 | Passed |
| angular21 | Angular 21.2.26 | CLI/build 21.2.30; TS 5.9.3 | Passed |

These exact compiler/browser points do not certify every intermediate framework patch, all browsers/operating systems, or upstream support for obsolete toolchains. Angular 17–19 and Vue 3.2 compatibility is not a recommendation to deploy vulnerable versions. SSR/hydration remains explicitly unsupported for framework bindings. React intentionally has no server snapshot hook; captures are identity-bound and cannot be reconstructed by serialization. Zustand requires immutable selected-slice updates and synchronous publication; middleware that defers/suppresses writes or breaks notifications is outside the adapter contract. See [runtime boundaries](RUNTIMES.md) and [adapter development](ADAPTERS.md).

## Hosted CI and repository configuration

Authenticated read-only GitHub API inspection confirmed these completed runs at the exact subject SHA:

- [CI run 43976459346](https://github.com/nkechr1s/agent-stage/actions/runs/43976459346): **success**. Node 22.22.1, Node 24.22.3 and representative framework application jobs all succeeded. Individual build, type, test, package and lint steps were inspected.
- [Dependency security run 43976459537](https://github.com/nkechr1s/agent-stage/actions/runs/43976459537): **success**. Root audit succeeded and compatibility advisory artifact was uploaded. Dependency review was skipped on this push, as configured.
- Two GitHub Actions Dependabot runs succeeded. npm Dependabot runs [43976465949](https://github.com/nkechr1s/agent-stage/actions/runs/43976465949) and [43976465907](https://github.com/nkechr1s/agent-stage/actions/runs/43976465907) **failed**. Both logs show npm `ETARGET`: `@typescript-eslint/eslint-plugin@8.73.0` was unavailable under the updater's "date before 11/13/2026" filter, followed by a peer-dependency resolution failure while updating TypeScript. This does not contradict the successful ordinary locked install. Rerun when the dependency is eligible and inspect the result; a future success has not been assumed.

The repository was private during those hosted runs. After the owner's visibility change, a fresh authenticated API check returned `private: false`, `404 Branch not protected` for `master`, and `200 []` for repository rulesets. This replaces the earlier private-plan `403` responses: enforcement is now confirmed absent, not merely inaccessible. The audit did not change settings. Required checks should include the two Node jobs, representative framework applications and security audit; confirm exact check names through a real public pull request before enforcing them.

Workflow review:

- CI and security run on pull requests and pushes to `main`, `master`, `develop`. Compatibility, benchmarks/soak and security have scheduled/manual triggers. Release validation is manual only.
- All checked-in action references are pinned to full commit SHAs. Jobs have `contents: read`, no write or OIDC permission, no configured secrets, and checkout credentials are not persisted. There is no publish, tag or release step and no `pull_request_target` trigger.
- Node 22.22.1/24.22.3, npm 11.13.0, Ubuntu 24.04 and committed npm lockfiles make the selected matrix reproducible. The nine-framework matrix covers both React majors, Vue minimum/current points, and every declared Angular major; it does not claim exhaustive patches.
- Dependency review is intentionally public-PR-only. It has **not yet executed on a public PR** after the visibility change. The fixture advisory script reports historical vulnerabilities without forcing incompatible upgrades; root audit remains a failing gate for High/Critical findings.
- Hosted representative/advisory artifacts exist and were not expired. Their API expiry dates show the current repository default of approximately **90 days**. Workflow files leave retention to that default rather than pinning a retention period.
- No successful hosted full scheduled compatibility, heavy benchmark/soak or manual release-validation run at this SHA was present in the inspected run list. Local equivalents passed; those hosted variants remain unverified. No workflow was dispatched by the audit.

## Security assessment

No new prototype-pollution, partial-commit, duplicate-commit or proposal-code-execution defect was reproduced. JSON validation, pointer/path restrictions, all six supported patch operations, conservative dependency grouping, workload rejection and immutable boundaries were reviewed against their tests. Root dependencies have zero audit findings, and the distributed library has zero runtime dependencies.

The historical fixtures have **35 unique High/Critical upstream advisories**, including Critical Piscina prototype-pollution RCE gadgets and Critical node-tar decompression DoS. The [appendix](FINAL-RELEASE-ADVISORIES.md) lists every advisory, package, severity, direct/transitive dependency path, executing boundary, permissions and mitigation. Package-count audit totals include inherited dependency effects and are not unique advisory counts.

Piscina's worker path executes in Angular builds; its exploit needs prior prototype pollution that was not identified in this fixture. The affected fixture tar library is installed but is not the archive extractor used by this workflow. Other routes require absent SSR, formatting input, CSS source maps, old development servers, archive APIs, or unsafe template/output configuration. Conditional worker compromise, availability and artifact contamination remain genuine CI risks. No secrets or repository write permissions are configured in these jobs, but that is containment rather than elimination. No exploit payload or formal dynamic reachability proof was performed. The constrained historical-fixture exposure is assessed Medium here; compatible patch candidates and continued isolation need tracked owner acceptance, especially before stable production release.

The security model still trusts adapters, subscription callbacks, selectors and host code. It does not sandbox hostile JavaScript, getters/Proxies outside validated JSON, an already-polluted realm, or broken middleware. Host applications must authorize paths/values, validate domain rules, bound transport/session ownership and reconcile uncertain commits independently. See [security contract](SECURITY.md).

## Architecture and public API assessment

- The host adapter remains the committed-state authority. Proposal, decision and preview paths do not publish; publication goes through revision-checked adapter commit. Memory and Zustand adapters build candidates before atomic publication. External/custom adapter atomicity is a trusted contract, not something the engine can prove.
- Independent transactions retain private captured bases. Fabricated captures fail; core read views are detached with recursively readonly declarations. Framework views are additionally deeply frozen. Operation ordering and related array/path operations remain grouped for approval.
- Pending decisions return structured `UNRESOLVED_CHANGES`. Accepted groups alone are sent to the adapter after every group is resolved. Rejected groups are not applied.
- Concurrent/reentrant commit attempts are blocked by the `committing` state. Exceptions or malformed adapter outcomes terminate as `indeterminate`, release open capacity, retain detached diagnostics under normal closed-history policy and prevent retry/rollback. Structured adapter `failed`/`conflict` results promise no publication and return the transaction to open. There is no automatic retry, recovery or exactly-once guarantee.
- Default history retains 50 closed records and 100 open/committing records; closed records include committed, rolled-back and indeterminate outcomes. Pruning is in closure order and produces existing `NOT_FOUND` behavior. A rejected decision alone does not close a transaction. No open or in-flight transaction is pruned.
- Default admission limits remain 200 operations and 250,000 estimated work units, below fixed JSON safety ceilings. The 20,000-element/1,000-operation combination is rejected. Caller-held views/captures and per-session request rates remain application responsibilities; count/work budgets are not a heap quota or latency guarantee.
- Vue scope cleanup and Angular DestroyRef cleanup share subscriptions appropriately. React external-store version identities are stable between notifications. All executed component/browser cleanup checks passed.

The patch dialect deliberately excludes root removal and unknown operation members; this is documented rather than presented as unrestricted RFC 6902 support. No architecture/API regression requiring a production code change was demonstrated. No tests were weakened, removed or added merely to increase the count.

## Reproducible performance and memory observations

Fresh single-process measurements on macOS arm64, Node 22.22.1; milliseconds. These are descriptive samples, not portable latency guarantees or CI thresholds. Raw JSON includes all samples/counts and separate commit-only timing.

| Runtime benchmark | Median | p95 |
| --- | ---: | ---: |
| Small capture/propose | 0.021 | 0.145 |
| Small preview | 0.0065 | 0.0088 |
| Small commit only | 0.0077 | 0.0087 |
| Nested capture/propose | 10.653 | 12.419 |
| Nested preview | 3.888 | 8.459 |
| Nested commit only | 7.541 | 10.851 |
| Large-array capture/propose | 7.739 | 14.190 |
| Large-array preview | 5.304 | 6.925 |
| Large-array commit only | 7.820 | 8.776 |
| 1,000 independent small transactions, raised capacity | 3.272 | 4.580 |
| 1,000 proposed operations, default rejection | 0.0025 | 0.0033 |
| Notification to 1,000 subscribers | 0.0141 | 0.0583 |

The hardening benchmark rejected the combined 20,000-element/1,000-operation workload in all five iterations: median **0.0021 ms**, p95 **0.0031 ms**. Raising only the operation limit still hit the work guard (median **0.560 ms**, p95 **0.766 ms**). The runtime benchmark independently rejected the combination in its single sample. No performance optimization or threshold was introduced during this audit.

Memory observations with explicit GC:

- Runtime history exercise, 3,000 transactions with 10,000-byte payload: heap before **5,433,992 B**, retained **6,048,344 B**, after disposal **5,519,904 B**.
- Independent hardening history measurement: **4,978,888 B** before, **5,575,912 B** retained, **5,047,776 B** after disposal.
- Soak: **100 stages × 1,000 commits**, **2.094 s** elapsed, with pruning, admission, unsubscribe and disposal assertions. Post-cycle heap was **4,527,168 B** initially and **4,873,400 B** at cycle 99; later samples levelled near 4.87 MB. Each cycle recorded the expected 5,000 notifications before unsubscribing.

These short finite runs support bounded behavior for the measured profile; they do not establish the absence of all leaks or replace multi-day application soak tests. Application-held captures/views and costly trusted callbacks can still retain memory or block the thread. Large admitted trees remain synchronous.

## Package integrity and distribution gate

Verified metadata: `agent-stage@0.1.0`, MIT license present, ESM-only, five type-first export mappings, recursive readonly declarations, optional React/Vue/Angular/Zustand peers, no runtime dependencies. Packed imports do not load unrelated frameworks. Core-only consumers do not install Husky or frameworks. Import/declaration graph checks found no cycles in the public entry graphs.

The integrity script clears stale output and compares two independently rebuilt tarballs byte-for-byte. It checks export/declaration targets, lock metadata, file allowlists and license. The package contains source/declarations/runtime code and documentation, including this audit. Hooks, workflows, fixture lockfiles, tests, node_modules, scripts, credentials and raw local audit artifacts are excluded. The final integrity JSON records the exact working-tree candidate digest under `artifacts/final-audit/`; it is a checksum, not signed provenance.

The exact manual workflow version guard rejected **0.1.0**. `validate:release` intentionally validates content without approving distribution; only the manual workflow adds the explicit beta-version guard. The version was not changed, and there is no publishing job or configured credential. Actual OIDC provenance and registry acceptance remain unverified because no publish was attempted.

Read-only `npm view agent-stage name version maintainers dist-tags --json` found an existing package at **0.2.20**, maintained by `gyuannn1100`, with `latest: 0.2.20`. `npm whoami --json` returned **E401** in this environment. This does not establish whether the owner also controls that npm account; it means publishing authority for this already-registered name has **not been demonstrated**. Confirm authorized ownership or choose an approved alternate/scoped name before selecting the prerelease/version migration. Do not assume the previously suggested `0.1.0-beta.0` is the correct version for an unrelated existing registry package.

## Prioritized remaining findings and owner actions

| Severity | Finding | Type and required action |
| --- | --- | --- |
| Critical | No confirmed Critical library or privileged-CI exploit reproduced | This is a bounded audit conclusion, not a security proof; upstream Critical advisories remain in the appendix |
| High | Registry namespace/publishing authority unresolved | External owner action: demonstrate authorized control of the existing package, or approve a new name and compatible version plan. Do not create credentials as part of this audit |
| High | `master` is unprotected; no rulesets/required checks | Confirmed repository configuration gap. Owner must enable required checks/review protection and verify enforcement using a public PR; audit is not authorized to modify settings |
| Medium | Historical fixture worker/toolchain advisories remain | Track compatible transitive patches and owner risk acceptance; preserve compiler-version tests and isolated read-only execution. Address before stable release; reassess immediately if inputs/privileges expand |
| Medium | Two npm Dependabot update jobs failed | Rerun after dependency-age eligibility and verify successful resolution; do not claim automatic dependency maintenance is fully healthy |
| Medium | Public PR dependency review and full scheduled/manual workflows lack hosted execution evidence at this SHA | Local equivalents passed, and essential push CI/security passed. Owner should run/review these workflows on the approved candidate and verify exact required-check names |
| Low | SSR/hydration, arbitrary middleware, exhaustive browser/version coverage and universal latency are unsupported | Keep current boundaries explicit; no partial SSR/recovery implementation is added |
| Low | Artifact retention inherits repository default | Approximately 90 days verified for current hosted artifacts; pin an explicit period if long-term audit retention is required |

Before distribution, the owner must also select an approved beta candidate/version/channel, obtain explicit release approval, validate that exact candidate and review trusted publishing/provenance configuration in a separately authorized change. No version, tag, release, registry token or repository setting was created here.

## Changes made and final decision

Added this audit and the 35-advisory appendix; updated the README and release procedure to point to the current gate evidence and registry-name issue. No confirmed runtime defect required a fix, so transactional code and the 155-test baseline were preserved. Lint/type/build/test/package checks were rerun during the audit, with package integrity rerun after the final documentation edits.

**NOT READY.** Actual regression and artifact verification are strong, and essential hosted CI passed. They cannot establish registry authority or compensate for unenforced repository gates. Resolve the High external blockers, review the residual fixture security position and validate the owner-approved candidate before reconsidering public beta. Nothing was committed, pushed, tagged or published by this audit.
