import type { ToolConfig } from '@itsjust/core';

export const toolConfig: ToolConfig = {
  id: 'slugify-conflict-scanner',
  name: 'Slugify Conflict Scanner',
  description:
    'Pastes a list of page slugs/URLs and detects collisions after slugification, near-duplicates, and reserved-word clashes before they break routing.',
  version: '1.0.0',
  exportFormats: ['png', 'pdf', 'json'],
  theme: {
    accent: '#8b5cf6',
    brand: 'Slugify Conflict Scanner',
  },
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
};

export default toolConfig;
