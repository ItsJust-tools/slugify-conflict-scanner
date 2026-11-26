export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  slugifyConflictScannerTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { COMMON_RESERVED_WORDS } from './types';
export {
  DEFAULT_STATE,
  DEFAULT_OPTIONS,
  DEFAULT_RESERVED_RULES,
  MAX_HISTORY,
  slugify,
  analyze,
  reportText,
  summaryText,
  isState,
} from './types';
export type {
  AnalysisReport,
  CasingRule,
  CollisionGroup,
  HistoryEntry,
  LengthRule,
  LengthWarning,
  NearDuplicatePair,
  NumericRisk,
  ReservedHit,
  ReservedRule,
  SlugOption,
  SlugRecord,
  ToolState,
} from './types';
