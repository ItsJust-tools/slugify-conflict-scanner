import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  analyze,
  isState,
  reportText,
  summaryText,
  type HistoryEntry,
  type SlugOption,
  type ToolState,
} from './types';

const VALID_SEPARATORS: SlugOption['separator'][] = ['-', '_', '.'];
const VALID_CASING: SlugOption['casing'][] = ['lowercase', 'keep'];

/** Serialize tool state into JSON for export / share. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    version: 1,
    input: state.input,
    options: state.options,
    reservedRules: state.reservedRules,
    lengthRule: state.lengthRule,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function validOptions(value: unknown): SlugOption {
  const fallback: SlugOption = { ...DEFAULT_STATE.options };
  if (typeof value !== 'object' || value === null) return fallback;
  const v = value as Record<string, unknown>;
  const sep = VALID_SEPARATORS.includes(v.separator as SlugOption['separator'])
    ? (v.separator as SlugOption['separator'])
    : DEFAULT_STATE.options.separator;
  const casing = VALID_CASING.includes(v.casing as SlugOption['casing'])
    ? (v.casing as SlugOption['casing'])
    : DEFAULT_STATE.options.casing;
  return {
    separator: sep,
    casing,
    stripDiacritics: boolOr(v.stripDiacritics, fallback.stripDiacritics),
    collapseSeparators: boolOr(v.collapseSeparators, fallback.collapseSeparators),
  };
}

function validReservedRules(value: unknown): ToolState['reservedRules'] {
  if (!Array.isArray(value))
    return DEFAULT_STATE.reservedRules.map((r) => ({ ...r, words: [...r.words] }));
  return value
    .filter((rule): rule is Record<string, unknown> => typeof rule === 'object' && rule !== null)
    .map((rule) => ({
      id: stringOr(rule.id, 'rule'),
      words: Array.isArray(rule.words)
        ? rule.words.filter((w): w is string => typeof w === 'string')
        : [],
      enabled: boolOr(rule.enabled, true),
    }));
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected slugify conflict scanner state object',
    };
  }
  const v = data as Record<string, unknown>;
  const lengthMax = Math.max(
    1,
    Math.min(
      500,
      Math.round(
        numberOr((v.lengthRule as Record<string, unknown>)?.max, DEFAULT_STATE.lengthRule.max)
      )
    )
  );
  const lengthEnabled = boolOr(
    (v.lengthRule as Record<string, unknown>)?.enabled,
    DEFAULT_STATE.lengthRule.enabled
  );
  const state: ToolState = {
    input: stringOr(v.input, DEFAULT_STATE.input),
    options: validOptions(v.options),
    reservedRules: validReservedRules(v.reservedRules),
    lengthRule: { max: lengthMax, enabled: lengthEnabled },
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export { analyze, isState, reportText, summaryText };

export const slugifyConflictScannerTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
