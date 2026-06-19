import { viteStaticCopy } from "vite-plugin-static-copy";
import virtual from "vite-plugin-virtual";

/** @type {import('./index.js').StarlightPageContextActionConfig} */
const defaultConfig = {
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
};

/**
 * Strip YAML frontmatter, imports, and Starlight/MDX component tags from
 * markdown content, producing clean standard Markdown.
 * @param {string} content
 * @returns {string}
 */
function cleanMarkdown(content) {
  let title = "";
  let cleaned = content;

  // --- Extract title from frontmatter and strip it ---
  const frontMatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;
  const fmMatch = cleaned.match(frontMatterRegex);
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/title:\s*["']?([^"'\n]+)["']?/);
    title = titleMatch ? titleMatch[1].trim() : "";
    cleaned = fmMatch[2];
  } else {
    // Fallback: strip frontmatter without extracting
    cleaned = cleaned.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  }

  // --- Helper: protect fenced code blocks during transforms ---
  // Splits content into [codeBlock, nonCode, codeBlock, nonCode, ...]
  function transformOutsideCodeBlocks(text, transformFn) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts
      .map((part, i) => (i % 2 === 1 ? part : transformFn(part)))
      .join("");
  }

  // --- Strip import statements (outside code blocks) ---
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(/^import\s+.*?;\s*\r?\n?/gm, ""),
  );

  // --- Strip wrapper-only components (tags removed, children kept) ---
  const wrapperComponents = [
    "Steps",
    "CardGrid",
    "FileTree",
    "Tabs",
    "TabItem",
    "Icon",
  ];
  for (const tag of wrapperComponents) {
    const re = new RegExp(`<\\s*\\/?\\s*${tag}\\b[^>]*>\\s*`, "g");
    cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
      text.replace(re, ""),
    );
  }

  // --- Convert semantic components to Markdown ---

  // <LinkCard title="X" href="Y" /> (self-closing)
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(
      /<LinkCard\s+(?=[^>]*title=["']([^"']+)["'])(?=[^>]*href=["']([^"']+)["'])[^>]*\/?\s*>/g,
      (_, t, h) => `[${t}](${h})`,
    ),
  );

  // <Card title="X">content</Card>
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(
      /<Card\s+(?=[^>]*title=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/\s*Card\s*>/g,
      (_, t, c) => `**${t}**\n${c.trim()}`,
    ),
  );

  // <Aside type="T" title="X">content</Aside>
  const asideDefaults = {
    note: "Note",
    tip: "Tip",
    caution: "Caution",
    danger: "Danger",
  };
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(
      /<Aside\b([^>]*)>([\s\S]*?)<\/\s*Aside\s*>/g,
      (_, attrs, c) => {
        const titleAttr = attrs.match(/title=["']([^"']+)["']/);
        const typeAttr = attrs.match(/type=["']([^"']+)["']/);
        const heading =
          titleAttr?.[1] ||
          asideDefaults[typeAttr?.[1]] ||
          asideDefaults.note;
        return `**${heading}:** ${c.trim()}`;
      },
    ),
  );

  // <Badge text="X" /> (self-closing)
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(
      /<Badge\s+(?=[^>]*text=["']([^"']+)["'])[^>]*\/?\s*>/g,
      (_, t) => t,
    ),
  );

  // <Code code="X" lang="Y" title="Z" /> (self-closing)
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(/<Code\b([^>]*)\/?\s*>/g, (_, attrs) => {
      const codeMatch = attrs.match(/code=["']([^"']+)["']/);
      if (!codeMatch) return "";
      const code = codeMatch[1];
      const langMatch = attrs.match(/lang=["']([^"']+)["']/);
      const titleMatch = attrs.match(/title=["']([^"']+)["']/);
      const lang = langMatch ? langMatch[1] : "";
      const titleComment = titleMatch ? `// ${titleMatch[1]}\n` : "";
      return `\`\`\`${lang}\n${titleComment}${code}\n\`\`\``;
    }),
  );

  // <LinkButton href="Y">text</LinkButton>
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(
      /<LinkButton\s+(?=[^>]*href=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/\s*LinkButton\s*>/g,
      (_, h, t) => `[${t.trim()}](${h})`,
    ),
  );

  // --- Strip remaining HTML tags (outside code blocks) ---
  cleaned = transformOutsideCodeBlocks(cleaned, (text) =>
    text.replace(/<[^>]+>/g, ""),
  );

  // --- Normalize whitespace ---
  // Collapse 3+ newlines to 2 (single blank line)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  // Fix indentation on numbered list items (strip excessive leading whitespace)
  cleaned = cleaned.replace(/^[ \t]{4,}(\d+\.)/gm, "   $1");
  // Trim
  cleaned = cleaned.trim();

  // --- Prepend title ---
  if (title) {
    cleaned = `# ${title}\n\n${cleaned}`;
  }

  return cleaned + "\n";
}

