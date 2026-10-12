// Landing: el botón de la app como protagonista. Cada sección se presenta y, al
// scrollear, se mete dentro del botón. Al final, el botón abre el abanico
// (misma mecánica que components/layout/fab-menu.tsx) y cada sección se puede
// volver a abrir: la pantalla nace del botón, como en la app.
import './style.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { wireWhatsappLinks } from './whatsapp.js'

const ICONS = {
  programas: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  registra: '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>',
  revisas: '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>',
  medis: '<path d="M5 21v-6"/><path d="M12 21V9"/><path d="M19 21V3"/>',
  compiten: '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
}
const LABELS = { programas: 'Programás', registra: 'Registra', revisas: 'Revisás', medis: 'Medís', compiten: 'Compiten' }

// Mismos colores que theme-selector.tsx / globals.css de la app (primary de cada modo)
const MODES = {
  original: { '--c1': '#6f7584', '--c2': '#3a3f4b', '--c3': '#20232a', '--glow': 'rgba(150, 160, 185, 0.28)', '--tint': '#16171c' },
  rosa: { '--c1': '#f2649d', '--c2': '#d6246e', '--c3': '#93124b', '--glow': 'rgba(214, 36, 110, 0.45)', '--tint': '#2a1220' },
  oscuro: { '--c1': '#9997ff', '--c2': '#6360ff', '--c3': '#3f3cd0', '--glow': 'rgba(99, 96, 255, 0.45)', '--tint': '#15142a' },
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const body = document.body
const wrap = document.querySelector('.core-wrap')
const core = wrap.querySelector('.core')
const fan = wrap.querySelector('.fan')
const sheet = document.querySelector('.sheet')
const sheetBody = sheet.querySelector('.sheet-body')
const chapters = [...document.querySelectorAll('.chapter[data-index]')]

wireWhatsappLinks()
const arcs = buildRing()
const fanItems = buildFan()
const backdrop = Object.assign(document.createElement('div'), { className: 'fan-backdrop' })
document.body.append(backdrop)
moveGiantsBehindCore()

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

if (prefersReduced) {
  gsap.set('.blueprint, .core-wire', { opacity: 0 })
  arcs.forEach(a => gsap.set(a, { strokeDashoffset: 0 }))
} else {
  initHero()
  document.querySelectorAll('.chapter').forEach(initChapter)
}
initFinal()
initRail()

// ---------- Anillo: 5 segmentos que se llenan al absorber cada sección ----------
function buildRing() {
  const svg = wrap.querySelector('.ring')
  const R = 82
  const n = chapters.length
  const gap = 12
  const fills = []
  for (let i = 0; i < n; i++) {
    const a0 = (-90 + (360 / n) * i + gap / 2) * (Math.PI / 180)
    const a1 = (-90 + (360 / n) * (i + 1) - gap / 2) * (Math.PI / 180)
    const d = `M ${R * Math.cos(a0)} ${R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)}`
    for (const cls of ['arc-base', 'arc-fill']) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      path.setAttribute('class', cls)
      svg.append(path)
      if (cls === 'arc-fill') {
        const len = path.getTotalLength()
        path.style.strokeDasharray = `${len}`
        path.style.strokeDashoffset = `${len}`
        fills.push(path)
      }
    }
  }
  return fills
}

