import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';

export interface CacheConfig {
  cacheDir: string;
  cacheTtlMs: number;
  cacheEnabled: boolean;
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number; // epoch ms
  ttlMs: number;
}

export class DiskCache {
  private readonly cacheDir: string;
  private readonly ttlMs: number;
  private readonly enabled: boolean;

  constructor(config: CacheConfig) {
    this.cacheDir = config.cacheDir;
    this.ttlMs = config.cacheTtlMs;
    this.enabled = config.cacheEnabled;
  }

  /**
   * Get cached data. Returns { data, age } if valid cache exists, null otherwise.
   */
  get<T>(projectId: number, category: string, key: string): { data: T; ageMs: number } | null {
    if (!this.enabled) return null;
    const filePath = this.filePath(projectId, category, key);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(raw) as CacheEntry<T>;
      const age = Date.now() - entry.cachedAt;
      if (age > entry.ttlMs) {
        return null; // expired
      }
      return { data: entry.data, ageMs: age };
    } catch {
      return null; // file doesn't exist or parse error — fallback to API
    }
  }

  /**
   * Store data in cache.
   */
  set<T>(projectId: number, category: string, key: string, data: T): void {
    if (!this.enabled) return;
    const filePath = this.filePath(projectId, category, key);
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttlMs: this.ttlMs,
    };
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(entry), 'utf-8');
  }

  /**
   * Invalidate specific cache entry or entire category.
   */
  invalidate(projectId: number, category?: string, key?: string): number {
    if (category && key) {
      const filePath = this.filePath(projectId, category, key);
      return this.removeFile(filePath);
    }
    if (category) {
      const dirPath = join(this.cacheDir, String(projectId), category);
      return this.removeDir(dirPath);
    }
    const dirPath = join(this.cacheDir, String(projectId));
    return this.removeDir(dirPath);
  }

  /**
   * Invalidate all cached data across all projects.
   */
  invalidateAll(): number {
    return this.removeDir(this.cacheDir);
  }

  /**
   * Get cache status for a project — shows each cached file with age and size.
   */
  getStatus(projectId: number): CacheStatusReport {
    const projectDir = join(this.cacheDir, String(projectId));
    const entries: CacheFileInfo[] = [];
    let totalBytes = 0;

    if (!existsSync(projectDir)) {
      return { projectId, enabled: this.enabled, totalFiles: 0, totalBytes: 0, entries };
    }

    this.walkDir(projectDir, (filePath) => {
      try {
        const stat = statSync(filePath);
        const raw = readFileSync(filePath, 'utf-8');
        const entry = JSON.parse(raw) as CacheEntry<unknown>;
        const ageMs = Date.now() - entry.cachedAt;
        const expired = ageMs > entry.ttlMs;
        const relativePath = filePath.slice(projectDir.length + 1);

        entries.push({
          path: relativePath,
          ageMs,
          expired,
          sizeBytes: stat.size,
          cachedAt: new Date(entry.cachedAt).toISOString(),
        });
        totalBytes += stat.size;
      } catch {
        // skip unreadable files
      }
    });

    return {
      projectId,
      enabled: this.enabled,
      totalFiles: entries.length,
      totalBytes,
      entries,
    };
  }

  /**
   * Format age in human-readable form for output annotations.
   */
  static formatAge(ageMs: number): string {
    const seconds = Math.floor(ageMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // ─── Internals ───────────────────────────────────────────────

  private filePath(projectId: number, category: string, key: string): string {
    return join(this.cacheDir, String(projectId), category, `${key}.json`);
  }

  private removeFile(filePath: string): number {
    try {
      rmSync(filePath, { force: true });
      return 1;
    } catch {
      return 0;
    }
  }

  private removeDir(dirPath: string): number {
    if (!existsSync(dirPath)) return 0;
    let count = 0;
    this.walkDir(dirPath, () => count++);
    rmSync(dirPath, { recursive: true, force: true });
    return count;
  }

  private walkDir(dirPath: string, cb: (filePath: string) => void): void {
    if (!existsSync(dirPath)) return;
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        this.walkDir(fullPath, cb);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        cb(fullPath);
      }
    }
  }
}

export interface CacheFileInfo {
  path: string;
  ageMs: number;
  expired: boolean;
  sizeBytes: number;
  cachedAt: string;
  [key: string]: unknown;
}

export interface CacheStatusReport {
  projectId: number;
  enabled: boolean;
  totalFiles: number;
  totalBytes: number;
  entries: CacheFileInfo[];
  [key: string]: unknown;
}
