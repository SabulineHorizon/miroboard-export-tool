import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseBoardId, validateRequest, publicExportError } from '../desktop/validation.js';

describe('desktop boundary', () => {
  it.each(['uXjV_test=', 'https://miro.com/app/board/uXjV_test=/?share_link_id=123', ' https://miro.com/app/board/uXjV_test%3D/ '])('accepts board URL or ID: %s', value => {
    expect(parseBoardId(value)).toBe('uXjV_test=');
  });
  it.each(['', '../file', 'https://evilmiro.com/app/board/abc/', 'https://miro.com.evil.test/app/board/abc/', 'http://miro.com/app/board/abc/', 'https://user:secret@miro.com/app/board/abc/', 'abc/def', 'https://miro.com/app/board/%ZZ/'])('rejects invalid board input: %s', value => {
    expect(() => parseBoardId(value)).toThrow();
  });
  const settings = { board: 'abc=', token: 'secret', outputDir: resolve('test-output'), formats: ['tldraw'], tldrawFormat: 'tldr', downloadImages: true };
  it('normalizes and preserves export settings', () => {
    expect(validateRequest({ ...settings, token: ' secret ' })).toEqual({ boardId: 'abc=', token: 'secret', outputDir: settings.outputDir, formats: ['tldraw'], tldrawFormat: 'tldr', downloadImages: true });
  });
  it.each([{ token: '' }, { token: 'secret\nheader' }, { formats: [] }, { formats: ['exe'] }, { outputDir: 'relative' }, { tldrawFormat: 'bad' }, { downloadImages: 'yes' }])('rejects unsafe settings %j', override => {
    expect(() => validateRequest({ ...settings, ...override })).toThrow();
  });
  it('does not expose tokens, headers or arbitrary SDK error text', () => {
    for (const error of [new Error('Bearer TOP_SECRET'), { statusCode: 401, message: 'TOP_SECRET' }, { code: 'EPERM', request: { headers: { Authorization: 'TOP_SECRET' } } }]) {
      expect(publicExportError(error)).not.toContain('TOP_SECRET');
    }
    expect(publicExportError({ statusCode: 403 })).toContain('boards:read');
  });
});
