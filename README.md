# Slugify Conflict Scanner

Paste slugs, URLs, or messy titles and catch routing problems before they ship: exact collisions after slugification, near-duplicates (separator, diacritics, or trailing-noise variants), reserved route-name clashes, length-budget overruns, and numeric-suffix risks (`post` vs `post-1` vs `post-01`).

**Live:** [slugify-conflict-scanner.itsjust.tools](https://slugify-conflict-scanner.itsjust.tools)

## Features

- Paste many slugs/URLs at once; each line slugifies with configurable separator and casing
- Exact-collision groups aggregate every variant that maps to the same slug
- Near-duplicate detection for separator, diacritics, and trailing-noise differences
- Reserved-word clash list (framework route names like `admin`, `api`, `docs`) with per-rule toggles and custom rules
- Length-budget warnings with per-slug character counts
- Numeric-suffix risk warnings for sibling-numbered slug patterns, including zero-padding
- Export the cleaned unique slug list as TXT, CSV, or JSON; copy individual slugs or the full report
- Shareable state via URL, `.itsjust.json` import/export, PNG/PDF canvas export
- 100% client-side — no data ever leaves your browser

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Testing

```bash
npm test
npx playwright test
```

## License

MIT
