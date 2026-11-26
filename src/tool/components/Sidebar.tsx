'use client';

import React from 'react';
import type { ToolState } from '../types';
import { COMMON_RESERVED_WORDS } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const toggleRule = (id: string) => {
    onChange({
      ...state,
      reservedRules: state.reservedRules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      ),
    });
  };

  const addRule = () => {
    const id = `rule-${Date.now()}`;
    onChange({
      ...state,
      reservedRules: [...state.reservedRules, { id, words: [], enabled: true }],
    });
  };

  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="slugify-sidebar">
      <section aria-label="Slug options">
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Slug options</h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <label className="flex items-center justify-between gap-2">
            Separator
            <select
              value={state.options.separator}
              onChange={(e) =>
                onChange({
                  ...state,
                  options: {
                    ...state.options,
                    separator: e.target.value as ToolState['options']['separator'],
                  },
                })
              }
              data-testid="sidebar-separator"
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="-">hyphen (-)</option>
              <option value="_">underscore (_)</option>
              <option value=".">dot (.)</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            Casing
            <select
              value={state.options.casing}
              onChange={(e) =>
                onChange({
                  ...state,
                  options: {
                    ...state.options,
                    casing: e.target.value as ToolState['options']['casing'],
                  },
                })
              }
              data-testid="sidebar-casing"
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="lowercase">lowercase</option>
              <option value="keep">keep original</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.options.stripDiacritics}
              onChange={(e) =>
                onChange({
                  ...state,
                  options: { ...state.options, stripDiacritics: e.target.checked },
                })
              }
              data-testid="sidebar-strip-diacritics"
            />
            Strip diacritics
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.options.collapseSeparators}
              onChange={(e) =>
                onChange({
                  ...state,
                  options: { ...state.options, collapseSeparators: e.target.checked },
                })
              }
              data-testid="sidebar-collapse"
            />
            Collapse repeats (--- to -)
          </label>
        </div>
      </section>

      <section aria-label="Length budget">
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Length budget</h3>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.lengthRule.enabled}
            onChange={(e) =>
              onChange({ ...state, lengthRule: { ...state.lengthRule, enabled: e.target.checked } })
            }
            data-testid="sidebar-length-enabled"
          />
          <span>Warn above</span>
          <input
            type="number"
            min={1}
            max={500}
            value={state.lengthRule.max}
            onChange={(e) =>
              onChange({
                ...state,
                lengthRule: { ...state.lengthRule, max: Number(e.target.value) || 1 },
              })
            }
            data-testid="sidebar-length-max"
            className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          <span>chars</span>
        </div>
      </section>

      <section aria-label="Reserved word rules">
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Reserved words</h3>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          {state.reservedRules.map((rule) => (
            <li key={rule.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => toggleRule(rule.id)}
                data-testid={`rule-toggle-${rule.id}`}
                aria-label={`Toggle rule ${rule.id}`}
              />
              <div className="flex-1">
                <div className="font-mono">{rule.id}</div>
                <input
                  type="text"
                  value={rule.words.join(', ')}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      reservedRules: state.reservedRules.map((r) =>
                        r.id === rule.id
                          ? {
                              ...r,
                              words: e.target.value
                                .split(',')
                                .map((w) => w.trim())
                                .filter(Boolean),
                            }
                          : r
                      ),
                    })
                  }
                  data-testid={`rule-words-${rule.id}`}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs dark:border-gray-700 dark:bg-gray-800"
                  placeholder="comma, separated, words"
                />
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addRule}
          data-testid="btn-add-rule"
          className="mt-2 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          + Add rule
        </button>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Common route names:
          <div className="mt-1 flex flex-wrap gap-1" data-testid="common-words">
            {COMMON_RESERVED_WORDS.map((word) => (
              <span
                key={word}
                className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Saved reports">
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved reports</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} saved report{state.history.length === 1 ? '' : 's'}
        </p>
      </section>

      <section aria-label="About">
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">About</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Paste slugs, URLs, or messy titles; the scanner slugifies each line and flags collisions,
          near-duplicates, reserved-word clashes, length overruns, and numeric-suffix risks before
          they break routing. Everything runs locally in your browser.
        </p>
      </section>
    </div>
  );
};
