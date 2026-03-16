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
  /**
   * Position of the page actions relative to the table of contents.
   * @default "above-toc"
   */
  position?: "above-toc" | "below-toc";
  /**
   * Layout style for action buttons.
   * - `"spread"`: Buttons are spread out vertically.
   * - `"compact"`: Primary action is shown inline with a kebab menu for all actions.
   * @default "spread"
   */
  layout?: "spread" | "compact";
  /** Configure which action buttons to show. */
  actions?: StarlightPageActionActions;
}

export default function starlightPageAction(
  config?: Partial<StarlightPageActionConfig>
): StarlightPlugin;
