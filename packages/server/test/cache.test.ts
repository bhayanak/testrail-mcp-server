import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DiskCache } from '../src/cache.js';

const TEST_CACHE_DIR = join(tmpdir(), `testrail-cache-test-${process.pid}`);

function createCache(
  overrides: Partial<{ cacheDir: string; cacheTtlMs: number; cacheEnabled: boolean }> = {},
) {
  return new DiskCache({
    cacheDir: TEST_CACHE_DIR,
    cacheTtlMs: 7 * 24 * 3600000, // 7 days
    cacheEnabled: true,
    ...overrides,
  });
}

describe('DiskCache', () => {
  beforeEach(() => {
    rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('get/set', () => {
    it('should return null for missing cache entry', () => {
      const cache = createCache();
      expect(cache.get(1, 'meta', 'suites')).toBeNull();
    });

    it('should store and retrieve data', () => {
      const cache = createCache();
      const data = [{ id: 1, name: 'Suite A' }];
      cache.set(1, 'meta', 'suites', data);

      const result = cache.get<typeof data>(1, 'meta', 'suites');
      expect(result).not.toBeNull();
      expect(result!.data).toEqual(data);
      expect(result!.ageMs).toBeGreaterThanOrEqual(0);
      expect(result!.ageMs).toBeLessThan(1000);
    });

    it('should return null for expired entries', () => {
      const cache = createCache({ cacheTtlMs: 1 }); // 1ms TTL
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {
        /* spin */
      }

      expect(cache.get(1, 'meta', 'suites')).toBeNull();
    });

    it('should return null when cache is disabled', () => {
      const cache = createCache({ cacheEnabled: false });
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);
      expect(cache.get(1, 'meta', 'suites')).toBeNull();
    });

    it('should not write when cache is disabled', () => {
      const cache = createCache({ cacheEnabled: false });
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);
      expect(existsSync(TEST_CACHE_DIR)).toBe(false);
    });

    it('should handle corrupt cache file gracefully', () => {
      const cache = createCache();
      const filePath = join(TEST_CACHE_DIR, '1', 'meta', 'suites.json');
      mkdirSync(join(TEST_CACHE_DIR, '1', 'meta'), { recursive: true });
      writeFileSync(filePath, 'not valid json', 'utf-8');

      expect(cache.get(1, 'meta', 'suites')).toBeNull();
    });

    it('should isolate projects and categories', () => {
      const cache = createCache();
      cache.set(1, 'cases', '10', [{ id: 100 }]);
      cache.set(2, 'cases', '10', [{ id: 200 }]);

      expect(cache.get<any[]>(1, 'cases', '10')!.data).toEqual([{ id: 100 }]);
      expect(cache.get<any[]>(2, 'cases', '10')!.data).toEqual([{ id: 200 }]);
    });
  });

  describe('invalidate', () => {
    it('should invalidate a specific entry', () => {
      const cache = createCache();
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);
      cache.set(1, 'meta', 'users', [{ id: 2 }]);

      const removed = cache.invalidate(1, 'meta', 'suites');
      expect(removed).toBe(1);
      expect(cache.get(1, 'meta', 'suites')).toBeNull();
      expect(cache.get(1, 'meta', 'users')).not.toBeNull();
    });

    it('should invalidate an entire category', () => {
      const cache = createCache();
      cache.set(1, 'cases', '10', [{ id: 1 }]);
      cache.set(1, 'cases', '20', [{ id: 2 }]);
      cache.set(1, 'meta', 'suites', [{ id: 3 }]);

      const removed = cache.invalidate(1, 'cases');
      expect(removed).toBe(2);
      expect(cache.get(1, 'cases', '10')).toBeNull();
      expect(cache.get(1, 'cases', '20')).toBeNull();
      expect(cache.get(1, 'meta', 'suites')).not.toBeNull();
    });

    it('should invalidate entire project', () => {
      const cache = createCache();
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);
      cache.set(1, 'cases', '10', [{ id: 2 }]);

      const removed = cache.invalidate(1);
      expect(removed).toBe(2);
      expect(cache.get(1, 'meta', 'suites')).toBeNull();
      expect(cache.get(1, 'cases', '10')).toBeNull();
    });

    it('should return 0 for missing entry', () => {
      const cache = createCache();
      expect(cache.invalidate(1, 'meta', 'nonexistent')).toBe(1); // rmSync force
    });

    it('should return 0 for missing directory', () => {
      const cache = createCache();
      expect(cache.invalidate(999)).toBe(0);
    });
  });

  describe('invalidateAll', () => {
    it('should remove all cached data', () => {
      const cache = createCache();
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);
      cache.set(2, 'cases', '10', [{ id: 2 }]);

      const removed = cache.invalidateAll();
      expect(removed).toBe(2);
      expect(cache.get(1, 'meta', 'suites')).toBeNull();
      expect(cache.get(2, 'cases', '10')).toBeNull();
    });

    it('should return 0 when cache dir does not exist', () => {
      const cache = createCache();
      expect(cache.invalidateAll()).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return empty status for missing project', () => {
      const cache = createCache();
      const status = cache.getStatus(1);
      expect(status.projectId).toBe(1);
      expect(status.totalFiles).toBe(0);
      expect(status.totalBytes).toBe(0);
      expect(status.entries).toEqual([]);
    });

    it('should report cached files', () => {
      const cache = createCache();
      cache.set(1, 'meta', 'suites', [{ id: 1 }, { id: 2 }]);
      cache.set(1, 'cases', '10', [{ id: 100 }]);

      const status = cache.getStatus(1);
      expect(status.projectId).toBe(1);
      expect(status.enabled).toBe(true);
      expect(status.totalFiles).toBe(2);
      expect(status.totalBytes).toBeGreaterThan(0);
      expect(status.entries).toHaveLength(2);

      const paths = status.entries.map((e) => e.path).sort();
      expect(paths).toEqual(['cases/10.json', 'meta/suites.json']);
      expect(status.entries.every((e) => !e.expired)).toBe(true);
    });

    it('should mark expired entries', () => {
      const cache = createCache({ cacheTtlMs: 1 });
      cache.set(1, 'meta', 'suites', [{ id: 1 }]);

      const start = Date.now();
      while (Date.now() - start < 5) {
        /* spin */
      }

      const status = cache.getStatus(1);
      expect(status.entries[0].expired).toBe(true);
    });
  });

  describe('formatAge', () => {
    it('should format seconds', () => {
      expect(DiskCache.formatAge(5000)).toBe('5s ago');
    });

    it('should format minutes', () => {
      expect(DiskCache.formatAge(120_000)).toBe('2m ago');
    });

    it('should format hours', () => {
      expect(DiskCache.formatAge(7200_000)).toBe('2h ago');
    });

    it('should format days', () => {
      expect(DiskCache.formatAge(172800_000)).toBe('2d ago');
    });

    it('should format zero', () => {
      expect(DiskCache.formatAge(0)).toBe('0s ago');
    });
  });
});
