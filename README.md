# miro-migrator

Migrate Miro boards to Obsidian Canvas, tldraw, draw.io, and Markdown via the Miro REST API.

## Output Formats

- **Canvas** (`.canvas`) — Obsidian Canvas JSON spec
- **tldraw** (`.tldr`) — for [tldraw.com](https://tldraw.com) or any tldraw-compatible tool
- **tldraw for Obsidian** (`.tldraw.md`) — for the [tldraw-in-obsidian](https://github.com/holxsam/tldraw-in-obsidian) plugin
- **draw.io** (`.drawio`) — mxGraph XML for [draw.io / diagrams.net](https://www.diagrams.net)
- **Markdown** (`.md`) — individual notes per item + board index

## Usage

```bash
# Interactive mode — prompts for token and options
npx tsx src/index.ts https://miro.com/app/board/BOARD_ID/

# Export all formats to an Obsidian vault (outputs to ~/vault/miro-export/)
MIRO_ACCESS_TOKEN=xxx npx tsx src/index.ts BOARD_ID \
  --vault ~/path/to/vault \
  --format canvas,markdown,tldraw,drawio

# Export draw.io only
MIRO_ACCESS_TOKEN=xxx npx tsx src/index.ts BOARD_ID --format drawio

# Export tldraw only (.tldr for tldraw.com)
MIRO_ACCESS_TOKEN=xxx npx tsx src/index.ts BOARD_ID \
  --format tldraw --tldraw-format tldr

# Dry run (no files written)
MIRO_ACCESS_TOKEN=xxx npx tsx src/index.ts BOARD_ID --dry-run
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --token <token>` | Miro access token (or `MIRO_ACCESS_TOKEN` env, or `token` file in cwd) | — |
| `-o, --output <dir>` | Output directory | `./miro-export` |
| `-f, --format <fmts>` | Comma-separated: `canvas`, `markdown`, `tldraw`, `drawio` | `canvas,markdown` |
| `--tldraw-format <fmt>` | tldraw output: `tldr`, `obsidian`, or `both` | `both` |
| `--vault <path>` | Obsidian vault root — defaults output to `{vault}/miro-export` and computes vault-relative image paths | — |
| `--no-images` | Skip image/document download | — |
| `--scale <number>` | Coordinate scale factor | `1.0` |
| `--dry-run` | Preview extraction without writing files | — |
| `--verbose` | Detailed logging | — |

Requires a Miro OAuth token with `boards:read` scope. Token is resolved in order: `--token` flag → `MIRO_ACCESS_TOKEN` env → `token` file in cwd → interactive prompt.

## Development

### Setup

```bash
git clone <repo> && cd miro-migrator
npm install
npm test          # 98 tests via vitest
npm run build     # build with tsup
```

Requires Node.js >= 20.

### Structure

```
src/
  index.ts                          # Entry point
  cli.ts                            # CLI (commander) with interactive mode
  model/
    types.ts                        # IR types (IRBoard, IRNode, IREdge, IRAsset)
    color.ts                        # Miro named colors → hex parsing
    coordinate-transform.ts         # Miro center-origin → top-left
  extract/
    miro-extractor.ts               # Bulk fetch + concurrent detail-fetch → IR
    image-downloader.ts             # Two-step image download (API → CDN)
  generate/
    canvas/
      canvas-generator.ts           # IR → .canvas (JSON Canvas spec)
      canvas-color-map.ts           # Miro colors → Canvas presets
    tldraw/
      tldraw-generator.ts           # IR → .tldr (tldraw JSON)
      tldraw-color-map.ts           # Miro colors → tldraw named colors
      tldraw-obsidian-wrapper.ts    # .tldr → .tldraw.md for Obsidian plugin
    drawio/
      drawio-generator.ts           # IR → .drawio (mxGraph XML)
      drawio-color-map.ts           # Miro colors → draw.io fill/stroke hex pairs
    markdown/
      markdown-generator.ts         # IR → .md notes + board index
  utils/
    rate-limiter.ts                 # Token bucket (800 req/min)
    progress.ts                     # CLI progress bar
    html-to-markdown.ts             # Miro HTML → Markdown
    id-map.ts                       # Miro ID → stable short ID mapping
  __tests__/                        # vitest unit tests
```

### Architecture

```
Miro REST API (v2 + v1) ──> [Extractor] ──> Intermediate Representation (IR)
                                                    │
                                  ┌─────────────────┼──────────────┬──────────────┐
                                  │                 │              │              │
                          [CanvasGenerator] [TldrawGenerator] [DrawioGenerator] [MarkdownGenerator]
                                  │                 │              │              │
                            .canvas file   .tldr/.tldraw.md    .drawio        .md notes
```

The IR layer decouples extraction from generation. Each output format has its own generator module.

## Windows desktop application

The desktop app wraps the same extractor and generators as the CLI. No Node.js
installation is needed to **run the packaged app**. The initial build targets
Windows 11 x64.

### Run the portable app

Build the executable with `npm run dist:win` as described below; packaged binaries
are not included in this source branch. Double-click
`release/Miro-Board-Exporter-0.1.0-portable.exe`. Choose a Miro board
URL or ID, enter an OAuth token with `boards:read` and board access, choose a
format and output folder, then click **Export board**. **Open output folder**
opens that selected folder in Explorer. The single executable extracts its
bundled runtime into a temporary directory while running.

Alternatively, copy the entire `release/win-unpacked` folder and launch
`Miro Board Exporter.exe` inside it. Keep all files in that folder together.
The release is unsigned and uses Electron's default icon.

Tokens are held in memory, cleared from the form when submitted, and never saved
by the app. Enter the token again for each export. The GUI does not read the CLI's
token file or environment credentials. Exported board content is written to your
selected folder; matching filenames are overwritten. If an export fails, partial
files may remain. Close during an export prompts before quitting.

All CLI formats are available, including standard `.tldr`, Obsidian `.tldraw.md`,
Canvas, draw.io, and Markdown. **All formats** exports them together; choose
**Both** in the tldraw output menu to include both tldraw variants. For Obsidian,
choose the vault root as output so `assets/…` links resolve. Standard `.tldr`
retains the original exporter's remote asset URL behavior; downloading assets
does not embed them into the standard `.tldr`. Miro-hosted links may require
access or expire. Unsupported items and failed asset/detail requests are reported
as warnings; the conversion is not guaranteed to reproduce every Miro feature.

### Develop and build

Use Node.js **22.12 or newer** (Node 24 LTS recommended) and npm for desktop
development. The original CLI continues to support Node 20+.

```powershell
cd miroboard-export-tool  # from the enclosing project folder
npm ci
npm run desktop         # build and launch; rerun after source edits

npm run dist:win        # single portable Windows x64 executable
npm run pack:win        # self-contained application folder only
```

The first install/build requires Internet access to download Electron and the
packaging tools. If npm reports blocked Electron install scripts, run
`node node_modules/electron/install.js` before launching in development.

```powershell
npm test
npm run typecheck
npm run build           # original CLI
node dist/index.js --help
npm run build:desktop
npm run test:desktop    # offline GUI + original CLI integration tests
node scripts/test-desktop.mjs "release/win-unpacked/Miro Board Exporter.exe"
```

Integration checks use a dummy token and local API fixture. They launch the real
app and exercise form submission, both board input forms, all formats, progress,
folder-opening dispatch, credential clearing, a rejected token, secure window
preferences, CLI exports, and `document:document.gridSize === 10`. Test-only
instrumentation replaces the folder dialog and redirects SDK requests; there is
no fixture mode or alternate API endpoint in the shipped application. Artifacts
and screenshots go to ignored `test-output/` directories.

Playwright cannot reliably attach through the self-extracting portable wrapper
on this host (its launcher connection times out). Test the packaged application
folder with the command above, then launch the portable executable normally to
verify extraction and the native dialog. Its extracted application can also be
passed directly to the integration script while the portable launcher is running.

For a live check: launch the portable executable normally, use **Browse** to pick
a writable folder, enter your real board and token, and export `.tldr`. Open the
folder, then import the file into tldraw.com. Repeat with a board containing
images and review any warnings. A clean Windows VM without Node/npm is the best
final distribution check. Real Miro credentials, live asset access and current
tldraw.com import behavior are not verified by the offline tests.

### Desktop code layout

- `src/export-board.ts`: shared extraction and file-writing pipeline; no Electron imports.
- `src/cli.ts`: existing command options, prompts and terminal reporting.
- `src/desktop/main.ts`: native dialogs, trusted IPC, export invocation and safe status responses.
- `src/desktop/validation.ts`: board/settings validation and public error messages.
- `desktop/preload.cjs`: four restricted bridge methods; no general IPC access.
- `desktop/renderer/`: local HTML/CSS/JS with a restrictive content security policy.
- `scripts/build-desktop.mjs`: bundled main process, preload and renderer resources.
- `scripts/test-desktop.mjs`: development and packaged-app integration checks.

The renderer uses context isolation and sandboxing with Node integration disabled,
no remote content, no network access, and an in-memory session. File selection and
exports happen in the main process; tokens never become command-line arguments.
The tldraw `gridSize: 10` compatibility fix is covered by generator and pipeline
regression tests. Packaging is isolated from the existing CLI build.
