declare module "virtual:starlight-page-context-action-config" {
  const config: {
    prompt: string;
    position: "above-toc" | "below-toc";
    layout: "spread" | "compact";
    sticky: boolean;
    actions: {
      copy: boolean;
      chatgpt: boolean;
      claude: boolean;
      t3chat: boolean;
    };
  };
  export default config;
}
