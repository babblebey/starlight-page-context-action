import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightPageContextAction from "starlight-page-context-action";

export default defineConfig({
  integrations: [
    starlight({
      title: "Starlight Page Context Action",
      plugins: [
        starlightPageContextAction({
          position: "below-toc",
          sticky: true,
          llmsTxt: true,
        }),
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/babblebey/starlight-page-context-action",
        },
      ],
      sidebar: [
        { label: "Home", link: "/" },
        {
          label: "Guides",
          items: [
            { label: "Getting Started", slug: "guides/getting-started" },
            { label: "Configuration", slug: "guides/configuration" },
          ],
        },
        {
          label: "Examples",
          items: [
            { label: "Default Setup", slug: "examples/default" },
            { label: "Compact Layout", slug: "examples/compact-layout" },
            { label: "Custom Prompt", slug: "examples/custom-prompt" },
            { label: "Disabled Actions", slug: "examples/disabled-page" },
          ],
        },
      ],
      customCss: ["./src/styles/global.css"],
    }),
  ],
});
