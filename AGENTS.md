# Repository Guidelines

## Project Structure & Module Organization

Next.js 16 TypeScript PWA for managing a Panini World Cup 2026 sticker album. App routes live in `src/app` (single-page app), reusable components in `src/components`, and shared domain logic in `src/lib`. UI primitives are under `src/components/ui`. Tests sit beside library code as `*.test.ts` files, with some nested in `__tests__/` directories. Static PWA assets, icons, and the service worker are in `public`.

Use the `@/*` path alias for imports from `src`.

## Build, Test, and Development Commands

- `pnpm run dev`: start the local Next development server.
- `pnpm run build`: create a production Next build.
- `pnpm run lint`: run ESLint with Next core web vitals and TypeScript rules.
- `pnpm run typecheck`: run `tsc --noEmit` with strict TypeScript settings.
- `pnpm test`: run the Vitest test suite once.
- `pnpx vitest run <path>`: run a single test file.

Run `pnpm install` after dependency changes. Both `package-lock.json` and `pnpm-lock.yaml` exist; prefer pnpm scripts unless the project standard is explicitly changed.

## Toolchain & Architecture Notes

- **Tailwind CSS v4** is configured without a `tailwind.config` file. Use `@import "tailwindcss"` and `@theme inline` in `src/app/globals.css` for theming.
- **Vitest runs in a Node environment** (`vitest.config.ts`). React Testing Library and jsdom are installed but not currently configured as the default test environment.
- **Zustand store** (`src/lib/store.ts`) persists to `localStorage` with versioned merge logic. Changes to store shape may require migration updates in the `merge` option.
- **Custom QR protocol** lives in `src/lib/stickeros/` and handles binary encoding/decoding of sticker collections for trades.
- **AI sticker parsing** in `src/lib/ai/` supports OpenAI and Gemini providers for extracting sticker lists from free-form text.
- The **service worker** at `public/sw.js` caches app assets. Bumping its `CACHE_NAME` is required when shipping updates that must bypass old caches.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, semicolons, and trailing commas where the existing code uses them. Prefer named exports for shared utilities and components. Component files use kebab-case (e.g., `trade-drawer.tsx`); exported React components use PascalCase. Utility functions and variables use camelCase.

Keep UI styling consistent with the Tailwind utility approach and shared helpers such as `cn` from `src/lib/utils.ts`. Reuse UI primitives from `src/components/ui` before creating new controls.

## Testing Guidelines

Place tests near the code they cover using the `*.test.ts` suffix. Use descriptive `describe` blocks and short `it` statements that state the expected outcome. Add or update tests when changing trade logic, QR payload handling, exports, or other pure library behavior.

Before opening a PR, run `pnpm test`, `pnpm run lint`, and `pnpm run typecheck`.

## Commit Guidelines

Use concise Conventional Commit-style prefixes such as `feat:`, `fix:`, and `refactor:`. Keep commit subjects imperative and scoped to one change. Call out PWA, service worker, or persistence changes in PR descriptions because they can affect cached behavior.
