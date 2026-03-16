import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightPageContextAction from "starlight-page-context-action";

export default defineConfig({
  integrations: [
    starlight({
      title: "Starlight Page Context Action",
      plugins: [starlightPageContextAction()],
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
          autogenerate: { directory: "guides" },
        },
        {
          label: "Examples",
          autogenerate: { directory: "examples" },
        },
      ],
    }),
  ],
});
