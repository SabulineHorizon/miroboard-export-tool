import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { exportBoard } from "../export-board.js";
import { validateRequest, publicExportError } from "./validation.js";

app.setName("Miro Board Exporter");
// No persistent browser profile, cache or credential storage for the renderer.
let window: BrowserWindow | null = null;
let selectedFolder: string | undefined;
let busy = false;
const rendererPath = join(__dirname, "renderer", "index.html");
const rendererUrl = pathToFileURL(rendererPath).href;

function trusted(event: Electron.IpcMainInvokeEvent) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== rendererUrl) throw new Error("Unauthorized request.");
}

app.whenReady().then(() => {
  ipcMain.handle("desktop:choose-folder", async event => {
    trusted(event);
    if (busy) return null;
    const result = await dialog.showOpenDialog(window!, { title: "Choose export folder", properties: ["openDirectory", "createDirectory"], defaultPath: selectedFolder || app.getPath("documents") });
    if (result.canceled) return null;
    selectedFolder = result.filePaths[0];
    return selectedFolder;
  });
  ipcMain.handle("desktop:open-folder", async event => {
    trusted(event);
    if (!selectedFolder) return { ok: false, error: "Choose an output folder first." };
    const error = await shell.openPath(selectedFolder);
    return error ? { ok: false, error: "Could not open the output folder." } : { ok: true };
  });
  ipcMain.handle("desktop:export", async (event, input: unknown) => {
    trusted(event);
    if (busy) return { ok: false, error: "An export is already running." };
    let options: ReturnType<typeof validateRequest>;
    try {
      options = validateRequest(input);
      if (options.outputDir !== selectedFolder) return { ok: false, error: "Choose the output folder using Browse." };
    } catch (error) { return { ok: false, error: (error as Error).message }; }
    busy = true;
    const send = (message: string) => { if (!event.sender.isDestroyed()) event.sender.send("desktop:progress", message); };
    try {
      const { board, stats, files } = await exportBoard({ ...options, verbose: false,
        onStatus: message => { if (message === "Connecting to Miro…") send(message); },
        onProgress: ({ phase, current, total }) => send(`${{ items: "Fetching items", details: "Fetching details", connectors: "Fetching connectors", assets: "Downloading assets" }[phase]}: ${current}${total ? ` / ${total}` : ""}`),
      });
      const warnings = [];
      if (stats.skippedItems.length) warnings.push(`${stats.skippedItems.length} unsupported items skipped`);
      if (stats.droppedConnectors) warnings.push(`${stats.droppedConnectors} connectors dropped`);
      if (stats.filteredPreviews) warnings.push(`${stats.filteredPreviews} previews omitted`);
      if (stats.failedAssetDownloads.length) warnings.push(`${stats.failedAssetDownloads.length} asset downloads failed`);
      if (stats.failedDetailFetches.length) warnings.push(`${stats.failedDetailFetches.length} detail requests failed`);
      return { ok: true, files: files.length, nodes: board.nodes.length, warnings };
    } catch (error) { return { ok: false, error: publicExportError(error) }; }
    finally { options.token = ""; busy = false; }
  });
  const createWindow = () => {
    window = new BrowserWindow({ width: 760, height: 820, minWidth: 600, minHeight: 700, show: false, autoHideMenuBar: true, backgroundColor: "#f4f6fa", title: "Miro Board Exporter",
      webPreferences: { preload: join(__dirname, "preload.cjs"), nodeIntegration: false, contextIsolation: true, sandbox: true, partition: "miro-export-memory", devTools: !app.isPackaged, spellcheck: false },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", event => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    window.webContents.session.setPermissionCheckHandler(() => false);
    window.on("close", event => {
      if (busy && dialog.showMessageBoxSync(window!, { type: "question", buttons: ["Keep exporting", "Quit"], defaultId: 0, cancelId: 0, message: "An export is running. Quit and leave any partial files?" }) === 0) event.preventDefault();
    });
    window.on("closed", () => { window = null; selectedFolder = undefined; });
    window.once("ready-to-show", () => window?.show());
    void window.loadFile(rendererPath);
  };
  createWindow();
  app.on("activate", () => { if (!window) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
