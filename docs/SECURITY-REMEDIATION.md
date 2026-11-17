# Compatibility fixture security remediation

Historical evidence: the owner-approved [support policy](SUPPORT-POLICY.md) now supersedes earlier support ranges and executable matrices. Angular 17–19 and Vue 3.2 are unsupported; their lockfiles and runnable fixtures have been retired. The advisory history below is preserved, not relabeled as fixed.

Date: **2026-11-17**. Baseline: the [final audit](FINAL-RELEASE-AUDIT.md) and its [original 35-advisory inventory with dependency paths](FINAL-RELEASE-ADVISORIES.md). This report supersedes their fixture vulnerability counts, not their release decision or external owner actions.

## Outcome

**21 of the original 35 unique High/Critical advisories are fully remediated across the fixtures. Both Critical findings are removed.** One additional finding is partially remediated: Angular 19's Vite 6 is patched, while Angular 17/18's bundled Vite 5 remains affected. The other 13 findings have no compatible fix for their historical framework points. **14 unique High advisories remain; none is described as fixed by isolation.** Fresh audits introduced no new advisory identifiers at any severity.

Root `npm audit` still reports **zero vulnerabilities**. All nine actively executed fixtures report **zero Critical vulnerabilities**. The remaining High vulnerable routes were not identified in the current fixed-input CI execution path; their packages can still load or execute other code. This is a source/fixture assessment, not a formal reachability proof or an endorsement of deploying vulnerable frameworks.

The safely compatible dependency work and local regression verification are complete. Closing the whole remediation phase still requires an owner decision on historical support/risk and the eligible hosted Dependabot recheck. No public beta readiness is asserted.

## Dependency changes and compatibility evidence

Only the Angular 17, 18 and 19 fixture manifests/lockfiles changed. Their Angular core/common/compiler/compiler-cli/platform-browser, CLI/build, TypeScript and Zone versions are preserved exactly. Vue and React fixtures, public peer ranges, root dependencies/lockfile, transactional code and runtime dependency footprint are unchanged.

| Dependency | Applied version / route | Why the change is compatible with these fixtures |
| --- | --- | --- |
| Piscina 4.4/4.6/4.8 | `piscina@4` → **4.9.4** | Same major; real compiler workers and explicit inherited-filename/execArgv regression probes pass |
| PostCSS 8.4/8.5 | `postcss@8` → **8.5.33** | Same major; old builders still compile successfully |
| picomatch 4.0.1/4.0.2 | `picomatch@4` → **4.0.7** | Same major; other picomatch majors are not forced to 4 |
| pacote 17/18/20 | Scoped under `@angular/cli` → **21.5.3** | Deliberate tested major bridge, not a blanket upgrade: the old CLI's actual `fetchPackageManifest` and `fetchPackageMetadata` callers still work against a synthetic localhost registry |
| tar 6.2.1 | Via pacote 21 → **7.5.23** | No patched tar 6 exists. New pacote upstream already declares tar 7, avoiding an isolated incompatible tar override under old pacote. CommonJS create/extract and pacote local archive/manifest paths pass |
| sigstore 2.3.1/3.1.0 | Via pacote 21 → **4.1.1** | New pacote upstream declares sigstore 4; no independent sigstore-major override. Its verification API is not part of these fixture builds |
| serialize-javascript 6.0.2 | Scoped under copy-webpack-plugin → **7.1.4** | Deliberate tested major bridge; CommonJS serialization and real copy-webpack-plugin 11/12 transform-cache serialization/asset output pass |
| tmp 0.0.33 | Scoped under external-editor → **0.2.7** (17/18) | Outside the original 0.0 range, explicitly tested: old ExternalEditor creates/reads/removes its temporary file, and path-bearing prefixes are rejected. No editor is launched |
| Rollup 4.22.4 | `rollup@4` → **4.68.4** (18) | Same major; strict declarations and production build pass |
| webpack-dev-middleware 5/6/7 | **7.4.6** | Same-major patch for 18/19. Deliberate major bridge for 17: both versions support webpack 5; old webpack-dev-server 4 actually builds/serves an asset with patched middleware and shuts down successfully |
| http-proxy-middleware 3.0.5 | `http-proxy-middleware@3` → **3.0.11** (18/19) | Same major; older major-2 dependencies are not forced to 3 |
| Vite 6.4.2 | `vite@6` → **6.4.6** (19) | Same major; Vite 5 is deliberately not forced across its plugin peer constraints |

