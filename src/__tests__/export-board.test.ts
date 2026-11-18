import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { extractBoard } from '../extract/miro-extractor.js';
import { exportBoard, safeBoardName } from '../export-board.js';
vi.mock('../extract/miro-extractor.js', () => ({ extractBoard: vi.fn() }));
const dirs: string[] = [];
afterEach(async () => { vi.clearAllMocks(); await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
describe('shared export pipeline', () => {
  async function setup() {
    const outputDir = await mkdtemp(join(tmpdir(), 'miro-export-test-'));
    dirs.push(outputDir);
    vi.mocked(extractBoard).mockResolvedValue({ board: { id: 'test', name: 'Test Board', sourceUrl: 'https://miro.com/app/board/test/', extractedAt: '2026-01-01', nodes: [], edges: [], assets: [] }, stats: { totalApiItems: 0, convertedNodes: 0, skippedItems: [], droppedConnectors: 0, totalApiConnectors: 0, filteredPreviews: 0, failedAssetDownloads: [], failedDetailFetches: [] } });
    return { outputDir, boardId: 'test', token: 'MEMORY_ONLY', formats: ['tldraw'], tldrawFormat: 'tldr' as const, downloadImages: true };
  }
  it('writes a .tldr with gridSize 10 and passes extraction settings', async () => {
    const options = await setup();
    const result = await exportBoard(options);
    expect(extractBoard).toHaveBeenCalledWith(expect.objectContaining(options));
    const tldr = JSON.parse(await readFile(result.files[0], 'utf8'));
    expect(tldr.records.find((r: { id: string }) => r.id === 'document:document').gridSize).toBe(10);
    expect(await readdir(options.outputDir)).toEqual(['Test-Board.tldr']);
  });
  it('exports all existing formats including the Obsidian wrapper', async () => {
    const options = await setup();
    await exportBoard({ ...options, formats: ['canvas', 'markdown', 'tldraw', 'drawio'], tldrawFormat: 'both' });
    expect(await readdir(options.outputDir)).toEqual(expect.arrayContaining(['Test-Board.canvas', 'Test-Board.tldr', 'Test-Board.tldraw.md', 'Test-Board.drawio', 'miro-notes']));
  });
  it('dry run writes nothing and disables image downloading', async () => {
    const options = await setup();
    expect((await exportBoard({ ...options, dryRun: true })).files).toEqual([]);
    expect(await readdir(options.outputDir)).toEqual([]);
    expect(extractBoard).toHaveBeenCalledWith(expect.objectContaining({ downloadImages: false, outputDir: undefined }));
  });
  it('handles empty, reserved and unsafe board names', () => {
    for (const name of ['..', '', 'CON', 'nul.txt']) expect(safeBoardName(name)).toBe('Miro-board');
    expect(safeBoardName('My / Board?')).toBe('My-Board');
  });
});
