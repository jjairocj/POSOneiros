<!-- BEGIN:nextjs-agent-rules -->
# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
<!-- END:nextjs-agent-rules -->

# UX and Design System:
- **Mobile-First**: Design interfaces optimizing for mobile viewports first, then scale up.
- **Micro-interactions**: Include subtle scale/opacity transitions (Vanilla CSS variables) for hover states.
- **Glassmorphism & Color palettes**: Prefer deep gradients, dark mode optimizations over solid basic colors.
- **Atomic Components**: Build components combining atomic principles, without tying strictly to Tailwind. Use `.module.css`.

# Prisma v7 Rules:
- Refer to `prisma/skills` for any CLI, Client APIs, or PostgreSQL Database usage.
