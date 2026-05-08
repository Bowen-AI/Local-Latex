# Troubleshooting

## Tectonic binary not found

Run `LaTeX: Doctor` to see the binary path, download status, supported platform, workspace settings, resolved main file, and output-directory safety status.
If the binary is missing, trigger a compile — you will be prompted to download it.
Doctor remains available in limited mode when a workspace is untrusted or no folder is open. Compile, clean, preview, and root selection activate in those contexts, but they show a warning and do not access project files until a trusted workspace folder is open.

## Command says workspace trust is required

Trust the workspace from VS Code's Workspace Trust prompt, then rerun the command. Use `LaTeX: Doctor` before trusting only when you need limited diagnostics such as platform, runtime path, and workspace status.

## Compile fails with "Unsupported platform"

Linux arm64 and Windows arm64 are not yet supported.
See `resources/runtime-manifest.json` for supported platforms.

## PDF does not open after compile

Check that `latexOneClick.preview.autoOpen` is set to `true`.
If you have a PDF viewer extension installed, it should open automatically.
Otherwise, run `LaTeX: Open PDF` manually.

## Auto-compile on save not working

Ensure `latexOneClick.autoCompileOnSave` is `true` in your settings.
The file must have language ID `latex` or end with `.tex` using any casing, such as `.TEX` or `.TeX`.

## Compile times out

Increase `latexOneClick.compileTimeoutSec` (default: 60).
Large documents or first-run package downloads may take longer.

## Compile fails with "Invalid output directory"

Set `latexOneClick.outputDirectory` to a folder inside the current workspace, such as `out` or `build/latex`.
The extension refuses filesystem roots, the home directory, the workspace root, and paths outside the workspace.
Run `LaTeX: Doctor` to see both the configured value and the resolved absolute output directory.

## Main file is not detected

Set `latexOneClick.mainFile` to a `.tex` file inside the current workspace or add a workspace-local `% !TEX root = ...` directive.
The resolver ignores non-TeX files, paths outside the workspace, and symlinked TeX files that resolve outside the workspace.
Run `LaTeX: Doctor` to see the active editor, configured main file, and resolved main file.

## Missing packages / offline mode

If `latexOneClick.offlineOnly` is `true`, only cached packages are used.
Disable this setting to allow Tectonic to download missing packages on first compile.
If you need fully offline compilation, compile once while online to populate Tectonic's package cache, then enable `latexOneClick.offlineOnly`.
