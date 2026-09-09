<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UX and Design System:
- **Mobile-First**: Design interfaces optimizing for mobile viewports first, then scale up.
- **Micro-interactions**: Include subtle scale/opacity transitions (Vanilla CSS variables) for hover states.
- **Glassmorphism & Color palettes**: Prefer deep gradients, dark mode optimizations over solid basic colors.
- **Atomic Components**: Build components combining atomic principles, without tying strictly to Tailwind. Use `.module.css`.

# Prisma v7 Rules:
- Refer to `prisma/skills` for any CLI, Client APIs, or PostgreSQL Database usage.
