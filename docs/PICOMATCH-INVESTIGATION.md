# Picomatch investigation and independent security reporting

Date: 2026-11-17. **Blocker unresolved. No dependency fix or complete mitigation was identified.** Both root and all supported fixture High/Critical gates remain failing. Functional success is not security acceptance.

## Verified upstream status

The [official GHSA-fc5q-39xc-vjpf / CVE-2026-112366 advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) still covers picomatch `<=4.0.7` and lists no patched release. Fresh registry metadata lists `latest: 4.0.7`. GitHub releases also identify 4.0.7 (2026-08-24) as the latest published release. Earlier versions are covered too.

[PR #194](https://github.com/micromatch/picomatch/pull/194) is **open, not merged**, with `merged_at: null`. Its inspected head is `7be3276fb8bd215a8c73fa066bcaf696c244ad88`. A non-null merge_commit_sha in GitHub's response is not evidence of a merge. The diff concerns leading-`?` extglob parsing and detection of branches mixing `?` and `*`. It includes behavior changes and tests, but does not establish coverage of every advisory pattern. In particular, its added mixed-wildcard check is not a demonstrated repair of all single-star branches such as `+(*)` and `+(*a)`. It is neither a published fix nor an approved security backport. No PR code was installed or executed.

Fresh latest-parent metadata also gives no complete migration route: Vite 8.3.8 depends on picomatch `^4.0.7` and tinyglobby; Vitest 5.1.0 depends on picomatch `^4.0.7`; typescript-eslint 8.73.0 reaches it through typescript-estree/tinyglobby; tinyglobby 0.2.17 requires picomatch `^4.0.4`, and fdir 6.5.0 declares a `^3 || ^4` peer. Even Angular build 22.2.7 still declares picomatch 4.0.7, besides being outside our approved Angular range. No unsupported parent upgrade was made.

## Every installed path and version

The [complete path inventory](PICOMATCH-PATHS.md) contains every acyclic dependency path resolved from the actual committed locks, including dependency, optional and peer edges. There are 122 paths: root 29, Angular 20 38, Angular 21 39, React 18 four, React 19 four, Vue eight. Repeated paths can converge on the same installed package; path counts are not vulnerability counts.

| Tree | Installed picomatch packages |
| --- | --- |
| Root | `node_modules/picomatch@4.0.7` |
| React 18, React 19, Vue 3.5 | `node_modules/picomatch@4.0.7` in each consumer |
| Angular 20 and 21 | root picomatch 4.0.4; nested picomatch 2.3.2 under anymatch, micromatch, and webpack-dev-server |

Installed versions were checked against actual consumer directories and lockfiles. Final newly installed supported consumers additionally enforce the existing no-version-drift assertion. The local evidence includes `dependency-paths.json`, `installed-callers.json`, registry/advisory/PR/release metadata and bounded parser probes under `artifacts/picomatch/`. Complete audit data includes inherited dependency effects.

These are agent-stage development/build/test dependency trees. The distributed library still has zero runtime dependencies; none of its five entry-point import graphs imports picomatch. Applications may independently carry this tooling, so that observation is not a claim that their whole installation is unaffected.

## Actual callers and input boundaries

| Caller / route | Actual input and parser reachability | Current CI exposure |
| --- | --- | --- |
| Vite direct and bundled filter helpers | Plugin include/exclude, module filters and import-glob patterns; calls picomatch with defaults / dot options | Production builds execute Vite. Committed configuration/source owns these patterns; arbitrary third-party plugin or source patterns are not sanitized by agent-stage |
| tinyglobby | Glob and ignore arrays, directory traversal filters; calls picomatch and scan helpers | Runs for file discovery in Vite/Vitest and Angular. These callers permit general patterns; there is no universal noextglob guard |
| fdir | Optional/peer picomatch used by its glob facilities; tinyglobby can instead supply traversal filters | Module loading does not prove every fdir glob method executes. Public glob APIs allow caller patterns; peer edges are included in the inventory |
| Vitest | Test discovery and coverage include/exclude patterns; direct pm calls and tinyglobby | Root tests execute discovery. The inspected coverage matcher compiles configured include/exclude with dot/ignore options, not a general repeated-extglob rejection. Coverage-specific routes need coverage enabled; not every installed route executes in the default suite |
| typescript-estree | parserOptions.project and projectFolderIgnoreList through tinyglobby.globSync | Installed through ESLint tooling. Current flat config does not enable parserOptions.project, so this project-resolution route is not exercised by ordinary lint. It is reachable with a different caller configuration |
| Angular virtual-fs PatternMatchingHost | `.parse(glob)` followed by `new RegExp` | Framework tooling can use pattern replacement configuration. No pre-parser repeated-extglob validation is present in the inspected implementation |
| Angular build proxy normalization | Proxy keys through makeRe | No proxy/dev server is started in our production-build fixtures. If used elsewhere, proxy configuration owns patterns |
| @parcel/watcher | Ignore glob strings through makeRe, dot matching | Watch configuration can enable this route. Current one-shot production builds do not certify arbitrary watch configurations |
| anymatch / micromatch | Caller-supplied matchers, exclusions, glob API and parser helpers | Chokidar/readdirp, fast-glob and webpack-related paths lead here. General APIs can reach vulnerable parsing; current fixtures use fixed repository inputs |
| webpack-dev-server's readdirp | String filters compiled with picomatch | Installed in Angular toolchains but no webpack development server runs in the supported fixture workflow |

Direct caller source locations and lines were captured from installed modules, including Vite config.js, tinyglobby dist, fdir dist, Vitest cli-api chunks, typescript-estree resolveProjectList.js, Angular virtual-fs/host/pattern.js, Angular build load-proxy-config.js, @parcel/watcher/wrapper.js, anymatch/index.js, micromatch/index.js and readdirp/index.js. The caller scan records import sites; reachability conclusions also use the call implementations. Import sites alone are not runtime traces. No exhaustive dynamic trace was performed.

Current CI takes glob configuration from trusted repository files, CLI invocations and generated fixed fixture templates. AI-proposed application data reaches JSON Patch, not glob matching. No application-facing untrusted pattern input was found in agent-stage source. A malicious PR can change executable build code/configuration already; jobs retain read-scoped privileges and no publishing secrets. That limits privilege escalation but does not eliminate runner availability risk or justify a clean audit. Consumers who accept user-selected glob patterns have a different and potentially exploitable boundary.

## Parser and targeted mitigation assessment

Installed 4.0.7's analyzeRepeatedExtglob checks some risky wildcard branches only when there is more than one branch. Source inspection and bounded child-process probes showed that all installed versions (2.3.2, 4.0.4 and 4.0.7) compile `+(*)` to a nested repetition and `+(*a)` to a repeated group containing an unbounded wildcard. Probe output includes the generated expressions. Ordinary `src/**/*.ts` and `file.@(js|ts)` patterns still match the expected short examples.

Probes use only short subjects and a two-second child-process timeout; they do not run catastrophic long-input timing tests or claim quantitative exploit confirmation. They are investigation evidence, not a patched-parser regression suite.

A complete input mitigation would need to intercept every actual glob ingress in Vite, Vitest, tinyglobby, fdir, Angular's parse/makeRe callers, micromatch and watcher tooling, including nested and escaped syntax and version-2 copies. A validator at stage.propose would cover none of these ingress points. A Node require-hook would miss ESM/bundled paths and would not establish complete coverage. Limiting pattern length alone does not reject the short malicious patterns. A blacklist for the two named examples does not cover parser variants; disabling all extglobs changes valid glob semantics and still requires controlling each caller. A new regex validator could itself introduce backtracking.

No custom application validator, loader hook, noextglob override or partial mitigation was added. There is no external untrusted glob boundary owned by this library at which such a validator could honestly protect arbitrary third-party tooling. Existing fixed repository patterns are an exposure constraint, not remediation of the installed parser.

## Alternatives and exact dependency changes

1. Official release: none available; await a reviewed release whose advisory and installed-code evidence cover this issue, then update locks and repeat all gates.
2. Parent upgrades: inspected latest parents still retain affected picomatch. Major Angular upgrades would also violate the approved contract. No safe complete parent route was identified.
3. Scoped override: every published version is in the affected range; neither a downgrade nor a blanket override fixes it. No override added.
4. Maintained alternative: minimatch is maintained (fresh registry latest 11.0.9), but is not a drop-in picomatch alias. The installed 11.0.8 exposes an object rather than picomatch's callable factory and has no root scan/parse/makeRe methods. Callers depend on those APIs, parser outputs, options and matching semantics. micromatch itself depends on picomatch and is not an independent escape. Migrating third-party callers would require maintained parent changes or a fork; no compatible complete migration was demonstrated.
5. Fork or local patch: would need full source review, malicious/ordinary pattern regression coverage, provenance, license review, release ownership and an explicit maintenance/retirement plan. An open PR plus a private version label is insufficient. No fork was created or installed.

**Exact dependency changes: none.** Root/fixture manifests, locks, peers, Node engines and framework points are unchanged. Public API, transactional semantics and package name are unchanged.

## Security gate changes

The prompt's Critical-only mismatch was already corrected by Prompt 11: both High and Critical failed in the local script before this task. The confirmed defect was workflow short-circuiting after root audit failure, plus script termination after the first invalid fixture response.

The shared audit script now supports independent `--root` mode. The workflow runs root and fixture steps with `if: always()`, then uploads **both** complete JSON reports with `if: always()`. It uses no continue-on-error. Any failed audit step keeps the job failed even when subsequent audits succeed. Fixture collection continues after an individual transport/malformed response and writes diagnostics alongside successful remaining reports before exiting nonzero. Every active fixture is attempted. A 120-second per-audit timeout and output bound fail closed on excessive or hung responses. Root mode requires no fixture discovery.

All severity counts must be finite nonnegative integers; missing/invalid reports, npm process failures and error envelopes are fatal. The complete vulnerability list is retained, and High/Critical entries also block even if summary counts understate them. Moderate/Low findings remain visible. No advisory exception or suppression was added. Existing action SHAs, contents:read permissions, checkout credential controls and absence of publishing credentials are unchanged.

Existing High, Critical, Moderate/Low, malformed and transport regression tests are retained. Two additional tests verify later fixtures execute/report after an earlier malformed response, and root High findings fail with their own complete report independently of fixture discovery. This is local process verification plus workflow inspection/actionlint, not proof of a hosted GitHub run. New hosted workflow execution remains unverified because nothing was pushed or dispatched.

## Actual results on both supported Node lines

Node **22.22.1** and **24.22.3**, each sequentially:

| Command / check | Actual result on each Node line |
| --- | --- |
| Fresh npm ci | Exit 0 |
| Root audit via --root | Exit 1, correctly blocked |
| All five fixture audits | Exit 1, all five reported |
| npm run test:security | Exit 0, **16 tests in 2 files** |
| npm run validate:release | Exit 0, including **162 tests in 22 files** |
| Build, strict typecheck, NodeNext/Bundler type tests, ESLint | Passed within validation |
| Five isolated package installations and four unsupported-peer rejection checks | Passed |
| Five supported framework production builds, declarations, browser approval/commit and unmount cleanup | Passed |
| React demo production build and Vanilla lifecycle example | Passed |
| npm run check:hooks | Exit 0 |
| Reproducible package integrity | Passed, rerun after final documentation edits |

Actionlint and git diff whitespace checks also passed. Audit failures were recorded independently and did not stop functional verification. validate:release is content validation; it does not substitute for the failing security job.

| Tree | High affected packages | Critical | Moderate / Low |
| --- | ---: | ---: | ---: |
| Root | 11 | 0 | 0 / 0 |
| Angular 20 | 23 | 0 | 16 / 0 |
| Angular 21 | 22 | 0 | 16 / 0 |
| React 18 | 4 | 0 | 0 / 0 |
| React 19 | 4 | 0 | 0 / 0 |
| Vue 3.5 | 4 | 0 | 0 / 0 |

These inherited package counts represent one unique High advisory. Reports have not been filtered to hide development or optional dependency findings. The tarball remains ESM with five exports and no runtime dependencies; scripts, fixtures/locks and local audit data are excluded. Documentary investigation/history is included.

## Remaining decision

This phase completes the evidence-backed unresolved-blocker outcome permitted by the objective. Security acceptance remains **blocked**. The approved zero-High/zero-Critical policy must stay enforced while waiting for an official fix or a separately reviewed maintained replacement/fork. A fork would require explicit owner commitment to the maintenance/provenance plan; none is assumed. No change to supported frameworks or release approval is proposed here. Dependabot's existing cooldown/grouping and pending hosted verification remain unchanged.

Nothing was committed, pushed, published, renamed or tagged. No registry credentials, repository settings, beta-readiness or production-readiness assertion was introduced.
