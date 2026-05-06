# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 TypeScript app for managing a Panini World Cup 2026 sticker album. App routes and global styles live in `src/app`, reusable React components in `src/components`, and shared domain logic in `src/lib`. UI primitives are grouped under `src/components/ui`. Tests currently sit beside library code as `*.test.ts` files in `src/lib`. Static PWA assets, icons, and the service worker are in `public`.

Use the `@/*` path alias for imports from `src`, for example `@/lib/trade` or `@/components/ui/button`.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next development server.
- `npm run build`: create a production Next build.
- `npm run lint`: run ESLint with Next core web vitals and TypeScript rules.
- `npm run typecheck`: run `tsc --noEmit` with strict TypeScript settings.
- `npm test`: run the Vitest test suite once.

Run `npm install` after dependency changes. The repository currently includes both `package-lock.json` and `pnpm-lock.yaml`; prefer the npm scripts unless the project standard is explicitly changed.

## Coding Style & Naming Conventions

Write TypeScript and React with strict types. Use two-space indentation, double quotes, semicolons, and trailing commas where the existing code uses them. Prefer named exports for shared utilities and components. Component files use kebab-case names such as `trade-drawer.tsx`; exported React components use PascalCase. Utility functions and variables use camelCase.

Keep UI styling consistent with the existing Tailwind utility approach and shared helpers such as `cn` from `src/lib/utils.ts`. Reuse UI primitives from `src/components/ui` before creating new controls.

## Testing Guidelines

Vitest is configured for a Node environment. Place tests near the code they cover using the `*.test.ts` suffix, as in `src/lib/trade.test.ts`. Use descriptive `describe` blocks for the behavior area and short `it` statements that state the expected outcome. Add or update tests when changing trade logic, QR payload handling, exports, or other pure library behavior.

Before opening a PR, run `npm test`, `npm run lint`, and `npm run typecheck`.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style prefixes such as `feat:`, `fix:`, and `refactor:`. Keep commit subjects imperative and scoped to one change.

Pull requests should include a brief summary, test results, and screenshots or screen recordings for visible UI changes. Link related issues when available and call out PWA, service worker, or persistence changes because they can affect cached behavior.
