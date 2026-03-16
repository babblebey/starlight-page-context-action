# Product Requirements Document: starlight-page-action

## Overview

**starlight-page-action** is a Starlight plugin that adds page action buttons to the **right sidebar, above the table of contents**. It provides a "Copy page" button (copies raw markdown to clipboard) and an "Ask AI about this page" dropdown (opens the page in ChatGPT, Claude, or T3 Chat).

### Differentiation

Existing plugins like [starlight-page-actions](https://github.com/dlcastillop/starlight-page-actions) and [starlight-contextual-menu](https://github.com/corsfix/starlight-contextual-menu) place action buttons **next to the page title** in the main content area. This plugin places them in the **right sidebar before the table of contents**, keeping the content area clean while making actions persistently visible as users scroll.

---

## Goals

1. Provide a zero-config, drop-in plugin for Starlight documentation sites
2. Place page actions in the right sidebar above the table of contents
3. Support copying the current page's markdown content to the clipboard
4. Support opening the current page in AI chat services (ChatGPT, Claude, T3 Chat)
5. Allow per-page opt-out via frontmatter
6. Match Starlight's visual design using its CSS custom properties

## Non-Goals

- Internationalization (i18n) support (future consideration)
- Share buttons (social media, email, etc.)
- "Edit this page on GitHub" action (Starlight has this built-in)
- "Scroll to top" action
- Automatic `llms.txt` file generation
- Mobile-specific layout overrides (actions will be hidden on mobile alongside the right sidebar)

---

## Architecture

### Plugin Type

Starlight plugin using the `config:setup` hook API.

### Component Override Strategy

Override the **`PageSidebar`** component instead of `PageTitle`. The default `PageSidebar.astro` renders:

```
MobileTableOfContents
TableOfContents (in .right-sidebar-panel)
```

Our override wraps the default, injecting a `<PageActions />` component before the table of contents panel:

```
PageActions (in .right-sidebar-panel)
MobileTableOfContents
TableOfContents (in .right-sidebar-panel)
```

### Config Delivery

User configuration is passed from the plugin entry point to Astro components via `vite-plugin-virtual`, exposing a `virtual:starlight-page-action-config` module.

### Markdown Serving

Raw `.md`/`.mdx` source files are copied to the build output via `vite-plugin-static-copy`, enabling the "Copy page" feature to fetch the markdown content at runtime.

---

## Project Structure

```
starlight-page-action/
├── package.json                          # Monorepo root
├── pnpm-workspace.yaml                   # Workspace definition
├── .gitignore
├── .npmrc
├── packages/
│   └── starlight-page-action/
│       ├── package.json                  # Plugin package (name: starlight-page-action)
│       ├── index.js                      # Plugin entry point
│       ├── index.d.ts                    # TypeScript declarations for config
│       ├── virtual.d.ts                  # Virtual module type declarations
│       ├── README.md                     # npm README
│       ├── overrides/
│       │   └── PageSidebar.astro         # Overrides default PageSidebar
│       └── components/
│           └── PageActions.astro         # Action buttons UI
└── docs/                                 # Demo/test Astro + Starlight site
    ├── package.json
    ├── astro.config.mjs
    └── src/
        └── content/
            └── docs/
                ├── index.mdx
                └── ...
```

---

## Configuration API

### Usage

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightPageAction from "starlight-page-action";

export default defineConfig({
  integrations: [
    starlight({
      title: "My Docs",
      plugins: [
        starlightPageAction({
          // All options are optional
          prompt: "Read {url}. I want to ask questions about it.",
          actions: {
            copy: true,
            chatgpt: true,
            claude: true,
            t3chat: true,
          },
        }),
      ],
    }),
  ],
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | `string` | `"Read {url}. I want to ask questions about it."` | Prompt template for AI chat services. `{url}` is replaced with the current page URL. |
| `actions.copy` | `boolean` | `true` | Show "Copy page" button. |
| `actions.chatgpt` | `boolean` | `true` | Show "Open in ChatGPT" in the AI dropdown. |
| `actions.claude` | `boolean` | `true` | Show "Open in Claude" in the AI dropdown. |
| `actions.t3chat` | `boolean` | `true` | Show "Open in T3 Chat" in the AI dropdown. |

### Per-Page Frontmatter

```md
---
title: My Page
pageActions: false
---
```

Setting `pageActions: false` hides the action buttons on that specific page. All other pages show actions by default.

---

## Component Specifications

### PageSidebar Override (`overrides/PageSidebar.astro`)

**Responsibilities:**

1. Import the default `PageSidebar` from `@astrojs/starlight/components/PageSidebar.astro`
2. Check the current page's frontmatter for `pageActions` field
3. If `pageActions` is not `false`, render `<PageActions />` before the default `PageSidebar`
4. Always render the default `PageSidebar` (with `<slot />` pass-through)

### PageActions Component (`components/PageActions.astro`)

**Responsibilities:**

1. Render a styled container matching the right sidebar panel design
2. Display a "Copy page" button
3. Display an "Ask AI" dropdown button with sub-items for enabled AI services
4. Include client-side `<script>` for:
   - Copy: Fetch `currentPath.md`, write to clipboard via `navigator.clipboard.writeText()`
   - Dropdown toggle: Open/close the AI dropdown on click, close on outside click

**Visual Design:**

- Uses Starlight CSS variables: `--sl-color-bg`, `--sl-color-text`, `--sl-color-gray-*`, `--sl-color-white`, etc.
- Buttons styled as compact, icon + label items matching the sidebar aesthetic
- Dropdown positioned below the trigger button, styled with `--sl-color-bg` background and `--sl-shadow-md` shadow
- Copy button shows a transient success/error icon for 3 seconds after clicking

**Layout:**

```
┌─────────────────────────────┐
│ Page Actions                │
│ ┌─────────────────────────┐ │
│ │ 📋 Copy page            │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🤖 Ask AI ▾             │ │
│ └─────────────────────────┘ │
│   ┌───────────────────────┐ │
│   │ Open in ChatGPT       │ │
│   │ Open in Claude        │ │
│   │ Open in T3 Chat       │ │
│   └───────────────────────┘ │
├─────────────────────────────┤
│ On this page                │
│  Heading 1                  │
│  Heading 2                  │
│  ...                        │
└─────────────────────────────┘
```

---

## Plugin Entry Point (`index.js`)

### Exported Function

```
starlightPageAction(userConfig?) → StarlightPlugin
```

### Hook: `config:setup`

1. **Merge config**: Deep-merge `userConfig` with defaults
2. **Validate**: Warn if no actions are enabled
3. **Add integration**: Register an Astro integration with:
   - `astro:config:setup` hook that configures Vite plugins:
     - `vite-plugin-virtual`: Exposes merged config as `virtual:starlight-page-action-config`
     - `vite-plugin-static-copy`: Copies `src/content/docs/**/*.{md,mdx}` to build output with frontmatter stripped and Starlight components cleaned
4. **Update Starlight config**: Override `PageSidebar` component, respecting any prior user overrides via spread:
   ```js
   updateConfig({
     components: {
       PageSidebar: "starlight-page-action/overrides/PageSidebar.astro",
       ...starlightConfig.components,
     },
   });
   ```

---

## Dependencies

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `vite-plugin-static-copy` | Copy raw markdown files to build output for the copy feature |
| `vite-plugin-virtual` | Expose plugin config as a virtual module accessible in Astro components |

### Peer Dependencies

| Package | Version |
|---------|---------|
| `@astrojs/starlight` | `>=0.36.0` |
| `astro` | `>=5.0.0` |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `@astrojs/starlight` | Type definitions and component imports |

---

## Implementation Phases

### Phase 1: Project Scaffolding

- [x] Initialize monorepo root (`package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.npmrc`)
- [x] Create plugin package structure (`packages/starlight-page-action/`)
- [x] Set up `package.json` with correct exports, dependencies, peer dependencies

### Phase 2: Plugin Core

- [ ] Implement `index.js` with `starlightPageAction()` function
- [ ] Config merging and validation logic
- [ ] Astro integration with `vite-plugin-virtual` and `vite-plugin-static-copy`
- [ ] `updateConfig()` call to override `PageSidebar`
- [ ] Write `index.d.ts` and `virtual.d.ts` for TypeScript support

### Phase 3: PageSidebar Override

- [ ] Create `overrides/PageSidebar.astro`
- [ ] Import and render default `PageSidebar`
- [ ] Conditionally render `PageActions` based on frontmatter

### Phase 4: PageActions Component

- [ ] Create `components/PageActions.astro`
- [ ] Implement "Copy page" button with clipboard API
- [ ] Implement "Ask AI" dropdown with configurable service links
- [ ] Style using Starlight CSS variables
- [ ] Client-side script for copy + dropdown interactions

### Phase 5: Docs Site

- [ ] Initialize Astro + Starlight docs site in `docs/`
- [ ] Add plugin as workspace dependency
- [ ] Create sample documentation pages
- [ ] Verify all features work in dev and production builds

---

## Acceptance Criteria

1. **Installation**: `pnpm install` in monorepo root completes without errors
2. **Dev server**: `pnpm dev` in `docs/` starts the dev server without build errors
3. **Placement**: Page actions appear in the right sidebar **above** the table of contents
4. **Copy button**: Clicking "Copy page" copies the page's markdown content to the clipboard
5. **Copy feedback**: Copy button shows a success checkmark icon for 3 seconds after successful copy
6. **AI dropdown**: Clicking "Ask AI" reveals a dropdown with enabled AI service links
7. **AI links**: Each AI link opens in a new tab with the configured prompt and current page URL
8. **Per-page disable**: Adding `pageActions: false` to a page's frontmatter hides the actions on that page only
9. **Config options**: All `actions.*` boolean options correctly show/hide their respective UI elements
10. **Custom prompt**: The `prompt` option correctly replaces `{url}` with the current page URL in AI links
11. **Theming**: Actions visually match Starlight's default theme (light and dark mode)
12. **Production build**: `pnpm build` in `docs/` completes successfully with all features working in the output
13. **No conflicts**: Plugin does not break existing Starlight features (sidebar nav, search, ToC, pagination)

---

## Technical References

- [Starlight Overrides Reference](https://starlight.astro.build/reference/overrides/) — Lists all overridable components including `PageSidebar`
- [Starlight Plugins Reference](https://starlight.astro.build/reference/plugins/) — Plugin API: `config:setup` hook, `updateConfig`, `addIntegration`
- [Starlight Overriding Components Guide](https://starlight.astro.build/guides/overriding-components/) — Patterns for reusing built-in components
- [Default PageSidebar.astro](https://github.com/withastro/starlight/blob/main/packages/starlight/components/PageSidebar.astro) — Source to understand structure
- [starlight-page-actions](https://github.com/dlcastillop/starlight-page-actions) — Reference plugin (overrides `PageTitle`, TypeScript)
- [starlight-contextual-menu](https://github.com/corsfix/starlight-contextual-menu) — Reference plugin (injects script, JavaScript, dropdown UI)
