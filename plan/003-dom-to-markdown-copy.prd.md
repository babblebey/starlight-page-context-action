# PRD: Enhanced Markdown Copy & View as Markdown Action

## Summary

Enhance the build-time `cleanMarkdown()` transform to **strip and convert known Astro/Starlight/MDX component tags** into clean Markdown equivalents, so the "Copy page" action produces standard Markdown instead of raw JSX. Additionally, introduce a new **"View as Markdown"** action button that links directly to the cleaned raw Markdown file served from the build output.

A future **DOM-to-Markdown runtime converter** is documented as a planned enhancement for handling arbitrary unknown components.

---

## Motivation

When a docs page uses MDX components (e.g. `<PluginCard>`, `<PluginStep>`, `<Card>`, `<Tabs>`, or any custom component), the current `cleanMarkdown()` build-time transform only strips frontmatter and `import` statements — component tags pass through verbatim. This means:

- Users copying a page with components see raw JSX markup in their clipboard
- The copied content is not parseable as standard Markdown
- Pasting into AI chat, notes, or other tools produces confusing output

Enhancing the build-time transform to strip and convert component tags solves this for all known Starlight built-in components and provides a simple pattern for handling common custom components. The build-time approach also produces a **static file at a stable URL**, enabling a "View as Markdown" action that can serve as an AI-readable endpoint.

