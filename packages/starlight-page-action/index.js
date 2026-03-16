import { viteStaticCopy } from "vite-plugin-static-copy";
import virtual from "vite-plugin-virtual";

/** @type {import('./index.js').StarlightPageActionConfig} */
const defaultConfig = {
  prompt: "Read {url}. I want to ask questions about it.",
  position: "above-toc",
  layout: "spread",
  actions: {
    copy: true,
    chatgpt: true,
    claude: true,
    t3chat: true,
  },
};

/**
 * Strip YAML frontmatter and Starlight component imports from markdown content.
 * @param {string} content
 * @returns {string}
 */
function cleanMarkdown(content) {
  // Strip frontmatter
  let cleaned = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  // Strip MDX import statements
  cleaned = cleaned.replace(/^import\s+.*?;\s*\r?\n?/gm, "");
  return cleaned.trim() + "\n";
}

/**
 * @param {Partial<import('./index.js').StarlightPageActionConfig>} [userConfig]
 * @returns {import('@astrojs/starlight/types').StarlightPlugin}
 */
export default function starlightPageAction(userConfig = {}) {
  const config = {
    prompt: userConfig.prompt ?? defaultConfig.prompt,
    position: userConfig.position ?? defaultConfig.position,
    layout: userConfig.layout ?? defaultConfig.layout,
    actions: {
      ...defaultConfig.actions,
      ...userConfig.actions,
    },
  };

  return {
    name: "starlight-page-action",
    hooks: {
      "config:setup"({ updateConfig, addIntegration, config: starlightConfig, logger }) {
        const anyActionEnabled = Object.values(config.actions).some(Boolean);
        if (!anyActionEnabled) {
          logger.warn(
            "All page actions are disabled. The plugin will not render any UI."
          );
        }

        addIntegration({
          name: "starlight-page-action-integration",
          hooks: {
            "astro:config:setup"({ updateConfig: updateAstroConfig }) {
              updateAstroConfig({
                vite: {
                  plugins: [
                    virtual({
                      "virtual:starlight-page-action-config": `export default ${JSON.stringify(config)}`,
                    }),
                    ...(config.actions.copy
                      ? [
                          viteStaticCopy({
                            targets: [
                              {
                                src: "src/content/docs/**/*.{md,mdx}",
                                dest: "_page-action-raw",
                                transform: {
                                  encoding: "utf-8",
                                  handler: (content) => cleanMarkdown(content),
                                },
                              },
                            ],
                            structured: true,
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
              "starlight-page-action/overrides/PageSidebar.astro",
          },
        });
      },
    },
  };
}
