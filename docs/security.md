# Security Model

## Binary Downloads

- Tectonic binaries are downloaded from official GitHub Releases only.
- SHA-256 checksums are verified before extraction.
- GA runtime manifests must contain real 64-character SHA-256 checksums for every supported platform; `PLACEHOLDER_` checksums are only acceptable in unpublished local development builds.
- Installed runtime metadata is stored with the downloaded binary, so an extension update refreshes stale cached runtimes when the bundled manifest version, platform, binary name, or checksum changes.
- Downloaded archives are deleted immediately after extraction.

## TeX Package Downloads

- Compilation runs locally through Tectonic, but Tectonic may download missing TeX packages during normal builds.
- Set `latexOneClick.offlineOnly` to `true` to prevent Tectonic package downloads after the required packages are already cached.

## Workspace Trust

- `LaTeX: Doctor` is registered before workspace-trust gating so users can inspect runtime and workspace status in untrusted or no-folder windows.
- Compile, clean, preview, and root-selection commands are also registered in untrusted or no-folder windows, but their command handlers stop with a warning before project-file access.
- Status-bar, first-run runtime prompt, and auto-compile behavior initialize only after a trusted workspace folder is available.

## No Telemetry

- No telemetry is collected or sent.
- Network access is limited to the first-use Tectonic runtime download and any Tectonic package downloads allowed by the user's `latexOneClick.offlineOnly` setting.

## Workspace Path Safety

- Compile and clean flows refuse filesystem roots, the user home directory, the workspace root, output directories outside the current workspace, and symlinked output paths that resolve outside the workspace.
- Automatic main-file resolution ignores configured files, active editor fallbacks, discovered `main.tex` files, and `% !TEX root` directives that point outside the workspace, resolve outside the workspace through symlinks, or point to non-`.tex` files.
- PDF preview titles are HTML-escaped, and webview resource URLs are emitted as escaped JavaScript string literals before they are embedded in the module script.

## Process Isolation

- Compilation runs in a child process (`spawn`) with `shell: false` to prevent shell injection.
- The working directory is set to the workspace root.

## Secrets

- No secrets, tokens, or credentials are stored or used.
