# GA Readiness Plan

This checklist tracks the remaining work required before marking LaTeX One-Click generally available.

## Last verification pass

Automation run: 2026-05-08 11:11 PDT, Codex macOS shell.

- Selected GA task: reduce remaining extension-host integration risk with a no-new-dependency VS Code CLI smoke harness.
- Acceptance criteria: the smoke uses an isolated temp VS Code profile and workspace; pre-seeds matching runtime metadata so activation does not prompt for a first-run download; verifies extension activation and contributed command registration; runs Doctor; opens the PDF preview through preserved preview state using a workspace path with spaces; exercises Clean against a temp output directory without touching tracked fixtures; skips clearly when `code` is unavailable unless `LATEX_ONE_CLICK_REQUIRE_EXTENSION_HOST=1` makes the gate mandatory; local testbed and release docs include the new gate; test files are excluded from the VSIX.
- Added `scripts/extension-host-smoke.js` and `test/extension-host/smoke.js` for the isolated extension-host smoke flow.
- Added `npm run test:extension`, wired it into `scripts/local-testbed.sh`, and excluded `test/**`/`.test.js` files from `.vscodeignore`.
- Updated README, release docs, changelog, and this GA plan with the new extension-host validation path.
- Passed direct local gates: `node -c scripts/check-package-contents.js`, `node -c scripts/smoke-test.js`, `node -c scripts/extension-host-smoke.js`, `node -c test/extension-host/smoke.js`, `bash -n scripts/local-testbed.sh`, `bash -n scripts/publish-extension.sh`, `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, direct strict typecheck for `scripts/smoke-test.ts` plus all unit/e2e test sources, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node_modules/.bin/vsce ls --no-dependencies`, and `git diff --check`.
- `node ./scripts/extension-host-smoke.js` skipped because the VS Code `code` CLI is unavailable in this Codex shell. Re-run with `LATEX_ONE_CLICK_REQUIRE_EXTENSION_HOST=1 npm run test:extension` on a machine with VS Code CLI.
- `node_modules/.bin/vitest run src/test/unit/workspaceAccess.test.ts src/test/unit/mainFileResolver.test.ts` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.
- `npm` and `npx` are not available on `PATH` in this Codex shell, so `npm run test:extension`, `npm test`, `npm run package`, and clean-environment package validation still need external validation.

Automation run: 2026-05-08 11:07 PDT, Codex macOS shell.

