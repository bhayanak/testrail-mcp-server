import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DiskCache } from '../src/cache.js';
import { handleGetCacheStatus, handleInvalidateCache } from '../src/tools/cache-tools.js';

const TEST_CACHE_DIR = join(tmpdir(), `testrail-cache-tools-test-${process.pid}`);

function createCache() {
  return new DiskCache({
    cacheDir: TEST_CACHE_DIR,
    cacheTtlMs: 7 * 24 * 3600000,
    cacheEnabled: true,
  });
}

describe('cache-tools', () => {
  beforeEach(() => {
    rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
  });

  describe('handleGetCacheStatus', () => {
    it('should return empty status for fresh cache', async () => {
      const cache = createCache();
      const result = await handleGetCacheStatus(cache, { project_id: 1 });

      expect(result.content[0].text).toContain('cache is empty');
      expect(result.structuredContent.totalFiles).toBe(0);
    });

    it('should show cached files in status table', async () => {
      const cache = createCache();
      cache.set(1, 'meta', 'suites', [{ id: 1, name: 'Suite' }]);
      cache.set(1, 'cases', '10', [{ id: 100, title: 'Test' }]);

      const result = await handleGetCacheStatus(cache, { project_id: 1 });

      expect(result.content[0].text).toContain('Total files');
      expect(result.content[0].text).toContain('2');
      expect(result.content[0].text).toContain('Valid');
      expect(result.structuredContent.totalFiles).toBe(2);
      expect(result.structuredContent.totalBytes).toBeGreaterThan(0);
    });
  });

  describe('handleInvalidateCache', () => {
    it('should invalidate a specific suite', async () => {
      const cache = createCache();
      cache.set(1, 'cases', '10', [{ id: 100 }]);
      cache.set(1, 'sections', '10', [{ id: 200 }]);
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);

      const result = await handleInvalidateCache(cache, { project_id: 1, suite_id: 10 });

      expect(result.content[0].text).toContain('suite 10');
      expect(result.structuredContent.removed).toBe(2);
      // meta/suites should still exist
      expect(cache.get(1, 'meta', 'suites')).not.toBeNull();
    });

    it('should invalidate entire project', async () => {
      const cache = createCache();
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);
      cache.set(1, 'cases', '10', [{ id: 2 }]);

      const result = await handleInvalidateCache(cache, { project_id: 1 });

      expect(result.content[0].text).toContain('project 1');
      expect(result.structuredContent.removed).toBe(2);
    });

    it('should invalidate all projects', async () => {
      const cache = createCache();
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);
      cache.set(2, 'cases', '10', [{ id: 2 }]);

      const result = await handleInvalidateCache(cache, {});

      expect(result.content[0].text).toContain('all projects');
      expect(result.structuredContent.removed).toBe(2);
    });
  });
});
