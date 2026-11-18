import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractBoard, type ExtractOptions } from "./extract/miro-extractor.js";
import { generateCanvas } from "./generate/canvas/canvas-generator.js";
import { generateMarkdown } from "./generate/markdown/markdown-generator.js";
import { generateTldraw } from "./generate/tldraw/tldraw-generator.js";
import { wrapTldrawForObsidian } from "./generate/tldraw/tldraw-obsidian-wrapper.js";
import { generateDrawio } from "./generate/drawio/drawio-generator.js";

export const EXPORT_FORMATS = ["canvas", "markdown", "tldraw", "drawio"] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];
export interface ExportOptions extends ExtractOptions {
  outputDir: string;
  formats: readonly string[];
  tldrawFormat?: "tldr" | "obsidian" | "both";
  dryRun?: boolean;
  onStatus?: (message: string) => void;
}

export function safeBoardName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, "-").replace(/[. ]+$/g, "").slice(0, 120);
  return !cleaned || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned) ? "Miro-board" : cleaned;
}

/** Shared, terminal-independent export pipeline for CLI and desktop. */
export async function exportBoard(options: ExportOptions) {
  const { outputDir, formats, tldrawFormat = "both", dryRun = false } = options;
  if (!formats.length || formats.some(f => !EXPORT_FORMATS.includes(f as ExportFormat))) throw new Error("Choose a supported export format.");
  const log = options.onStatus || (() => {});
  log("Connecting to Miro…");
  const { board, stats } = await extractBoard({ ...options, downloadImages: options.downloadImages !== false && !dryRun, outputDir: dryRun ? undefined : outputDir });
  const files: string[] = [];
  const writeOutput = async (path: string, content: string, encoding: "utf-8") => {
    await writeFile(path, content, encoding);
    files.push(path);
  };
  if (!dryRun) {
      await mkdir(outputDir, { recursive: true });

      const boardBasename = safeBoardName(board.name);

      // Generate Canvas
      if (formats.includes("canvas")) {
        const canvasJson = generateCanvas(board);
        const canvasFilename = `${boardBasename}.canvas`;
        const canvasPath = join(outputDir, canvasFilename);
        await writeOutput(canvasPath, canvasJson, "utf-8");
        log(`Written: ${canvasPath}`);
      }

      // Generate Markdown
      if (formats.includes("markdown")) {
        const canvasFilename = formats.includes("canvas")
          ? `${boardBasename}.canvas`
          : undefined;
        const mdFiles = generateMarkdown(board, canvasFilename);
        const mdDir = join(outputDir, "miro-notes");
        await mkdir(mdDir, { recursive: true });

        for (const file of mdFiles) {
          const filePath = join(mdDir, file.filename);
          await writeOutput(filePath, file.content, "utf-8");
        }
        log(`Written: ${mdFiles.length} markdown files to ${mdDir}`);
      }

      // Generate tldraw
      if (formats.includes("tldraw")) {
        if (tldrawFormat === "tldr" || tldrawFormat === "both") {
          const tldrJson = generateTldraw(board, { useLocalAssets: false });
          const tldrPath = join(outputDir, `${boardBasename}.tldr`);
          await writeOutput(tldrPath, tldrJson, "utf-8");
          log(`Written: ${tldrPath}`);
        }

        if (tldrawFormat === "obsidian" || tldrawFormat === "both") {
          const tldrJson = generateTldraw(board, { useLocalAssets: true });
          const obsidianMd = wrapTldrawForObsidian(tldrJson);
          const tldrawMdPath = join(outputDir, `${boardBasename}.tldraw.md`);
          await writeOutput(tldrawMdPath, obsidianMd, "utf-8");
          log(`Written: ${tldrawMdPath}`);
        }
      }

      // Generate draw.io
      if (formats.includes("drawio")) {
        const drawioXml = generateDrawio(board);
        const drawioPath = join(outputDir, `${boardBasename}.drawio`);
        await writeOutput(drawioPath, drawioXml, "utf-8");
        log(`Written: ${drawioPath}`);
      }


  }
  return { board, stats, files };
}