- Selected GA task: close a main-file path-safety gap where configured files, active editors, `% !TEX root` directives, or discovered `main.tex` files could pass lexical workspace checks while resolving through symlinks outside the workspace.
- Acceptance criteria: main-file resolution preserves existing workspace-local and mixed-case `.tex` behavior; existing TeX candidates are rejected when their real path is outside the real workspace; settings, active editor fallback, `% !TEX root`, root `main.tex`, nested `main.tex`, and single-file discovery use the same realpath-aware safety check; the shared Node filesystem adapter exposes realpath support; security/troubleshooting docs and changelog describe the symlink refusal.
- Updated `src/core/mainFileResolver.ts` to apply realpath-aware workspace checks to every automatic main-file candidate and fail closed when an existing candidate cannot be resolved.
- Updated `src/core/nodeFileSystem.ts` with a shared native realpath operation.
- Added resolver regression coverage for configured main files, `% !TEX root` directives, active editor fallbacks, and discovered main files that resolve outside the workspace through symlinks.
- Updated security docs, troubleshooting docs, changelog, and this GA plan for main-file symlink refusal.
- Passed direct local gates: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, direct strict typecheck for `scripts/smoke-test.ts` plus all unit/e2e test sources, `node_modules/.bin/tsc -p ./`, `node -c scripts/check-package-contents.js`, `node -c scripts/smoke-test.js`, `bash -n scripts/publish-extension.sh`, `bash -n scripts/local-testbed.sh`, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node ./scripts/extension-host-smoke.js` (skipped because VS Code CLI is unavailable), `node_modules/.bin/vsce ls --no-dependencies`, `git diff --check`, and a direct Node assertion against compiled `out/core/mainFileResolver.js` for symlink escape fallback.
- `node_modules/.bin/vitest run src/test/unit/mainFileResolver.test.ts` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.
- `npm` and `npx` are not available on `PATH` in this Codex shell, so `npm test`, `npm run package`, and clean-environment package validation still need external validation.

Automation run: 2026-05-08 11:06 PDT, Codex macOS shell.

- Selected GA task: make no-folder and untrusted-workspace command behavior match the support/security model before marketplace release.
- Acceptance criteria: all contributed commands explicitly activate from the command palette; `LaTeX: Doctor` remains available for limited diagnostics; compile, open-PDF, clean, and root-selection commands register in no-folder or untrusted contexts but stop with a clear warning before accessing project files; trusted workspace status bar, runtime prompt, auto-compile, compile, clean, preview, and root-selection behavior remains unchanged; smoke/package checks fail if command activation metadata or the compiled workspace-access guard is missing; docs describe the trust behavior users will see.
- Added `src/core/workspaceAccess.ts` and unit coverage for no-folder, untrusted-workspace, trusted-workspace, and warning-message cases.
- Refactored `src/extension.ts` so commands register before workspace trust/root initialization, trusted-only commands use the shared guard, and trusted workspace features initialize after a trust grant without exposing project-file access while untrusted.
- Added explicit `onCommand` activation events for compile, open-PDF, clean, select-root, and Doctor; updated smoke/package-content checks to require those events and `out/core/workspaceAccess.js`.
- Updated README, troubleshooting, security, release docs, changelog, and this GA plan to describe support warnings instead of unavailable commands.
- Passed direct local gates: `node -c scripts/check-package-contents.js`, `node -c scripts/smoke-test.js`, `node -c scripts/extension-host-smoke.js`, `bash -n scripts/publish-extension.sh`, `bash -n scripts/local-testbed.sh`, `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, direct strict typecheck for `scripts/smoke-test.ts` plus all unit/e2e test sources, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node_modules/.bin/vsce ls --no-dependencies`, direct Node assertions against compiled `out/core/workspaceAccess.js`, and `git diff --check`.
- `node ./scripts/extension-host-smoke.js` skipped because no VS Code CLI (`code` or `code-insiders`) is available on `PATH` in this Codex shell.
- `node_modules/.bin/vitest run src/test/unit/workspaceAccess.test.ts` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.
- `node_modules/.bin/vsce package --no-dependencies -o /private/tmp/latex-one-click-command-gating-test.vsix` still cannot complete here because its prepublish hook invokes `npm run vscode:prepublish`, and `npm` is not available on `PATH`.

Automation run: 2026-05-08 08:49 PDT, Codex macOS shell.

- Selected GA task: close security/privacy documentation drift before marketplace release.
- Acceptance criteria: public README distinguishes no telemetry from required/possible network access; README discloses first-use Tectonic runtime downloads from GitHub Releases, possible Tectonic package downloads during compilation, and `latexOneClick.offlineOnly` behavior; security docs describe limited support in untrusted/no-folder contexts without implying project-file access before trust/root checks pass; release/package checks fail if the marketplace README loses these GA privacy disclosures.
- Updated README, security, troubleshooting, release docs, changelog, and this GA plan to align privacy, offline-mode, and workspace-trust claims with implemented behavior.
- Added README privacy/network disclosure checks to `scripts/smoke-test.js`, `scripts/smoke-test.ts`, and `scripts/check-package-contents.js`.
- Passed direct local gates: `node -c scripts/check-package-contents.js`, `node -c scripts/smoke-test.js`, `node -c scripts/extension-host-smoke.js`, `bash -n scripts/publish-extension.sh`, `bash -n scripts/local-testbed.sh`, `git diff --check`, `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, direct strict typecheck for `scripts/smoke-test.ts` plus all unit/e2e test sources, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node ./scripts/extension-host-smoke.js`, and `node_modules/.bin/vsce ls --no-dependencies`.
- `node_modules/.bin/vitest run` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.
- `npm` and `npx` are not available on `PATH` in this Codex shell, so `npm run ...`, `npm test`, and `npm run package` still need clean-environment validation.

Automation run: 2026-05-08 06:07 PDT, Codex macOS shell.

- Selected GA task: reduce support/onboarding risk by making `LaTeX: Doctor` useful for first-run and misconfiguration triage, not just runtime/platform checks.
- Acceptance criteria: Doctor output includes runtime/platform status plus workspace trust/root, active editor, key compile/preview settings, resolved main file, resolved output directory, and output-directory safety; Doctor remains available in limited mode for untrusted or no-folder support diagnostics while compile/clean/preview/root selection stay gated behind trusted workspaces; report formatting is covered by pure unit-testable code; compile and doctor share the same filesystem-backed main-file resolver; smoke/package checks require the new compiled support modules and Doctor activation metadata; troubleshooting and release docs describe the expanded Doctor surface.
- Implemented `src/core/doctorReport.ts` for pure report rendering and `src/core/nodeFileSystem.ts` for shared filesystem-backed resolver operations.
- Updated `src/commands/doctor.ts` to report workspace, settings, main-file, and output-directory diagnostics, registered Doctor before workspace trust/root early returns, and updated `src/commands/compile.ts` to reuse the shared filesystem adapter.
- Added `src/test/unit/doctorReport.test.ts` and expanded smoke/package-content checks for `out/core/doctorReport.js`, `out/core/nodeFileSystem.js`, Doctor command activation, and limited untrusted-workspace support metadata.
- Updated README, troubleshooting, release docs, changelog, and this GA plan for the expanded diagnostic command.
- Passed direct local gates: `node -c scripts/check-package-contents.js`, `node -c scripts/smoke-test.js`, `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, direct strict typecheck for `scripts/smoke-test.ts` plus all unit/e2e test sources, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node_modules/.bin/vsce ls --no-dependencies`, `bash -n scripts/publish-extension.sh`, `bash -n scripts/local-testbed.sh`, direct Node assertions against compiled `out/core/doctorReport.js` and Doctor activation/package metadata, and `git diff --check`.
- `node_modules/.bin/vitest run src/test/unit/doctorReport.test.ts` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.
- `npm` is not available on `PATH` in this Codex shell, so `npm test`, `npm run package`, and `npm run test:local` still need clean-environment validation.

Automation run: 2026-05-08 05:47 PDT, Codex macOS shell.

- Selected GA task: close the release-path gap where `npm run package` inherited VSIX file-list checks but not the smoke test's release-critical metadata checks.
- Acceptance criteria: `scripts/check-package-contents.js` fails on runtime manifest platform drift, placeholder or malformed runtime checksums, wrong runtime binary names, runtime URLs that do not include the bundled manifest version, missing mixed-case TeX workspace activation, or exposed unimplemented settings; `npm run package` keeps inheriting these checks through `npm run package:check`; release docs describe the stronger gate.
- Implemented package metadata and runtime manifest validation inside `scripts/check-package-contents.js` alongside the existing VSIX allowlist/blocklist.
- Updated README, release docs, and changelog to describe the expanded GA package gate.
- Passed direct local gates: `node -c scripts/check-package-contents.js`, `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node_modules/.bin/vsce ls --no-dependencies`, `git diff --check`, `bash -n scripts/publish-extension.sh`, and `bash -n scripts/local-testbed.sh`.
- Typechecked test and smoke sources directly with `node_modules/.bin/tsc --noEmit --target ES2022 --module commonjs --lib ES2022 --types node --esModuleInterop --skipLibCheck --strict scripts/smoke-test.ts src/test/unit/*.test.ts src/test/e2e/*.test.ts`.
- `node_modules/.bin/vitest run` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.
- `npm` is not available on `PATH` in this Codex shell, so `npm run package:check`, `npm test`, and `npm run package` still need clean-environment validation even though their direct underlying commands were exercised where possible.

Automation run: 2026-05-08 04:08 PDT, Codex macOS shell.

- Selected GA task: reduce the remaining PDF preview/webview GA risk for projects whose workspace or PDF names contain spaces, quotes, ampersands, or script-breaking delimiters.
- Acceptance criteria: preview HTML generation is testable without a live VS Code host; PDF titles are HTML-escaped; PDF.js module, worker, PDF, CMap, and standard-font webview URIs are emitted as safe JavaScript string literals; resource root URLs keep one trailing slash; smoke/package checks require the compiled preview HTML module.
- Implemented a pure `buildPdfPreviewHtml` builder used by the VS Code webview path and added regression coverage for hostile PDF names and resource URLs.
- Updated smoke and package-content checks to require `out/preview/pdfPreviewHtml.js` in the GA VSIX surface.
- Passed direct local gates: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node_modules/.bin/vsce ls --no-dependencies`, `git diff --check`, `bash -n scripts/publish-extension.sh scripts/local-testbed.sh`, and direct Node assertions against the compiled preview HTML builder.
- Typechecked test and smoke sources directly with `node_modules/.bin/tsc --noEmit --target ES2022 --module commonjs --lib ES2022 --types node --esModuleInterop --skipLibCheck --strict scripts/smoke-test.ts src/test/unit/*.test.ts src/test/e2e/*.test.ts`.
- `node_modules/.bin/vitest run src/test/unit/pdfPreviewHtml.test.ts src/test/unit/htmlEscaping.test.ts` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.

Automation run: 2026-05-08 03:39 PDT, Codex macOS shell.

- Completed GA task: extension activation now uses the mixed-case TeX glob for `workspaceContains`, so folders containing only `.TEX` or `.TeX` files can activate before a file is opened.
- Completed GA task: the unused compile-all command implementation and stale compiled artifacts were removed from the GA package surface.
- Completed GA task: release and marketplace helper scripts now build through the checked package path and publish the exact deterministic VSIX filename that passed the package-content gate.
- Added a smoke-test assertion that fails if the mixed-case TeX workspace activation event is removed.
- Tightened the VSIX package-content check so the compiled command/config/core/preview/runtime dependency graph is required and stale `out/commands/compileAll.js` artifacts are rejected if they reappear.
- Added `npm run package:check` and wired package, CI, nightly, release, local testbed, and marketplace publish flows through the automated package-content gate.
- Updated README, troubleshooting, release docs, and changelog for mixed-case TeX activation, package-content checks, and exact-artifact marketplace publishing.
- Passed direct local gates: `node -c scripts/check-package-contents.js`, `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, `bash -n scripts/publish-extension.sh scripts/local-testbed.sh`, `node ./scripts/smoke-test.js`, `node ./scripts/check-package-contents.js`, `node_modules/.bin/vsce ls --no-dependencies`, and `git diff --check`.
- Typechecked test and smoke sources directly with `node_modules/.bin/tsc --noEmit --target ES2022 --module commonjs --lib ES2022 --types node --esModuleInterop --skipLibCheck --strict scripts/smoke-test.ts src/test/unit/*.test.ts src/test/e2e/*.test.ts`.
- Ran direct Node assertions for the package activation event and shared mixed-case TeX helper.
- Confirmed `vsce publish --help` supports `--packagePath`, which the release helper now uses for Visual Studio Marketplace publishing.
- `node_modules/.bin/vitest run` still cannot start in this Codex shell because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.
- `npm` and `npx` are not available on `PATH` in this Codex shell, so normal `npm run ...` commands and `npm run package` still need clean-environment validation.
- `node_modules/.bin/vsce package --no-dependencies -o /private/tmp/latex-one-click-ga-test.vsix` still cannot complete here because its prepublish hook invokes `npm run vscode:prepublish`, and `npm` is not available on `PATH`.

Automation run: 2026-05-07 22:28 PDT, Codex macOS shell.

- Completed GA task: case-insensitive TeX file detection is now shared by resolver, auto-compile save handling, and VS Code workspace file discovery.
- Added regression coverage for mixed-case `.TeX`/`.TEX` settings and active-editor resolution, plus a shared TeX-file helper test.
- Passed direct local gates: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint src`, `node_modules/.bin/tsc -p ./`, `node ./scripts/smoke-test.js`, and `node_modules/.bin/vsce ls --no-dependencies`.
- Typechecked test sources directly with `node_modules/.bin/tsc --noEmit --target ES2022 --module commonjs --lib ES2022 --types node --esModuleInterop --skipLibCheck --strict src/test/unit/*.test.ts src/test/e2e/*.test.ts`.
- Ran direct Node assertions against compiled modules for the shared TeX-file helper and mixed-case main-file resolution.
- `npm` and `npx` are not available on `PATH` in this Codex shell, so normal `npm run ...` commands and `npm run package` cannot be completed here.
- `node_modules/.bin/vitest run src/test/unit/texFiles.test.ts src/test/unit/mainFileResolver.test.ts` still cannot start because the Codex-bundled Node process rejects Rollup's native macOS optional package with a code-signature error. Re-run in a standard Node 20 + npm environment installed outside the Codex app.

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
- Run `LATEX_ONE_CLICK_REQUIRE_EXTENSION_HOST=1 npm run test:extension` on a machine with the VS Code `code` CLI.
- In a packaged VSIX, manually verify no-folder and untrusted-workspace command palette behavior: Doctor reports limited diagnostics, while compile, open-PDF, clean, and root selection show trust/workspace warnings before file access.
- Exercise projects with spaces and quotes in workspace/PDF names in the extension host; pure preview HTML escaping is now covered by automated unit/direct-node checks, but host rendering still needs manual GA validation.

## Cross-functional review snapshot

- Engineering: Core architecture is appropriately layered for a VS Code extension. Remaining engineering risk is mostly integration execution rather than harness absence: the new extension-host smoke, runtime download/extraction, and packaging need clean-machine validation.
- Product / PM: The user problem and GA workflow are clear: open a LaTeX folder, compile with no separate TeX install, view the PDF, and diagnose failures. Runtime-channel controls, telemetry, and broad TeX project formats remain non-goals until implemented.
- Customer / User: README, demo project, troubleshooting, doctor command, and settings table cover basic onboarding. Remaining friction is first-run download behavior and manual validation of unusual paths with spaces and quotes.
- QA: Unit coverage exists for resolver, compiler args, runtime readiness, workspace safety, preview HTML escaping, preview state, SyncTeX, process timeouts, and log parsing. A VS Code CLI extension-host smoke now covers activation, command registration, Doctor, PDF preview, and Clean when `code` is available; full Vitest execution still needs a normal Node 20/npm environment.
- Security: Runtime checksums, limited Doctor support before workspace trust, shell-free process spawning, output-directory safety, main-file symlink escape refusal, no telemetry, and Tectonic package-download behavior are documented and covered. Release still depends on validating first-run runtime downloads on all supported platforms.
- DevOps / SRE: CI, nightly, release, Pages, smoke, package-content validation, release metadata checks, and local testbed scripts exist. GA still needs clean CI parity, marketplace credential confirmation, and rollback/release artifact verification.
- Documentation: README, compatibility, security, troubleshooting, architecture, release, changelog, and GA plan are present. Docs should stay aligned after the final manual VSIX run.
- Support / Onboarding: Doctor now exposes runtime, workspace, settings, main-file, and output-directory health for common first-run failures. Marketplace install instructions and known limitations are adequate for MVP GA, pending final release validation.
- Command-palette support now has a clearer failure mode in no-folder and untrusted workspaces: contributed commands activate and show specific trust/workspace warnings instead of appearing unavailable.

## Execution plan

1. Start from a clean checkout and run `npm ci`.
2. Run static and unit gates: `npm run lint`, `npm run typecheck`, and `npm test`.
3. Run build and integration gates: `npm run compile`, `npm run smoke`, `LATEX_ONE_CLICK_REQUIRE_EXTENSION_HOST=1 npm run test:extension`, `npm run package:check`, and `npm run package`.
4. Inspect package contents with `npx vsce ls --no-dependencies` only if `npm run package:check` fails.
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
- Main-file resolution refuses non-`.tex` files, paths outside the workspace, and symlinked TeX files that resolve outside the workspace, including from settings, active editor fallback, workspace discovery, and `% !TEX root` directives.
- Doctor reports runtime/platform state, workspace trust/root, active editor, settings, resolved main file, resolved output directory, and output-directory safety, including limited diagnostics before workspace trust/root gating.
- All contributed commands activate from the command palette; project-file commands stop with a clear trust/workspace warning in no-folder or untrusted contexts.
- The VS Code CLI extension-host smoke passes on a machine with `code`, proving activation, command registration, Doctor, PDF preview, and Clean in an isolated workspace.
- Extension activation, auto-compile, root-file selection, and workspace file discovery recognize uppercase and mixed-case `.TEX` filenames.
- VSIX package contents are validated by an automated allowlist/blocklist check before packaging and marketplace publish flows.
- Package checks validate release-critical runtime manifest metadata, mixed-case TeX workspace activation, and absence of exposed unimplemented settings before packaging.
- Package checks validate that the marketplace README discloses no telemetry, first-use GitHub runtime downloads, possible Tectonic package downloads, and `latexOneClick.offlineOnly`.
- PDF preview webview URLs are safely embedded even when local paths contain spaces, quotes, or HTML/script delimiter characters.
- Published settings have implemented behavior; planned runtime-channel, telemetry, and log-verbosity controls are not exposed until they work.
- The VSIX excludes generated PDFs, SyncTeX output, sample projects, website source, repository docs, tests, local VSIX files, declaration files, and TypeScript source.
- Marketplace README, compatibility notes, troubleshooting notes, and release instructions reflect Tectonic 0.16.9.