/**
 * Rename a markdown file based on its path and name, following the rules:
 * - If the file is named "index", rename it to the name of its parent folder.
 * - If the file is in a subfolder, include the subfolder in the new name.
 * - Otherwise, keep the original name.
 * @param {string} fileName 
 * @param {string} fileExtension 
 * @param {string} fullPath 
 * @returns {string}
 */
function renameHandler(fileName, fileExtension, fullPath) {
  const normalized = fullPath.replace(/\\/g, "/");
  const relative = normalized
    .split("src/content/docs/")[1]
    .replace(new RegExp(`\\.${fileExtension}$`), "");
  const segments = relative.split("/");
  if (fileName === "index") {
    if (segments.length === 1) return "index.md";
    const dirs = segments.slice(0, -2).join("/");
    const folder = segments[segments.length - 2];
    return dirs ? `${dirs}/${folder}.md` : `${folder}.md`;
  }
  const dirs = segments.slice(0, -1).join("/");

  return dirs ? `${dirs}/${fileName}.md` : `${fileName}.md`;
}

/**
 * @param {Partial<import('./index.js').StarlightPageContextActionConfig>} [userConfig]
 * @returns {import('@astrojs/starlight/types').StarlightPlugin}
 */
export default function starlightPageContextAction(userConfig = {}) {
  const config = {
    prompt: userConfig.prompt ?? defaultConfig.prompt,
    position: userConfig.position ?? defaultConfig.position,
    layout: userConfig.layout ?? defaultConfig.layout,
    sticky: userConfig.sticky ?? defaultConfig.sticky,
    actions: {
      ...defaultConfig.actions,
      ...userConfig.actions,
    },
  };

  return {
    name: "starlight-page-context-action",
    hooks: {
      "config:setup"({
        updateConfig,
        addIntegration,
        config: starlightConfig,
        logger,
      }) {
        const anyActionEnabled = Object.values(config.actions).some(Boolean);
        if (!anyActionEnabled) {
          logger.warn(
            "All page actions are disabled. The plugin will not render any UI.",
          );
        }

        addIntegration({
          name: "starlight-page-context-action-integration",
          hooks: {
            "astro:config:setup"({ updateConfig: updateAstroConfig }) {
              updateAstroConfig({
                vite: {
                  plugins: [
                    virtual({
                      "virtual:starlight-page-context-action-config": `export default ${JSON.stringify(config)}`,
                    }),
                    ...(config.actions.copy || config.actions.viewMarkdown
                      ? [
                          viteStaticCopy({
                            targets: [
                              {
                                src: "src/content/docs/**/*.{md,mdx}",
                                dest: "",
                                transform: {
                                  encoding: "utf-8",
                                  handler: (content) => cleanMarkdown(content),
                                },
                                rename: renameHandler,
                              },
                            ],
                          }),
                        ]
                      : []),
                  ],
                },
              });
            },
          },
        });

        updateConfig({
          components: {
            ...starlightConfig.components,
            PageSidebar:
              starlightConfig.components?.PageSidebar ??
              "starlight-page-context-action/overrides/PageSidebar.astro",
            MobileTableOfContents:
              starlightConfig.components?.MobileTableOfContents ??
              "starlight-page-context-action/overrides/MobileTableOfContents.astro",
          },
        });
      },
    },
  };
}
