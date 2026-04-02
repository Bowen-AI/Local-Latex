# Release Process

## Steps

1. Update `CHANGELOG.md` with the new version entry.
2. Bump the version in `package.json`.
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push origin main --tags`
6. The `release.yml` workflow builds and publishes the VSIX to GitHub Releases automatically.

## Manual Packaging

```bash
npm run compile
npx vsce package --no-dependencies
```

This produces a `.vsix` file that can be installed via `Extensions: Install from VSIX...` in VS Code.

## Publishing to Visual Studio Marketplace

```bash
npx vsce publish
```

Requires a Personal Access Token with `Marketplace (Manage)` scope set as `VSCE_PAT`.

## Publishing to Open VSX (for Cursor/VSCodium ecosystems)

```bash
npx @open-vsx/ovsx publish
```

Requires an Open VSX token set as `OVSX_PAT`.

## One-command publish script

Use the helper script to run all checks, package, and publish:

```bash
bash ./scripts/publish-extension.sh all
```

Or target a single marketplace:

```bash
bash ./scripts/publish-extension.sh vscode
bash ./scripts/publish-extension.sh openvsx
```

## Local test bed before publishing

```bash
npm run test:local
```

This runs compile/typecheck/lint/tests/smoke, builds a VSIX, and installs locally when the `code` CLI is available.
