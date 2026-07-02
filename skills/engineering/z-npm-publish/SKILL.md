---
name: z-npm-publish
description: Publish a Node/TypeScript package to npm via GitHub Actions with OIDC trusted publishing and provenance. Use when setting up npm publishing, writing .github/workflows/npm-publish.yml, configuring a scoped package, bootstrapping a first publish, or debugging an E404/permission error on publish. Key gotcha — npm OIDC and `npm trust` cannot create a new package; it must be published once manually first. Triggers on "publish to npm", "npm-publish workflow", "trusted publisher", "npm provenance", "npm publish 404", "setup-node registry-url". Does not cover changelog upkeep; see [[z-changelog]]. Does not cover commit message policy.
allowed-tools: Read Edit Write Bash(npm:*) Bash(gh:*) Bash(git:*)
---

# Publish a Node package to npm with OIDC trusted publishing

Tag-triggered GitHub Actions publish, authenticated by OIDC (no long-lived token), with signed provenance. Use your own scope, e.g. `@scope/*`, for scoped public packages.

## Bootstrap order — the package must exist first

npm OIDC and `npm trust` **cannot create a brand-new package**. Until the name exists on the registry, OIDC `npm publish` and `POST /-/package/<pkg>/trust` both return `E404 ... you do not have permission` (anti name-hijack). So the first publish is manual:

1. `npm run build && npm publish --access public` — once, locally, with npm login (handles 2FA/OTP). Creates the package.
2. `npm trust github <pkg> --allow-publish --repo <owner/repo> --file npm-publish.yml` — grants the workflow publish rights (npm v11+, 2FA required).
3. Push a `vX.Y.Z` tag — CI publishes via OIDC from now on.

Token alternative (skips 1–2, works for the first publish, but you manage a secret): create an npm automation token, add repo secret `NPM_TOKEN`, and set `env: NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` on the publish step.

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

- **Pin the version in a test snapshot.** The publish job runs the suite; a bump then fails `npm test` and blocks the release. Assert shape instead: `expect(v).toMatch(/^\d+\.\d+\.\d+/)`.
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

The `publish` job succeeding means `npm publish` exited 0 — a registry read 404 right after is CDN propagation lag, not a failed publish; trust the CI log (`+ @scope/pkg@X.Y.Z`).

see [[z-changelog]] (release notes), [[z-go-ci]] (Go CI pipelines)
