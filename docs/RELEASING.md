# Future beta release procedure — no publishing configured

Version remains **0.1.0**, an unreleased development version. This tooling phase does not approve distribution. Before the first release, obtain a separate final audit and explicit release approval. The proposed migration is **0.1.0-beta.0** on the npm **beta** dist-tag, not latest. Do not use npm version's default Git tagging behavior; an approved version-only update can use `npm version 0.1.0-beta.0 --no-git-tag-version` and must include package-lock.json. No version bump or tag was performed here.

The [2026-11-17 final gate audit](FINAL-RELEASE-AUDIT.md) returned **NOT READY**. Registry inspection found `agent-stage` already registered at `0.2.20`; publishing authority was not demonstrated. The proposed version above is conditional on an approved namespace and version plan, not permission to publish over an existing package. The now-public repository also needs enforced required checks on `master`. Resolve the audit's owner actions before selecting a release candidate; see the [historical fixture advisory assessment](FINAL-RELEASE-ADVISORIES.md) for residual compatibility-toolchain risks.

## Checklist

1. Verify repository/package ownership and registry name availability with the owner. Choose the approved exact commit and prerelease version; preserve public API migration notes.
2. Use the supported pinned Node version and `npm ci`. Confirm lockfiles and optional peers are intentional; root runtime dependencies must remain empty.
3. Run `npm run lint` and `npm run validate:release`. Review all security reports, actual CI results and supported peer/runtime boundaries. The historical fixture advisory report is not a clean dependency bill for those old frameworks.
4. Run the scheduled/manual compatibility workflow and inspect component builds, browser lifecycle/cleanup and version-specific failures. Run benchmarks/soak manually when appropriate; compare raw measurements without arbitrary noisy thresholds.
5. Dispatch Release validation. It runs existing validation and then rejects versions without an explicit -beta.N suffix. Its expected result on current 0.1.0 is refusal to create a distribution candidate. It has no registry credentials or publish step.
6. Inspect the local/CI npm pack tarball. The build clears generated dist; check:integrity verifies stale output removal, compares two clean TypeScript builds and verifies byte identity, five export targets, MIT license, lock metadata and file allowlist. The tarball must contain no hooks, test fixtures, GitHub config, node_modules, credentials or developer tools.
7. Review generated source/declaration maps and API compatibility notes. Record tarball digest, audit/toolchain versions, Git commit and artifact provenance. No automated workflow here approves release or guarantees registry acceptance.
8. Only after a separate approval, establish a dedicated, protected publishing workflow and trusted publisher identity. Publishing, tags and releases remain owner-controlled actions outside this implementation.

`validate:release` deliberately works on an unreleased checkout to validate content; the manual workflow adds the explicit prerelease gate. It does not automatically change versions or dist-tags.

## Trusted Publishing and provenance (future setup)

Follow the official [npm Trusted Publishing documentation](https://docs.npmjs.com/trusted-publishers/). An npm package owner must configure the exact GitHub organization/repository and publishing workflow filename (and environment, if used) in npm's trusted-publisher settings. Initial package bootstrapping/ownership must be confirmed with npm's then-current requirements; do not assume an uncreated package already has a trusted publisher.

A future GitHub-hosted publish job needs `contents: read` and `id-token: write` scoped only to that protected job, a supported npm CLI (currently npm documents >=11.5.1), and an exact trusted-publisher match. Use a protected environment with approval, vetted action revisions, the approved commit, npm ci and all validations. OIDC exchanges a short-lived identity, so no npm token or long-lived registry credential should be created for this design.

That future job would publish the approved tarball/version to the **beta** tag with provenance according to npm's current Trusted Publishing behavior. Recheck public repository/package and provenance eligibility immediately before implementation. Artifact upload is not npm provenance, and a SHA-256 digest alone is not an attestation. The workflows added here intentionally request no id-token permission and contain no publish command.

## Rollback and versioning policy

Pre-1.0 public API changes may require a new minor prerelease series; document migrations. Use increasing beta identifiers for candidates, never reuse registry versions. Correct a bad candidate with a new prerelease and deliberate dist-tag maintenance after approval; do not promise that deleting/unpublishing a package is a safe rollback. Stable 1.0 and latest-tag policy require a separate decision.
