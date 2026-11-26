---
name: z-npm-publish
description: "Publish npm packages through GitHub Actions with trusted publishing and OIDC. Use for package bootstrap, workflow permissions, release tags, tarball checks, and release verification."
allowed-tools: Read Edit Write Bash(npm:*) Bash(gh:*) Bash(git:*)
---

# Publish a Node package to npm with OIDC trusted publishing

Use GitHub-hosted runners for GitHub Actions OIDC. Match the repository, workflow filename, package name, and scope. Use npm CLI 11.5.1 or later and Node.js 22.14.0 or later. Public packages from public repositories can receive automatic provenance.

## Bootstrap a new package

Set up the first trusted publisher on an existing package. For a new name, publish its first authorized release with a maintainer account.

1. Build and inspect the package. For a public package, authenticate locally and run `npm publish --access public`.
2. Configure the workflow in npm package settings. With npm 11.15.0 or later, use `npm trust github <pkg> --allow-publish --repo <owner/repo> --file npm-publish.yml` for direct publishing. Complete the required two-factor authentication.
3. Complete the publisher's first successful publish within two days. Use the approved release flow and a new package version.

Use OIDC after bootstrap. Select staged or direct publishing according to the release policy. For token-based publishing, check current granular-token permissions, expiry, and registry restrictions.

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

Inspect the tarball with `npm pack --dry-run`. Include the changelog and runtime assets in `files` where applicable. Add the Node shebang to a JavaScript CLI entrypoint.

## GitHub Actions workflow

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
    runs-on: ubuntu-latest
    timeout-minutes: 20
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
      - run: npm test # configure the project's test runner with a worker limit
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

Grant `id-token: write` to the publish job. Grant `contents: write` only to the optional GitHub Release job. The tag guard rejects a mismatch with the package version.

## Cut a release

1. Bump `version` in `package.json` **and** `package-lock.json` (root `version` + `packages[""].version`).
2. Update `CHANGELOG.md` (see [[z-changelog]]).
3. Commit, then `git tag -a vX.Y.Z -m vX.Y.Z && git push origin <branch> && git push origin vX.Y.Z`.

## Do not

- Test only the shape of a version string. Compare the built CLI version with `package.json`, including prerelease and build metadata.
- Reuse a published package version or release tag. Select a new version for a new release.
- **Set `NODE_AUTH_TOKEN` when using OIDC** — trusted publishing needs only `id-token: write`. Add the token env only on the token path.
- **Interpolate untrusted event input into `run:`** — the tag guard reads `process.env.GITHUB_REF_NAME`, never a `${{ }}` shell splice.

## Checks

```bash
npm pack --dry-run                                   # tarball name + files
npm view @scope/pkg version dist-tags                # after publish
gh run list --workflow npm-publish.yml --limit 1     # CI status
gh release view vX.Y.Z                               # release job output
```

Compare the exact registry, package, version, workflow run, and release result. Retry a temporary 404 within a bounded window. Report a persistent mismatch.

## References

- [Trusted publishing](https://docs.npmjs.com/trusted-publishers/).
- [Granular access tokens](https://docs.npmjs.com/about-access-tokens/) and [staged publishing](https://docs.npmjs.com/staged-publishing/).
- [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

see [[z-changelog]] (release notes), [[z-go-ci]] (Go CI pipelines)
