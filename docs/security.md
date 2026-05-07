# Security Model

## Binary Downloads

- Tectonic binaries are downloaded from official GitHub Releases only.
- SHA-256 checksums are verified before extraction.
- GA runtime manifests must contain real 64-character SHA-256 checksums for every supported platform; `PLACEHOLDER_` checksums are only acceptable in unpublished local development builds.
- Installed runtime metadata is stored with the downloaded binary, so an extension update refreshes stale cached runtimes when the bundled manifest version, platform, binary name, or checksum changes.
- Downloaded archives are deleted immediately after extraction.

## Workspace Trust

- The extension checks `vscode.workspace.isTrusted` on activation.
- If the workspace is not trusted, the extension does not activate.

## No Telemetry

- No data is sent to any third-party service.

## Workspace Path Safety

- Compile and clean flows refuse filesystem roots, the user home directory, the workspace root, output directories outside the current workspace, and symlinked output paths that resolve outside the workspace.
- Automatic main-file resolution ignores configured files and `% !TEX root` directives that point outside the workspace or to non-`.tex` files.
- PDF preview webview resource URLs are emitted as escaped JavaScript string literals before they are embedded in the module script.

## Process Isolation

- Compilation runs in a child process (`spawn`) with `shell: false` to prevent shell injection.
- The working directory is set to the workspace root.

## Secrets

- No secrets, tokens, or credentials are stored or used.
