# Any Webpage to Markdown

Chrome extension that converts any webpage to clean markdown using Readability.js (content extraction) + Turndown (HTML→markdown). Built with WXT (web extension framework) + React + TypeScript.

## Chrome Web Store name: "Any webpage to markdown converter"

## Architecture

- **WXT** framework (Manifest V3, wxt.config.ts)
- **React** popup UI
- **Readability.js** — Mozilla's reader-mode engine, strips page to article content
- **Turndown** — converts clean HTML to markdown
- **TypeScript** throughout

### Entrypoints (WXT convention: entrypoints/)

- entrypoints/popup/ — React popup UI (markdown preview, copy/save buttons)
- entrypoints/content.ts — content script injected into pages (runs Readability + Turndown on DOM)
- entrypoints/background.ts — service worker (message relay, keyboard shortcut handling)

### Conversion pipeline

1. User clicks extension icon or uses keyboard shortcut
2. Background script sends message to content script
3. Content script clones document, runs Readability.js to extract article
4. Passes clean HTML through Turndown → markdown
5. Sends markdown back to popup for display

## Commands

- `pnpm dev` — dev mode with hot reload (loads unpacked in Chrome)
- `pnpm build` — production build to .output/chrome-mv3/
- `pnpm zip` — zip for Chrome Web Store submission
- `pnpm dev:firefox` / `pnpm build:firefox` — Firefox variants
- `pnpm compile` — TypeScript check (no emit)

## Key dependencies

- eact, eact-dom — popup UI
- @wxt-dev/module-react — WXT React integration
- @mozilla/readability — article content extraction
- 	urndown — HTML to markdown conversion

## Conventions

1. Use `pnpm` exclusively (not npm/yarn)
2. All colors must use `oklch()` — never hex or hsl
3. Never hardcode dependency versions — use caret ranges
4. Never start local dev servers — user handles `pnpm dev` themselves
5. TypeScript strict mode
6. WXT auto-imports browser APIs — no need to manually import rowser from webextension-polyfill

## File structure

`
entrypoints/
  popup/          # React popup (index.html, main.tsx, App.tsx)
  content.ts      # Content script — Readability + Turndown pipeline
  background.ts   # Service worker — message relay
public/
  icon/           # Extension icons (16, 32, 48, 96, 128)
wxt.config.ts     # WXT config (modules, manifest overrides)
`

## Popup UI requirements

- Dark theme (oklch colors)
- Markdown preview with raw/rendered toggle
- Copy to clipboard button
- Download as .md button
- Frontmatter toggle (adds title, URL, date metadata)
- Selection-only mode toggle (convert highlighted text only vs full page)

## Content script requirements

- Readability.js processes cloned document (never mutates original page)
- Turndown configured with: fenced code blocks, ATX headings, code block language detection from class names
- Graceful fallback: if Readability fails (non-article page), fall back to `document.body` → Turndown directly
- Selection mode: if text is selected, convert only the selected HTML fragment

## WXT-specific notes

- Entrypoint metadata is defined via `export default defineContentScript({...})` or similar WXT patterns
- Content script `matches` configured in the entrypoint file itself, not manifest.json
- Use `browser.runtime.sendMessage` / `browser.runtime.onMessage` for popup↔content↔background comms
