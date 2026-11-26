export type CasingRule = 'lowercase' | 'keep';

export interface ReservedRule {
  /** Rule identifier. */
  id: string;
  /** Word list checked against each slug. */
  words: string[];
  /** Enable flag (per-rule toggle). */
  enabled: boolean;
}

export interface LengthRule {
  /** Max slug length budget; warnings fire above it. */
  max: number;
  /** Enable flag. */
  enabled: boolean;
}

export interface SlugOption {
  /** Word separator character. */
  separator: '-' | '_' | '.';
  /** Casing rule applied to words. */
  casing: CasingRule;
  /** Strip diacritics (NFD + combining-mark removal). */
  stripDiacritics: boolean;
  /** Collapse consecutive separators. */
  collapseSeparators: boolean;
}

export interface HistoryEntry {
  /** Short human readable description of the snapshot. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Raw pasted lines: slugs, URLs or messy titles, one per line. */
  input: string;
  options: SlugOption;
  reservedRules: ReservedRule[];
  lengthRule: LengthRule;
  /** Saved report snapshots, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_RESERVED_RULES: ReservedRule[] = [
  {
    id: 'framework-route',
    words: ['admin', 'api', 'docs'],
    enabled: true,
  },
];

export const DEFAULT_OPTIONS: SlugOption = {
  separator: '-',
  casing: 'lowercase',
  stripDiacritics: true,
  collapseSeparators: true,
};

export const DEFAULT_STATE: ToolState = {
  input:
    'About Us\n/blog/Hello World!!\nhttps://example.com/Café-Paris\ncontact us\nContact-Us\nadmin\nlong-page-slug-that-keeps-going-and-going-for-a-very-long-time-indeed',
  options: { ...DEFAULT_OPTIONS },
  reservedRules: DEFAULT_RESERVED_RULES.map((r) => ({ ...r, words: [...r.words] })),
  lengthRule: { max: 64, enabled: true },
  history: [],
};

export const MAX_HISTORY = 20;

/** Default reserved route names shown in the UI as suggestions. */
export const COMMON_RESERVED_WORDS = [
  'admin',
  'api',
  'docs',
  'blog',
  'login',
  'logout',
  'signup',
  'settings',
  'account',
  'robots.txt',
  'sitemap.xml',
  'wp-admin',
];

/** Normalize a single line into a slug given the current options. */
export function slugify(rawLine: string, options: SlugOption): string {
  let text = rawLine.trim();
  // Extract the path portion of a URL, else drop origin from scheme-like strings.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text);
  if (hasScheme) {
    try {
      const url = new URL(text);
      const pathname = url.pathname;
      try {
        text = decodeURIComponent(pathname);
      } catch {
        text = pathname;
      }
    } catch {
      text = '';
    }
  } else {
    text = text.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\S*/, (match) =>
      match.includes('/') ? match : match
    );
  }
  const segments = text.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (lastSegment !== undefined) text = lastSegment;
  text = text.trim();
  if (options.stripDiacritics) {
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  const sep: string = options.separator;
  let slug = '';
  let lastWasSep = false;
  for (const char of text) {
    if (/[a-zA-Z0-9]/.test(char)) {
      slug += options.casing === 'lowercase' && /[A-Z]/.test(char) ? char.toLowerCase() : char;
      lastWasSep = false;
    } else if (options.collapseSeparators) {
      if (!lastWasSep) {
        slug += sep;
      }
      lastWasSep = true;
    } else {
      slug += sep;
      lastWasSep = true;
    }
  }
  while (slug.startsWith(sep)) slug = slug.slice(sep.length);
  while (slug.endsWith(sep)) slug = slug.slice(0, -sep.length);
  if (options.collapseSeparators) {
    const esc = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    slug = slug.replace(new RegExp(`${esc}{2,}`, 'g'), sep);
  }
  return options.casing === 'lowercase' ? slug.toLowerCase() : slug;
}

export interface SlugRecord {
  /** Zero-based index of the input line. */
  index: number;
  /** Original trimmed line as pasted. */
  original: string;
  /** Normalized slug. */
  slug: string;
}

export interface CollisionGroup {
  slug: string;
  originals: { original: string; index: number }[];
}

export interface NearDuplicatePair {
  a: string;
  b: string;
  reason: 'separator' | 'diacritics' | 'trailing-noise';
}

export interface ReservedHit {
  slug: string;
  ruleId: string;
  words: string[];
  originals: string[];
}

export interface LengthWarning {
  slug: string;
  length: number;
  max: number;
}

export interface NumericRisk {
  slug: string;
  related: string[];
  pattern: 'suffix' | 'zero-padded';
}

export interface AnalysisReport {
  records: SlugRecord[];
  collisions: CollisionGroup[];
  nearDuplicates: NearDuplicatePair[];
  reserved: ReservedHit[];
  lengthWarnings: LengthWarning[];
  numericRisks: NumericRisk[];
  uniqueSlugs: string[];
  totalCount: number;
}

const TRAILING_NOISE = /[-_.\s]*\d+$|[-_.]+$/;

/** Run the full analysis pipeline over the pasted input. */
export function analyze(input: string, state: ToolState): AnalysisReport {
  const { options, lengthRule } = state;
  const lines = input.split(/\r?\n/);
  const records: SlugRecord[] = [];
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const slug = slugify(line, options);
    if (!slug) return;
    if (seen.has(`${index}`)) return;
    seen.add(`${index}`);
    records.push({ index, original: line.trim(), slug });
  });

  // Collisions
  const bySlug = new Map<string, CollisionGroup>();
  for (const record of records) {
    const group = bySlug.get(record.slug) ?? { slug: record.slug, originals: [] };
    group.originals.push({ original: record.original, index: record.index });
    bySlug.set(record.slug, group);
  }
  const collisions = [...bySlug.values()].filter((g) => g.originals.length > 1);

  // Near duplicates: same slug ignoring separator choice, diacritics-collapsed base, or trailing noise trimmed
  const slugList = [...new Set(records.map((r) => r.slug))];
  const nearDuplicates: NearDuplicatePair[] = [];
  const seenPairs = new Set<string>();
  for (let i = 0; i < slugList.length; i++) {
    const a = slugList[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < slugList.length; j++) {
      const b = slugList[j];
      if (b === undefined) continue;
      const key = a < b ? `${a}\n${b}` : `${b}\n${a}`;
      if (seenPairs.has(key)) continue;
      let reason: NearDuplicatePair['reason'] | null = null;
      const compare = (s1: string, s2: string) =>
        s1.replace(/[-_.]/g, '').toLowerCase() === s2.replace(/[-_.]/g, '').toLowerCase();
      if (compare(a, b)) {
        reason = 'separator';
      } else if (
        a.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
        b.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      ) {
        reason = 'diacritics';
      } else if (a.replace(TRAILING_NOISE, '') === b.replace(TRAILING_NOISE, '')) {
        reason = 'trailing-noise';
      }
      if (reason) {
        seenPairs.add(key);
        nearDuplicates.push({ a, b, reason });
      }
    }
  }

  // Reserved words
  const reserved: ReservedHit[] = [];
  for (const rule of state.reservedRules) {
    if (!rule.enabled) continue;
    const hits = slugList.filter((slug) =>
      rule.words.some((word) => slug === word || slug.startsWith(`${word}${options.separator}`))
    );
    if (hits.length === 0) continue;
    const originals = records.filter((r) => hits.includes(r.slug)).map((r) => r.original);
    reserved.push({ slug: hits.join(', '), ruleId: rule.id, words: hits, originals });
  }

  // Length budget
  const lengthWarnings: LengthWarning[] = lengthRule.enabled
    ? slugList
        .filter((slug) => slug.length > lengthRule.max)
        .map((slug) => ({ slug: slug as string, length: slug.length, max: lengthRule.max }))
    : [];

  // Numeric suffix risks
  const byBase = new Map<string, string[]>();
  for (const slug of slugList) {
    const zeroPadded = slug.match(/^(.*?[-_])0*(\d+)$/);
    const plain = slug.match(/^(.*?[-_])(\d+)$/);
    let base: string | null = null;
    if (zeroPadded) base = `${zeroPadded[1]}N`;
    else if (plain) base = `${plain[1]}N`;
    if (!base) continue;
    byBase.set(base, [...(byBase.get(base) ?? []), slug]);
  }
  const numericRisks: NumericRisk[] = [];
  for (const [base, related] of byBase) {
    const unique = [...new Set(related)];
    if (unique.length < 2) continue;
    const zeroPadded = unique.some((slug) => /^.*[-_]0\d/.test(slug));
    numericRisks.push({
      slug: base.replace(/[-_]N$/, ''),
      related: unique,
      pattern: zeroPadded ? 'zero-padded' : 'suffix',
    });
  }

  const uniqueSlugs = slugList;
  return {
    records,
    collisions,
    nearDuplicates,
    reserved,
    lengthWarnings,
    numericRisks,
    uniqueSlugs,
    totalCount: records.length,
  };
}