All selected versions were checked against refreshed **official GitHub Advisory metadata**, not just old suggested fixes. Thirty-six applicable advisory/package/range comparisons confirmed the selected target versions are outside the original vulnerable ranges. Patched releases and original paths are retained in the per-advisory inventory below and the baseline appendix. Exact resolved tarball integrity hashes are committed in the three lockfiles.

These overrides are tested for the pinned Node 22.22.1 fixture profile, whose runtime also satisfies the new package engine requirements. They are not a claim that every command/plugin in an arbitrary old Angular CLI installation is supported on every formerly supported Node version. Source inspection found the old CLI's pacote calls use its retained manifest/packument APIs. The smoke tests execute those callers; `ng add`, `ng update`, SSR and publishing are not claimed to be certified.

`scripts/check-fixture-dependencies.mjs` runs automatically in the three modified framework consumers. It resolves the packages as the actual old callers do, checks version/engine ranges, runs bounded local API/security probes and removes its temporary resources. `npm ls --all --json` succeeded in all three installed consumers, with no invalid/missing dependency or peer errors. Their manually unpacked subject package is the expected sole extraneous package.

## Fresh audit results

Numbers below are affected-package totals reported by npm, including inherited dependency effects; they are not unique advisory counts.

| Fixture | Before High / Critical | After High / Critical | Remaining Moderate / Low |
| --- | ---: | ---: | ---: |
| Angular 17 | 16 / 2 | **4 / 0** | 32 / 2 |
| Angular 18 | 18 / 2 | **4 / 0** | 31 / 3 |
| Angular 19 | 13 / 2 | **3 / 0** | 24 / 2 |
| Angular 20 | 0 / 0 | **0 / 0** | 21 / 0 |
| Angular 21 | 0 / 0 | **0 / 0** | 21 / 0 |
| Vue 3.2 | 2 / 0 | **2 / 0** | 0 / 0 |
| Vue 3.5, React 18, React 19 | 0 / 0 | **0 / 0** | 0 / 0 |
| Root | 0 / 0 | **0 / 0** | 0 / 0 |

Some Moderate/Low package counts change as dependency paths change. The set of advisory identifiers at all severities gained **no new identifiers**. Moderate/Low reports remain visible; they have not been excluded or asserted harmless.

## Residual High findings and owner decisions

1. **Twelve Angular advisories:** latest stable versions in the affected original majors remain 17.3.12, 18.2.14 and 19.2.25. Official advisory ranges confirm no fixed release in the affected historical line for each remaining finding. The defective code is inside Angular common/core/compiler, so there is no compatible transitive replacement. Mixing newer compiler/core packages into an old Angular line breaks their version/ABI contract and is not attempted. Compilation and client runtime execute, but the committed fixture has no i18n/SVG/MathML or attacker-controlled templates, date/number formatting, HttpClient/XSRF, SSR transfer cache or hydration involved in the vulnerable routes. It uses fixed interpolation and JsonPipe.
2. **Vite 5 / GHSA-587h-7wmj-h5pm:** 5.4.21 is still the latest major-5 release. The vulnerable editor code is bundled into Vite, so an override of an independent launch-editor package cannot replace it. Forcing Vite 6 alone violates the old basic-SSL plugin's Vite 3/4/5 peer range and would need broader dev-server/plugin compatibility work. Angular 17/18 production builds do not start Vite's dev-server editor route; hosted runners are also Linux, whereas this advisory's bypass is Windows-specific. Angular 19's Vite 6 route is genuinely patched.
3. **Vue SSR / GHSA-g2v6-rqmx-r4w6:** there is no fixed 3.2 release; the historical renderer is 3.2.47. A newer renderer in the same broad major exists, but its exact Vue peer matches that newer runtime, not Vue 3.2.47. Replacing only server-renderer is therefore not a safe override. The client-only SFC/browser fixture does not call SSR attribute rendering. SSR/hydration is already outside agent-stage's supported bindings.

**Recommendation:** prefer the tested patched Angular 20.3.35/21.2.26 and Vue 3.5.45 points for active application development. The current constrained historical fixtures can remain as compatibility evidence only with explicit acknowledgement of the above residual upstream risks. The owner should decide whether to retain that restricted execution, narrow active/public support to maintained patched lines, or archive old execution while retaining historical evidence. Changing peers, removing fixtures or claiming a security backport requires a separate explicit decision. None was done here.

