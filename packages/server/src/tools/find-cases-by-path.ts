import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Case, Suite, Section, Priority } from '../testrail/types.js';
import { DiskCache } from '../cache.js';

export const findCasesByPathSchema = {
  suite_name: z.string().max(500).describe('Name of the test suite, e.g. "PCAI Test Suite"'),
  section_path: z
    .string()
    .max(2000)
    .describe(
      'Section path separated by " > ", e.g. "PCAI FQA > PCAI developer system - milestone 1 > Platform Setup AIE". Each segment must match a section name, nested from top to bottom.',
    ),
  project_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('TestRail project ID (defaults to configured project)'),
};

export async function handleFindCasesByPath(
  client: TestRailClient,
  params: {
    project_id: number;
    suite_name: string;
    section_path: string;
  },
  diskCache?: DiskCache,
) {
  const { project_id, suite_name, section_path } = params;
  const pathSegments = section_path
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);

  if (pathSegments.length === 0) {
    throw new Error('section_path must contain at least one section name.');
  }

  let cacheAnnotation = '';

  // Step 1: Find the suite by name (try cache first)
  let suites: Suite[];
  const cachedSuites = diskCache?.get<Suite[]>(project_id, 'meta', 'suites');
  if (cachedSuites) {
    suites = cachedSuites.data;
    cacheAnnotation = `cached ${DiskCache.formatAge(cachedSuites.ageMs)}`;
  } else {
    const suitesRaw = await client.getPaginated<Suite>(`get_suites/${project_id}`, {});
    suites = suitesRaw.items;
    diskCache?.set(project_id, 'meta', 'suites', suites);
  }
  const suite = suites.find((s) => s.name === suite_name);
  if (!suite) {
    const available = suites.map((s) => `  [S${s.id}] ${s.name}`).join('\n');
    throw new Error(
      `Suite "${suite_name}" not found in project ${project_id}.\n\nAvailable suites:\n${available}`,
    );
  }

  // Step 2: Get all sections in the suite (try cache first)
  let sections: Section[];
  const cachedSections = diskCache?.get<Section[]>(project_id, 'sections', String(suite.id));
  if (cachedSections) {
    sections = cachedSections.data;
    if (!cacheAnnotation) cacheAnnotation = `cached ${DiskCache.formatAge(cachedSections.ageMs)}`;
  } else {
    const sectionsRaw = await client.getPaginated<Section>(`get_sections/${project_id}`, {
      suite_id: suite.id,
    });
    sections = sectionsRaw.items;
    diskCache?.set(project_id, 'sections', String(suite.id), sections);
  }
  const byId = new Map(sections.map((s) => [s.id, s]));

  // Build full path for any section
  const pathFor = (section: Section): string[] => {
    const names: string[] = [];
    let cur: Section | undefined = section;
    while (cur) {
      names.push(cur.name);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return names.reverse();
  };

  // Step 3: Find the target section by matching the path
  let target = sections.find((s) => {
    const p = pathFor(s);
    return p.length === pathSegments.length && pathSegments.every((name, i) => p[i] === name);
  });

  // Fallback: try suffix match (in case section is nested deeper than expected)
  if (!target) {
    target = sections.find((s) => {
      const p = pathFor(s);
      if (p.length < pathSegments.length) return false;
      const suffix = p.slice(p.length - pathSegments.length);
      return pathSegments.every((name, i) => suffix[i] === name);
    });
  }

  if (!target) {
    // Show candidates that partially match
    const candidates = sections
      .filter((s) => {
        const fullPath = pathFor(s).join(' > ');
        return pathSegments.some((seg) => fullPath.includes(seg));
      })
      .slice(0, 20)
      .map((s) => `  [Sec ${s.id}] ${pathFor(s).join(' > ')}`)
      .join('\n');

    throw new Error(
      `Section path "${section_path}" not found in suite "${suite_name}".\n\nLooking for: ${pathSegments.join(' > ')}\n\nPartially matching sections:\n${candidates || '(none)'}`,
    );
  }

  // Step 4: Get priorities for labeling
  const priorities = await client.getCached<Priority[]>('get_priorities', 'priorities');
  const priorityById = new Map(priorities.map((p) => [p.id, p.name]));

  // Step 5: Get test cases in the target section (try cache first, filter locally)
  let cases: Case[];
  const cachedCases = diskCache?.get<Case[]>(project_id, 'cases', String(suite.id));
  if (cachedCases) {
    cases = cachedCases.data.filter((c) => c.section_id === target.id);
    if (!cacheAnnotation) cacheAnnotation = `cached ${DiskCache.formatAge(cachedCases.ageMs)}`;
  } else {
    const casesRaw = await client.getPaginated<Case>(`get_cases/${project_id}`, {
      suite_id: suite.id,
      section_id: target.id,
    });
    cases = casesRaw.items;
  }

  // Step 6: Format output
  const fullPath = pathFor(target).join(' > ');
  if (cases.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No test cases found.\n\nSuite: ${suite.name} (S${suite.id})\nSection path: ${fullPath} (Sec ${target.id})`,
        },
      ],
      structuredContent: {
        suite: { id: suite.id, name: suite.name },
        section: { id: target.id, path: fullPath },
        cases: [],
      },
    };
  }

  const lines = [
    `# Test Cases in: ${fullPath}`,
    cacheAnnotation ? `_(${cacheAnnotation})_\n` : '',
    `**Suite**: ${suite.name} (S${suite.id})`,
    `**Section**: ${target.name} (Sec ${target.id})`,
    `**Count**: ${cases.length}\n`,
    '| # | Case ID | Title | Priority |',
    '|---|---------|-------|----------|',
    ...cases.map((c, i) => {
      const priority = priorityById.get(c.priority_id) || `Unknown (${c.priority_id})`;
      const title = c.title.replace(/\|/g, '\\|');
      return `| ${i + 1} | C${c.id} | ${title} | ${priority} |`;
    }),
  ];

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
    structuredContent: {
      suite: { id: suite.id, name: suite.name },
      section: { id: target.id, path: fullPath },
      count: cases.length,
      cases: cases.map((c) => ({
        id: c.id,
        title: c.title,
        priority: priorityById.get(c.priority_id) || String(c.priority_id),
        priority_id: c.priority_id,
        section_id: c.section_id,
        type_id: c.type_id,
      })),
    },
  };
}
