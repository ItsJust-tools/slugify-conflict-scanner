'use client';

import React from 'react';
import type { ToolState } from '../types';
import { analyze, reportText, slugify } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  const report = analyze(state.input, state);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      data-testid="toolbar"
    >
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Slugify conflict scanner controls"
      >
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear input
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...state, history: [] })}
          data-testid="btn-clear-history"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear history
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...state,
              options: {
                ...state.options,
                casing: state.options.casing === 'lowercase' ? 'keep' : 'lowercase',
              },
            })
          }
          data-testid="btn-toggle-casing"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Casing: {state.options.casing}
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-report"
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            Copy report
          </button>
        ) : null}
      </div>
      <span
        className="text-xs text-gray-500 dark:text-gray-400"
        data-testid="toolbar-preview"
        title={report.records[0] ? slugify(report.records[0].original, state.options) : ''}
      >
        {report.totalCount} lines scanned
      </span>
    </div>
  );
};

export { reportText };
