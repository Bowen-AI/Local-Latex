# Security Model

## Binary Downloads

- Tectonic binaries are downloaded from official GitHub Releases only.
- SHA-256 checksums are verified before extraction (checksums with `PLACEHOLDER_` prefix are skipped in development).
- Downloaded archives are deleted immediately after extraction.

## Workspace Trust

- The extension checks `vscode.workspace.isTrusted` on activation.
- If the workspace is not trusted, the extension does not activate.

## No Telemetry

- Telemetry is disabled by default (`latexOneClick.telemetry.enabled: false`).
- No data is sent to any third-party service.

## Process Isolation

- Compilation runs in a child process (`spawn`) with `shell: false` to prevent shell injection.
- The working directory is set to the workspace root.

## Secrets

- No secrets, tokens, or credentials are stored or used.
