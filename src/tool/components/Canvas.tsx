'use client';

import React from 'react';
import type { ToolState } from '../types';
import { analyze, slugify } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const report = React.useMemo(() => analyze(state.input, state), [state]);

  const exportUnique = (format: 'txt' | 'csv' | 'json') => {
    const unique = report.uniqueSlugs;
    let content = '';
    let mime = 'text/plain';
    if (format === 'txt') {
      content = unique.join('\n');
    } else if (format === 'csv') {
      content = ['slug', ...unique].join('\n');
      mime = 'text/csv';
    } else {
      content = JSON.stringify(unique, null, 2);
      mime = 'application/json';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `unique-slugs.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="slugify-canvas">
      <section aria-label="Paste slugs or URLs">
        <label
          className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
          htmlFor="slug-input"
        >
          Paste slugs, URLs, or messy titles (one per line)
        </label>
        <textarea
          id="slug-input"
          value={state.input}
          onChange={(e) => update({ input: e.target.value })}
          data-testid="slug-input"
          rows={8}
          spellCheck={false}
          className="w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder={'About Us\n/blog/Hello World!!\nhttps://example.com/Café-Paris'}
        />
      </section>

      <section aria-label="Normalized slugs" data-testid="slug-table-section">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Normalized slugs ({report.totalCount})
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-xs" data-testid="slug-table">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Original</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Len</th>
                <th className="px-3 py-2 font-medium" aria-label="Copy column" />
              </tr>
            </thead>
            <tbody>
              {report.records.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-gray-500"
                    data-testid="slug-table-empty"
                  >
                    No slugs pasted yet.
                  </td>
                </tr>
              ) : (
                report.records.map((record) => (
                  <tr
                    key={record.index}
                    className="border-t border-gray-200 dark:border-gray-800"
                    data-testid="slug-row"
                  >
                    <td className="px-3 py-1.5 text-gray-400">{record.index + 1}</td>
                    <td
                      className="max-w-[16rem] truncate px-3 py-1.5 text-gray-700 dark:text-gray-300"
                      title={record.original}
                    >
                      {record.original}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-gray-900 dark:text-gray-100">
                      {record.slug}
                    </td>
                    <td
                      className={`px-3 py-1.5 ${
                        state.lengthRule.enabled && record.slug.length > state.lengthRule.max
                          ? 'font-semibold text-amber-600 dark:text-amber-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {record.slug.length}
                    </td>
                    <td className="px-3 py-1.5">
                      <CopyButton value={record.slug} testid={`copy-slug-${record.index}`} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Warnings" className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4" data-testid="collisions-section">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Exact collisions ({report.collisions.length})
          </h3>
          {report.collisions.length === 0 ? (
            <p className="text-xs text-gray-500" data-testid="collisions-empty">
              No collisions detected.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="collisions-list">
              {report.collisions.map((group) => (
                <li key={group.slug} className="text-xs">
                  <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                    {group.slug}
                  </span>
                  <span className="ml-2 text-gray-500">
                    ← {group.originals.map((o) => o.original).join(' | ')} ({group.originals.length}
                    )
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
          data-testid="near-duplicates-section"
        >
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Near duplicates ({report.nearDuplicates.length})
          </h3>
          {report.nearDuplicates.length === 0 ? (
            <p className="text-xs text-gray-500" data-testid="near-duplicates-empty">
              No near duplicates detected.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="near-duplicates-list">
              {report.nearDuplicates.map((pair, i) => (
                <li key={`${pair.a}-${pair.b}-${i}`} className="text-xs">
                  <span className="font-mono">{pair.a}</span>
                  <span className="mx-2 text-gray-400">~</span>
                  <span className="font-mono">{pair.b}</span>
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">
                    {pair.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
          data-testid="reserved-section"
        >
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Reserved-word clashes ({report.reserved.length})
          </h3>
          {report.reserved.length === 0 ? (
            <p className="text-xs text-gray-500" data-testid="reserved-empty">
              No reserved-word clashes.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="reserved-list">
              {report.reserved.map((hit, i) => (
                <li key={`${hit.ruleId}-${i}`} className="text-xs">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {hit.slug.toString()}
                  </span>
                  <span className="ml-2 text-gray-500">rule: {hit.ruleId}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
          data-testid="length-section"
        >
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Length budget ({report.lengthWarnings.length})
          </h3>
          {report.lengthWarnings.length === 0 ? (
            <p className="text-xs text-gray-500" data-testid="length-empty">
              All slugs within budget
              {state.lengthRule.enabled ? ` (${state.lengthRule.max} chars).` : '.'}
            </p>
          ) : (
            <ul className="space-y-2" data-testid="length-list">
              {report.lengthWarnings.map((warning) => (
                <li key={warning.slug} className="text-xs">
                  <span className="font-mono text-amber-600 dark:text-amber-400">
                    {warning.slug.length}/{warning.max}
                  </span>
                  <span className="ml-2 font-mono" title={warning.slug}>
                    {warning.slug}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-lg border border-gray-200 p-4 md:col-span-2 dark:border-gray-800"
          data-testid="numeric-section"
        >
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Numeric-suffix risks ({report.numericRisks.length})
          </h3>
          {report.numericRisks.length === 0 ? (
            <p className="text-xs text-gray-500" data-testid="numeric-empty">
              No numeric-suffix patterns detected.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="numeric-list">
              {report.numericRisks.map((risk, i) => (
                <li key={`${risk.slug}-${i}`} className="text-xs">
                  <span className="font-mono">{risk.related.join(' vs ')}</span>
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">
                    {risk.pattern}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
        aria-label="Export"
        className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
        data-testid="export-section"
      >
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Export unique slugs ({report.uniqueSlugs.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {(['txt', 'csv', 'json'] as const).map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => exportUnique(format)}
              data-testid={`btn-export-${format}`}
              className="rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
            >
              Export {format.toUpperCase()}
            </button>
          ))}
          <CopyButton value={report.uniqueSlugs.join('\n')} testid="copy-all-unique" />
        </div>
      </section>

      <section aria-label="Live preview">
        <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="preview-line">
          Preview:{' '}
          <span className="font-mono">
            {report.records[0] ? slugify(report.records[0].original, state.options) : '—'}
          </span>
        </p>
      </section>

      <section aria-label="Saved reports">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Saved reports
          </h3>
          {report.totalCount > 0 ? (
            <button
              type="button"
              data-testid="btn-save-history"
              onClick={() =>
                onSaveHistory?.(`${report.totalCount} slugs, ${report.uniqueSlugs.length} unique`)
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Save summary to history
            </button>
          ) : null}
        </div>
        {state.history.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved reports yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