## CI security boundaries

All workflows retain `contents: read`, full-SHA pinned actions, no configured publishing secrets or OIDC/write permission, and `persist-credentials: false`. No settings or credentials were modified. Compatibility installation still uses `npm ci --ignore-scripts` against committed lockfiles in isolated temporary consumers, without `--force` or `--legacy-peer-deps`. Downloaded npm packages are integrity-checked by those lockfiles.

Build templates/configuration are fixed repository-controlled inputs. The new archive probe creates and reads a tiny **trusted synthetic local archive**; its dummy lifecycle scripts must not execute. It does not fetch an attacker-selected archive. The synthetic registry is bound to localhost. To validate the middleware major bridge, only Angular 17's dependency probe additionally starts an old webpack-dev-server with **patched middleware**, localhost binding, and client/HMR/WebSocket/live-reload/static serving disabled; requests are fixed probes of its own generated assets. This is an explicit addition to the old audit's execution map. No historical Vite server, SSR, external editor or proxy is started.

Only JSON verification/advisory reports are uploaded. Historical fixture bundles and archives are never promoted into npm release artifacts. Actions artifact/cache capabilities and compromised runner availability remain relevant; read-only repository permissions do not sandbox build code. Pull-request code already executes inside the same restricted job boundary.

The fixture audit now fails on **any Critical package** after saving the complete report. It also fails on audit transport errors or malformed Critical counts. Historical High findings stay visible and are not described as clean. Security CI now performs this fixture gate on pull requests as well as push/scheduled/manual events, and uploads its full report where available on all those events. No advisory exclusions or audit ignores were introduced. Four regression tests cover Critical rejection/report retention, visible High reporting, transport failure and malformed counts.

## Dependabot investigation

