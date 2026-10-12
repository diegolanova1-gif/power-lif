# Power Routine — Landing

Landing scrollytelling para **Power Routine**: todo el sistema entra en el botón de la app y, al final, el visitante lo toca para recorrer cada sección. Un solo destino: WhatsApp.

**App principal:** [power-lif.vercel.app](https://power-lif.vercel.app)

## Stack

- **Build:** Vite 8
- **Animación:** GSAP 3.12 + ScrollTrigger (secciones fijadas con scroll)
- **Fonts:** Inter + Geist Mono (Google Fonts)
- **UI:** HTML + CSS + JS vanilla, sin WebGL
- **Idioma:** Español (es-AR)

## Scripts

```bash
npm install
npm run dev        # servidor local Vite
npm run build      # build de producción → dist/
npm run preview    # preview del build
```

## Concepto

El botón de la app (FAB violeta con la mancuerna, `components/layout/fab-menu.tsx`) es el protagonista, fijo en el centro:

| Sección | Qué pasa |
|---------|----------|
| **Hero** + CTA WhatsApp | El botón aparece como plano técnico y se materializa al scrollear |
| **Caos** | Frases de WhatsApp/Excel flotan alrededor y se meten en el botón |
| **Programás · Registra · Revisás · Medís · Compiten** | Cada sección entra (texto + captura en iPhone), se sostiene y se mete en el botón; se llena un segmento del anillo |
| **Final** + CTA WhatsApp | "Tocá el botón": abre el abanico como en la app; cada ícono reabre su sección, que nace en círculo desde el botón |

## Estructura

```
landing/
├── index.html          # hero, caos, 5 secciones, final + hoja de sección
├── src/
│   ├── main.js         # timelines de scroll, anillo, abanico y hoja
│   ├── style.css       # tokens (modo oscuro de la app), mobile-first
│   └── whatsapp.js     # número y mensaje de WhatsApp (data-cta)
└── public/screens/     # capturas reales (iPhone 15 Pro, 1179×2556 + 786w), datos demo
```

## Capturas

Generadas con datos demo (`../scripts/demo/seed.mjs`, cuentas `pr-demo-*@example.com`). Para borrarlos: `node scripts/demo/seed.mjs --cleanup` desde la raíz del repo.

## Accesibilidad

- `prefers-reduced-motion`: sin secciones fijadas ni animaciones; todo visible, anillo completo
- Abanico y hoja accesibles por teclado (Esc cierra, el foco vuelve al ícono)
- Un solo destino de conversión: WhatsApp (`data-cta="hero|final"`)

## Deploy

Build estático — compatible con cualquier host (Vercel, Netlify, GitHub Pages, S3+CloudFront).

```bash
npm run build
# subir dist/
```

## Paleta

Escala de grises monocromática con un único acento blanco en el CTA de WhatsApp. Tokens en `src/style.css`:

```css
--bg: #0a0a0b;
--text: #ededec;
--text-dim: #9a9a9d;
--cta-bg: #ededec;
```
