import { isAbsolute } from "node:path";
import { EXPORT_FORMATS, type ExportFormat } from "../export-board.js";

export function parseBoardId(input: string): string {
  let id = input.trim();
  if (/^https?:/i.test(id)) {
    let url: URL;
    try { url = new URL(id); } catch { throw new Error("Enter a valid Miro board URL."); }
    const match = url.pathname.match(/^\/app\/board\/([^/]+)\/?$/);
    if (url.protocol !== "https:" || !["miro.com", "www.miro.com"].includes(url.hostname) || !match || url.username || url.password || url.port) {
      throw new Error("Use an https://miro.com/app/board/… URL or a board ID.");
    }
    try { id = decodeURIComponent(match[1]); } catch { throw new Error("Invalid board ID."); }
  }
  if (!/^[a-zA-Z0-9_-]+={0,2}$/.test(id) || id.length > 200) throw new Error("Enter a valid Miro board URL or ID.");
  return id;
}

export function validateRequest(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid export settings.");
  const v = value as Record<string, unknown>;
  if (typeof v.board !== "string") throw new Error("Enter a board URL or ID.");
  const boardId = parseBoardId(v.board);
  if (typeof v.token !== "string" || !v.token.trim() || v.token.length > 8192 || /\s/.test(v.token.trim())) throw new Error("Enter a valid OAuth access token without spaces.");
  if (typeof v.outputDir !== "string" || !isAbsolute(v.outputDir) || v.outputDir.includes("\0")) throw new Error("Choose an output folder.");
  if (!Array.isArray(v.formats) || !v.formats.length || v.formats.some(f => !EXPORT_FORMATS.includes(f as ExportFormat))) throw new Error("Choose a supported export format.");
  if (!["tldr", "obsidian", "both"].includes(v.tldrawFormat as string)) throw new Error("Choose a valid tldraw output type.");
  if (typeof v.downloadImages !== "boolean") throw new Error("Invalid image setting.");
  return { boardId, token: v.token.trim(), outputDir: v.outputDir, formats: [...new Set(v.formats)] as ExportFormat[], tldrawFormat: v.tldrawFormat as "tldr" | "obsidian" | "both", downloadImages: v.downloadImages };
}

/** Never send arbitrary SDK error text/objects (which can contain headers) to the UI. */
export function publicExportError(error: unknown): string {
  const e = error as { statusCode?: number; status?: number; response?: { status?: number }; code?: string } | null;
  const status = e?.statusCode ?? e?.status ?? e?.response?.status;
  if (status === 401) return "Miro rejected the token. Check that it is valid and has not expired.";
  if (status === 403) return "Access denied. Check boards:read scope and access to this board.";
  if (status === 404) return "Board not found. Check the board ID and token access.";
  if (status === 429) return "Miro rate limit reached. Wait a moment and retry.";
  if (["EACCES", "EPERM", "EROFS"].includes(e?.code || "")) return "Cannot write to the output folder. Choose a writable folder.";
  if (e?.code === "ENOSPC") return "The output drive is full. Free some space and retry.";
  return "Export failed. Check your internet connection, board access, token and output folder, then retry. Partial files may remain.";
}
