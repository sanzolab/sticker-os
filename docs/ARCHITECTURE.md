# StickerOS Component Architecture

## Summary

StickerOS keeps a small, practical component structure. `StickerOSApp` remains the root composition and state holder for now, while shared UI primitives live in `src/components/ui` and feature-specific behavior stays near the feature that owns it.

This repo intentionally does not have a full design system. We only extract shared pieces when the same UI behavior already repeats in real code.

React file boundaries are strict:

- Any function that returns JSX, or is used as a JSX element, lives in its own `.tsx` file.
- Non-component helpers may stay local only if they are small, private, non-React, and do not use hooks.
- React hooks are imported directly with `useState`, `useEffect`, `useMemo`, `useCallback`, and `useRef`.
- Avoid `React.useState`, `React.useEffect`, `React.useMemo`, `React.useCallback`, and `React.useRef`.
- React types are imported with `import type { ReactNode, ComponentProps } from "react";` when needed.
- Avoid `import React from "react"` unless a file has an unavoidable reason.

## Current Structure

- `src/components/sticker-os-app.tsx`: root page composition, Home state, and shared drawer state.
- `src/components/top-bar.tsx`, `src/components/collection-header.tsx`, `src/components/sticky-controls.tsx`, `src/components/album-tab-panel.tsx`, `src/components/sticker-section.tsx`: Home page composition pieces.
- `src/components/settings-drawer.tsx`, `src/components/share-drawer.tsx`, `src/components/stats-drawer.tsx`, `src/components/trade-drawer.tsx`, `src/components/duplicate-editor.tsx`: feature drawers and editors.
- `src/components/progress-ring.tsx`, `src/components/progress-row.tsx`, `src/components/team-progress-row.tsx`, `src/components/header-metric.tsx`, `src/components/setting-row.tsx`, `src/components/drawer-header.tsx`, `src/components/trade-section.tsx`, `src/components/summary-list.tsx`: shared feature-level presentation pieces.
- `src/components/sticker-card.tsx`, `src/components/trade-sticker-card.tsx`: sticker tile presentation.
- `src/components/ui/*`: shared primitives used across features.
- `src/lib/stickeros/*`: StickerOS QR encoding, decoding, and exchange logic.
- `src/app/api/stickeros/qr/route.ts`: API boundary for StickerOS QR encode/decode.

Feature folders are not forced yet. If a feature does not have repeated internal structure, keep it close to the feature rather than moving it for symmetry.

## Shared UI Rules

### Tabs

- Use `AnimatedTabs` for tab strips that need the moving active indicator.
- Use `AnimatedTabPanel` for content areas that should fade or slide with the tab change.
- Home tabs and stats drawer tabs should use the same tab behavior so they feel like one app, not two separate patterns.

### Drawers

- Use `AppDrawer` when a drawer repeats the same shell, title block, and padding structure.
- Keep feature-specific content inside the drawer body.
- Do not move unique flow logic, QR handling, or store mutations into the drawer shell.

### Empty States

- Use `EmptyState` for centered, simple no-results panels.
- Keep the message text feature-specific, but reuse the same visual pattern.

### Choice Grids

- Use `OptionGroup` for repeated bordered choice grids such as locale, theme, export type, or similar small option sets.
- Keep the option values explicit and typed.

### React Imports

- Import hooks directly from `react`.
- Import React types with `import type`.
- Keep helper functions non-React when possible; move JSX helpers into their own files instead of nesting them.

## StickerOS Rules

- Canonical StickerOS indexes must not change, even if visual order changes.
- QR payload logic belongs in `src/lib/stickeros` and/or the API route, not in React components.
- The QR logo is visual only. It must never alter payload generation or decoding.
- Local duplicate counts remain local app logic. StickerOS QR export still records duplicate yes/no, not exact duplicate quantities.

## Correct Usage Examples

- Home sticky tabs: `AnimatedTabs`
- Stats drawer tabs: `AnimatedTabs` plus `AnimatedTabPanel`
- Settings language/theme/export selectors: `OptionGroup`
- Drawer shells for settings/share/stats/duplicate/trade: `AppDrawer`
- Album empty results and trade no-match panels: `EmptyState`

## Anti-Patterns

- Do not duplicate tab underline or content transition logic in each feature.
- Do not copy the same drawer wrapper markup into every drawer.
- Do not push QR payload or duplicate-count business logic into UI components.
- Do not extract a new shared component unless the pattern already appears in real code.
- Do not keep multiple JSX-returning functions in one `.tsx` file.
- Do not use `React.useX` when a direct hook import will do.

## Migration Notes

- Extract presentation first, then simplify JSX.
- Keep feature logic close to the feature.
- Prefer composition over large configurable abstractions.
- If a component only has one unclear use case, keep it local for now.
- When a new repeated pattern appears, promote only the shared slice, not the whole feature.
- When a file starts accumulating JSX helpers, split them immediately rather than letting it grow into a grab bag.
