# Security support policy and legacy retirement

Owner-approved policy, 2026-11-17. This is the current support contract; it supersedes historical compatibility reports.

| Integration | Optional peer range | Verified exact points |
| --- | --- | --- |
| React | `>=18 <20` | 18.3.1, 19.3.1 |
| Zustand | `>=5 <6` | 5.1.0, exercised in both React consumers |
| Vue | `>=3.5 <4` | 3.5.45 |
| Angular Core | `>=20 <22` | 20.3.35, 21.2.26 |
| Node.js | `>=22.22.1 <23 || >=24.22.3 <25` | 22.22.1, 24.22.3 |

Ranges express the approved compatibility boundary, not evidence that every future minor/patch was tested. Security verification is specific to the locked tested points and audit date. Fresh validation found a new High picomatch advisory with no published fix; the root and supported fixtures currently fail their security gates. The contract is implemented, but security acceptance is blocked until remediation and clean reruns. See the verification report. Core remains framework independent with no runtime dependencies. All four peers remain optional, and all five ESM exports remain unchanged. SSR/hydration and unsupported middleware restrictions still apply.

## Breaking pre-1.0 support change

Angular 17–19 and Vue 3.2 are no longer supported due to unresolved upstream security advisories in those historical dependency lines. Vue versions below 3.5 and Angular versions below 20 now conflict with the declared peers. Consumers must upgrade to a supported framework before adopting this package contract. No version bump, package rename or public API/transaction change accompanies this local policy update; an approved release must document this narrowing.

The four directories `scripts/compatibility/angular17`, `angular18`, `angular19`, and `vue32` and their eight manifests/locks are deleted. The legacy-only `scripts/check-fixture-dependencies.mjs` probe is removed with its caller. The maintenance script cannot regenerate those fixtures. Scheduled/manual compatibility and the default browser runner contain exactly react18, react19, vue, angular20 and angular21. PR/push representative builds retain React 18, Vue 3.5 and Angular 21. Benchmark/soak jobs are core-only and require no fixture changes.

No integration/core tests were removed. Supported Angular 20/21 and Vue 3.5 continue to compile actual components, exercise approval/commit and verify subscription cleanup. The removed probes concerned retired dependency override bridges, not library behavior.

## Historical evidence

The [original 35-advisory appendix](FINAL-RELEASE-ADVISORIES.md), [remediation disposition of every finding](SECURITY-REMEDIATION.md) and [final release audit](FINAL-RELEASE-AUDIT.md) are retained as documentary history. The prior remediation fixed 21 unique advisories; fourteen remaining High findings are now outside the supported matrix because the affected fixtures were retired. Retirement does not fix those upstream vulnerabilities. No vulnerable historical lockfile is retained as an installable fixture or shipped artifact. Previous report numbers and paths describe their original audit, not the active repository.

## Enforcement and security controls

Package integrity asserts the exact peer ranges, unchanged Node range/name, optional peers, zero runtime dependencies, five exports, root lock metadata and exact five fixture directories. Real supported consumer installations use strict peer resolution. Negative consumers use metadata-only `npm install --package-lock-only --ignore-scripts --strict-peer-deps` to require ERESOLVE for Vue 3.2.47 and Angular 17.3.12/18.2.14/19.2.25; no legacy node_modules or executable fixture is created.

Active audits inspect all remaining fixture locks and reject any High or Critical finding. Moderate and Low findings remain in the full JSON reports and CI artifacts. Malformed counts and transport failures remain fatal. There are no advisory exclusions, blanket overrides or severity suppressions. Root audit remains a High/Critical gate. All pinned Actions, read-only permissions, disabled checkout credential persistence and absence of publishing secrets remain intact.

Dependabot retains its three-day cooldown and TypeScript/typescript-eslint grouping. The previously blocked plugin becomes eligible November 19, 2026, at 17:07:51.653 UTC. No successful hosted retry is claimed; this remains external verification. Nothing in this phase changes repository settings or pushes local workflow changes.

See [implementation verification](SUPPORT-POLICY-VERIFICATION.md) for actual commands, counts, artifact checks and exact changed files. This policy is not a public beta or production-readiness declaration. Registry ownership, enforced hosted checks and release approval remain separate owner responsibilities.
