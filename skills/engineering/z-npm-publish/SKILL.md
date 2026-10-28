---
name: z-npm-publish
description: Publish a Node/TypeScript package to npm via GitHub Actions with OIDC trusted publishing and provenance. Use when setting up npm publishing, writing npm-publish.yml, or debugging an E404/permission error. Key gotcha — npm OIDC and `npm trust` cannot create a new package; publish once manually first. Triggers on "publish to npm", "trusted publisher", "npm provenance", "setup-node registry-url". Does not cover changelog upkeep; see [[z-changelog]].
allowed-tools: Read Edit Write Bash(npm:*) Bash(gh:*) Bash(git:*)
---

# Publish a Node package to npm with OIDC trusted publishing

Tag-triggered GitHub Actions publish authenticated by OIDC. Verify npm CLI ≥11.5.1 and Node ≥22.14.0, supported cloud-hosted runners, and matching repository identity. Automatic provenance applies to public packages published from public repositories through supported providers. Use the verified package scope.

## Bootstrap order — the package must exist first

npm OIDC and `npm trust` **cannot create a brand-new package**. Until the name exists on the registry, OIDC `npm publish` and `POST /-/package/<pkg>/trust` both return `E404 ... you do not have permission` (anti name-hijack). So the first publish is manual:

1. `npm run build && npm publish --access public` — once, locally, with npm login (handles 2FA/OTP). Creates the package.
2. `npm trust github <pkg> --allow-publish --repo <owner/repo> --file npm-publish.yml` — grants the workflow publish rights (npm ≥11.15.0, 2FA required). With an older publishing-capable CLI, configure the trusted publisher on the npm website.
3. Validate the new trusted publisher with a successful publish within its two-day activation window. Push the intended release tag only within the authorized release flow.

Prefer OIDC after bootstrap. If token authentication is required, use current granular token permissions and expiry, not removed classic automation tokens. Choose direct publishing or staged publishing explicitly. Current npm policy schedules removal of direct publishing with bypass-2FA tokens in January 2027; verify the current policy before setting up a pipeline.

## package.json

```jsonc
{
  "name": "@scope/pkg",
  "version": "0.1.0",
  "license": "Apache-2.0",
  "repository": { "type": "git", "url": "git+https://github.com/OWNER/REPO.git" },
  "bin": { "pkg": "dist/cli.js" },
  "files": ["dist", "README.md", "CHANGELOG.md"],
  "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org" }
}
```

`files` gates the tarball — `README.md` is auto-included, but `CHANGELOG.md` and any runtime assets must be listed. A `bin` needs a `#!/usr/bin/env node` shebang in its source (npm sets the exec bit on publish).

## Workflow: .github/workflows/npm-publish.yml

```yaml
name: Publish npm package
run-name: Publish ${{ github.ref_name }} to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write          # OIDC provenance
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
          package-manager-cache: false
      - run: npm ci
      - run: node -e "const p=require('./package.json');const t=process.env.GITHUB_REF_NAME;if(t!=='v'+p.version)throw new Error('tag '+t+' != v'+p.version)"
      - run: npm run build
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm publish --access public

  release:                     # optional: GitHub Release on success
    needs: publish
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
      - run: gh release create "$GITHUB_REF_NAME" --title "$GITHUB_REF_NAME" --verify-tag --generate-notes
        env:
          GH_TOKEN: ${{ github.token }}
```

The guard step aborts if the tag and `package.json` version disagree — this is what forces the bump-then-tag discipline. Use per-job `permissions` (least privilege): the publish job never needs `contents: write`.

## Cut a release

1. Bump `version` in `package.json` **and** `package-lock.json` (root `version` + `packages[""].version`).
2. Update `CHANGELOG.md` (see [[z-changelog]]).
3. Commit, then `git tag -a vX.Y.Z -m vX.Y.Z && git push origin <branch> && git push origin vX.Y.Z`.

## Do not

- **Pin the version in a test snapshot or check only its shape.** Compare the built CLI's reported version with the current `package.json` version, including prerelease and build metadata. A version bump must pass without a snapshot edit, and stale CLI output must fail.
- **Reuse a published version or tag.** npm rejects re-publishing an existing version; bump instead.
- **Set `NODE_AUTH_TOKEN` when using OIDC** — trusted publishing needs only `id-token: write`. Add the token env only on the token path.
- **Interpolate untrusted event input into `run:`** — the tag guard reads `process.env.GITHUB_REF_NAME`, never a `${{ }}` shell splice.

## Verify

```bash
npm pack --dry-run                                   # tarball name + files
npm view @scope/pkg version dist-tags                # after publish
gh run list --workflow npm-publish.yml --limit 1     # CI status
gh release view vX.Y.Z                               # release job output
```

Verify the exact package, version, registry, CI log, and registry result. A temporary 404 can reflect propagation, but do not assume that cause; retry within a bounded window and report unresolved disagreement.

## References

- [Trusted publishing](https://docs.npmjs.com/trusted-publishers/).
- [Granular access tokens and staged publishing](https://docs.npmjs.com/about-access-tokens/).
- [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

see [[z-changelog]] (release notes), [[z-go-ci]] (Go CI pipelines)