/** Human-readable one-line summary for the status bar. */
export function summaryText(state: ToolState): string {
  const report = analyze(state.input, state);
  const issues =
    report.collisions.length +
    report.nearDuplicates.length +
    report.reserved.length +
    report.lengthWarnings.length +
    report.numericRisks.length;
  return `${report.totalCount} slugs, ${report.uniqueSlugs.length} unique, ${issues} warning${issues === 1 ? '' : 's'}`;
}

/** Plain-text report used for export and copy actions. */
export function reportText(state: ToolState): string {
  const report = analyze(state.input, state);
  const lines: string[] = [];
  lines.push(`Slugs analyzed: ${report.totalCount} (unique: ${report.uniqueSlugs.length})`);
  if (report.collisions.length) {
    lines.push('', 'Collisions:');
    for (const group of report.collisions) {
      lines.push(`  ${group.slug} <= ${group.originals.map((o) => o.original).join(' | ')}`);
    }
  }
  if (report.nearDuplicates.length) {
    lines.push('', 'Near duplicates:');
    for (const pair of report.nearDuplicates) {
      lines.push(`  ${pair.a} ~ ${pair.b} (${pair.reason})`);
    }
  }
  if (report.reserved.length) {
    lines.push('', 'Reserved-word clashes:');
    for (const hit of report.reserved) {
      lines.push(`  ${hit.slug} (rule ${hit.ruleId})`);
    }
  }
  if (report.lengthWarnings.length) {
    lines.push('', 'Length budget exceeded:');
    for (const warning of report.lengthWarnings) {
      lines.push(`  ${warning.slug} (${warning.length}/${warning.max})`);
    }
  }
  if (report.numericRisks.length) {
    lines.push('', 'Numeric suffix risks:');
    for (const risk of report.numericRisks) {
      lines.push(`  ${risk.slug}: ${risk.related.join(', ')} (${risk.pattern})`);
    }
  }
  if (lines.length === 1 && report.totalCount === 0) lines.push('No slugs pasted yet.');
  return lines.join('\n');
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.input === 'string' && typeof v.options === 'object' && v.options !== null;
}
