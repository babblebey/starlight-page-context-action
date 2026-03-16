import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightPageAction from "starlight-page-action";

export default defineConfig({
  integrations: [
    starlight({
      title: "Starlight Page Action",
      plugins: [starlightPageAction()],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/babblebey/starlight-page-action",
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