Reference implementation: [`starlight-page-actions`](https://github.com/dlcastillop/starlight-page-actions/blob/main/packages/starlight-page-actions/index.ts) uses the same build-time regex approach to convert Starlight components in its static copy transform.

---

## Goals

1. "Copy page" produces clean, standard Markdown — no JSX component tags, no raw HTML wrappers
2. Handle all built-in Starlight components: `<Steps>`, `<CardGrid>`, `<FileTree>`, `<Icon>`, `<Tabs>`, `<TabItem>`, `<LinkCard>`, `<Card>`, `<Aside>`, `<Badge>`, `<Code>`, `<LinkButton>`
3. Strip generic HTML wrapper tags (e.g. `<div>`, `<span>`) that commonly appear in MDX content
4. Extract page title from frontmatter and prepend as `# Title`
5. Introduce a new **"View as Markdown"** action that opens the cleaned `.md` file in the browser
6. Add `actions.viewMarkdown` config option (default: `false`) to enable the new action
7. Keep the cleaned Markdown files at stable URLs in the build output for potential AI/LLM consumption

## Non-Goals

- Handling arbitrary unknown components perfectly (planned as future DOM-to-Markdown enhancement)
- Generating `llms.txt` (separate feature, may be added later)
- Changing the AI prompt actions, scroll-to-top, dropdown UX, or layout system
- Adding new runtime dependencies
- Internationalisation or localisation

---

## Architecture

### Current Flow (Before)

```
Build time:
  cleanMarkdown(content)
    → strip frontmatter (---...---)
    → strip import statements
    → output: Markdown with JSX component tags still present

Runtime (Copy page):
  fetch(`/_page-context-action-raw/{entryFilePath}`)
    → raw text with JSX tags remaining
    → navigator.clipboard.writeText(rawText)
```

### New Flow (After)

```
Build time:
  cleanMarkdown(content)
    → extract title from frontmatter → prepend as "# Title"
    → strip frontmatter
    → strip import statements
    → strip wrapper-only components (Steps, CardGrid, FileTree, Tabs, TabItem, Icon)
    → convert semantic components to Markdown:
        LinkCard → [title](href)
        Card → **title** + content
        Aside → **Title:** content
        Badge → text
        Code → fenced code block
        LinkButton → [text](href)
    → strip remaining HTML tags (<div>, <span>, etc.)
    → normalize whitespace
    → output: clean standard Markdown

Runtime (Copy page):
  fetch(`/_page-context-action-raw/{entryFilePath}`)
    → clean Markdown (no JSX tags)
    → navigator.clipboard.writeText(rawText)

Runtime (View as Markdown) [new action]:
  window.open(`/_page-context-action-raw/{entryFilePath}`)
    → browser displays clean Markdown file
```

---

## Component Conversion Rules

### Wrapper-Only Components (strip tags, keep children)

These components are purely structural wrappers — removing the opening/closing tags leaves valid Markdown content.

| Component | Regex Pattern | Replacement |
|---|---|---|
| `<Steps>` / `</Steps>` | `/<\s*\/?\s*Steps\b[^>]*>\s*/g` | *(empty)* |
| `<CardGrid>` / `</CardGrid>` | `/<\s*\/?\s*CardGrid\b[^>]*>\s*/g` | *(empty)* |
| `<FileTree>` / `</FileTree>` | `/<\s*\/?\s*FileTree\b[^>]*>\s*/g` | *(empty)* |
| `<Tabs>` / `</Tabs>` | `/<\s*\/?\s*Tabs\b[^>]*>\s*/g` | *(empty)* |
| `<TabItem>` / `</TabItem>` | `/<\s*\/?\s*TabItem\b[^>]*>\s*/g` | *(empty)* |
| `<Icon>` / `</Icon>` | `/<\s*\/?\s*Icon\b[^>]*>\s*/g` | *(empty)* |

### Semantic Components (convert to Markdown)

| Component | Pattern | Markdown Output |
|---|---|---|
| `<LinkCard title="X" href="Y" />` | Extract `title` and `href` attributes | `[X](Y)` |
| `<Card title="X">content</Card>` | Extract `title` attr, capture inner content | `**X**\ncontent` |
| `<Aside type="T" title="X">content</Aside>` | Extract optional `type`/`title`, capture content | `**Title:** content` (default titles: Note, Tip, Caution, Danger) |
| `<Badge text="X" />` | Extract `text` attribute | `X` |
| `<Code code="X" lang="Y" />` | Extract `code` and optional `lang`/`title` | `` ```lang\n// title\nX\n``` `` |
| `<LinkButton href="Y">text</LinkButton>` | Extract `href`, capture inner text | `[text](Y)` |

### HTML Tag Stripping

After component conversion, strip any remaining raw HTML tags that may appear in MDX content:

```js
// Strip remaining HTML tags (but preserve content inside code blocks)
cleaned = cleaned.replace(/(```[\s\S]*?```)|<[^>]+>/g, (_, codeBlock) => codeBlock || '');
```

### Title Extraction

Extract the `title` field from YAML frontmatter and prepend as a `# Title` heading:

```js
const frontMatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;
const match = content.match(frontMatterRegex);
if (match) {
  const titleMatch = match[1].match(/title:\s*["']?([^"'\n]+)["']?/);
  title = titleMatch ? titleMatch[1].trim() : "";
  markdownContent = match[2];
}
```

### Whitespace Normalization

- Collapse runs of 3+ newlines → 2 newlines (single blank line)
- Fix indentation: strip excessive leading whitespace from numbered list items
- Trim the final output

---

## New Action: View as Markdown

### UI

A new **"View as Markdown"** button/link that opens the cleaned raw Markdown file in a new browser tab.

- **Spread layout**: New button row below "Copy page", above "Open in Chat" or "Scroll to top"
- **Compact layout**: New item in the kebab dropdown menu
- **Mobile layout**: New item in the mobile page actions dropdown
- **Icon**: Document/file icon (consistent with Markdown file association)

### Config

```js
actions: {
  copy: true,          // existing
  viewMarkdown: false, // new — opt-in, default false
  chatgpt: true,       // existing
  claude: true,        // existing
  t3chat: true,        // existing
  scrollTop: true,     // existing
}
```

### Behavior

- Clicking "View as Markdown" opens `{base}/_page-context-action-raw/{entryFilePath}` in a new tab
- The browser displays the raw Markdown text (served as a static file)
- The URL is stable and can be bookmarked or shared

---

## Scope

### Files to Modify

| File | Changes |
|---|---|
| `packages/starlight-page-context-action/index.js` | Enhance `cleanMarkdown()` with component stripping/conversion regexes, title extraction, HTML tag stripping, and whitespace normalization |
| `packages/starlight-page-context-action/index.d.ts` | Add `viewMarkdown?: boolean` to `StarlightPageContextActionActions` |
| `packages/starlight-page-context-action/components/PageContextActions.astro` | Add "View as Markdown" button (spread layout) and dropdown item (compact layout) |
| `packages/starlight-page-context-action/overrides/MobileTableOfContents.astro` | Add "View as Markdown" item in mobile dropdown |

### Files NOT Modified

| File | Reason |
|---|---|
| `packages/starlight-page-context-action/virtual.d.ts` | `viewMarkdown` is already part of the `actions` object shape in the virtual config |
| `packages/starlight-page-context-action/overrides/PageSidebar.astro` | No changes needed; it passes `entryFilePath` through to components |
| `packages/starlight-page-context-action/package.json` | No new dependencies |

---

## Implementation Phases

### Phase 1: Enhance `cleanMarkdown()` in `index.js`

- [x] Extract page title from frontmatter and prepend as `# Title\n\n`
- [x] Add regexes to strip wrapper-only components: `Steps`, `CardGrid`, `FileTree`, `Tabs`, `TabItem`, `Icon`
- [x] Add regexes to convert semantic components:
  - `LinkCard` → `[title](href)`
  - `Card` → `**title**\ncontent`
  - `Aside` → `**Title:** content` (with default titles per type)
  - `Badge` → text
  - `Code` → fenced code block
  - `LinkButton` → `[text](href)`
- [x] Strip remaining HTML tags (preserving content inside fenced code blocks)
- [x] Strip import statements (preserving content inside fenced code blocks)
- [x] Normalize whitespace (collapse 3+ newlines, fix indentation)
- [x] Ensure all regex operations are safe against ReDoS (no nested quantifiers on overlapping patterns)

### Phase 2: Add `viewMarkdown` Config Option

- [x] Add `viewMarkdown: false` to `defaultConfig.actions` in `index.js`
- [x] Add `viewMarkdown?: boolean` with JSDoc to `StarlightPageContextActionActions` in `index.d.ts`

### Phase 3: "View as Markdown" UI in Desktop Component

- [ ] Add "View as Markdown" button in spread layout (link opening `{base}/_page-context-action-raw/{entryFilePath}` in new tab)
- [ ] Add "View as Markdown" item in compact layout kebab dropdown
- [ ] Conditionally render based on `actions.viewMarkdown`

### Phase 4: "View as Markdown" UI in Mobile Component

- [ ] Add "View as Markdown" item in mobile page actions dropdown in `MobileTableOfContents.astro`
- [ ] Conditionally render based on `actions.viewMarkdown`

### Phase 5: Verification

- [ ] `pnpm build` in `docs/` completes without errors
- [ ] Copy from plugins-list page → clean Markdown, no `<PluginCard>`, `<PluginStep>`, `<div>` tags
- [ ] Copy from default example page → clean Markdown with `# Title` heading
- [ ] Copy from a page with fenced code blocks → code blocks preserved (not mangled by HTML stripping)
- [ ] Copy from a page with `<Aside>`, `<Card>`, `<LinkCard>` → proper Markdown equivalents
- [ ] "View as Markdown" button opens the raw file in the browser (when enabled)
- [ ] `viewMarkdown: false` (default) → button not rendered
- [ ] Mobile layout: both copy and view-as-markdown actions work
- [ ] Icon feedback (success checkmark / error X) still works in both layouts

---

## Example: Expected Copy Output

### Input (plugins-list.mdx source, abbreviated)

```mdx
---
title: Plugins
---
import PluginCard from "../../../components/PluginCard.astro";
import PluginStep from "../../../components/PluginStep.astro";

## Official plugins

<div class="plugin-grid">

<PluginCard name="@semantic-release/commit-analyzer" url="https://github.com/semantic-release/commit-analyzer" note="This is already part of semantic-release...">
  <PluginStep name="analyzeCommits">
    Determine the type of release by analyzing commits with [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog).
  </PluginStep>
</PluginCard>

</div>
```

### Expected Output After `cleanMarkdown()` Transform

```markdown
# Plugins

## Official plugins

Determine the type of release by analyzing commits with [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog).
```

> **Note**: Unknown custom components like `<PluginCard>` and `<PluginStep>` have their tags stripped, leaving their inner text content. The title is extracted from frontmatter and prepended. Wrapper `<div>` tags are removed.

---

## Decisions

| Decision | Rationale |
|---|---|
| Build-time regex stripping as primary approach | Produces static files at stable URLs; enables "View as Markdown" action; works for copy, AI consumption, and bookmarking; deterministic output |
| Handle known Starlight built-ins explicitly | Explicit conversion produces better Markdown (e.g. `LinkCard` → link, `Aside` → bold callout) than generic tag stripping |
| Strip unknown component tags generically | After known components are converted, remaining tags are stripped via `<[^>]+>` regex (preserving fenced code blocks), leaving inner text content — best-effort for unknown components |
| `viewMarkdown` defaults to `false` | Opt-in to avoid adding UI for users who don't need it; the cleaned files are always generated since `copy` needs them |
| DOM-to-Markdown as future enhancement, not primary | Build-time approach covers the common case; DOM approach can be added later for perfect fidelity with arbitrary components |
| No new dependencies | All regex operations run in the existing `vite-plugin-static-copy` transform; no Turndown or similar library needed |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Unknown custom components (e.g. `<PluginCard>`) produce imperfect output | Generic HTML tag stripping preserves inner text content; future DOM-to-Markdown enhancement will handle these perfectly |
| Regex can't perfectly parse nested/malformed HTML | Starlight MDX content is well-structured; the regex patterns target specific known component shapes; fenced code blocks are protected from stripping |
| New Starlight components added in future versions | Maintain the regex list; the generic HTML tag stripping catches unknown components with degraded but usable output |
| ReDoS from complex regex patterns | Keep patterns simple (no nested quantifiers on overlapping groups); test with large inputs |
| `viewMarkdown` URL exposes raw file path structure | The `_page-context-action-raw/` path is already public (used by copy); no new exposure |

---

## Future Enhancement: DOM-to-Markdown Runtime Converter

A future iteration can add a **runtime DOM-to-Markdown converter** as an optional enhancement:

- Read the rendered HTML from `document.querySelector('.sl-markdown-content')`
- Walk the DOM tree recursively, converting HTML elements to Markdown equivalents
- Use as the **primary** copy source, with the build-time raw file as fallback

This approach would:
- Handle **any** component universally (no regex maintenance)
- Reflect exactly what the user sees on the page
- Support runtime-only content (e.g. client-side rendered components)

It would be implemented as a shared `htmlToMarkdown()` function on `window.__pageContextAction`, injected via `PageSidebar.astro`, and called by both desktop and mobile copy handlers before falling back to the raw file fetch.

**Element conversion rules** for the future DOM converter:

| HTML Element | Markdown Output |
|---|---|
| `h1` – `h6` | `#` to `######` + text |
| `p` | text + double newline |
| `a` | `[text](absoluteHref)` |
| `strong`, `b` | `**text**` |
| `em`, `i` | `*text*` |
| `code` (inline) | `` `text` `` |
| `pre > code` | fenced code block with language |
| `ul/ol > li` | `- item` / `1. item` with nesting |
| `blockquote` | `> text` |
| `hr` | `---` |
| `img` | `![alt](src)` |
| `table` | Markdown table with alignment row |
| `details/summary` | bold summary + content |
| `div`, `span`, etc. | pass-through (process children) |

This is deferred to a separate PRD and implementation cycle.

---

## Technical References

- [`starlight-page-actions` index.ts](https://github.com/dlcastillop/starlight-page-actions/blob/main/packages/starlight-page-actions/index.ts) — Reference implementation of build-time component stripping with regex
- [Starlight Built-in Components](https://starlight.astro.build/reference/components/) — Full list of Starlight components to handle
- [`vite-plugin-static-copy` API](https://github.com/sapphi-red/vite-plugin-static-copy) — Transform handler for build-time content processing
- [MDN `navigator.clipboard.writeText()`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — Clipboard API used by copy handler
