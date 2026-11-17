# Final release gate: historical fixture security assessment

This is the original baseline inventory. The subsequent [remediation report](SECURITY-REMEDIATION.md) accounts for all 35 findings, with 21 fully removed and no Critical findings remaining. Use that report for current versions and execution boundaries; baseline dependency paths below are preserved for comparison.

Audit date: 2026-11-17. Subject commit: `71ec1b51af4426f322d73a1ae6a6e519f0d7470a`.

Fresh `node scripts/audit-compatibility.mjs` reports **35 unique High/Critical advisories** (33 High, 2 Critical), across the Angular 17–19 and Vue 3.2 lockfiles. npm totals count affected packages and inherited effects, so they differ from unique advisory counts. Root `npm audit` reports zero vulnerabilities. None of these historical fixture packages is an agent-stage runtime dependency or included in its tarball.

The package/range/fix evidence below was cross-checked against the official GitHub Advisory API. Each finding links its primary advisory. Dependency paths are resolved from the committed fixture lockfiles; one shortest path is shown for each affected installation. A direct fixture dependency is not necessarily a direct dependency of agent-stage.

## Execution and privilege boundary

The scheduled compatibility job actually installs, builds and runs these fixtures. Its current trust boundary is committed source/configuration and registry tarballs checked by lockfile integrity. Installation uses `npm ci --ignore-scripts`; the fixture then executes the selected compiler/build scripts and a browser lifecycle test. Ignoring install scripts does not sandbox later compiler execution. Angular compilers and Piscina workers execute; calling every advisory an unused development dependency would be incorrect.

Every finding below has the same workflow privilege assessment: `contents: read`, no configured secrets, no `id-token: write`, checkout credentials not persisted, ephemeral Ubuntu 24.04 runner, and no publishing or promotion of fixture bundles into the npm release. Artifact/cache runtime credentials remain capabilities of a running Actions job; read-only repository permission does not eliminate availability, artifact contamination or runner-compromise risk. A pull request can already change executable build source, so these findings alone do not demonstrate a new privilege boundary crossing.

Exposure statements are source-based assessments of the current fixed fixture, not proof that an upstream vulnerability is harmless. All nine browser fixtures passed again. No advisory exploit payload was run; no complete dynamic call trace or independent penetration test was performed. Any introduction of untrusted CSS, templates, plugins, network requests, archives or development servers invalidates the relevant assessment.

The two Critical advisories are assessed individually below. Piscina is a real conditional worker-RCE risk because its workers run, although the required prior prototype pollution was not identified. The vulnerable fixture node-tar archive path is not used. Treat residual fixture risk as **Medium for this constrained CI**, requiring tracked mitigation/owner acceptance before stable release. This does not downgrade the upstream advisories or endorse deploying vulnerable Angular/Vue versions. No Critical/High exploitable library or privileged-CI defect was reproduced in this audit.

Do not use `npm audit fix --force` or remove old fixture tests to obtain a clean report. Compatible transitive patch overrides are candidates for a separately tested change; this audit did not alter fixture versions, locks or supported peers. Direct old Angular security fixes often require leaving the historical major. Consumers should choose maintained patched peers.

## Fresh npm audit totals

| Fixture | High packages | Critical packages | Other advisories (package counts) |
| --- | ---: | ---: | ---: |
| angular17 | 16 | 2 | 34 |
| angular18 | 18 | 2 | 35 |
| angular19 | 13 | 2 | 25 |
| angular20 | 0 | 0 | 21 |
| angular21 | 0 | 0 | 21 |
| react18 | 0 | 0 | 0 |
| react19 | 0 | 0 | 0 |
| vue | 0 | 0 | 0 |
| vue32 | 2 | 0 | 0 |

## Per-advisory assessment

### 1. GHSA-58c5-g7wp-6w37 — High

