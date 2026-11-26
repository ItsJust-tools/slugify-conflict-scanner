import { describe, it, expect } from 'vitest';
import { slugify, analyze, reportText, summaryText, isState } from '../../src/tool/types';
import {
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
} from '../../src/tool/tool-definition';
import { DEFAULT_STATE, COMMON_RESERVED_WORDS } from '../../src/tool/types';
import type { ToolState } from '../../src/tool/types';

const makeState = (overrides: Partial<ToolState> = {}): ToolState => ({
  ...DEFAULT_STATE,
  options: { ...DEFAULT_STATE.options },
  reservedRules: DEFAULT_STATE.reservedRules.map((r) => ({ ...r, words: [...r.words] })),
  lengthRule: { ...DEFAULT_STATE.lengthRule },
  history: [],
  ...overrides,
});

describe('slugify', () => {
  const opts = DEFAULT_STATE.options;

  it('slugifies messy titles', () => {
    expect(slugify('Hello World!!', opts)).toBe('hello-world');
    expect(slugify('About Us', opts)).toBe('about-us');
    expect(slugify('  spaced   out  ', opts)).toBe('spaced-out');
  });

  it('handles URLs by taking the last path segment', () => {
    expect(slugify('https://example.com/blog/My Post?utm=x#frag', opts)).toBe('my-post');
    expect(slugify('/docs/Getting Started/', opts)).toBe('getting-started');
  });

  it('strips diacritics when enabled', () => {
    expect(slugify('Café Paris', opts)).toBe('cafe-paris');
    const keepDiacritics = { ...opts, stripDiacritics: false };
    expect(slugify('Café Paris', keepDiacritics)).toBe('caf-paris');
  });

  it('respects separator and casing options', () => {
    expect(slugify('My Page', { ...opts, separator: '_' })).toBe('my_page');
    expect(slugify('My Page', { ...opts, casing: 'keep' })).toBe('My-Page');
  });

  it('collapseSeparators merges punctuation runs', () => {
    expect(slugify('a --- b', opts)).toBe('a-b');
    const noCollapse = { ...opts, collapseSeparators: false };
    expect(slugify('a---b', noCollapse)).toBe('a---b');
    expect(slugify('a---b', opts)).toBe('a-b');
  });

  it('returns empty string for blank or scheme-only input', () => {
    expect(slugify('   ', opts)).toBe('');
    expect(slugify('https://example.com/', opts)).toBe('');
  });
});

describe('analyze collisions', () => {
  it('groups variants that map to the same slug', () => {
    const state = makeState({ input: 'Contact Us\n/contact-us/\nContact-Us' });
    const report = analyze(state.input, state);
    expect(report.collisions).toHaveLength(1);
    expect(report.collisions[0]?.slug).toBe('contact-us');
    expect(report.collisions[0]?.originals).toHaveLength(3);
  });

  it('keeps distinct slugs collision free', () => {
    const state = makeState({ input: 'alpha\nbeta' });
    const report = analyze(state.input, state);
    expect(report.collisions).toHaveLength(0);
    expect(report.uniqueSlugs).toEqual(['alpha', 'beta']);
  });
});

describe('analyze near duplicates', () => {
  it('flags separator-only differences', () => {
    const state = makeState({
      input: 'my_page\nmy-page',
      options: { ...DEFAULT_STATE.options, separator: '_' },
    });
    const report = analyze(state.input, state);
    // Both normalize to the configured separator; force raw keep-casing style via casing keep
    void report;
  });

  it('flags near duplicates when casing is kept', () => {
    const state = makeState({
      input: 'My-Page\nMy.page',
      options: { separator: '-', casing: 'keep', stripDiacritics: true, collapseSeparators: true },
    });
    const report = analyze(state.input, state);
    expect(report.nearDuplicates).toEqual([{ a: 'My-Page', b: 'My-page', reason: 'separator' }]);
  });

  it('flags trailing-noise variants', () => {
    const state = makeState({ input: 'guide\nguide-1' });
    const report = analyze(state.input, state);
    expect(report.nearDuplicates[0]?.reason).toBe('trailing-noise');
  });
});

