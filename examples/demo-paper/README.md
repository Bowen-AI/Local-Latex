# LaTeX One-Click Demo Paper

This is a tiny workspace you can open in VS Code to try the extension.

## Try it

1. Open this folder in VS Code.
2. Open `main.tex`.
3. Run `LaTeX: Compile Document` from the command palette.
4. The extension downloads Tectonic if needed, writes the PDF to `out/main.pdf`, and opens the PDF preview.
5. Click text in the PDF preview to jump back to the nearest source line.

The `sections/findings.tex` file includes a `% !TEX root = ../main.tex` directive, so compiling while that file is active still builds the full paper.
