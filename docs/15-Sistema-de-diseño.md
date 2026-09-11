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

## Ver también
- [[05-Componentes-POS]]
- [[06-Componentes-Admin]]
