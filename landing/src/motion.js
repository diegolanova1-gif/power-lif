// Motion engine for the Power Routine landing — built with the epic-design skill's
// depth-layer + scroll-reveal system (GSAP + ScrollTrigger, no WebGL).

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const PERF_STORAGE_KEY = 'motionPreference'

function getPreferences() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  const isLowPower = (navigator.hardwareConcurrency ?? 4) <= 2
  return { prefersReduced, isTouch, isLowPower }
}

function revealImmediately() {
  // Fallback if GSAP/ScrollTrigger failed to load, or reduced-motion path:
  // guarantee every bit of content is visible, never stuck mid-animation.
  document.querySelectorAll('.hero-line-left, .hero-line-right').forEach(el => {
    el.style.transform = 'none'
    el.style.opacity = '1'
  })
  document.querySelectorAll('.line-inner').forEach(el => {
    el.style.transform = 'none'
  })
  document.querySelectorAll('.scene').forEach(el => {
    el.style.clipPath = 'none'
  })
}

export function initMotion() {
  const { prefersReduced, isTouch, isLowPower } = getPreferences()
  const liteMode = isTouch || isLowPower

  try {
    gsap.registerPlugin(ScrollTrigger)

    if (prefersReduced) {
      revealImmediately()
      initMotionToggle({ disabledByPreference: true })
      return
    }

    initHeroSequence()
    initCurtainReveals()
    initStaggerGrid()
    initSkewBounce()
    initScaleSettle()
    initTopDownDrop()
    initCircleIris()
    if (!liteMode) initSectionParallax()
    initMotionToggle({ disabledByPreference: false })

    // GSAP's ticker throttles in background tabs (e.g. page opened in a new
    // tab that isn't focused yet). Catch up once it becomes visible instead
    // of leaving scroll-linked content stuck mid-animation.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        ScrollTrigger.refresh()
      }
    })
  } catch (error) {
    console.error('Motion init failed, showing static content:', error)
    revealImmediately()
  }
}

// ---- Hero: split-converge title + curtain subtitle, pinned ----
function initHeroSequence() {
  const hero = document.querySelector('[data-scene="hero"]')
  if (!hero) return

  const left = hero.querySelector('.hero-line-left')
  const right = hero.querySelector('.hero-line-right')
  const subLine = hero.querySelector('.hero-sub .line-inner')
  const scrollCue = hero.querySelector('.scroll-cue')

  gsap.set(scrollCue, { opacity: 0 })

  // Entrance plays immediately on load — never gated behind a scroll gesture.
  // A hero the visitor has to scroll to even see would fail the 5-second test.
  const intro = gsap.timeline({ delay: 0.15 })
  intro
    .to(left, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0)
    .to(right, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0)
    .to(subLine, { y: '0%', duration: 0.8, ease: 'power4.out' }, 0.3)
    .to(scrollCue, { opacity: 1, duration: 0.4 }, 0.9)

  // Only the exit (scroll-out) is scroll-linked and pinned.
  // Every tween below uses an EXPLICIT fromTo (not .to()) with the exact
  // resting values the intro also targets. A scrubbed ScrollTrigger renders
  // its progress-0 state the moment it's created, which happens here before
  // the intro tween above has finished — with an implicit .to() that captures
  // whatever half-animated value was on screen at that instant as "from",
  // corrupting the loop so scrolling back up never restored the visible
  // title. Explicit values make progress 0 always mean "fully visible",
  // in both directions.
  const exitTl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=100%',
      pin: true,
      scrub: 1,
    },
  })

  exitTl
    .fromTo(scrollCue, { opacity: 1 }, { opacity: 0, duration: 0.15 }, 0)
    .fromTo(left, { x: 0, opacity: 1 }, { x: '-100vw', opacity: 0, duration: 0.4, ease: 'power3.in' }, 0.05)
    .fromTo(right, { x: 0, opacity: 1 }, { x: '100vw', opacity: 0, duration: 0.4, ease: 'power3.in' }, 0.05)
    .fromTo(subLine, { y: '0%' }, { y: '-110%', duration: 0.35, ease: 'power3.in' }, 0.05)
}

// ---- Generic curtain reveal for section headings (outside hero) ----
function initCurtainReveals() {
  const lines = document.querySelectorAll('.scene:not([data-scene="hero"]) [data-reveal="curtain"] .line-inner')
  lines.forEach(line => {
    gsap.to(line, {
      y: '0%',
      duration: 0.9,
      ease: 'power4.out',
      scrollTrigger: { trigger: line, start: 'top 85%' },
    })
  })
}

