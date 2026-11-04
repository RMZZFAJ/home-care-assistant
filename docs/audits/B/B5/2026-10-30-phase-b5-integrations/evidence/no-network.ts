import { beforeEach, afterEach, vi } from 'vitest';
beforeEach(() => {
  vi.stubGlobal('fetch', () => { throw new Error('B5 unexpected network forbidden'); });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
