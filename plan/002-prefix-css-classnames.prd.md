# PRD: Prefix All Custom CSS Class Names

## Summary

Namespace every custom (non-Starlight) CSS class name in the plugin with the `page-context-action__` prefix (double-underscore BEM modifier style). This prevents style collisions when consumers add their own CSS and makes the plugin's DOM footprint instantly recognisable.

The root element class `page-context-action` remains unchanged — it is the namespace itself.

---

## Motivation

- Custom class names like `toggle`, `caret`, `dropdown`, `sticky`, and `action-item` are generic and likely to collide with consumer stylesheets or other Starlight plugins.
- Classes already using a `page-context-action-` single-dash separator (e.g. `page-context-action-btn`) are inconsistent with the root name and don't follow a clear BEM convention.
- A uniform `page-context-action__*` prefix makes it trivial for consumers to identify and override plugin-specific styles without guessing.

---

## Scope

### Files to Modify

| File | Changes |
|------|---------|
| `packages/starlight-page-context-action/components/PageContextActions.astro` | HTML `class` attributes, `<style>` selectors, `<script>` `querySelector` strings |
| `packages/starlight-page-context-action/overrides/MobileTableOfContents.astro` | HTML `class` attributes, `<style>` selectors, `<script>` `querySelector` strings |
| `packages/starlight-page-context-action/overrides/PageSidebar.astro` | JS `wrapperClasses` array, `<style>` selectors |

### Out of Scope

- Starlight-owned classes (`sl-flex`, `sl-hidden`, `lg:sl-block`, `right-sidebar-panel`, `sl-container`) — **must not be renamed**.
- The `display-current` global style in `MobileTableOfContents.astro` — targets a Starlight-native class, left untouched.
- All `id="page-context-action-*"` attributes — used for JS targeting, not part of the CSS namespace task.
- `data-*` attributes (`data-ai-service`, `data-compact-copy`, `data-mobile-copy`, `data-mobile-ai`, `data-mobile-scroll-top`) — unchanged.

---

## Class Name Mapping

### Classes already prefixed with `page-context-action-` → normalise to `page-context-action__`

| Old | New |
|-----|-----|
| `page-context-action--compact` | `page-context-action__compact` |
| `page-context-action--spread` | `page-context-action__spread` |
| `page-context-action-wrapper` | `page-context-action__wrapper` |
| `page-context-action-btn` | `page-context-action__btn` |
| `page-context-action-label` | `page-context-action__label` |
| `page-context-action-chevron` | `page-context-action__chevron` |
| `page-context-action-dropdown-wrapper` | `page-context-action__dropdown-wrapper` |
| `page-context-action-popup` | `page-context-action__popup` |
| `page-context-action-popup-item` | `page-context-action__popup-item` |
| `page-context-action-popup-item-content` | `page-context-action__popup-item-content` |
| `page-context-action-icon` | `page-context-action__icon` |
| `page-context-action-external-icon` | `page-context-action__external-icon` |

### Unprefixed custom classes → add `page-context-action__` prefix

| Old | New | File(s) |
|-----|-----|---------|
| `compact-copy-btn` | `page-context-action__compact-copy-btn` | PageContextActions |
| `compact-scroll-top-btn` | `page-context-action__compact-scroll-top-btn` | PageContextActions |
| `compact-kebab-btn` | `page-context-action__compact-kebab-btn` | PageContextActions |
| `compact-kebab-wrapper` | `page-context-action__compact-kebab-wrapper` | PageContextActions |
| `icon-copy` | `page-context-action__icon-copy` | PageContextActions, MobileTableOfContents (HTML + JS) |
| `icon-check` | `page-context-action__icon-check` | PageContextActions, MobileTableOfContents (HTML + JS) |
| `icon-error` | `page-context-action__icon-error` | PageContextActions, MobileTableOfContents (HTML + JS) |
| `toggle` | `page-context-action__toggle` | MobileTableOfContents |
| `caret` | `page-context-action__caret` | MobileTableOfContents |
| `dropdown` | `page-context-action__dropdown` | MobileTableOfContents |
| `action-item` | `page-context-action__action-item` | MobileTableOfContents |
| `action-item-content` | `page-context-action__action-item-content` | MobileTableOfContents |
| `external-icon` | `page-context-action__external-icon` | MobileTableOfContents |
| `above-toc` | `page-context-action__above-toc` | PageSidebar |
| `below-toc` | `page-context-action__below-toc` | PageSidebar |
| `sticky` | `page-context-action__sticky` | PageSidebar |

---

## Implementation Phases

### Phase 1 — `PageContextActions.astro`

- [x] Rename all `class` attributes in the HTML template (compact and spread sections)
- [x] Update all CSS selectors in the `<style>` block
- [x] Update JS `querySelector` strings: `.icon-copy` → `.page-context-action__icon-copy`, `.icon-check` → `.page-context-action__icon-check`, `.icon-error` → `.page-context-action__icon-error`

### Phase 2 — `MobileTableOfContents.astro`

- [x] Rename all `class` attributes in the HTML template
- [x] Update all CSS selectors in the `<style>` block
- [x] Update JS `querySelector` strings: `.icon-copy` → `.page-context-action__icon-copy`, `.icon-check` → `.page-context-action__icon-check`, `.icon-error` → `.page-context-action__icon-error`

### Phase 3 — `PageSidebar.astro`

- [ ] Update the `wrapperClasses` array: `page-context-action-wrapper` → `page-context-action__wrapper`, `above-toc` / `below-toc` → `page-context-action__above-toc` / `page-context-action__below-toc`, `sticky` → `page-context-action__sticky`
- [ ] Update all CSS selectors in the `<style>` block

---

## Acceptance Criteria

1. **No unprefixed custom classes remain** — `grep` across `packages/` for any old class name returns zero hits.
2. **All Starlight-owned classes are untouched** — `sl-flex`, `sl-hidden`, `lg:sl-block`, `right-sidebar-panel`, `sl-container` remain as-is.
3. **JS `querySelector` calls match new names** — copy-icon toggling and dropdown interactions work in both layouts.
4. **Dev build passes** — `pnpm dev` in `docs/` starts without errors.
5. **Production build passes** — `pnpm build` in `docs/` completes successfully.
6. **Visual parity** — all UI elements render identically before and after the rename (both spread and compact layouts, desktop and mobile).

---

## Notes

- This is a **breaking change** for any consumer who targets the plugin's CSS class names in custom stylesheets. It should be called out in the changelog / release notes.
- `id` attributes (e.g. `page-context-action-copy`, `page-context-action-dropdown`) are left unchanged — they are already unique per-page by nature and are used for JS targeting, not CSS namespacing.
