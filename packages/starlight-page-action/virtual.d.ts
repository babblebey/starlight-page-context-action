declare module "virtual:starlight-page-action-config" {
  const config: {
    prompt: string;
    actions: {
      copy: boolean;
      chatgpt: boolean;
      claude: boolean;
      t3chat: boolean;
    };
  };
  export default config;
}
