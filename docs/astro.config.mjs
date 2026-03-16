import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightPageAction from "starlight-page-action";

export default defineConfig({
  integrations: [
    starlight({
      title: "Starlight Page Action",
      plugins: [starlightPageAction()],
    }),
  ],
});
