# Release Process

## GA readiness gates

Run these checks before creating a release tag:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run compile
npm run assets:capture
npm run assets:marketplace
npm run smoke
LATEX_ONE_CLICK_REQUIRE_EXTENSION_HOST=1 npm run test:extension
npm run package:check
npm run package
npx vsce ls --no-dependencies
```

`npm run assets:capture` launches VS Code, opens `examples/demo-paper`, and captures genuine marketplace/project-page screenshots from the running extension. `npm run assets:marketplace` regenerates only non-screenshot marketplace artwork such as the package icon. `npm run package:check` validates the `npx vsce ls --no-dependencies` output against the GA package allowlist/blocklist and checks release-critical package metadata. The VSIX should include `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, compiled JavaScript under `out/`, `resources/runtime-manifest.json`, the marketplace README screenshots under `resources/readme/`, the marketplace icon, and `media/pdfjs/`. It should not include generated demo PDFs, generated SyncTeX files, sample projects, the website source, repository docs, source TypeScript, tests, CI files, local VSIX files, animated mock walkthrough GIFs, or declaration files. The same gate also fails if the runtime manifest has unsupported platform drift, placeholder checksums, wrong binary names, URLs that do not match the bundled runtime version, missing mixed-case TeX workspace activation, or exposed settings for features that are not implemented.

The same package gate also checks the marketplace README for the GA privacy disclosure: no telemetry, first-use runtime download from GitHub Releases, possible Tectonic package downloads during compilation, and the `latexOneClick.offlineOnly` opt-out for package fetching.

Manual verification for GA:

- Install the packaged VSIX in VS Code.
- Open `examples/demo-paper`.
- Run `LATEX_ONE_CLICK_REQUIRE_EXTENSION_HOST=1 npm run test:extension` on a machine with the VS Code `code` CLI to verify extension-host activation, command registration, Doctor, PDF preview, and Clean in an isolated temp workspace.
- Run `LaTeX: Doctor` and confirm runtime version, supported platform, binary readiness, workspace trust/root, resolved main file, resolved output directory, and key compile/preview settings are visible.
- Open an untrusted workspace or no-folder window and confirm `LaTeX: Doctor` still reports limited diagnostic state while compile, clean, preview, and root selection activate but stop with a trust or workspace warning before accessing project files.
- Run `LaTeX: Compile Document` with a clean runtime cache to exercise first-run download, checksum verification, staged extraction, runtime metadata, compile, diagnostics, PDF preview, and SyncTeX click-to-source navigation.
- Confirm the README privacy section accurately distinguishes telemetry from first-run runtime downloads and Tectonic package downloads, including the `latexOneClick.offlineOnly` behavior.
- Verify compile refuses unsafe `latexOneClick.outputDirectory` values, including symlinked paths that resolve outside the workspace, then run `LaTeX: Clean Build Artifacts` against the default workspace `out/` directory and verify clean refuses the same unsafe targets.
- Compile a project whose folder or PDF name contains spaces, quotes, and uppercase `.TEX` to verify output-name handling and PDF preview webview escaping.
- Keep `src/test/unit/pdfPreviewHtml.test.ts` green; it covers PDF preview title and resource URI escaping for spaces, quotes, ampersands, and script delimiter strings before the final extension-host smoke test.
- Repeat the first-run download check on macOS arm64, macOS x64, Windows x64, and Linux x64 before marking the release GA.

External release blockers:

- `VSCE_PAT` must be set for Visual Studio Marketplace publishing.
- `OVSX_PAT` must be set for Open VSX publishing.
- The configured `publisher` in `package.json` must exist in each target marketplace account before publishing.
- Commit and push regenerated marketplace assets before publishing. `vsce` rewrites relative README image links to GitHub raw URLs, so the Marketplace listing needs the PNG files to exist on the published branch as well as inside the VSIX.

## Step-by-step production plan

1. Update release metadata: package version, `CHANGELOG.md`, runtime manifest, and compatibility docs.
2. Run `npm ci` from a clean checkout.
3. Run the GA readiness gates above and fix any failure before packaging.
4. Run `npm run package:check` and inspect `npx vsce ls --no-dependencies` if the allowlist gate fails.
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
npm run package
```

This produces a `.vsix` file that can be installed via `Extensions: Install from VSIX...` in VS Code.

## Publishing to Visual Studio Marketplace

```bash
bash ./scripts/publish-extension.sh vscode
```

Requires a Personal Access Token with `Marketplace (Manage)` scope set as `VSCE_PAT`.

## Publishing to Open VSX (for Cursor/VSCodium ecosystems)

```bash
bash ./scripts/publish-extension.sh openvsx
```

Requires an Open VSX token set as `OVSX_PAT`.

## One-command publish script

Use the helper script to run all checks, package, and publish:

```bash
bash ./scripts/publish-extension.sh all
```

The helper publishes the same VSIX that passed `npm run package:check`; it does not repackage a different artifact during marketplace upload.

Or target a single marketplace:

```bash
bash ./scripts/publish-extension.sh vscode
bash ./scripts/publish-extension.sh openvsx
```

## Local test bed before publishing

```bash
npm run test:local
```

This runs compile/typecheck/lint/tests/smoke, runs the extension-host smoke when the `code` CLI is available, builds a VSIX, and installs locally when the `code` CLI is available.
