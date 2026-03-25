# PRD: DOM-to-Markdown Copy Action

## Summary

Replace the "Copy page" clipboard behavior so it copies **plain Markdown** derived from the rendered page content, instead of the raw `.mdx` source which leaks JSX component tags (e.g. `<PluginCard>`, `<PluginStep>`, `<div class="plugin-grid">`).

The copy handler will read the rendered HTML from the page's `.sl-markdown-content` DOM element, convert it to clean Markdown at runtime, and write the result to the clipboard. The existing raw-file fetch via `vite-plugin-static-copy` is kept as a fallback if the DOM element is unavailable.

---

## Motivation

When a docs page uses custom Astro/MDX components (e.g. `<PluginCard>`, `<PluginStep>`, or any arbitrary user component), the current copy behavior fetches the raw `.mdx` source from `_page-context-action-raw/`. The `cleanMarkdown()` build-time transform only strips frontmatter and `import` statements — it does **not** resolve component tags into their rendered output. This means:

- Users copying a page with custom components see raw JSX markup in their clipboard
- The copied content is not parseable as standard Markdown
- Pasting into AI chat, notes, or other tools produces confusing output

Reading from the rendered DOM and converting to Markdown solves this universally for **any** component, without needing per-component stripping rules.

---

## Goals

1. Copy page produces clean, standard Markdown text — no HTML tags, no JSX components
2. Works universally with any custom Astro/MDX component without special handling
3. Preserves the structural semantics of the rendered page: headings, links (absolute URLs), bold/italic, code blocks, lists, tables, images, blockquotes
4. Falls back to the existing raw-file fetch if the DOM content element is unavailable
5. No external runtime dependencies (no Turndown, no heavy libraries) — inline lightweight converter

## Non-Goals

- Perfect round-trip fidelity with the original `.mdx` source (best-effort rendering is sufficient)
- Converting exotic HTML elements like `<canvas>`, `<svg>`, `<video>`, `<iframe>` to Markdown
- Changing the AI prompt actions, scroll-to-top, dropdown UX, or any other action
- Removing `vite-plugin-static-copy` or the `cleanMarkdown()` build-time transform
- Internationalisation or localisation of copied content

---

## Architecture

### Current Flow (Before)

```
User clicks "Copy page"
  → fetch(`/_page-context-action-raw/{entryFilePath}`)
  → raw text (frontmatter + imports stripped, but JSX tags remain)
  → navigator.clipboard.writeText(rawText)
```

### New Flow (After)

```
User clicks "Copy page"
  → document.querySelector('.sl-markdown-content')
  → htmlToMarkdown(contentEl)       ← new runtime converter
  → navigator.clipboard.writeText(markdownText)
  → fallback: if DOM element missing, fetch raw file (current behavior)
```

### Shared Converter Function

Both the desktop component (`PageContextActions.astro`) and the mobile component (`MobileTableOfContents.astro`) use `<script is:inline>` blocks. To avoid duplicating the converter:

- Define `htmlToMarkdown` on `window.__pageContextAction` in a dedicated `<script is:inline>` block injected by the `PageSidebar.astro` override (rendered once per page before both desktop and mobile components)
- Both copy handlers call `window.__pageContextAction.htmlToMarkdown(el)` instead of inlining the logic

---

## HTML-to-Markdown Converter Specification

### Function Signature

```js
/**
 * Convert a DOM element's rendered content to clean Markdown.
 * @param {Element} element - The root element to convert (e.g. .sl-markdown-content)
 * @returns {string} - Clean Markdown text
 */
function htmlToMarkdown(element) { ... }
```

### Element Conversion Rules

