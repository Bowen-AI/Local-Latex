# Release Process

## GA readiness gates

Run these checks before creating a release tag:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run compile
npm run smoke
npm run package
npx vsce ls --no-dependencies
```

Review `npx vsce ls --no-dependencies` before publishing. The VSIX should include `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, compiled JavaScript under `out/`, `resources/runtime-manifest.json`, and `media/pdfjs/`. It should not include generated demo PDFs, generated SyncTeX files, sample projects, the website source, repository docs, source TypeScript, tests, CI files, or declaration files.

Manual verification for GA:

- Install the packaged VSIX in VS Code.
- Open `examples/demo-paper`.
- Run `LaTeX: Doctor` and confirm the detected platform is supported.
- Run `LaTeX: Compile Document` with a clean runtime cache to exercise first-run download, checksum verification, staged extraction, runtime metadata, compile, diagnostics, PDF preview, and SyncTeX click-to-source navigation.
- Verify compile refuses unsafe `latexOneClick.outputDirectory` values, including symlinked paths that resolve outside the workspace, then run `LaTeX: Clean Build Artifacts` against the default workspace `out/` directory and verify clean refuses the same unsafe targets.
- Compile a project whose folder or PDF name contains spaces, quotes, and uppercase `.TEX` to verify output-name handling and PDF preview webview escaping.
- Repeat the first-run download check on macOS arm64, macOS x64, Windows x64, and Linux x64 before marking the release GA.

External release blockers:

- `VSCE_PAT` must be set for Visual Studio Marketplace publishing.
- `OVSX_PAT` must be set for Open VSX publishing.
- The configured `publisher` in `package.json` must exist in each target marketplace account before publishing.

## Step-by-step production plan

1. Update release metadata: package version, `CHANGELOG.md`, runtime manifest, and compatibility docs.
2. Run `npm ci` from a clean checkout.
3. Run the GA readiness gates above and fix any failure before packaging.
4. Inspect `npx vsce ls --no-dependencies` and confirm the package contents match the allowlist above.
5. Install the generated VSIX locally and complete the manual verification checklist against `examples/demo-paper`.
6. Push the release branch and wait for CI to pass on Ubuntu, macOS, and Windows.
7. Tag the release with `vX.Y.Z` and confirm the GitHub Release artifact is produced.
8. Publish to Visual Studio Marketplace and Open VSX with `bash ./scripts/publish-extension.sh all`.
9. Verify marketplace listings, install from each marketplace, and compile the sample project once from a clean profile.

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
