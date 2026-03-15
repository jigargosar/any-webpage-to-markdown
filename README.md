# Any Webpage to Markdown Converter

Chrome extension that converts any webpage to clean, readable markdown. Uses Readability.js to strip noise (navbars, ads, footers) and Turndown to convert the clean HTML to markdown.

Built with WXT + React + TypeScript + Tailwind CSS.

## Plan of Action

### Setup
1. `git init` + initial commit with scaffold
2. Install runtime deps (`@mozilla/readability`, `turndown`, `@types/turndown`)
3. Set up Tailwind CSS for popup (WXT + PostCSS integration)
4. Configure `wxt.config.ts` — manifest name, description, permissions (`activeTab`, `scripting`, `clipboardWrite`, `contextMenus`), keyboard shortcut command

### Core pipeline
5. Content script: clone DOM → Readability.js extract article → return clean HTML
6. Content script: pipe clean HTML through Turndown → return markdown string
7. Content script: configure Turndown — fenced code blocks, ATX headings, bullet list markers
8. Content script: graceful fallback — if Readability fails (non-article page), fall back to `document.body`
9. Background script: message relay between popup ↔ content script
10. Background script: register keyboard shortcut listener (`Alt+Shift+M` or similar)

### Popup UI
11. Popup layout — dark theme shell, textarea/preview area, toolbar with action buttons
12. Copy to clipboard button
13. Download as `.md` file button
14. Raw markdown / rendered preview toggle
15. Loading state while content script processes
16. Error state — handle `chrome://` pages, empty results, Readability failures

### Features
17. Frontmatter toggle — prepend YAML block (title, url, date) to markdown output
18. Selection-only mode — if text is highlighted, convert only that HTML fragment
19. Context menu — right-click selected text → "Copy selection as Markdown"
20. Persist toggle states (frontmatter, selection-mode) via `@wxt-dev/storage`
21. Code block language detection — infer lang from `class="language-*"` / `class="hljs-*"`
22. Turndown plugin rules — tables (`turndown-plugin-gfm`), strikethrough, task lists

### Polish
23. Design extension icon set (16/32/48/96/128)
24. Test on target sites — SPAs (React/Vue docs), static blogs, GitHub, news sites, docs (MDN, Imba)
25. Edge cases — pages with iframes, shadow DOM content, lazy-loaded images
26. Performance — ensure Readability clone + Turndown runs under 500ms on heavy pages

### Ship
27. Write Chrome Web Store description (SEO: webpage, markdown, converter, clean, reader mode)
28. Create screenshots / promo images for listing
29. Write minimal privacy policy (no data collection, all local processing)
30. `pnpm zip` → submit to Chrome Web Store
31. (Stretch) Firefox port via `pnpm build:firefox`

## Development

`pnpm dev` — hot-reload dev mode (loads unpacked extension in Chrome)
`pnpm build` — production build
`pnpm zip` — package for Chrome Web Store