| HTML Element | Markdown Output | Notes |
|---|---|---|
| `h1` – `h6` | `#` to `######` + text + `\n\n` | Strip anchor links / IDs from heading text |
| `p` | text + `\n\n` | |
| `a` | `[text](href)` | Resolve relative `href` to absolute using `window.location.origin` |
| `strong`, `b` | `**text**` | |
| `em`, `i` | `*text*` | |
| `code` (inline) | `` `text` `` | Only when not inside `<pre>` |
| `pre > code` | ```` ```lang\ntext\n``` ```` + `\n\n` | Detect language from `class="language-*"` or `data-language` |
| `ul > li` | `- item` | Support nesting with 2-space indent per level |
| `ol > li` | `1. item` | Use sequential numbering; support nesting |
| `blockquote` | `> text` | Prefix each line; support nested blockquotes |
| `hr` | `---\n\n` | |
| `img` | `![alt](src)` | Resolve relative `src` to absolute |
| `table` | Markdown table with alignment row | `th` → header row; `td` → data rows; `---` separator |
| `br` | `\n` | |
| `details` / `summary` | `**summary text**\n\ncontent` | Expand details content; bold the summary |
| `del`, `s` | `~~text~~` | |
| `div`, `span`, `section`, `article`, `nav`, `aside`, `figure`, `figcaption`, `main`, `header`, `footer` | Process children only (pass-through) | No markup added for generic containers |
| Text nodes | Trimmed text content | Collapse multiple whitespace to single space |
| Script, style, SVG, template | Skipped entirely | |

### Whitespace Normalization

- Collapse runs of 3+ newlines to 2 newlines (single blank line)
- Trim leading/trailing whitespace from the final output
- Ensure the output ends with a single trailing newline

### Link Resolution

- Relative URLs (e.g. `/guides/configuration`, `../getting-started`) are resolved to absolute URLs using `new URL(href, window.location.origin)` so they work when pasted into external tools

---

## Scope

### Files to Modify

| File | Changes |
|---|---|
| `packages/starlight-page-context-action/overrides/PageSidebar.astro` | Add a `<script is:inline>` block that defines `window.__pageContextAction.htmlToMarkdown` — the shared converter function |
| `packages/starlight-page-context-action/components/PageContextActions.astro` | Update `handleCopy()` to: (1) query `.sl-markdown-content`, (2) call `window.__pageContextAction.htmlToMarkdown()`, (3) copy result, (4) fall back to raw-file fetch on failure |
| `packages/starlight-page-context-action/overrides/MobileTableOfContents.astro` | Update the mobile copy handler with the same DOM-first + fallback logic |

### Files NOT Modified

| File | Reason |
|---|---|
| `packages/starlight-page-context-action/index.js` | `vite-plugin-static-copy` and `cleanMarkdown()` remain for fallback; no config changes needed |
| `packages/starlight-page-context-action/index.d.ts` | No new config options |
| `packages/starlight-page-context-action/virtual.d.ts` | No new virtual modules |
| `packages/starlight-page-context-action/package.json` | No new dependencies |

---

## Implementation Phases

### Phase 1: Shared Converter Script in `PageSidebar.astro`

- [ ] Add a `<script is:inline>` block to `PageSidebar.astro` that defines `window.__pageContextAction = { htmlToMarkdown }` before the component slots render
- [ ] Implement the recursive `htmlToMarkdown(element)` function per the conversion rules above
- [ ] The script runs once per page load, making the converter available to both desktop and mobile handlers

### Phase 2: Update Desktop Copy Handler in `PageContextActions.astro`

- [ ] Modify the `handleCopy(btn)` function to:
  1. Query `document.querySelector('.sl-markdown-content')`
  2. If found, call `window.__pageContextAction.htmlToMarkdown(contentEl)`
  3. If the result is non-empty, write it to the clipboard
  4. If the DOM element is missing or the result is empty, fall back to the existing raw-file fetch
- [ ] Existing icon feedback (copy → check → error) remains unchanged

### Phase 3: Update Mobile Copy Handler in `MobileTableOfContents.astro`