// ---------- Abanico: mismo arco que la app (spread = min(170, 24·(n-1))) ----------
function buildFan() {
  return chapters.map((ch, i) => {
    const key = ch.dataset.chapter
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'fan-item'
    btn.setAttribute('aria-label', `Ver: ${LABELS[key]}`)
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]}</svg><span class="fan-label" aria-hidden="true">${LABELS[key]}</span>`
    btn.addEventListener('click', () => openSheet(ch, btn))
    btn.tabIndex = -1
    fan.append(btn)
    return btn
  })
}

function fanPositions() {
  const n = fanItems.length
  const spread = Math.min(170, 24 * (n - 1)) * 1.6 // más abierto: el botón es más grande que en la app
  const start = 90 + spread / 2
  const radius = core.offsetWidth * 1.35 + 30
  return fanItems.map((_, i) => {
    const rad = ((start - (spread / (n - 1)) * i) * Math.PI) / 180
    return { x: Math.cos(rad) * radius, y: -Math.sin(rad) * radius }
  })
}

function setFan(open) {
  body.classList.toggle('fan-open', open)
  fan.hidden = false
  core.setAttribute('aria-expanded', String(open))
  core.setAttribute('aria-label', open ? 'Cerrar las secciones' : 'Abrir las secciones del sistema')
  const pos = fanPositions()
  fanItems.forEach((btn, i) => {
    btn.tabIndex = open ? 0 : -1
    btn.style.transitionDelay = open ? `${i * 30}ms` : '0ms'
    btn.style.transform = open ? `translate(${pos[i].x}px, ${pos[i].y}px) scale(1)` : 'translate(0px, 0px) scale(0.3)'
  })
}

core.addEventListener('click', () => {
  if (!body.classList.contains('is-ready-page')) {
    document.querySelector('.final').scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
    return
  }
  setFan(!body.classList.contains('fan-open'))
})
backdrop.addEventListener('click', () => setFan(false))
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return
  if (!sheet.hidden) closeSheet()
  else if (body.classList.contains('fan-open')) setFan(false)
})

// ---------- Hoja: la sección nace del botón (círculo que se expande) ----------
let returnFocus = null
function coreCenter() {
  const r = core.getBoundingClientRect()
  return `${r.left + r.width / 2}px ${r.top + r.height / 2}px`
}

function openSheet(chapter, from) {
  returnFocus = from
  const card = chapter.querySelector('.ch-card').cloneNode(true)
  card.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'))
  card.querySelector('h2').id = 'sheet-title'
  card.querySelectorAll('img').forEach(img => (img.loading = 'eager'))
  sheetBody.replaceChildren(...card.children)
  sheet.hidden = false
  sheet.scrollTop = 0
  body.classList.add('is-locked')
  sheet.querySelector('.sheet-close').focus({ preventScroll: true })
  if (prefersReduced) return
  const at = coreCenter()
  gsap.fromTo(sheet, { clipPath: `circle(0px at ${at})` }, { clipPath: `circle(150vmax at ${at})`, duration: 0.55, ease: 'power3.out' })
  gsap.from(sheetBody.children, { y: 30, opacity: 0, duration: 0.5, stagger: 0.06, delay: 0.15, ease: 'power3.out' })
}

function closeSheet() {
  const done = () => {
    sheet.hidden = true
    body.classList.remove('is-locked')
    returnFocus?.focus({ preventScroll: true })
  }
  if (prefersReduced) return done()
  gsap.to(sheet, { clipPath: `circle(0px at ${coreCenter()})`, duration: 0.42, ease: 'power3.in', onComplete: done })
}
sheet.querySelector('.sheet-close').addEventListener('click', closeSheet)

// ---------- Palabras gigantes: capa fija detrás del botón ----------
function moveGiantsBehindCore() {
  const layer = Object.assign(document.createElement('div'), { className: 'giants' })
  layer.setAttribute('aria-hidden', 'true')
  document.querySelectorAll('.chapter .giant').forEach(g => {
    g.dataset.for = g.closest('.chapter').dataset.chapter
    layer.append(g)
  })
  wrap.before(layer)
}

// ---------- Hero: el plano se materializa y el botón recorre los modos de la app ----------
function initHero() {
  const hero = document.querySelector('.hero')
  const root = document.documentElement
  const stack = core.querySelector('.core-stack')
  const layers = [...stack.querySelectorAll('.ly')] // de abajo (sombra) a arriba (ícono)
  const labels = stack.querySelectorAll('.ly-label')
  const icon = stack.querySelector('.ly-icon')
  const ring = wrap.querySelector('.ring')
  const themeItems = [...hero.querySelectorAll('.themes li')]
  const setActive = mode => themeItems.forEach(li => li.classList.toggle('is-active', li.dataset.theme === mode))
  const gap = core.offsetWidth * 0.3 // separación entre capas en la vista explotada
  const zOf = i => (i - (layers.length - 1) / 2) * gap

  // Estado inicial: solo el plano y el ícono en trazo violeta
  gsap.set(root, MODES.original)
  gsap.set(layers.filter(l => l !== icon), { opacity: 0 })
  gsap.set(ring, { opacity: 0 })
  gsap.set('.core-icon', { stroke: '#a5a3ff' })
  gsap.from('.blueprint', { opacity: 0, scale: 0.85, rotate: -12, duration: 1.2, ease: 'power3.out' })
  gsap.from('.hero-top > *, .hero-bottom > *', { opacity: 0, y: 24, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.2 })
  setActive('original')

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=420%',
      pin: true,
      scrub: 0.7,
      onUpdate: st => setActive(st.progress < 0.66 ? 'original' : st.progress < 0.82 ? 'rosa' : 'oscuro'),
    },
  })

  // 1. Se va el texto y el plano; el botón se inclina en 3D
  tl.to('.hero-top', { opacity: 0, y: -50, duration: 0.07 }, 0.01)
    .to('.hero-bottom', { opacity: 0, y: 50, duration: 0.07 }, 0.01)
    .to('.blueprint', { opacity: 0, scale: 1.3, rotate: 20, duration: 0.1 }, 0.02)
    .to('.core-wire', { opacity: 0, duration: 0.06 }, 0.04)
    .to(stack, { rotationX: 58, rotationZ: -38, scale: 1.45, '--ol': 1, duration: 0.08, ease: 'power2.inOut' }, 0.06)
    .to(icon, { z: zOf(layers.length - 1), duration: 0.08, ease: 'power2.inOut' }, 0.06)

  // 2. Vista explotada: cada capa baja a su lugar, de abajo hacia arriba, con su nombre
  layers.forEach((layer, i) => {
    if (layer === icon) return
    tl.fromTo(layer, { opacity: 0, z: zOf(i) + gap * 1.6 }, { opacity: 1, z: zOf(i), duration: 0.05, ease: 'power2.out' }, 0.12 + i * 0.035)
  })
  tl.to(labels, { opacity: 1, duration: 0.03, stagger: 0.035 }, 0.13)

  // 3. Ensamblado: las capas se juntan, el botón vuelve a mirar de frente y aparece el anillo
  tl.to(labels, { opacity: 0, duration: 0.03 }, 0.33)
    .to(layers, { z: 0, duration: 0.08, ease: 'power3.in', stagger: { each: 0.01, from: 'end' } }, 0.34)
    .to(stack, { rotationX: 0, rotationZ: 0, scale: 1, '--ol': 0, duration: 0.08, ease: 'power2.inOut' }, 0.37)
    .to('.core-icon', { stroke: '#ffffff', duration: 0.04 }, 0.42)
    .to(core, { scale: 1.1, duration: 0.025, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.45)
    .to(ring, { opacity: 1, duration: 0.04 }, 0.45)

  // 4. Los modos de la app: Original → Rosa → Oscuro, con un "clic" en cada cambio
  tl.fromTo('.themes', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.5)
    .to(root, { ...MODES.rosa, duration: 0.08, ease: 'power1.inOut' }, 0.62)
    .to(core, { scale: 0.92, duration: 0.03, yoyo: true, repeat: 1 }, 0.62)
    .to(root, { ...MODES.oscuro, duration: 0.08, ease: 'power1.inOut' }, 0.78)
    .to(core, { scale: 0.92, duration: 0.03, yoyo: true, repeat: 1 }, 0.78)
    .to('.themes', { opacity: 0, y: -12, duration: 0.05 }, 0.93)
}

// ---------- Barra lateral: progreso del scroll y salto a cada sección ----------
function initRail() {
  const stops = [
    { label: 'Inicio', el: document.querySelector('.hero'), hold: 0 },
    { label: 'Caos', el: document.querySelector('.chapter-chaos'), hold: 0.45 },
    ...chapters.map(ch => ({ label: LABELS[ch.dataset.chapter], el: ch, hold: 0.45 })),
    { label: 'Final', el: document.querySelector('.final'), hold: 0 },
  ]
  const rail = Object.assign(document.createElement('nav'), { className: 'rail' })
  rail.setAttribute('aria-label', 'Progreso de la página')
  const fill = Object.assign(document.createElement('div'), { className: 'rail-fill' })
  rail.append(fill)
  const marks = stops.map(stop => {
    const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'rail-mark' })
    btn.setAttribute('aria-label', `Ir a: ${stop.label}`)
    btn.innerHTML = `<span class="rail-label" aria-hidden="true">${stop.label}</span>`
    btn.addEventListener('click', () => window.scrollTo({ top: stop.target, behavior: prefersReduced ? 'auto' : 'smooth' }))
    rail.append(btn)
    return btn
  })
  document.body.append(rail)

  // Inicio de cada sección en el scroll total (las fijadas viven dentro de un pin-spacer)
  function measure() {
    const max = document.documentElement.scrollHeight - window.innerHeight
    stops.forEach((stop, i) => {
      const box = stop.el.parentElement.classList.contains('pin-spacer') ? stop.el.parentElement : stop.el
      const pinned = box.offsetHeight - stop.el.offsetHeight
      stop.start = i === stops.length - 1 ? max : box.offsetTop
      stop.target = Math.min(max, stop.start + pinned * stop.hold)
      marks[i].style.top = `${(stop.start / max) * 100}%`
    })
    update()
  }
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const y = window.scrollY
    fill.style.transform = `scaleY(${max > 0 ? Math.min(1, y / max) : 0})`
    let active = 0
    stops.forEach((stop, i) => {
      if (y + 2 >= stop.start) active = i
    })
    marks.forEach((m, i) => {
      m.classList.toggle('is-active', i === active)
      m.classList.toggle('is-passed', i < active)
      if (i === active) m.setAttribute('aria-current', 'step')
      else m.removeAttribute('aria-current')
    })
  }
  ScrollTrigger.addEventListener('refresh', measure)
  window.addEventListener('scroll', update, { passive: true })
  measure()
}

// Centro del elemento en pantalla mientras su sección está fijada arriba
function offsetIn(el, section) {
  let x = 0
  let y = 0
  for (let n = el; n && n !== section; n = n.offsetParent) {
    x += n.offsetLeft
    y += n.offsetTop
  }
  return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 }
}

// ---------- Cada sección: aparece, se sostiene y se mete en el botón ----------
function initChapter(section) {
  const items = [...section.querySelectorAll('.absorb')]
  const giant = document.querySelector(`.giant[data-for="${section.dataset.chapter}"]`)
  const index = section.dataset.index === undefined ? -1 : Number(section.dataset.index)

  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: section, start: 'top top', end: '+=190%', pin: true, scrub: 0.6, invalidateOnRefresh: true },
  })

  if (giant) {
    tl.fromTo(giant, { xPercent: 22, opacity: 0 }, { xPercent: -22, opacity: 1, duration: 0.5, ease: 'none' }, 0)
    tl.to(giant, { xPercent: -40, opacity: 0, duration: 0.5, ease: 'none' }, 0.5)
  }

  // fromTo explícito: con invalidateOnRefresh un from() releería su estado oculto como destino
  tl.fromTo(
    items,
    { opacity: 0, y: 70, x: 0, scale: 0.92, rotation: 0, filter: 'blur(0px)' },
    { opacity: 1, y: 0, x: 0, scale: 1, rotation: 0, filter: 'blur(0px)', duration: 0.22, stagger: 0.04, immediateRender: true },
    0.02,
  )

  // Absorción: cada pieza viaja al centro del botón, se achica y se desenfoca
  tl.to(
    items,
    {
      x: (_, el) => window.innerWidth / 2 - offsetIn(el, section).x,
      y: (_, el) => window.innerHeight / 2 - offsetIn(el, section).y,
      scale: 0.04,
      rotation: (i) => (i % 2 ? 14 : -14),
      opacity: 0,
      filter: 'blur(6px)',
      duration: 0.26,
      stagger: 0.025,
      ease: 'power3.in',
    },
    0.62,
  )

  // El botón "traga": se hunde y rebota; se llena un segmento del anillo
  tl.to(core, { scale: 1.16, duration: 0.05, ease: 'power2.out' }, 0.86)
  tl.to(core, { scale: 1, duration: 0.09, ease: 'back.out(3)' }, 0.91)
  if (index >= 0) tl.to(arcs[index], { strokeDashoffset: 0, duration: 0.1, ease: 'power2.out' }, 0.86)
}

// ---------- Final: el botón queda listo para tocar ----------
function initFinal() {
  ScrollTrigger.create({
    trigger: '.final',
    start: 'top 40%',
    onEnter: () => body.classList.add('is-ready-page'),
    onLeaveBack: () => {
      setFan(false)
      body.classList.remove('is-ready-page')
    },
  })
  if (!prefersReduced) {
    gsap.from('.final-top > *, .final-bottom > *', {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.final', start: 'top 60%' },
    })
  }
}
