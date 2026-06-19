# starlight-page-context-action

A [Starlight](https://starlight.astro.build/) plugin that adds page action buttons to the right sidebar — making utility actions like **copy page**, **view as markdown**, **open in AI chat**, and **scroll to top** always accessible alongside the table of contents.

**[Demo & Docs](https://starlight-page-context-action.vercel.app)**

## Features

- **Copy Page** — Copies the cleaned markdown content to clipboard with visual feedback
- **View as Markdown** — Opens the cleaned markdown file in the browser
- **Open in AI Chat** — Dropdown to open the current page in ChatGPT, Claude, or T3 Chat with a customizable prompt
- **Scroll to Top** — Smooth scroll back to the top of the page
- **Mobile Support** — Compact "Page Actions" dropdown in the mobile table of contents bar
- **Zero Config** — Works out of the box with sensible defaults
- **Per-Page Control** — Disable actions on specific pages via frontmatter
- **Two Layouts** — Choose between a spread (vertical list) or compact (pill + kebab menu) layout
- **Fully Themed** — Inherits Starlight's CSS variables with automatic light/dark mode support

## Installation

```bash
npm install starlight-page-context-action
```

## Getting Started

Add the plugin to your Starlight config in `astro.config.mjs`:

```js
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightPageContextAction from "starlight-page-context-action";

export default defineConfig({
  integrations: [
    starlight({
      title: "My Docs",
      plugins: [starlightPageContextAction()],
    }),
  ],
});
```

That's it — all actions are enabled by default and appear above the table of contents.

## Configuration

Pass a config object to customize behavior:

```js
starlightPageContextAction({
  prompt: "Read {url}. I want to ask questions about it.",
  position: "above-toc",
  layout: "spread",
  sticky: false,
  actions: {
    copy: true,
    viewMarkdown: false,
    chatgpt: true,
    claude: true,
    t3chat: true,
    scrollTop: true,
  },
});
```

### Options

| Option     | Type                           | Default                                           | Description                                                                                                                             |
| ---------- | ------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`   | `string`                       | `"Read {url}. I want to ask questions about it."` | Prompt template for AI services. `{url}` is replaced with the current page URL.                                                         |
| `position` | `"above-toc"` \| `"below-toc"` | `"above-toc"`                                     | Position of the actions relative to the table of contents.                                                                              |
| `layout`   | `"spread"` \| `"compact"`      | `"spread"`                                        | Layout style. `"spread"` shows all buttons vertically. `"compact"` shows a primary copy button inline with a kebab menu for AI actions. |
| `sticky`   | `boolean`                      | `false`                                           | Whether the actions stick to the top/bottom of the sidebar on scroll.                                                                   |
| `actions`  | `object`                       | `copy`, `chatgpt`, `claude`, `t3chat`, `scrollTop` `true`; `viewMarkdown` `false` | Toggle individual action buttons on or off.                                                                                             |

### Disabling on a Specific Page

Add `pageContextActions: false` to the page's frontmatter:

```mdx
---
title: My Page
pageContextActions: false
---
```

## Peer Dependencies

- `astro` >= 5.0.0
- `@astrojs/starlight` >= 0.36.0

## License

[MIT](LICENSE)
