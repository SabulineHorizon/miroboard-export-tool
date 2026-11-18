# Development guide

Build instructions, CLI reference, and checks for contributors. For desktop app
usage, see the [README](../README.md).

Development is on the `gui` branch. The Electron app and CLI share the extraction
pipeline and format generators. The desktop build targets Windows x64 and has
been checked on Windows 11; other platforms have not been validated for this GUI.

## Build and run from source

Desktop development requires Git, npm, and Node.js 22.12 or newer. Run in
PowerShell:

```powershell
git clone --branch gui https://github.com/SabulineHorizon/miroboard-export-tool.git
cd miroboard-export-tool
npm ci
npm run desktop
```

The first installation/build needs Internet access to download dependencies,
Electron, and packaging tools. Rerun `npm run desktop` after source edits. If npm
blocked Electron's install script, run `node node_modules/electron/install.js`
before launching.

```powershell
npm run dist:win  # release/Miro-Board-Exporter-0.1.0-portable.exe
npm run pack:win  # release/win-unpacked/Miro Board Exporter.exe
```

Close a running portable executable before rebuilding to the same filename. For
the folder-based build, distribute the entire `win-unpacked` folder together.

## CLI usage

The original CLI remains available for scripting, vault-relative asset paths,
coordinate scaling, dry runs, and verbose logging. Its runtime supports Node.js
20+; installing the desktop development tools uses the requirement above.

```powershell
npm run build
node dist/index.js --help

# Interactive prompts for credentials and export settings
node dist/index.js BOARD_ID
```

For automation, supply `MIRO_ACCESS_TOKEN` through your environment, then run:

```powershell
# All formats, including both tldraw variants
node dist/index.js BOARD_ID --format canvas,markdown,tldraw,drawio --tldraw-format both

# Preview extraction without writing files
node dist/index.js BOARD_ID --dry-run
```

CLI credential order is `--token` → `MIRO_ACCESS_TOKEN` → a `token` file in the
working directory → an interactive prompt. Prefer environment credentials for
scripts to avoid tokens in command-line arguments. The CLI's interactive token
prompt echoes input; the GUI uses a password field.

| Option | Purpose | Default |
| --- | --- | --- |
| `-o, --output <dir>` | Output folder | `./miro-export` |
| `-f, --format <formats>` | Comma-separated `canvas,markdown,tldraw,drawio` | `canvas,markdown` |
| `--tldraw-format <format>` | `tldr`, `obsidian`, or `both` | `both` |
| `--vault <path>` | Vault root; defaults output to its `miro-export/` subfolder and computes vault-relative asset paths | — |
| `--no-images` | Skip image/document downloads | Downloads enabled |
| `--scale <number>` | Coordinate scale factor | `1.0` |
| `--dry-run` | Extract and preview without writing files | Off |
| `--verbose` | Detailed terminal logging | Off |

## Development checks

```powershell
npm test
npm run typecheck
npm run build
npm run build:desktop
npm run test:desktop

# After npm run pack:win, test the packaged application
node scripts/test-desktop.mjs "release/win-unpacked/Miro Board Exporter.exe"
```

Build both the CLI and desktop app before `test:desktop`. Integration tests use a
dummy token and local API fixture, replace native folder dialogs and folder-opening
actions, and write screenshots and outputs to ignored `test-output/` directories.
On the validation host, Playwright could test the packaged application directly
but could not reliably attach through the self-extracting portable wrapper.

## Source layout

Both entry points use `src/export-board.ts`. The intermediate board representation
keeps Miro extraction separate from output generation.

| Path | Responsibility |
| --- | --- |
| `src/desktop/` | Electron main process, trusted IPC, validation, and safe errors |
| `desktop/` | Restricted preload bridge and local HTML/CSS/JS interface |
| `src/cli.ts` | CLI options, prompts, and terminal reporting |
| `src/export-board.ts` | Shared extraction and file-writing pipeline |
| `src/extract/` | Miro API extraction and asset downloads |
| `src/generate/` | Canvas, tldraw, draw.io, and Markdown generators |
| `src/model/`, `src/utils/` | Shared board types, transforms, and utilities |
| `src/__tests__/` | Unit and regression tests |
| `scripts/build-desktop.mjs` | Desktop bundling and resource copying |
| `scripts/test-desktop.mjs` | Offline desktop and CLI integration checks |

Build outputs (`dist/`, `desktop-dist/`, `release/`), dependencies, caches, and test
artifacts are excluded from Git. Release executables are distributed through
GitHub Releases rather than committed to the source tree.

## Reporting problems and contributing

When reporting a GUI problem, include your Windows version, app version or commit,
output format, reproduction steps, and displayed error. Remove tokens and private
board content from logs and screenshots. A small, anonymized example helps with
conversion problems.

For contributions, run the checks above and describe which workflow you tested.
Keep desktop-specific changes separate from shared exporter changes when practical.
Credit for the original CLI, extraction pipeline, and generators belongs to
[essoen/miroboard-export-tool](https://github.com/essoen/miroboard-export-tool).
