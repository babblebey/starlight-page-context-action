import type { StarlightPlugin } from "@astrojs/starlight/types";

export interface StarlightPageActionActions {
  /** Show "Copy page" button. @default true */
  copy?: boolean;
  /** Show "Open in ChatGPT" in the AI dropdown. @default true */
  chatgpt?: boolean;
  /** Show "Open in Claude" in the AI dropdown. @default true */
  claude?: boolean;
  /** Show "Open in T3 Chat" in the AI dropdown. @default true */
  t3chat?: boolean;
}

export interface StarlightPageActionConfig {
  /**
   * Prompt template for AI chat services.
   * `{url}` is replaced with the current page URL.
   * @default "Read {url}. I want to ask questions about it."
   */
  prompt?: string;
  /** Configure which action buttons to show. */
  actions?: StarlightPageActionActions;
}

export default function starlightPageAction(
  config?: Partial<StarlightPageActionConfig>
): StarlightPlugin;
