# SlugShare Style Guide
This guide reflects patterns found in the current codebase and sets a consistent direction for new work. Where existing files differ, prefer following the rule below for new code, and avoid large reformatting passes.

## Tech Stack
- Language: TypeScript (`.ts`, `.tsx`)
- Framework: Next.js App Router (`app/`)
- Styling: Tailwind CSS (utility classes)
- Tests: Vitest + Testing Library

## Formatting
- Indentation: Tab
- Line width: keep lines readable; wrap long JSX props and chained calls.
- Quotes: prefer double quotes in TS/TSX and JSON.
- Semicolons: use semicolons consistently in code. 
- Trailing commas: include in multiline object/array literals and argument lists.
- JSX: one prop per line when there are 3+ props or when props are long.

## Naming Conventions
- Files/folders: `kebab-case` (e.g., `get-status-route.test.ts`, `page-back-link.tsx`).
- React components: `PascalCase` function names and filenames in `components/` (e.g., `DonationCalculator.tsx`).
- Functions/variables: `camelCase`.
- Types/interfaces/enums: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants; otherwise `camelCase`.

## Imports
- Order: external packages, then internal aliases (`@/`), then relative imports.
- Use the `@/` path alias where possible.
- Avoid deep relative paths when an alias is available.

## React / Next.js
- Server components by default; add `"use client";` only when needed.
- Keep server-only logic (auth, database) in `lib/` or route handlers.
- API route handlers live under `app/api/**/route.ts`.
- Route handlers should return `NextResponse.json(...)` for success, and a consistent error helper for failures when available.

## Error Handling
- Prefer early returns for validation failures.
- Log errors with enough context for debugging, but avoid leaking secrets.
- In API routes, return consistent error shapes and status codes.

## Comments
- Use short, purposeful comments for non-obvious logic.
- Prefer `//` for one line comments, `/** ... */` for longer summaries.

## Testing
- Test framework: Vitest (`vitest.config.ts`).
- Test location: `__tests__/`.
- Test file naming convention (unit tests):
  - `__tests__/feature-name.test.ts` for non-UI modules.
  - `__tests__/component-name.test.tsx` for React components.
  - Use `kebab-case` for the filename even if the component is PascalCase.
  - Legacy PascalCase test filenames are okay; new tests should follow `kebab-case`.
- Describe/it style:
  - `describe("ModuleName", () => { ... })`
  - `it("does something meaningful", () => { ... })`
- Prefer Testing Library queries by role/label/text for UI.
- Use `vi.mock(...)` for module boundaries and `beforeEach` to reset mocks.

## Project Structure
- `app/`: Next.js routes and pages (App Router).
- `components/`: Shared React components.
- `lib/`: Reusable logic, server utilities, validators, and helpers.
- `types/`: Shared type definitions.

## Notes on Existing Inconsistencies
- Style guide was designed after the project initially started so many files may not follow this format, in that case match the existing style if editing old code, use this style for new code.

