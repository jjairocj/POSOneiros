---
tags: [diseño, ui, oneiros-pos]
---

# Sistema de diseño

Definido en `AGENTS.md` (instrucciones del proyecto, no solo para el asistente — reflejan la intención de diseño real):

- **Mobile-first**: optimizar primero para viewport móvil, luego escalar hacia arriba. Coherente con que el POS tenga un `MobileCartBar` dedicado en vez de simplemente encoger el `CartDrawer` de escritorio (ver [[05-Componentes-POS]]).
- **Micro-interacciones**: transiciones sutiles de escala/opacidad (con variables CSS vanilla) en estados hover.
- **Glassmorphism y paletas de color**: preferir gradientes profundos y optimización para modo oscuro por sobre colores sólidos básicos.
- **Componentes atómicos**: construidos combinando principios atómicos, sin atarse estrictamente a Tailwind — usar `.module.css` para el diseño propio (los formularios de Ajustes/Inventario, por ejemplo, usan CSS Modules; el resto de la app usa utilidades Tailwind + shadcn/ui).

## Dónde se ve hoy el glassmorphism

- `ShiftHeader` (header sticky del POS): `bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm`.
- Modales y tarjetas con `shadow-2xl`, bordes redondeados grandes (`rounded-3xl`, `rounded-l-3xl` en `CartDrawer`).
- Theming claro/oscuro vía `next-themes` + variables CSS (`:root` / `.dark`), colores en `oklch`/`lab`.

## Reflexión: ¿vale la pena mover el diseño hacia el lenguaje "Liquid Glass" de Apple (rediseño 2025 de iOS/visionOS)?

Tiene sentido **tomar prestado el principio, no la implementación literal**: el "Liquid Glass" de Apple prioriza **legibilidad de contenido bajo el vidrio** (menos blur uniforme, más adaptación de contraste dinámico según lo que hay detrás) y **profundidad sutil con especular/refracción**, en vez del glassmorphism plano de 2020-2021 (blur fuerte + borde translúcido fijo). Para un POS eso importa más de lo estético: en un mostrador con luz variable, un cajero necesita leer precios y totales sin fricción — un `backdrop-blur-xl` fijo sobre fondos que cambian (catálogo con fotos de productos, por ejemplo) puede bajar el contraste justo donde más se necesita precisión (el total a cobrar).

Cambios concretos que sí valdría la pena evaluar, sin rehacer el sistema:
- Reducir el blur en superficies que llevan **números críticos** (total del carrito, botón de cobrar) y reservar el efecto vidrio para chrome secundario (header, navegación) — separar "vidrio decorativo" de "vidrio funcional".
- Asegurar contraste mínimo (WCAG AA) del texto sobre superficies con `backdrop-blur` en ambos temas, no solo confiar en la opacidad del fondo.
- Bordes más finos y luminosos (`border-white/10` en oscuro) en vez de bordes translúcidos gruesos, para el efecto de "capa de vidrio" en vez de "panel semi-transparente".

No cambiaría la dirección general (glassmorphism + mobile-first sigue siendo coherente con el resto de la app) — solo ajustaría **dónde** se aplica el blur para que nunca compita con la legibilidad de un total de venta.

## Implementado (2026-09-11, rama `design/liquid-glass-contrast`)

Se investigó la [guía de glassmorphism de NN/g](https://www.nngroup.com/articles/glassmorphism/) y el backlash real que sufrió Apple con Liquid Glass en iOS 26 (contraste medido tan bajo como 1.5:1 en algunas superficies, muy por debajo del mínimo WCAG de 4.5:1, forzando a Apple a sacar un control "Tinted" para atenuarlo). Dos hallazgos de NN/g aplicados directamente:

1. **El texto sobre un fondo translúcido puede caer sobre distintos colores** — no hay forma de garantizar contraste si lo que está detrás cambia. Su recomendación: reservar el vidrio para superficies simples, medir contraste con una herramienta (no a ojo), y respetar la preferencia del sistema de reducir transparencia.
2. Verificado con la fórmula de contraste WCAG (relative luminance, no "a ojo"): los badges de estado del `ShiftHeader` ("Sin turno activo", "Turno: X", "N ventas") con los tonos y opacidades usados en la primera pasada de este trabajo **no llegaban a 4.5:1** en varios casos (ej. `text-emerald-600` sobre `bg-emerald-500/20` daba ~3.1:1). Es exactamente el patrón de mayor riesgo que señala NN/g: texto de marca sobre una tinta translúcida del mismo color.

### Cambios aplicados

- **`.glass-chrome`** (`app/globals.css`): clase reutilizable para toda superficie de vidrio de navegación (hoy solo el header del POS). Usa `color-mix()` sobre `--background` (así respeta el tema activo automáticamente) + `backdrop-filter: blur(20px) saturate(1.5)`. Bajo `@media (prefers-reduced-transparency: reduce)` — la media query CSS real, equivalente a "Reducir transparencia" de Apple/iOS — cae a un fondo 100% opaco sin blur. Esto es justo lo que le faltó a Apple por defecto y tuvo que agregar tras las quejas.
- **Badges del `ShiftHeader`**: recalculados con la fórmula de contraste real (no shades "a ojo"). Los tres badges ahora usan una opacidad de fondo del 12% con texto en el tono 700 (claro) / 300 (oscuro) de su color — combinación que da entre 4.76:1 y 8.6:1 según el caso, con margen sobre el mínimo de 4.5:1. Los colores están hardcodeados a propósito (no los tokens semánticos `destructive`/`primary`) porque esos tokens están calibrados para uso sólido (botones), no para texto-sobre-tinta-translúcida — mezclarlos sin recalcular el contraste rompe la garantía.
- El total del carrito y el botón de pago **no se tocaron** — ya viven en `bg-card` sólido (verificado en la primera pasada de este trabajo), que es justamente la recomendación de NN/g de "usar fondos simples cuando sea posible" para lo que más importa leer bien.

### Cómo verificar manualmente

- **Reducir transparencia**: macOS → Ajustes del Sistema → Accesibilidad → Pantalla → "Reducir transparencia". Con eso activo, el header del POS debe verse sólido, sin blur.
- **Contraste**: cualquier inspector de accesibilidad del navegador (Chrome DevTools → Lighthouse / el ícono de contraste en el selector de color) sobre los tres badges del header, en claro y oscuro.

## Ver también
- [[05-Componentes-POS]]
- [[06-Componentes-Admin]]
- [[13-Seguridad]]