Both original hosted failure logs were inspected: [43976465949](https://github.com/nkechr1s/agent-stage/actions/runs/43976465949) and [43976465907](https://github.com/nkechr1s/agent-stage/actions/runs/43976465907). Their decisive error is `ETARGET` for `@typescript-eslint/eslint-plugin@8.73.0` under the updater's before-2026-11-13 date filter. The later peer-resolution message does not by itself establish a TypeScript incompatibility.

Fresh npm metadata dates that exact plugin publication to **2026-11-16 17:07:51.653 UTC**. Its TypeScript peer is `>=4.8.4 <6.1.0`, which accepts the project's **5.9.3**. npm's real version-selection implementation reproduced `ETARGET` at the recorded cutoff and accepted the version after its publication. Ordinary `npm ci` succeeded. The demonstrated immediate cause is release-age filtering of a freshly committed dependency, not a missing registry version or a proven incompatible current TypeScript peer.

The [official Dependabot reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference) documents a default three-day cooldown for version updates. Configuration now makes **three days explicit**, groups TypeScript with typescript-eslint/parser/plugin tooling, and leaves TypeScript major migrations for deliberate review. Historical fixture directories are not opted into automatic updates. No age safeguard was removed, incompatible TypeScript update forced or CI gate relaxed.

The plugin itself becomes eligible after **2026-11-19 17:07:51.653 UTC**. Recheck the rest of the group's release times and rerun the hosted update check then. It is not yet eligible on this audit date, so **a successful hosted Dependabot repair has not been verified**. The configuration changes are local and have not been pushed. No remote update run or repository setting change was made.

## Actual regression verification

- All three modified consumers executed `npm ci` with their new lockfiles, package API/security probes, strict NodeNext/Bundler declarations, Angular production/AOT build, browser approval/commit and unmount cleanup successfully.
- The complete nine-fixture matrix passed again: React 18/19 with real Zustand 5, Vue 3.2/3.5 SFCs, Angular 17/18/19/20/21. Strengthened dependency probes additionally passed for all three installed old Angular consumers, including both Piscina regression cases and real copy-plugin cache calls.
- Root `HUSKY=0 npm ci`, fresh root audit and the new real fixture Critical gate passed. Reports remain complete, including residual High/Moderate/Low findings.
- `npm run validate:release` passed after the final audit guard changes: ESLint, build, strict typecheck, both type-test resolutions, **159 tests in 22 files**, all five real isolated consumer installations, package integrity, React demo production build and Vanilla lifecycle example.
- Node **24.22.3** also passed all **159 tests**; main validation ran on Node **22.22.1**. Existing 155 tests were preserved; four security-gate regressions were added.
- `npm run check:hooks` and `actionlint` passed. Final package integrity is rerun after documentation edits. No package release, workflow publication or hosted validation of the uncommitted changes is claimed.

Raw metadata, before/after audits, range comparisons, installed graphs and logs are under `artifacts/security-remediation/` (ignored and excluded from the npm tarball). No production source or root dependency changed. No commit, push, tag, publication or public peer-range change was made.

## Original 35-advisory disposition

The following table accounts for **every original High/Critical advisory**. Versions are the vulnerable baseline versions, not newly introduced dependencies. Direct/transitive paths for each affected installation remain in the [original appendix](FINAL-RELEASE-ADVISORIES.md); the machine-readable local `inventory.json` records those paths, official patched releases and remaining fixtures. Each identifier links the refreshed primary advisory metadata. “Same major” does not override an incompatible exact framework peer.

| Advisory / severity | Baseline affected packages / versions | Original fixtures | Verified fix / compatibility decision | Disposition |
| --- | --- | --- | --- | --- |
| [GHSA-58c5-g7wp-6w37](https://github.com/advisories/GHSA-58c5-g7wp-6w37) / High | `@angular/common@17.3.12`, `@angular/common@18.2.14` | angular17, angular18 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18 |
| [GHSA-48r7-hpm6-gfxm](https://github.com/advisories/GHSA-48r7-hpm6-gfxm) / High | `@angular/common@17.3.12`, `@angular/common@18.2.14`, `@angular/common@19.2.25` | angular17, angular18, angular19 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18, angular19 |
| [GHSA-39pv-4j6c-2g6v](https://github.com/advisories/GHSA-39pv-4j6c-2g6v) / High | `@angular/common@17.3.12`, `@angular/common@18.2.14`, `@angular/common@19.2.25` | angular17, angular18, angular19 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18, angular19 |
| [GHSA-p3vc-36g9-x9gr](https://github.com/advisories/GHSA-p3vc-36g9-x9gr) / High | `@angular/common@17.3.12`, `@angular/common@18.2.14` | angular17, angular18 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18 |
| [GHSA-q6f4-qqrg-jv6x](https://github.com/advisories/GHSA-q6f4-qqrg-jv6x) / High | `@angular/common@17.3.12`, `@angular/common@18.2.14` | angular17, angular18 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18 |
| [GHSA-jhpw-976m-542j](https://github.com/advisories/GHSA-jhpw-976m-542j) / High | `@angular/common@17.3.12`, `@angular/common@18.2.14`, `@angular/common@19.2.25` | angular17, angular18, angular19 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18, angular19 |
| [GHSA-g93w-mfhg-p222](https://github.com/advisories/GHSA-g93w-mfhg-p222) / High | `@angular/compiler@17.3.12`, `@angular/compiler@18.2.14`, `@angular/core@17.3.12`, `@angular/core@18.2.14` | angular17, angular18 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18 |
| [GHSA-jrmj-c5cx-3cw6](https://github.com/advisories/GHSA-jrmj-c5cx-3cw6) / High | `@angular/compiler@17.3.12`, `@angular/compiler@18.2.14`, `@angular/core@17.3.12`, `@angular/core@18.2.14` | angular17, angular18 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18 |
| [GHSA-v4hv-rgfq-gp49](https://github.com/advisories/GHSA-v4hv-rgfq-gp49) / High | `@angular/compiler@17.3.12`, `@angular/compiler@18.2.14` | angular17, angular18 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18 |
| [GHSA-jj27-h5hq-8x99](https://github.com/advisories/GHSA-jj27-h5hq-8x99) / High | `@angular/compiler@17.3.12`, `@angular/compiler@18.2.14`, `@angular/compiler@19.2.25`, `@angular/core@17.3.12`, `@angular/core@18.2.14`, `@angular/core@19.2.25` | angular17, angular18, angular19 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18, angular19 |
| [GHSA-prjf-86w9-mfqv](https://github.com/advisories/GHSA-prjf-86w9-mfqv) / High | `@angular/core@17.3.12`, `@angular/core@18.2.14` | angular17, angular18 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18 |
| [GHSA-rgjc-h3x7-9mwg](https://github.com/advisories/GHSA-rgjc-h3x7-9mwg) / High | `@angular/core@17.3.12`, `@angular/core@18.2.14`, `@angular/core@19.2.25` | angular17, angular18, angular19 | No fixed release in affected Angular major; no compatible transitive workaround | **Retained; restricted execution** — angular17, angular18, angular19 |
| [GHSA-w4pp-8pjf-rmxw](https://github.com/advisories/GHSA-w4pp-8pjf-rmxw) / High | `pacote@17.0.6`, `pacote@18.0.6`, `pacote@20.0.0` | angular17, angular18, angular19 | 21.5.3, tested CLI caller bridge; no fixed 17/18/20 | **Remediated** |
| [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) / High | `picomatch@4.0.1`, `picomatch@4.0.2` | angular17, angular18 | 4.0.7 for affected major 4 | **Remediated** |
| [GHSA-x9g3-xrwr-cwfg](https://github.com/advisories/GHSA-x9g3-xrwr-cwfg) / High | `piscina@4.4.0`, `piscina@4.6.1`, `piscina@4.8.0` | angular17, angular18, angular19 | 4.9.4, same major; actual workers and both pollution regressions pass | **Remediated** |
| [GHSA-67c8-pqhq-4rmx](https://github.com/advisories/GHSA-67c8-pqhq-4rmx) / Critical | `piscina@4.4.0`, `piscina@4.6.1`, `piscina@4.8.0` | angular17, angular18, angular19 | 4.9.4, same major; actual workers and both pollution regressions pass | **Remediated** |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) / High | `postcss@8.4.35`, `postcss@8.4.41` | angular17, angular18 | 8.5.33, same major | **Remediated** |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) / High | `postcss@8.4.35`, `postcss@8.4.41`, `postcss@8.5.12` | angular17, angular18, angular19 | 8.5.33, same major | **Remediated** |
| [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq) / High | `serialize-javascript@6.0.2` | angular17, angular18, angular19 | 7.1.4, real old copy-plugin cache calls tested | **Remediated** |
| [GHSA-52v5-jr5w-gjxr](https://github.com/advisories/GHSA-52v5-jr5w-gjxr) / High | `sigstore@2.3.1`, `sigstore@3.1.0` | angular17, angular18, angular19 | 4.1.1 through upstream pacote 21 dependency range | **Remediated** |
| [GHSA-34x7-hfp2-rc4v](https://github.com/advisories/GHSA-34x7-hfp2-rc4v) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-r6q2-hw4h-h46w](https://github.com/advisories/GHSA-r6q2-hw4h-h46w) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) / Critical | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) / High | `tar@6.2.1` | angular17, angular18, angular19 | 7.5.23 through coherent pacote 21; no fixed 6; archive/API probes pass | **Remediated** |
| [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65) / High | `tmp@0.0.33` | angular17, angular18 | 0.2.7, tested old ExternalEditor API bridge | **Remediated** |
| [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) / High | `vite@5.4.21`, `vite@6.4.2` | angular17, angular18, angular19 | 6.4.6 fixes 19; no fixed 5; old SSL-plugin peer blocks a standalone major override | **Partially remediated** — angular17, angular18 |
| [GHSA-g84c-rxfj-3j2c](https://github.com/advisories/GHSA-g84c-rxfj-3j2c) / High | `webpack-dev-middleware@5.3.4`, `webpack-dev-middleware@6.1.2`, `webpack-dev-middleware@7.4.2` | angular17, angular18, angular19 | 7.4.6; same major on 18/19, actual old dev-server/webpack bridge tested on 17 | **Remediated** |
| [GHSA-gcq2-9pq2-cxqm](https://github.com/advisories/GHSA-gcq2-9pq2-cxqm) / High | `http-proxy-middleware@3.0.5` | angular18, angular19 | 3.0.11 for affected major 3 | **Remediated** |
| [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) / High | `rollup@4.22.4` | angular18 | 4.68.4, same major | **Remediated** |
| [GHSA-g2v6-rqmx-r4w6](https://github.com/advisories/GHSA-g2v6-rqmx-r4w6) / High | `@vue/server-renderer@3.2.47` | vue32 | Fixed newer 3.x requires matching newer Vue; not compatible with the 3.2.47 peer | **Retained; restricted execution** — vue32 |
