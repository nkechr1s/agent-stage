# CI, release engineering and developer tooling verification

Historical evidence: the owner-approved [support policy](SUPPORT-POLICY.md) now supersedes earlier support ranges and executable matrices. Angular 17–19 and Vue 3.2 are unsupported; their lockfiles and runnable fixtures have been retired. The advisory history below is preserved, not relabeled as fixed.

Historical tooling-phase snapshot: later [release-gate verification](FINAL-RELEASE-AUDIT.md) and [security remediation](SECURITY-REMEDIATION.md) supersede the hosted-verification status, fixture counts and report-only audit behavior recorded below.

Date: 2026-11-17. No readiness verdict is assigned by this tooling phase. The library remains unreleased 0.1.0; a final audit and explicit release approval are still required.

## Repository audit and implementation

Existing build/typecheck, unit/security/integration/type tests, package-isolation consumers, React demo, Vanilla runner and framework-build generator were reused. There was no GitHub configuration or Husky setup at the start of this phase. Existing user work was preserved. No transactional behavior or public framework API was changed; lint-related source edits only combine a type export and make reactive dependency reads explicit.

Added workflows:

- CI: pull requests, pushes to main/master/develop and manual dispatch. Node 22.22.1 and 24.22.3 matrix; representative browser/compiler consumers.
- Scheduled compatibility: weekly/manual locked React 18/19, Vue 3.2/3.5 and Angular 17–21 consumer jobs.
- Dependency security: root audit gate, public-PR dependency review and scheduled fixture advisory reports.
- Benchmarks and soak: weekly/manual raw JSON artifacts, correctness assertions, no arbitrary timing or heap thresholds.
- Release validation: manual, validates only; current 0.1.0 is explicitly refused as a distribution candidate because it is not -beta.N.

All workflows use read-scoped permissions, pinned action revisions and no saved checkout credentials or publishing secrets. Dependabot proposes root npm and GitHub Actions updates; compatibility fixture maintenance remains deliberate and locked. No publishing job, tag trigger, id-token grant or npm credential was added.

## Actual local verification

- npm ci completed under Node 22.22.1 and Node 24.22.3 with the current root lockfile. npm 11.13.0 was used and is pinned in CI. CI-safe Husky prepare behavior was exercised.
- Both Node versions passed library builds, strict typecheck, the complete unit/security/core suite (141 tests), NodeNext/Bundler type tests and five package import/declaration checks.
- The complete runtime suite passed on both tested Node versions: **155 tests across 21 files**. Integration/compatibility subset: **14 passed**.
- ESLint **10.15.0**, typescript-eslint **8.73.0**, React Hooks plugin **7.1.1**: lint and lint:fix passed over actual source, TSX examples, tests, scripts and benchmarks. No formatter, broad rule-disabling comments or runtime dependency was added.
- Husky **9.1.7** was installed locally, with core.hooksPath=.husky/_. A disposable Git checkout ran the actual generated hook, verified nonzero/zero exit propagation, rejected a real ESLint failure, accepted corrected input, and checked CI/no-Git skips. No commit was created.
- All five packed exports passed isolated npm installation without ignore-scripts, runtime import/lifecycle checks, NodeNext/Bundler declarations and readonly negative tests. Consumers do not install Husky or unrelated optional frontend peers.
- The build removes only generated dist before compilation; check:integrity confirmed stale generated output is removed and produced byte-identical tarballs from two builds, validated five export/declaration targets and root lock metadata, and enforced a file allowlist. Hooks, .github config, scripts, compatibility locks, tests, credentials and node_modules are excluded; MIT and CONTRIBUTING are included.
- validate:release completed all non-publishing checks, including the demo production build and executable Vanilla lifecycle. The separate explicit-prerelease gate correctly refused current 0.1.0; no version was modified.
- actionlint **1.7.7** passed workflow semantic checks; Ruby YAML parsing also passed. Hosted GitHub runs were not dispatched or claimed.