- [ ] Apply the same DOM-first + fallback pattern to the mobile copy click handler inside the `MobilePageContextActions` custom element
- [ ] The mobile handler already has the same `fetch → clipboard → icon feedback` logic; wrap it identically

### Phase 4: Verification

- [ ] `pnpm build` in `docs/` completes without errors
- [ ] Dev server: Copy from the plugins-list page produces clean Markdown with plugin names as bold text, step descriptions as content, and links intact — no `<PluginCard>`, `<PluginStep>`, or `<div>` tags
- [ ] Copy from a standard Markdown page (e.g. default.mdx) produces clean Markdown
- [ ] Copy from a page with fenced code blocks preserves the code blocks
- [ ] When `.sl-markdown-content` is missing (simulated via devtools), the fallback raw-file fetch still works
- [ ] Mobile layout: "Copy page" from the mobile TOC dropdown produces the same clean Markdown
- [ ] Icon feedback (success checkmark / error X) still works in both layouts

---

## Example: Expected Copy Output

### Input (rendered `.sl-markdown-content` for plugins-list page)

The rendered HTML includes Astro components expanded into `<div>`, `<details>`, `<summary>`, `<a>`, `<p>`, `<span>` elements.

### Expected Clipboard Output (excerpt)

```markdown
## Official plugins

**@semantic-release/commit-analyzer** ([GitHub](https://github.com/semantic-release/commit-analyzer))

This is already part of semantic-release and does not have to be installed separately

**analyzeCommits**

Determine the type of release by analyzing commits with [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog).

**@semantic-release/release-notes-generator** ([GitHub](https://github.com/semantic-release/release-notes-generator))

This is already part of semantic-release and does not have to be installed separately

**generateNotes**

Generate release notes for the commits added since the last release with [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog).

...
```

Note: The exact output depends on the rendered HTML structure. The converter reflects what the user sees on the page, not the original MDX source.

---

## Decisions

| Decision | Rationale |
|---|---|
| Runtime DOM-to-Markdown over enhanced build-time stripping | Universal — works with any component without per-component rules |
| Inline lightweight converter, no external library | Keeps bundle size minimal; avoids adding a dependency like Turndown |
| `vite-plugin-static-copy` kept as fallback | Safety net if DOM reading fails (e.g. SSR edge cases, obscure browsers) |
| Shared via `window.__pageContextAction` namespace | Both `<script is:inline>` blocks need the converter; avoids code duplication while staying compatible with Astro's inline script model |
| `.sl-markdown-content` as the source selector | Starlight's documented content wrapper (`MarkdownContent.astro`); excludes sidebar, nav, ToC, and page chrome |
| Absolute URL resolution for links | Ensures copied Markdown links work when pasted outside the docs site |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Starlight changes `.sl-markdown-content` class name in a future version | Fallback to raw-file fetch still works; update selector as needed |
| Converter misses edge-case HTML elements | Start with common elements (listed above); the converter can be iteratively improved; raw fallback catches critical failures |
| Performance on very large pages (e.g. plugins-list with 50+ cards) | DOM tree walking is fast (sub-millisecond for typical docs pages); no concern expected |
| `window.__pageContextAction` namespace collision | Extremely unlikely for a documentation site; prefix is specific enough |
| Inline script ordering: converter not yet defined when copy handler runs | `PageSidebar.astro` renders the converter script before the `PageContextActions` component and before the `MobileTableOfContents` component, ensuring it's available when handlers bind |

---

## Technical References

- [Starlight `MarkdownContent.astro`](https://github.com/withastro/starlight/blob/main/packages/starlight/components/MarkdownContent.astro) — Defines `.sl-markdown-content` wrapper
- [MDN `TreeWalker` API](https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker) — Alternative to recursive DOM walking (not required but available)
- [MDN `navigator.clipboard.writeText()`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — Clipboard API used by copy handler
- [Astro `is:inline` directive](https://docs.astro.build/en/reference/directives-reference/#isinline) — Scripts are not bundled, run as-is in the page