[Angular is Vulnerable to XSRF Token Leakage via Protocol-Relative URLs in Angular HTTP Client](https://github.com/advisories/GHSA-58c5-g7wp-6w37) (CVE-2025-66035).

**Affected dependency paths:**

- `angular17` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@17.3.12`. Installation: `node_modules/@angular/common`.
- `angular18` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@18.2.14`. Installation: `node_modules/@angular/common`.

**CI execution and actual risk:** Angular client code runs, but the fixture does not provide HttpClient or issue HTTP requests. The protocol-relative-request/XSRF leak route is not exercised.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line for applications with HttpClient. Keep this historical fixture free of credentials and network application code.

**Advisory patch versions:** `@angular/common@19.2.16`, `@angular/common@20.3.14`, `@angular/common@21.0.1`.

### 2. GHSA-48r7-hpm6-gfxm — High

[@angular/common: Denial of Service (DoS) via OOM in Date Formatting (formatDate)](https://github.com/advisories/GHSA-48r7-hpm6-gfxm) (CVE-2026-54268).

**Affected dependency paths:**

- `angular17` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@17.3.12`. Installation: `node_modules/@angular/common`.
- `angular18` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@18.2.14`. Installation: `node_modules/@angular/common`.
- `angular19` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@19.2.25`. Installation: `node_modules/@angular/common`.

**CI execution and actual risk:** The Angular compiler/runtime runs. These fixed templates use neither date nor number formatting pipes and accept no attacker-controlled formatting arguments. The allocation-exhaustion sink is not exercised.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line; never add unbounded user formatting arguments to the fixture. Retaining an old compiler is compatibility evidence, not a security endorsement.

**Advisory patch versions:** `@angular/common@20.3.25`, `@angular/common@21.2.17`, `@angular/common@22.0.1`.

**Ranges with no fixed release listed:** `@angular/common (<= 19.2.25)`.

### 3. GHSA-39pv-4j6c-2g6v — High

[@angular/common: Weak 32-Bit Cache Key Hashing in `HttpTransferCache` Leading to Cross-Request Data Leakage and State Poisoning](https://github.com/advisories/GHSA-39pv-4j6c-2g6v) (CVE-2026-54266).

**Affected dependency paths:**

- `angular17` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@17.3.12`. Installation: `node_modules/@angular/common`.
- `angular18` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@18.2.14`. Installation: `node_modules/@angular/common`.
- `angular19` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@19.2.25`. Installation: `node_modules/@angular/common`.

**CI execution and actual risk:** This is a browser-only build with no SSR, HttpClient transfer cache or cross-request response cache. The affected cache path is not exercised.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line for SSR/transfer-cache applications. Do not enable SSR or credentialed HTTP in the historical fixture.

**Advisory patch versions:** `@angular/common@20.3.25`, `@angular/common@21.2.17`, `@angular/common@22.0.1`.

**Ranges with no fixed release listed:** `@angular/common (<= 19.2.25)`.

### 4. GHSA-p3vc-36g9-x9gr — High

[@angular/common: Denial of Service (DoS) via OOM in Number Formatting (digitsInfo)](https://github.com/advisories/GHSA-p3vc-36g9-x9gr) (CVE-2026-50171).

**Affected dependency paths:**

- `angular17` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@17.3.12`. Installation: `node_modules/@angular/common`.
- `angular18` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@18.2.14`. Installation: `node_modules/@angular/common`.

**CI execution and actual risk:** The Angular compiler/runtime runs. These fixed templates use neither date nor number formatting pipes and accept no attacker-controlled formatting arguments. The allocation-exhaustion sink is not exercised.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line; never add unbounded user formatting arguments to the fixture. Retaining an old compiler is compatibility evidence, not a security endorsement.

**Advisory patch versions:** `@angular/common@19.2.23`, `@angular/common@20.3.22`, `@angular/common@21.2.15`, `@angular/common@22.0.0-rc.2`.

**Ranges with no fixed release listed:** `@angular/common (<= 18.2.14)`.

### 5. GHSA-q6f4-qqrg-jv6x — High

[@angular/common: Information Leak via Default Caching of Credentialed Requests in HttpTransferCache](https://github.com/advisories/GHSA-q6f4-qqrg-jv6x) (CVE-2026-50170).

**Affected dependency paths:**

- `angular17` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@17.3.12`. Installation: `node_modules/@angular/common`.
- `angular18` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@18.2.14`. Installation: `node_modules/@angular/common`.

**CI execution and actual risk:** This is a browser-only build with no SSR, HttpClient transfer cache or cross-request response cache. The affected cache path is not exercised.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line for SSR/transfer-cache applications. Do not enable SSR or credentialed HTTP in the historical fixture.

**Advisory patch versions:** `@angular/common@19.2.23`, `@angular/common@20.3.22`, `@angular/common@21.2.15`, `@angular/common@22.0.0-rc.2`.

**Ranges with no fixed release listed:** `@angular/common (<= 18.2.14)`.

### 6. GHSA-jhpw-976m-542j — High

[Angular: Cache-Key Ambiguity in HttpTransferCache Leading to Cross-Request Response Reuse and State Poisoning](https://github.com/advisories/GHSA-jhpw-976m-542j) (CVE-2026-68945).

**Affected dependency paths:**

- `angular17` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@17.3.12`. Installation: `node_modules/@angular/common`.
- `angular18` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@18.2.14`. Installation: `node_modules/@angular/common`.
- `angular19` — `@angular/common`, direct fixture dependency: `fixture → @angular/common@19.2.25`. Installation: `node_modules/@angular/common`.

**CI execution and actual risk:** This is a browser-only build with no SSR, HttpClient transfer cache or cross-request response cache. The affected cache path is not exercised.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line for SSR/transfer-cache applications. Do not enable SSR or credentialed HTTP in the historical fixture.

**Advisory patch versions:** `@angular/common@20.3.27`, `@angular/common@21.2.19`, `@angular/common@22.0.2`.

**Ranges with no fixed release listed:** `@angular/common (<= 19.2.25)`.

### 7. GHSA-g93w-mfhg-p222 — High

[Angular vulnerable to XSS in i18n attribute bindings](https://github.com/advisories/GHSA-g93w-mfhg-p222) (CVE-2026-32635).

**Affected dependency paths:**

- `angular17` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@17.3.12`. Installation: `node_modules/@angular/compiler`.
- `angular17` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@17.3.12`. Installation: `node_modules/@angular/core`.
- `angular18` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@18.2.14`. Installation: `node_modules/@angular/compiler`.
- `angular18` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@18.2.14`. Installation: `node_modules/@angular/core`.

**CI execution and actual risk:** The affected compiler/runtime packages actually execute during AOT compilation and browser tests. The committed template has no i18n, SVG/MathML, event-attribute interpolation or untrusted HTML/template input needed by these XSS routes. No exploit was reproduced in this fixture.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line in deployed applications. Keep fixture templates trusted and minimal; changes introducing affected bindings require reassessment. Old direct framework versions cannot be silently upgraded while claiming the same compatibility point.

**Advisory patch versions:** `@angular/compiler@19.2.20`, `@angular/compiler@20.3.18`, `@angular/compiler@21.2.4`, `@angular/compiler@22.0.0-next.3`, `@angular/core@19.2.20`, `@angular/core@20.3.18`, `@angular/core@21.2.4`, `@angular/core@22.0.0-next.3`.

**Ranges with no fixed release listed:** `@angular/compiler (>= 17.0.0-next.0, <= 18.2.14)`; `@angular/core (>= 17.0.0-next.0, <= 18.2.14)`.

### 8. GHSA-jrmj-c5cx-3cw6 — High

[Angular has XSS Vulnerability via Unsanitized SVG Script Attributes](https://github.com/advisories/GHSA-jrmj-c5cx-3cw6) (CVE-2026-22610).

**Affected dependency paths:**

- `angular17` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@17.3.12`. Installation: `node_modules/@angular/compiler`.
- `angular17` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@17.3.12`. Installation: `node_modules/@angular/core`.
- `angular18` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@18.2.14`. Installation: `node_modules/@angular/compiler`.
- `angular18` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@18.2.14`. Installation: `node_modules/@angular/core`.

**CI execution and actual risk:** The affected compiler/runtime packages actually execute during AOT compilation and browser tests. The committed template has no i18n, SVG/MathML, event-attribute interpolation or untrusted HTML/template input needed by these XSS routes. No exploit was reproduced in this fixture.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line in deployed applications. Keep fixture templates trusted and minimal; changes introducing affected bindings require reassessment. Old direct framework versions cannot be silently upgraded while claiming the same compatibility point.

**Advisory patch versions:** `@angular/compiler@19.2.18`, `@angular/compiler@20.3.16`, `@angular/compiler@21.0.7`, `@angular/compiler@21.1.0-rc.0`, `@angular/core@19.2.18`, `@angular/core@20.3.16`, `@angular/core@21.0.7`, `@angular/core@21.1.0-rc.0`.

**Ranges with no fixed release listed:** `@angular/compiler (<= 18.2.14)`; `@angular/core (<= 18.2.14)`.

### 9. GHSA-v4hv-rgfq-gp49 — High

[Angular Stored XSS Vulnerability via SVG Animation, SVG URL and MathML Attributes](https://github.com/advisories/GHSA-v4hv-rgfq-gp49) (CVE-2025-66412).

**Affected dependency paths:**

- `angular17` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@17.3.12`. Installation: `node_modules/@angular/compiler`.
- `angular18` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@18.2.14`. Installation: `node_modules/@angular/compiler`.

**CI execution and actual risk:** The affected compiler/runtime packages actually execute during AOT compilation and browser tests. The committed template has no i18n, SVG/MathML, event-attribute interpolation or untrusted HTML/template input needed by these XSS routes. No exploit was reproduced in this fixture.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line in deployed applications. Keep fixture templates trusted and minimal; changes introducing affected bindings require reassessment. Old direct framework versions cannot be silently upgraded while claiming the same compatibility point.

**Advisory patch versions:** `@angular/compiler@19.2.17`, `@angular/compiler@20.3.15`, `@angular/compiler@21.0.2`.

**Ranges with no fixed release listed:** `@angular/compiler (<= 18.2.14)`.

### 10. GHSA-jj27-h5hq-8x99 — High

[Angular i18n: Cross-Site Scripting (XSS) via event-handler attributes](https://github.com/advisories/GHSA-jj27-h5hq-8x99) (CVE-2026-69151).

**Affected dependency paths:**

- `angular17` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@17.3.12`. Installation: `node_modules/@angular/compiler`.
- `angular17` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@17.3.12`. Installation: `node_modules/@angular/core`.
- `angular18` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@18.2.14`. Installation: `node_modules/@angular/compiler`.
- `angular18` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@18.2.14`. Installation: `node_modules/@angular/core`.
- `angular19` — `@angular/compiler`, direct fixture dependency: `fixture → @angular/compiler@19.2.25`. Installation: `node_modules/@angular/compiler`.
- `angular19` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@19.2.25`. Installation: `node_modules/@angular/core`.

**CI execution and actual risk:** The affected compiler/runtime packages actually execute during AOT compilation and browser tests. The committed template has no i18n, SVG/MathML, event-attribute interpolation or untrusted HTML/template input needed by these XSS routes. No exploit was reproduced in this fixture.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line in deployed applications. Keep fixture templates trusted and minimal; changes introducing affected bindings require reassessment. Old direct framework versions cannot be silently upgraded while claiming the same compatibility point.

**Advisory patch versions:** `@angular/compiler@20.3.27`, `@angular/compiler@21.2.19`, `@angular/compiler@22.0.1`, `@angular/core@20.3.27`, `@angular/core@21.2.19`, `@angular/core@22.0.1`.

**Ranges with no fixed release listed:** `@angular/compiler (<= 19.2.25)`; `@angular/core (<= 19.2.25)`.

### 11. GHSA-prjf-86w9-mfqv — High

[Angular i18n vulnerable to Cross-Site Scripting](https://github.com/advisories/GHSA-prjf-86w9-mfqv) (CVE-2026-27970).

**Affected dependency paths:**

- `angular17` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@17.3.12`. Installation: `node_modules/@angular/core`.
- `angular18` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@18.2.14`. Installation: `node_modules/@angular/core`.

**CI execution and actual risk:** The affected compiler/runtime packages actually execute during AOT compilation and browser tests. The committed template has no i18n, SVG/MathML, event-attribute interpolation or untrusted HTML/template input needed by these XSS routes. No exploit was reproduced in this fixture.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched maintained Angular line in deployed applications. Keep fixture templates trusted and minimal; changes introducing affected bindings require reassessment. Old direct framework versions cannot be silently upgraded while claiming the same compatibility point.

**Advisory patch versions:** `@angular/core@19.2.19`, `@angular/core@20.3.17`, `@angular/core@21.1.6`, `@angular/core@21.2.0`.

**Ranges with no fixed release listed:** `@angular/core (<= 18.2.14)`.

### 12. GHSA-rgjc-h3x7-9mwg — High

[Angular Client Hydration DOM Clobbering & Response-Cache Poisoning](https://github.com/advisories/GHSA-rgjc-h3x7-9mwg) (CVE-2026-54267).

**Affected dependency paths:**

- `angular17` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@17.3.12`. Installation: `node_modules/@angular/core`.
- `angular18` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@18.2.14`. Installation: `node_modules/@angular/core`.
- `angular19` — `@angular/core`, direct fixture dependency: `fixture → @angular/core@19.2.25`. Installation: `node_modules/@angular/core`.

**CI execution and actual risk:** Angular client rendering executes, but hydration and server-rendered response-cache state are not configured. The DOM-clobbering/hydration path is not exercised.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched Angular line for hydration. Maintain the explicit client-only contract and do not infer SSR safety from these tests.

**Advisory patch versions:** `@angular/core@20.3.25`, `@angular/core@21.2.17`, `@angular/core@22.0.1`.

**Ranges with no fixed release listed:** `@angular/core (<= 19.2.25)`.

### 13. GHSA-w4pp-8pjf-rmxw — High

[pacote is vulnerable to Denial of Service (DoS) via the addGitSha function](https://github.com/advisories/GHSA-w4pp-8pjf-rmxw) (CVE-2026-9496).

**Affected dependency paths:**

- `angular17` — `pacote`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6`. Installation: `node_modules/pacote`.
- `angular18` — `pacote`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6`. Installation: `node_modules/pacote`.
- `angular19` — `pacote`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0`. Installation: `node_modules/pacote`.

**CI execution and actual risk:** The fixture CLI installs pacote transitively, but the test runs ng build, not ng add/update or a Git dependency fetch. The fixture pacote addGitSha path is not used. npm ci uses the separately pinned npm CLI, not this dependency.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Update to patched pacote through compatible CLI/toolchain maintenance and revalidate the fixture; do not fetch attacker-selected Git dependencies or run package-management commands inside old CLIs.

**Advisory patch versions:** `pacote@21.5.1`.

### 14. GHSA-c2c7-rcm5-vvqj — High

[Picomatch has a ReDoS vulnerability via extglob quantifiers](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) (CVE-2026-33671).

**Affected dependency paths:**

- `angular17` — `picomatch`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → picomatch@4.0.1`. Installation: `node_modules/picomatch`.
- `angular18` — `picomatch`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → picomatch@4.0.2`. Installation: `node_modules/picomatch`.

**CI execution and actual risk:** Glob processing can run during builds. Patterns are fixed by the committed build configuration; no attacker-controlled extglob quantifier input was identified. Conditional CPU-exhaustion risk exists if untrusted patterns are introduced.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** A compatible picomatch patch exists within each affected major. Evaluate a transitive override with a regenerated lockfile and repeat exact compiler/browser tests before accepting it.

**Advisory patch versions:** `picomatch@2.3.2`, `picomatch@3.0.2`, `picomatch@4.0.4`.

### 15. GHSA-x9g3-xrwr-cwfg — High

[piscina: Prototype Pollution Gadget → RCE via inherited options.filename](https://github.com/advisories/GHSA-x9g3-xrwr-cwfg) (CVE-2026-55388).

**Affected dependency paths:**

- `angular17` — `piscina`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → piscina@4.4.0`. Installation: `node_modules/piscina`.
- `angular18` — `piscina`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → piscina@4.6.1`. Installation: `node_modules/piscina`.
- `angular19` — `piscina`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@19.2.27 → piscina@4.8.0`. Installation: `node_modules/piscina`.

**CI execution and actual risk:** Piscina workers actually run in the Angular build. These are RCE gadgets requiring prior prototype pollution or attacker-influenced inherited options in that process. No upstream pollution source or exploitation was reproduced in the fixed fixture. This is a conditional CI worker-execution risk, not a harmless unused development dependency.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Prioritize a tested compatible 4.9.4-or-later patch override through the old toolchains; do not replace Angular majors silently. Until validated, retain ephemeral read-only jobs with no secrets, no publishing, and no promotion of their build output to release artifacts. Reassess if untrusted configuration or plugins are added.

**Advisory patch versions:** `piscina@4.9.3`, `piscina@5.2.0`, `piscina@6.0.0-rc.2`.

### 16. GHSA-67c8-pqhq-4rmx — Critical

[piscina: Prototype-pollution gadget in ThreadPool.options allows RCE via execArgv / loadBalancer / env](https://github.com/advisories/GHSA-67c8-pqhq-4rmx) (CVE-2026-102992).

**Affected dependency paths:**

- `angular17` — `piscina`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → piscina@4.4.0`. Installation: `node_modules/piscina`.
- `angular18` — `piscina`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → piscina@4.6.1`. Installation: `node_modules/piscina`.
- `angular19` — `piscina`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@19.2.27 → piscina@4.8.0`. Installation: `node_modules/piscina`.

**CI execution and actual risk:** Piscina workers actually run in the Angular build. These are RCE gadgets requiring prior prototype pollution or attacker-influenced inherited options in that process. No upstream pollution source or exploitation was reproduced in the fixed fixture. This is a conditional CI worker-execution risk, not a harmless unused development dependency.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Prioritize a tested compatible 4.9.4-or-later patch override through the old toolchains; do not replace Angular majors silently. Until validated, retain ephemeral read-only jobs with no secrets, no publishing, and no promotion of their build output to release artifacts. Reassess if untrusted configuration or plugins are added.

**Advisory patch versions:** `piscina@4.9.4`, `piscina@5.3.2`, `piscina@6.0.0-rc.5`.

### 17. GHSA-6g55-p6wh-862q — High

[PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q) (CVE-2026-45623).

**Affected dependency paths:**

- `angular17` — `postcss`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → postcss@8.4.35`. Installation: `node_modules/postcss`.
- `angular18` — `postcss`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → postcss@8.4.41`. Installation: `node_modules/postcss`.

**CI execution and actual risk:** PostCSS is part of the CSS build pipeline. This fixture has empty styles/assets and no attacker-supplied CSS or sourceMappingURL. The affected source-map file-loading route is not exercised by these inputs. It becomes a CI file-disclosure risk if crafted CSS is introduced.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Evaluate a compatible PostCSS 8.5.18-or-later patch and rerun the exact fixture. Do not introduce untrusted styles/source maps or sensitive runner files.

**Advisory patch versions:** `postcss@8.5.12`.

### 18. GHSA-r28c-9q8g-f849 — High

[PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) (CVE-2026-73646).

**Affected dependency paths:**

- `angular17` — `postcss`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → postcss@8.4.35`. Installation: `node_modules/postcss`.
- `angular18` — `postcss`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → postcss@8.4.41`. Installation: `node_modules/postcss`.
- `angular19` — `postcss`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@19.2.27 → postcss@8.5.12`. Installation: `node_modules/postcss`.

**CI execution and actual risk:** PostCSS is part of the CSS build pipeline. This fixture has empty styles/assets and no attacker-supplied CSS or sourceMappingURL. The affected source-map file-loading route is not exercised by these inputs. It becomes a CI file-disclosure risk if crafted CSS is introduced.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Evaluate a compatible PostCSS 8.5.18-or-later patch and rerun the exact fixture. Do not introduce untrusted styles/source maps or sensitive runner files.

**Advisory patch versions:** `postcss@8.5.18`.

### 19. GHSA-5c6j-r48x-rmvq — High

[Serialize JavaScript is Vulnerable to RCE via RegExp.flags and Date.prototype.toISOString()](https://github.com/advisories/GHSA-5c6j-r48x-rmvq).

**Affected dependency paths:**

- `angular17` — `serialize-javascript`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → copy-webpack-plugin@11.0.0 → serialize-javascript@6.0.2`. Installation: `node_modules/serialize-javascript`.
- `angular18` — `serialize-javascript`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → copy-webpack-plugin@12.0.2 → serialize-javascript@6.0.2`. Installation: `node_modules/serialize-javascript`.
- `angular19` — `serialize-javascript`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@19.2.27 → copy-webpack-plugin@12.0.2 → serialize-javascript@6.0.2`. Installation: `node_modules/serialize-javascript`.

**CI execution and actual risk:** The affected serializer is installed through copy-webpack-plugin. The fixture uses the browser-esbuild builder with no assets; it does not invoke that webpack copy/serialization route or supply attacker-controlled Date/RegExp serialization values.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Update the compatible build/plugin chain after testing; do not force a major serializer override without checking plugin compatibility. Keep the esbuild-only/no-untrusted-assets boundary explicit.

**Advisory patch versions:** `serialize-javascript@7.0.3`.

### 20. GHSA-52v5-jr5w-gjxr — High

[sigstore's `certificateOIDs` verification constraints are silently dropped and never enforced](https://github.com/advisories/GHSA-52v5-jr5w-gjxr) (CVE-2026-48815).

**Affected dependency paths:**

- `angular17` — `sigstore`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → sigstore@2.3.1`. Installation: `node_modules/sigstore`.
- `angular18` — `sigstore`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → sigstore@2.3.1`. Installation: `node_modules/sigstore`.
- `angular19` — `sigstore`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → sigstore@3.1.0`. Installation: `node_modules/sigstore`.

**CI execution and actual risk:** The fixture installs sigstore through pacote, but does not perform certificate-OID verification using that library. No fixture security decision relies on its affected constraints. Installation uses the separately pinned npm CLI.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched verification implementation wherever OID constraints are relied on; update the old CLI dependency chain with compatibility tests. Do not describe the old fixture as validating registry attestations.

**Advisory patch versions:** `sigstore@4.1.1`.

### 21. GHSA-34x7-hfp2-rc4v — High

[node-tar Vulnerable to Arbitrary File Creation/Overwrite via Hardlink Path Traversal](https://github.com/advisories/GHSA-34x7-hfp2-rc4v) (CVE-2026-24842).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The vulnerable node-tar is installed under the Angular CLI/pacote dependency chain, but this build does not use that node-tar to extract archives. npm ci runs pinned npm 11.13.0 with its own dependencies. The subject tarball is unpacked using the system tar command. No untrusted archive reaches the affected fixture library in the tested flow.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not invoke the old CLI package-manager/archive paths. Move the CLI dependency chain to a patched node-tar after compatibility verification; a major override from tar 6 to 7 needs testing. Continue locked, registry-integrity-checked installation and bounded ephemeral jobs.

**Advisory patch versions:** `tar@7.5.7`.

### 22. GHSA-8qq5-rm4j-mr97 — High

[node-tar is Vulnerable to Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) (CVE-2026-23745).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The vulnerable node-tar is installed under the Angular CLI/pacote dependency chain, but this build does not use that node-tar to extract archives. npm ci runs pinned npm 11.13.0 with its own dependencies. The subject tarball is unpacked using the system tar command. No untrusted archive reaches the affected fixture library in the tested flow.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not invoke the old CLI package-manager/archive paths. Move the CLI dependency chain to a patched node-tar after compatibility verification; a major override from tar 6 to 7 needs testing. Continue locked, registry-integrity-checked installation and bounded ephemeral jobs.

**Advisory patch versions:** `tar@7.5.3`.

### 23. GHSA-83g3-92jg-28cx — High

[Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain in node-tar Extraction](https://github.com/advisories/GHSA-83g3-92jg-28cx) (CVE-2026-26960).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The vulnerable node-tar is installed under the Angular CLI/pacote dependency chain, but this build does not use that node-tar to extract archives. npm ci runs pinned npm 11.13.0 with its own dependencies. The subject tarball is unpacked using the system tar command. No untrusted archive reaches the affected fixture library in the tested flow.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not invoke the old CLI package-manager/archive paths. Move the CLI dependency chain to a patched node-tar after compatibility verification; a major override from tar 6 to 7 needs testing. Continue locked, registry-integrity-checked installation and bounded ephemeral jobs.

**Advisory patch versions:** `tar@7.5.8`.

### 24. GHSA-qffp-2rhf-9h96 — High

[tar has Hardlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-qffp-2rhf-9h96) (CVE-2026-29786).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The vulnerable node-tar is installed under the Angular CLI/pacote dependency chain, but this build does not use that node-tar to extract archives. npm ci runs pinned npm 11.13.0 with its own dependencies. The subject tarball is unpacked using the system tar command. No untrusted archive reaches the affected fixture library in the tested flow.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not invoke the old CLI package-manager/archive paths. Move the CLI dependency chain to a patched node-tar after compatibility verification; a major override from tar 6 to 7 needs testing. Continue locked, registry-integrity-checked installation and bounded ephemeral jobs.

**Advisory patch versions:** `tar@7.5.10`.

### 25. GHSA-9ppj-qmqm-q256 — High

[node-tar Symlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-9ppj-qmqm-q256) (CVE-2026-31802).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The vulnerable node-tar is installed under the Angular CLI/pacote dependency chain, but this build does not use that node-tar to extract archives. npm ci runs pinned npm 11.13.0 with its own dependencies. The subject tarball is unpacked using the system tar command. No untrusted archive reaches the affected fixture library in the tested flow.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not invoke the old CLI package-manager/archive paths. Move the CLI dependency chain to a patched node-tar after compatibility verification; a major override from tar 6 to 7 needs testing. Continue locked, registry-integrity-checked installation and bounded ephemeral jobs.

**Advisory patch versions:** `tar@7.5.11`.

### 26. GHSA-r6q2-hw4h-h46w — High

[Race Condition in node-tar Path Reservations via Unicode Ligature Collisions on macOS APFS](https://github.com/advisories/GHSA-r6q2-hw4h-h46w) (CVE-2026-23950).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The affected fixture node-tar extraction route is not invoked. This race additionally requires macOS APFS Unicode filename collisions; hosted jobs run Ubuntu 24.04. Local macOS testing is not a claim that this upstream library is fixed.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched node-tar before handling untrusted archives on macOS; maintain the no-fixture-archive-extraction boundary and validate any dependency-chain change.

**Advisory patch versions:** `tar@7.5.4`.

### 27. GHSA-23hp-3jrh-7fpw — Critical

[node-tar: Decompression/parse DoS via unlimited input](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) (CVE-2026-59873).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The vulnerable node-tar is installed under the Angular CLI/pacote dependency chain, but this build does not use that node-tar to extract archives. npm ci runs pinned npm 11.13.0 with its own dependencies. The subject tarball is unpacked using the system tar command. No untrusted archive reaches the affected fixture library in the tested flow.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not invoke the old CLI package-manager/archive paths. Move the CLI dependency chain to a patched node-tar after compatibility verification; a major override from tar 6 to 7 needs testing. Continue locked, registry-integrity-checked installation and bounded ephemeral jobs.

**Advisory patch versions:** `tar@7.5.19`.

### 28. GHSA-8x88-c5mf-7j5w — High

[node-tar: Negative tar entry size causes infinite loop in archive replace](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) (CVE-2026-59874).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The installed fixture node-tar replace API is not called by the browser build/test path. No archive with a crafted negative-size entry is provided to it.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use patched node-tar if archive replacement is introduced; upgrade through a tested compatible CLI chain. Do not accept untrusted archives in old compatibility jobs.

**Advisory patch versions:** `tar@7.5.18`.

### 29. GHSA-r292-9mhp-454m — High

[node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection](https://github.com/advisories/GHSA-r292-9mhp-454m) (CVE-2026-73566).

**Affected dependency paths:**

- `angular17` — `tar`, transitive fixture dependency: `fixture → @angular/cli@17.3.17 → pacote@17.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular18` — `tar`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → pacote@18.0.6 → tar@6.2.1`. Installation: `node_modules/tar`.
- `angular19` — `tar`, transitive fixture dependency: `fixture → @angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Installation: `node_modules/tar`.

**CI execution and actual risk:** The fixture does not call the installed node-tar listing/member-selection APIs. Crafted long-path archives do not reach the recursive member-filter path in this test flow.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use patched node-tar before adding archive selection/listing. Validate a major dependency-chain update rather than silently changing the historical framework fixture.

**Advisory patch versions:** `tar@7.5.21`.

### 30. GHSA-ph9p-34f9-6g65 — High

[tmp has Path Traversal via unsanitized prefix/postfix that enables directory escape](https://github.com/advisories/GHSA-ph9p-34f9-6g65) (CVE-2026-44705).

**Affected dependency paths:**

- `angular17` — `tmp`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → inquirer@9.2.15 → external-editor@3.1.0 → tmp@0.0.33`. Installation: `node_modules/tmp`.
- `angular18` — `tmp`, transitive fixture dependency: `fixture → @angular/cli@18.2.21 → @inquirer/prompts@5.3.8 → @inquirer/editor@2.2.0 → external-editor@3.1.0 → tmp@0.0.33`. Installation: `node_modules/tmp`.

**CI execution and actual risk:** The old tmp dependency is installed through external-editor/inquirer. Noninteractive ng build does not launch an external editor or pass untrusted prefix/postfix options to this tmp path.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use patched tmp through a compatible dependency update; no interactive editor prompts or attacker-selected temporary paths in CI.

**Advisory patch versions:** `tmp@0.2.6`.

### 31. GHSA-587h-7wmj-h5pm — High

[launch-editor: `fs.existsSync()` existence check can be bypassed on Windows](https://github.com/advisories/GHSA-587h-7wmj-h5pm) (CVE-2026-112942).

**Affected dependency paths:**

- `angular17` — `vite`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → vite@5.4.21`. Installation: `node_modules/vite`.
- `angular18` — `vite`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → @angular/build@18.2.21 → vite@5.4.21`. Installation: `node_modules/vite`.
- `angular19` — `vite`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@19.2.27 → @angular/build@19.2.27 → vite@6.4.2`. Installation: `node_modules/@angular/build/node_modules/vite`.

**CI execution and actual risk:** The affected Vite dev-server editor-launch endpoint is not started. Builds are served by a minimal localhost static server, and hosted runners use Linux rather than the Windows-specific vulnerable existence check.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not expose a historical Vite dev server. Evaluate a compatible patched Vite/toolchain version and retest; patched major-6/7 versions are listed by the advisory.

**Advisory patch versions:** `launch-editor@2.14.2`, `vite-plus@1.1.0`, `vite@6.4.4`, `vite@7.3.7`, `vite@8.1.6`, `vite@8.2.4`, `vite@8.3.3`.

### 32. GHSA-g84c-rxfj-3j2c — High

[webpack-dev-middleware vulnerable to Path Traversal via non-slash-terminated publicPath](https://github.com/advisories/GHSA-g84c-rxfj-3j2c) (CVE-2026-76844).

**Affected dependency paths:**

- `angular17` — `webpack-dev-middleware`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → webpack-dev-middleware@6.1.2`. Installation: `node_modules/webpack-dev-middleware`.
- `angular17` — `webpack-dev-middleware`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@17.3.17 → webpack-dev-server@4.15.1 → webpack-dev-middleware@5.3.4`. Installation: `node_modules/webpack-dev-server/node_modules/webpack-dev-middleware`.
- `angular18` — `webpack-dev-middleware`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → webpack-dev-middleware@7.4.2`. Installation: `node_modules/webpack-dev-middleware`.
- `angular19` — `webpack-dev-middleware`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@19.2.27 → webpack-dev-middleware@7.4.2`. Installation: `node_modules/webpack-dev-middleware`.

**CI execution and actual risk:** webpack-dev-middleware is installed but not used: the fixture builds with browser-esbuild and serves static output, never ng serve or webpack-dev-server. No request reaches the affected publicPath handler.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Do not start the vulnerable development server. Upgrade middleware/toolchain compatibly before serving untrusted requests; major-5/6 chains may require broader build-tool updates.

**Advisory patch versions:** `webpack-dev-middleware@7.4.6`, `webpack-dev-middleware@8.3.0`.

### 33. GHSA-gcq2-9pq2-cxqm — High

[http-proxy-middleware: multipart/form-data field injection via unescaped CRLF in `fixRequestBody`](https://github.com/advisories/GHSA-gcq2-9pq2-cxqm) (CVE-2026-55603).

**Affected dependency paths:**

- `angular18` — `http-proxy-middleware`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → http-proxy-middleware@3.0.5`. Installation: `node_modules/http-proxy-middleware`.
- `angular19` — `http-proxy-middleware`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@19.2.27 → http-proxy-middleware@3.0.5`. Installation: `node_modules/http-proxy-middleware`.

**CI execution and actual risk:** No HTTP proxy middleware or fixRequestBody request processing is configured in the fixture. Its local static server forwards no multipart requests.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use a patched compatible http-proxy-middleware version if proxying is introduced. Preserve the no-proxy build-test boundary.

**Advisory patch versions:** `http-proxy-middleware@3.0.7`, `http-proxy-middleware@4.1.1`.

### 34. GHSA-mw96-cpmx-2vgc — High

[Rollup 4 has Arbitrary File Write via Path Traversal](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) (CVE-2026-27606).

**Affected dependency paths:**

- `angular18` — `rollup`, transitive fixture dependency: `fixture → @angular-devkit/build-angular@18.2.21 → @angular/build@18.2.21 → rollup@4.22.4`. Installation: `node_modules/rollup`.

**CI execution and actual risk:** The affected Rollup is transitive in the Angular 18 toolchain. The fixed browser-esbuild build does not supply attacker-controlled Rollup chunk/module output paths; no malicious output-path route was demonstrated. Other Vite fixtures resolve patched Rollup. This can become a CI file-write risk if the old Rollup path is used with untrusted configuration.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Evaluate a compatible Rollup 4.59.0-or-later patch override and rerun Angular 18 compilation/browser behavior. Keep output configuration and plugins trusted.

**Advisory patch versions:** `rollup@2.80.0`, `rollup@3.30.0`, `rollup@4.59.0`.

### 35. GHSA-g2v6-rqmx-r4w6 — High

[@vue/server-renderer: XSS via missing CR in attribute-name blacklist](https://github.com/advisories/GHSA-g2v6-rqmx-r4w6).

**Affected dependency paths:**

- `vue32` — `@vue/server-renderer`, transitive fixture dependency: `fixture → vue@3.2.47 → @vue/server-renderer@3.2.47`. Installation: `node_modules/@vue/server-renderer`.

**CI execution and actual risk:** Vue 3.2 installs server-renderer transitively, but this is a client-only SFC build/browser mount. It does not render SSR attributes or use an attacker-controlled attribute-name SSR path.

**Secrets/write permissions:** None configured; shared read-only/ephemeral privilege boundary above applies. Runner availability and job artifact capabilities remain exposed if exploited.

**Mitigation:** Use patched Vue/server-renderer for SSR. Keep the historical 3.2 compatibility point isolated, and do not imply that agent-stage supports SSR/hydration.

**Advisory patch versions:** `@vue/server-renderer@3.5.42`, `@vue/server-renderer@3.6.0-rc.6`.