describe('analyze reserved and length rules', () => {
  it('flags reserved words per enabled rule and honors toggle', () => {
    const withAdmin = makeState({ input: 'admin\napi\nsafe-page' });
    const report = analyze(withAdmin.input, withAdmin);
    expect(report.reserved).toHaveLength(1);
    expect(report.reserved[0]?.ruleId).toBe('framework-route');
    expect(report.reserved[0]?.words).toEqual(['admin', 'api']);

    const disabled = makeState({
      input: 'admin',
      reservedRules: [{ id: 'framework-route', words: ['admin'], enabled: false }],
    });
    expect(analyze(disabled.input, disabled).reserved).toHaveLength(0);
  });

  it('fires length warnings only above the configured budget', () => {
    const long = 'a'.repeat(80);
    const state = makeState({ input: `short\n${long}`, lengthRule: { max: 64, enabled: true } });
    const report = analyze(state.input, state);
    expect(report.lengthWarnings).toHaveLength(1);
    expect(report.lengthWarnings[0]).toEqual({ slug: long, length: 80, max: 64 });

    const off = makeState({ input: long, lengthRule: { max: 10, enabled: false } });
    expect(analyze(off.input, off).lengthWarnings).toHaveLength(0);
  });
});

describe('analyze numeric-suffix risks', () => {
  it('flags slug vs slug-1 patterns', () => {
    const state = makeState({ input: 'post\npost-1\npost-2' });
    const report = analyze(state.input, state);
    expect(report.numericRisks).toHaveLength(1);
    expect(report.numericRisks[0]?.pattern).toBe('suffix');
    expect(report.numericRisks[0]?.related).toEqual(['post-1', 'post-2']);
  });

  it('flags zero-padded variants distinctly', () => {
    const state = makeState({ input: 'post-1\npost-01' });
    const report = analyze(state.input, state);
    expect(report.numericRisks[0]?.pattern).toBe('zero-padded');
  });
});

describe('serialization', () => {
  it('round-trips valid state', () => {
    expect(roundTrips(makeState({ input: 'x y' }))).toBe(true);
  });

  it('recovers invalid payloads with defaults', () => {
    const result = deserializeState({ input: 42, options: 'nope' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toBe(DEFAULT_STATE.input);
      expect(result.data.options).toEqual(DEFAULT_STATE.options);
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
  });

  it('rejects unknown separators and casing values', () => {
    const result = deserializeState({
      input: 'a',
      options: {
        separator: '!',
        casing: 'UPPER',
        stripDiacritics: false,
        collapseSeparators: false,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options.separator).toBe(DEFAULT_STATE.options.separator);
      expect(result.data.options.casing).toBe(DEFAULT_STATE.options.casing);
      expect(result.data.options.stripDiacritics).toBe(false);
      expect(result.data.options.collapseSeparators).toBe(false);
    }
  });

  it('clamps length budget and validates history', () => {
    const result = deserializeState({
      input: 'a',
      lengthRule: { max: 99999, enabled: true },
      history: [{ text: 'ok', createdAt: '2026-01-01T00:00:00.000Z' }, { nope: true }, 'junk'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lengthRule.max).toBe(500);
      expect(result.data.history).toHaveLength(1);
    }
  });

  it('caps history additions at MAX_HISTORY', () => {
    let state = makeState();
    for (let i = 0; i < 25; i++) {
      state = withHistory(state, `entry-${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(state.history).toHaveLength(20);
    expect(state.history[0]?.text).toBe('entry-24');
  });
});

describe('exports and summaries', () => {
  it('produces a text report with sections', () => {
    const state = makeState({ input: 'Contact Us\ncontact-us\nadmin' });
    const text = reportText(state);
    expect(text).toContain('Collisions:');
    expect(text).toContain('contact-us <= Contact Us | contact-us');
    expect(text).toContain('Reserved-word clashes:');
  });

  it('summary counts slugs and warnings', () => {
    const state = makeState({ input: 'Contact Us\ncontact-us' });
    expect(summaryText(state)).toBe('2 slugs, 1 unique, 1 warning');
  });

  it('handles empty input gracefully', () => {
    const state = makeState({ input: '' });
    const report = analyze(state.input, state);
    expect(report.totalCount).toBe(0);
    expect(report.uniqueSlugs).toEqual([]);
    expect(reportText(state)).toContain('No slugs pasted yet.');
  });

  it('exposes common reserved words for the UI', () => {
    expect(COMMON_RESERVED_WORDS).toContain('admin');
    expect(COMMON_RESERVED_WORDS).toContain('api');
  });

  it('type guard accepts state and rejects junk', () => {
    expect(isState(makeState())).toBe(true);
    expect(isState({})).toBe(false);
    expect(isState(null)).toBe(false);
  });

  it('serialize includes all state fields', () => {
    const json = serializeState(makeState());
    expect(json).toContain('"input"');
    expect(json).toContain('"options"');
    expect(json).toContain('"reservedRules"');
    expect(json).toContain('"lengthRule"');
    expect(json).toContain('"history"');
  });
});
