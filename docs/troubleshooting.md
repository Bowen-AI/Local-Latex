# Troubleshooting

## Tectonic binary not found

Run `LaTeX: Doctor` to see the binary path and download status.
If the binary is missing, trigger a compile — you will be prompted to download it.

## Compile fails with "Unsupported platform"

Linux arm64 and Windows arm64 are not yet supported.
See `resources/runtime-manifest.json` for supported platforms.

## PDF does not open after compile

Check that `latexOneClick.preview.autoOpen` is set to `true`.
If you have a PDF viewer extension installed, it should open automatically.
Otherwise, run `LaTeX: Open PDF` manually.

## Auto-compile on save not working

Ensure `latexOneClick.autoCompileOnSave` is `true` in your settings.
The file must have language ID `latex` or end with `.tex`.

## Compile times out

Increase `latexOneClick.compileTimeoutSec` (default: 60).
Large documents or first-run package downloads may take longer.

## Missing packages / offline mode

If `latexOneClick.offlineOnly` is `true`, only cached packages are used.
Disable this setting to allow Tectonic to download missing packages on first compile.
