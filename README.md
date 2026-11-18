# Miro Board Exporter

Export a Miro board to **tldraw, Obsidian Canvas, draw.io, or Markdown** using a
Windows desktop app. Choose a board and an output folder, then click **Export
board**.

**[Download for Windows (64-bit)](https://github.com/SabulineHorizon/miroboard-export-tool/releases/download/gui-v0.1.0/Miro-Board-Exporter-0.1.0-portable.exe)**
· [Release notes and other downloads](https://github.com/SabulineHorizon/miroboard-export-tool/releases/tag/gui-v0.1.0)

No installation, command line, Node.js, or npm is needed to run the downloaded
app. You need Windows 11 (64-bit), an Internet connection, access to your Miro
board, and a Miro access token. The initial release is unsigned.

## Quick start

### 1. Download and open the app

Click **Download for Windows** above, save
**Miro-Board-Exporter-0.1.0-portable.exe**, and double-click it. On the release
page, the same file is listed under **Assets**. Choose the `.exe`; the **Source
code** ZIP and TAR downloads are for developers.

The app runs without an installer. Keep the executable wherever you want to
launch it from. Because this release is unsigned, Windows or your browser may
show an unrecognized-app warning. Check that your download came from this
repository's release page before deciding whether to run it.

<img src="docs/images/desktop-gui.png" alt="Miro Board Exporter window with fields for the board URL, access token, format and output folder, and an Export board button. All fields are empty." width="620">

### 2. Get your Miro access token

An **access token** is a private code that lets the exporter read boards you can
access. It is different from your Miro password. This app does not have a built-in
Miro sign-in button, so this one-time setup happens in your browser:

1. Sign in to Miro and open **Settings → Your apps**. Create an app, or use an
   existing app you control. Miro may first ask you to create a Developer team.
2. In the app settings, enable the **`boards:read`** permission and save.
3. Choose **Install app and get OAuth token**, select the team containing your
   board, and authorize the installation. Copy the **access token** shown.

See [Miro's illustrated token setup guide](https://developers.miro.com/docs/rest-api-build-your-first-hello-world-app)
for the app creation and installation screens. This exporter only needs read
access; its required permission is `boards:read`. If your organization restricts
app installation, ask your Miro administrator for help.

Keep the token private. The exporter does not save it, and you will paste it again
for each export. If it expires, obtain a new token in Miro and retry.

### 3. Export your board

1. Open the board in Miro and copy its address from your browser. Paste it into
   **Board URL or ID** in the exporter.
2. Paste your token into **OAuth access token**.
3. Choose an **Export format**. For tldraw.com, keep **tldraw (.tldr)** and
   **Standard .tldr**. To export every format, choose **All formats** and set
   **tldraw output** to **Both**.
4. Click **Browse…** and choose where to save the files. For Obsidian, choose your
   vault's main folder so image links can resolve.
5. Leave **Download images and documents** selected if you want local copies of
   the board's assets, then click **Export board**.
6. When the export finishes, review any warnings and click **Open output folder**.
   Open or import the generated files in your chosen application.

**Files with matching names are replaced.** Choose a new folder if you want to
keep earlier exports. A failed or interrupted export can leave partial files.

### Which format should I choose?

| If you use… | Choose… | Files you get |
| --- | --- | --- |
| [tldraw.com](https://tldraw.com) | tldraw → Standard .tldr | `.tldr` |
| Obsidian Canvas | Obsidian Canvas | `.canvas` |
| Obsidian's [tldraw plugin](https://github.com/holxsam/tldraw-in-obsidian) | tldraw → Obsidian .tldraw.md | `.tldraw.md` |
| [draw.io / diagrams.net](https://www.diagrams.net) | draw.io | `.drawio` |
| A Markdown editor or Obsidian notes | Markdown | Individual `.md` notes and a board index in `miro-notes/` |

Downloaded images and documents go in an `assets/` folder. Keep that folder with
the exported files that reference it. **Standard `.tldr` files still use remote
image links**, even when you download assets; those images may need Miro access
and are not guaranteed to work offline.

### If something goes wrong

| Message or problem | What to try |
| --- | --- |
| Token rejected | Obtain a valid access token and paste it again before retrying. |
| Access denied or board not found | Check the board address, the token's `boards:read` permission, and access to the board's team. |
| Rate limit reached | Wait a little before retrying. |
| Cannot write to the output folder | Use **Browse…** to choose a writable folder and check available disk space. |
| Export completed with warnings | Some content was omitted. Review the generated files in the destination app. |
| Images missing after import | Keep the `assets/` folder with the export. Standard `.tldr` uses remote links, which may require access or expire. |

---

## Technical details

This is the GUI branch of a fork of
[essoen/miroboard-export-tool](https://github.com/essoen/miroboard-export-tool).
The Electron app and retained CLI share the original extraction pipeline and
format generators. The release tag `gui-v0.1.0` identifies the desktop release;
GUI development is on the `gui` branch.

### Platform, limitations, and validation

- The desktop build targets Windows 11 x64. macOS, Linux, and other Windows
  architectures have not been validated for this GUI.
- The portable executable bundles its runtime and extracts application files into
  a temporary directory while running. A folder-based build is also available
  when building from source. The release is unsigned and uses Electron's default
  icon.
- Conversion may change layout or omit Miro features. Unsupported items, dropped
  connectors, and failed detail or asset requests are reported as warnings.
- Standard `.tldr` exports use remote asset URLs; the Obsidian variant uses local
  asset paths. The `gridSize: 10` tldraw document compatibility fix is included.
- Automated checks cover extraction against a local fixture, all output formats,
  credential clearing, safe errors, and development/packaged GUI security settings.
  The maintainer reports that a build copied from the `release/` folder launched
  successfully on another computer. The exact transferred artifact and machine
  configuration were not recorded. This does not establish live export or import
  compatibility with every destination application.

See [VALIDATION.md](VALIDATION.md) for dated results, dependency audit findings,
and the scope of manual and automated testing.

### Tokens and privacy

The GUI holds the token in memory, clears its input when an export is submitted,
and does not save it to disk. It does not read the CLI's token file or environment
credentials, and it does not refresh expired tokens automatically.

The main process connects to Miro and downloads requested assets. The renderer
loads local files, uses an in-memory session, and has Node integration disabled,
context isolation enabled, and sandboxing enabled. API errors shown in the GUI
are sanitized.

Keep real tokens and private board exports out of Git commits, logs shared with
others, and screenshots. Environment files, the CLI's `token` file, and the default
`miro-export/` folder are ignored by Git; a custom export folder inside the
repository is not automatically excluded.

### Build and run from source

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

### CLI usage

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

### Development checks

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

### Source layout

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

### Reporting problems and contributing

When reporting a GUI problem, include your Windows version, app version or commit,
output format, reproduction steps, and displayed error. Remove tokens and private
board content from logs and screenshots. A small, anonymized example helps with
conversion problems.

For contributions, run the checks above and describe which workflow you tested.
Keep desktop-specific changes separate from shared exporter changes when practical.
Credit for the original CLI, extraction pipeline, and generators belongs to
[essoen/miroboard-export-tool](https://github.com/essoen/miroboard-export-tool).