// ---- Problem section: pain-list items enter from different edges ----
function initStaggerGrid() {
  const grid = document.querySelector('[data-reveal="stagger-grid"]')
  if (!grid) return
  const items = grid.querySelectorAll('li')
  const directions = [
    { x: -60, y: 0 },
    { x: 0, y: -50 },
    { x: 60, y: 0 },
    { x: 0, y: 50 },
  ]
  items.forEach((item, i) => {
    const dir = directions[i % directions.length]
    gsap.from(item, {
      x: dir.x,
      y: dir.y,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      delay: i * 0.08,
      scrollTrigger: { trigger: grid, start: 'top 78%' },
    })
  })
}

// ---- Solution pillars + CTA button: skew + elastic bounce ----
function initSkewBounce() {
  const pillars = document.querySelectorAll('[data-reveal="skew-bounce"] .pillar')
  if (pillars.length) {
    gsap.from(pillars, {
      y: 70,
      skewY: 6,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.6)',
      stagger: 0.12,
      scrollTrigger: { trigger: pillars[0].closest('.pillars'), start: 'top 78%' },
    })
  }

  const cta = document.querySelector('.whatsapp-cta[data-reveal="skew-bounce"]')
  if (cta) {
    gsap.from(cta, {
      y: 40,
      skewY: 5,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.7)',
      scrollTrigger: { trigger: cta, start: 'top 85%' },
    })
  }
}

// ---- Proof mockup: settle into place (DJI-style scale-in, scrubbed) ----
function initScaleSettle() {
  const mockup = document.querySelector('[data-reveal="scale-settle"]')
  if (!mockup) return
  gsap.fromTo(
    mockup,
    { scale: 0.88, opacity: 0.6, y: 30 },
    {
      scale: 1,
      opacity: 1,
      y: 0,
      ease: 'none',
      scrollTrigger: { trigger: mockup, start: 'top 90%', end: 'top 45%', scrub: 1 },
    }
  )
}

// ---- Problem section: whole scene born from the top (clip-path) ----
function initTopDownDrop() {
  const section = document.querySelector('.reveal-top-drop')
  if (!section) return
  gsap.fromTo(
    section,
    { clipPath: 'inset(0 0 100% 0)' },
    {
      clipPath: 'inset(0 0 0% 0)',
      ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 90%', end: 'top 35%', scrub: 1.2 },
    }
  )
}

// ---- CTA section: iris aperture opening ----
function initCircleIris() {
  const section = document.querySelector('.reveal-iris')
  if (!section) return
  gsap.fromTo(
    section,
    { clipPath: 'circle(0% at 50% 50%)' },
    {
      clipPath: 'circle(75% at 50% 50%)',
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 35%', scrub: 1 },
    }
  )
}

// ---- Subtle parallax on depth-0/1 layers, scoped to each section ----
function initSectionParallax() {
  document.querySelectorAll('.scene:not([data-scene="hero"])').forEach(scene => {
    const back = scene.querySelectorAll('.depth-0')
    const glow = scene.querySelectorAll('.depth-1')
    if (back.length) {
      gsap.to(back, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    }
    if (glow.length) {
      gsap.to(glow, {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    }
  })
}

// ---- Motion toggle: lets the user pause everything, independent of prefers-reduced-motion ----
function initMotionToggle({ disabledByPreference }) {
  const toggle = document.querySelector('.motion-toggle')
  if (!toggle) return

  const label = toggle.querySelector('.motion-toggle-text')
  let enabled = !disabledByPreference

  function apply() {
    document.documentElement.classList.toggle('no-motion', !enabled)
    toggle.setAttribute('aria-pressed', String(!enabled))
    if (label) label.textContent = enabled ? 'Animaciones' : 'Animaciones (pausadas)'
    gsap.globalTimeline.timeScale(enabled ? 1 : 0.001)
  }

  const saved = localStorage.getItem(PERF_STORAGE_KEY)
  if (saved === 'off') enabled = false
  if (disabledByPreference) enabled = false
  apply()

  toggle.addEventListener('click', () => {
    enabled = !enabled
    apply()
    try {
      localStorage.setItem(PERF_STORAGE_KEY, enabled ? 'on' : 'off')
    } catch {
      /* storage unavailable — non-critical */
    }
  })
}
