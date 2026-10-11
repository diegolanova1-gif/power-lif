# Power Routine — Landing

Landing page scrollytelling para **Power Routine**, plataforma de seguimiento de rutinas de gimnasio orientada a coaches. Narra el problema del seguimiento manual, la solución y empuja a contacto por WhatsApp.

**App principal:** [power-lif.vercel.app](https://power-lif.vercel.app)

## Stack

- **Build:** [Vite 8](https://vitejs.dev/)
- **Animación:** [GSAP 3.12 + ScrollTrigger](https://gsap.com/) (vía CDN jsdelivr)
- **Fonts:** Inter (Google Fonts)
- **UI:** HTML + CSS + JS vanilla — sin framework
- **Idioma:** Español (es-AR)

Zero dependencias en runtime; solo `vite` como devDependency.

## Scripts

```bash
npm install
npm run dev        # servidor local Vite
npm run build      # build de producción → dist/
npm run preview    # preview del build
```

## Estructura

```
power-routine-landing/
├── index.html          # 5 secciones semánticas (hero, problema, solución, prueba, CTA)
├── src/
│   ├── main.js         # bootstrap: year, link WhatsApp, initMotion()
│   ├── motion.js       # engine GSAP + ScrollTrigger (timelines por sección)
│   └── style.css       # tokens, depth layers, reveals, responsive
├── public/             # assets estáticos
└── dist/               # output de build
```

## Secciones

| Sección | Técnica |
|---------|---------|
| **Hero** | Pinned 220vh — título split (izq/der converge), subtítulo cortina, exit scrubbed |
| **Problema** | `clip-path` top-drop + stagger-grid desde 4 direcciones |
| **Solución** | 3 pillars con skew-bounce (`back.out`) |
| **Prueba** | Mockup panel coach, scale-settle scrubbed |
| **CTA** | Iris circular (`circle(0% → 75%)`), botón WhatsApp |

## Configuración

Valores inline en `src/main.js`:

```js
const WHATSAPP_NUMBER = '5491138753141'
const WHATSAPP_MESSAGE = 'Hola! Quiero información sobre Power Routine para mi gimnasio.'
```

Link de login externo en `index.html`:

```html
<a class="login-link" href="https://power-lif.vercel.app/login">Ingresar</a>
```

## Accesibilidad

- `skip-link` al contenido principal
- Soporte `prefers-reduced-motion` nativo (fallback estático)
- Toggle manual de animaciones (persistencia en `localStorage`)
- `aria-pressed`, `aria-label`, roles e `id="main-content"`
- Focus ring visible (`:focus-visible`)
- Si GSAP no carga desde CDN, `revealImmediately()` muestra todo el contenido

## Performance

- `content-visibility: auto` en scenes no-hero
- Lite mode automático en touch o `hardwareConcurrency <= 2` (skip parallax)
- `preconnect` a Google Fonts
- `ScrollTrigger.refresh()` al recuperar foco de pestaña

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
