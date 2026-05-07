# GA Readiness Plan

This checklist tracks the remaining work required before marking LaTeX One-Click generally available.

## Last verification pass

Automation run: 2026-05-07 06:56 PDT, Codex macOS shell.

- Passed direct local gates: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, `node ./scripts/smoke-test.js`, and `node_modules/.bin/vsce ls --no-dependencies`.
- Typechecked test sources directly with `node_modules/.bin/tsc --noEmit --target ES2022 --module commonjs --lib ES2022 --types node --esModuleInterop --skipLibCheck --strict src/test/unit/*.test.ts src/test/e2e/*.test.ts`.
- Added and compiled regression coverage for output directories that escape the workspace through symlinks.
- Ran direct Node assertions against compiled modules for symlink output-directory refusal, clean-command symlink refusal, runtime manifest shape, runtime readiness metadata, Windows zip extraction command selection, unsupported platform refusal, process timeouts, PDF preview script-literal escaping, and preview state preservation.
- Verified package contents with `node_modules/.bin/vsce ls --no-dependencies`; the allowlist contains 221 files and excludes source TypeScript, tests, docs, scripts, website source, examples, coverage, local VSIX files, and declaration files.
- Warm local performance: typecheck 0.30s, lint 0.33s, compile 0.34s, smoke 0.04s, package-content listing 0.21s.
- `npm` is not available on `PATH` in this Codex shell, so `npm run ...` commands and normal `vsce package --no-dependencies` prepublish execution cannot be completed here.
- `node_modules/.bin/vitest run` cannot start because the Codex-bundled Node process rejects Rollup's native macOS optional package with an invalid code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.

## Current blockers

- Run the full test suite and packaging command in a clean Node 20 + npm environment that matches CI and marketplace release machines.
- Confirm `npm test` executes the Vitest suite, including workspace safety, symlink output-directory refusal, runtime manager, process runner, log parser, SyncTeX, and PDF preview state coverage.
- Validate first-run runtime provisioning on every supported platform: macOS arm64, macOS x64, Windows x64, and Linux x64.
- Confirm Visual Studio Marketplace and Open VSX publisher ownership, plus `VSCE_PAT` and `OVSX_PAT` credentials.
- Install the final VSIX in VS Code and exercise compile, diagnostics, PDF preview, preserved preview state, clean, select-root, and doctor commands against the demo project.
- Exercise projects with spaces, quotes, and uppercase `.TEX` names to verify PDF preview webview escaping and output-path handling in the extension host.
- Add automated VS Code extension-host coverage for command and webview flows, or keep those flows as explicit manual GA acceptance checks until such tests exist.

## Execution plan

1. Start from a clean checkout and run `npm ci`.
2. Run static and unit gates: `npm run lint`, `npm run typecheck`, and `npm test`.
3. Run build gates: `npm run compile`, `npm run smoke`, and `npm run package`.
4. Inspect package contents with `npx vsce ls --no-dependencies`.
5. Install the generated VSIX locally and compile `examples/demo-paper/main.tex`.
6. Clear the extension runtime cache and repeat one compile to verify runtime download, checksum verification, archive extraction, and executable permissions.
7. Repeat the first-run runtime check on each supported OS/architecture pair.
8. Publish a release candidate to a private/manual test profile when marketplace credentials are available.
9. Update `CHANGELOG.md`, bump `package.json`, tag the release, and let `.github/workflows/release.yml` produce the GitHub release artifact.
10. Publish to Visual Studio Marketplace and Open VSX after the tagged artifact passes manual install verification.

## Release acceptance criteria

- CI is green on Ubuntu, macOS, and Windows.
- Runtime provisioning fails gracefully on unsupported platforms instead of selecting an x64 binary.
- Windows runtime extraction uses the built-in PowerShell archive path.
- Runtime extraction uses a fresh staging directory and only marks the runtime ready after installed metadata matches the bundled manifest.
- Compile and clean refuse unsafe output targets, including filesystem roots, the home directory, the workspace root, output directories outside the workspace, and symlinked paths that resolve outside the workspace.
- Main-file resolution refuses non-`.tex` files and paths outside the workspace, including from settings and `% !TEX root` directives.
- PDF preview webview URLs are safely embedded even when local paths contain spaces, quotes, or HTML/script delimiter characters.
- Published settings have implemented behavior; planned runtime-channel, telemetry, and log-verbosity controls are not exposed until they work.
- The VSIX excludes generated PDFs, SyncTeX output, sample projects, website source, repository docs, tests, local VSIX files, declaration files, and TypeScript source.
- Marketplace README, compatibility notes, troubleshooting notes, and release instructions reflect Tectonic 0.16.9.
