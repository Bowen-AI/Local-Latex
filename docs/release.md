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

## Publishing to Marketplace

```bash
npx vsce publish
```

Requires a Personal Access Token with `Marketplace (Manage)` scope set as `VSCE_PAT`.
