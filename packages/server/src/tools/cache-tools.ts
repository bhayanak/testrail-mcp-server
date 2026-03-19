import { z } from 'zod';
import { DiskCache } from '../cache.js';

export const getCacheStatusSchema = {
  project_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('TestRail project ID (defaults to configured project)'),
};

export async function handleGetCacheStatus(cache: DiskCache, params: { project_id: number }) {
  const status = cache.getStatus(params.project_id);
  const totalMb = (status.totalBytes / (1024 * 1024)).toFixed(2);

  if (status.totalFiles === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text:
            `# Cache Status (Project ${params.project_id})\n\n` +
            `**Enabled**: ${status.enabled ? 'Yes' : 'No'}\n` +
            `**Files**: 0 (cache is empty)\n\n` +
            'Use `refresh_cache` to populate the cache.',
        },
      ],
      structuredContent: status,
    };
  }

  const lines = [
    `# Cache Status (Project ${params.project_id})`,
    '',
    `**Enabled**: ${status.enabled ? 'Yes' : 'No'}`,
    `**Total files**: ${status.totalFiles}`,
    `**Total size**: ${totalMb} MB`,
    '',
    '| File | Size | Age | Status |',
    '|------|------|-----|--------|',
    ...status.entries.map((e) => {
      const sizeFmt =
        e.sizeBytes > 1024 * 1024
          ? `${(e.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${(e.sizeBytes / 1024).toFixed(1)} KB`;
      const ageFmt = DiskCache.formatAge(e.ageMs);
      const statusFmt = e.expired ? 'Expired' : 'Valid';
      return `| ${e.path} | ${sizeFmt} | ${ageFmt} | ${statusFmt} |`;
    }),
  ];

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
    structuredContent: status,
  };
}

export const refreshCacheSchema = {
  project_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('TestRail project ID (defaults to configured project)'),
  suite_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Refresh only this suite (cases & sections)'),
};

export const invalidateCacheSchema = {
  project_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'TestRail project ID (defaults to configured project). Omit to invalidate all projects.',
    ),
  suite_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Invalidate only this suite's cases and sections"),
};

export async function handleInvalidateCache(
  cache: DiskCache,
  params: { project_id?: number; suite_id?: number },
) {
  let removed: number;
  let scope: string;

  if (params.project_id && params.suite_id) {
    const r1 = cache.invalidate(params.project_id, 'cases', String(params.suite_id));
    const r2 = cache.invalidate(params.project_id, 'sections', String(params.suite_id));
    removed = r1 + r2;
    scope = `suite ${params.suite_id} in project ${params.project_id}`;
  } else if (params.project_id) {
    removed = cache.invalidate(params.project_id);
    scope = `project ${params.project_id}`;
  } else {
    removed = cache.invalidateAll();
    scope = 'all projects';
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `Cache invalidated for ${scope}. Removed ${removed} file(s). Next fetch will pull fresh data from TestRail.`,
      },
    ],
    structuredContent: { scope, removed },
  };
}
