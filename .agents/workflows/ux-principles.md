---
description: UX Guidelines and UI Architecture for Oneiros POS
---

# UX Guidelines and UI Architecture

When building or modifying UI components for the Oneiros POS system, you must follow these rules strictly:

1. **Mobile-First Approach**: The UI must be optimized for tablets and mobile devices. Registers might be used on touch screens.
2. **Atomic Structure**: Avoid monolithic components. Use composable elements (e.g., `Button`, `Input`, `ProductCard`) that accept `className` and standard HTML props.
3. **Vanilla CSS via `.module.css`**: Do not use Tailwind CSS. Rely on CSS Modules.
4. **Color Palette via Variables**: Use variables defined in `globals.css` (`var(--background)`, `var(--primary)`, `var(--muted)`). Do not hardcode hex colors in component styles.
5. **Micro-interactions**: Incorporate CSS transitions (e.g., `transition: all 0.2s ease`) on interactive elements (buttons, cards) for active/hover states.
6. **Dark Mode Support**: Prefer `glassmorphism` aesthetics with subtle borders and shadows over completely flat designs. Use CSS media queries (`@media (prefers-color-scheme: dark)`) handled via the root variables natively.
7. **No Layout Shift**: Provide skeleton loaders or empty states to prevent Cumalative Layout Shift (CLS) when fetching data dynamically.