The sandbox initially blocked registry/DNS and hook Git configuration operations. Authorized reruns completed. An earlier typecheck overlapped npm ci's node_modules replacement and failed transiently; it was rerun sequentially after installation and passed. The initial strict Angular 17 consumer check found incompatible transitive Node type definitions; Angular 17/18 fixtures now pin @types/node 20.11.30 compatible with their older compilers, without skipLibCheck in the declaration checks.

## Locked framework consumer matrix

Each row passed actual npm ci, NodeNext/Bundler declarations, an optimized Vite/SFC or Angular CLI/AOT production build, headless Chrome approval/commit, and an active-subscription count of zero after teardown. React consumers use real Zustand 5 stores and verify action preservation. These are smoke checks, not every application or patch version.

| Consumer | Core version | Compiler/tooling |
| --- | --- | --- |
| react18 | 18.3.1 | TypeScript 5.9.3; Vite 7.3.8 |
| react19 | 19.3.1 | TypeScript 5.9.3; Vite 7.3.8 |
| vue32 | 3.2.47 | TypeScript 5.9.3; Vite 7.3.8 |
| vue | 3.5.45 | TypeScript 5.9.3; Vite 7.3.8 |
| angular17 | 17.3.12 | TypeScript 5.4.5; Angular CLI 17.3.17 |
| angular18 | 18.2.14 | TypeScript 5.5.4; Angular CLI 18.2.21 |
| angular19 | 19.2.25 | TypeScript 5.8.3; Angular CLI 19.2.27 |
| angular20 | 20.3.35 | TypeScript 5.9.3; Angular CLI 20.3.43 |
| angular21 | 21.2.26 | TypeScript 5.9.3; Angular CLI 21.2.30 |

## Audit results

Root npm audit reported **zero known vulnerabilities** for the final development dependency installation. That does not describe historical compatibility fixture tools. Scheduled audits retain their complete JSON reports; no automatic upgrades or audit fixes were performed.

| Compatibility fixture | Low | Moderate | High | Critical |
| --- | ---: | ---: | ---: | ---: |
| angular17 | 4 | 30 | 16 | 2 |
| angular18 | 7 | 28 | 18 | 2 |
| angular19 | 2 | 23 | 13 | 2 |
| angular20 | 0 | 21 | 0 | 0 |
| angular21 | 0 | 21 | 0 | 0 |
| react18 | 0 | 0 | 0 | 0 |
| react19 | 0 | 0 | 0 | 0 |
| vue | 0 | 0 | 0 | 0 |
| vue32 | 0 | 0 | 2 | 0 |

Older Angular/CLI and Vue minimum versions remain compatibility evidence, not deployment recommendations. Root high/critical findings fail CI; fixture findings are surfaced for review because upgrading every minimum-version fixture would erase the requested compatibility boundary. Framework upgrades still require tests and review.

## Benchmarks and soak

Both existing benchmark commands completed and their raw results were saved separately from tracked historical baselines. A full soak ran **100 cycles × 1,000 transactions = 100,000 commits**, exercising bounded history, workload rejection, notification teardown and repeated disposal. Post-GC first/last sampled heap was approximately **4.53 / 4.86 MB** in this run; this is descriptive, not a proof or a threshold. The default scheduled job repeats the same correctness workload and uploads all raw JSON. No noisy benchmark gate is added to PR CI.

## Remaining external work

The owner still needs to push these definitions, observe actual Ubuntu GitHub-hosted runs, enable dependency graph/branch protection and select required status checks. Private dependency review needs appropriate GitHub security entitlement; it is intentionally skipped otherwise. Registry name/ownership, an approved prerelease version, a separate final audit and release approval, and future Trusted Publisher/environment setup remain unresolved external steps. OIDC/provenance setup is documented, not configured. No npm tokens, publication, commit, push, tag or GitHub release was created.
