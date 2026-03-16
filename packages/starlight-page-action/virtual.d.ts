declare module "virtual:starlight-page-action-config" {
  const config: {
    prompt: string;
    position: "above-toc" | "below-toc";
    actions: {
      copy: boolean;
      chatgpt: boolean;
      claude: boolean;
      t3chat: boolean;
    };
  };
  export default config;
}
