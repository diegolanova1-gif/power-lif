'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Dumbbell } from 'lucide-react'
import { whatsappLink, WHATSAPP_MESSAGES } from '@/lib/contact'

const G = '#10B981'
const RANKING = [
  { pos: '1', name: 'Martina G.', delta: '+18%', w: 92, color: G },
  { pos: '2', name: 'Lucas P.', delta: '+15%', w: 80, color: G },
  { pos: '3', name: 'Sofía R.', delta: '+11%', w: 64, color: G },
  { pos: '4', name: 'Tomás B.', delta: '+7%', w: 46, color: G },
  { pos: '5', name: 'Julián M.', delta: '−3%', w: 18, color: '#EF4444' },
]

const NAV_LINKS = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Testimonios', href: '#testimonios' },
  { label: 'Impacto', href: '#metricas' },
  { label: 'CEO', href: '#equipo' },
]

const FEATURES = [
  { title: 'Rutinas semanales', desc: 'Subí la rutina una vez y tus alumnos la ven al instante. Sin PDFs, sin audios.' },
  { title: 'Seguimiento en vivo', desc: 'Cargas, repeticiones y asistencia por sesión. Sabé quién avanza y quién necesita un ajuste.' },
  { title: 'Rankings por equipo', desc: 'Progreso del grupo en números concretos. Motiva al equipo y respaldá tu trabajo.' },
  { title: 'Rachas y logros', desc: 'Registrá asistencia consecutiva y premiá la constancia. Tus alumnos compiten consigo mismos.' },
  { title: 'Estadísticas de evolución', desc: 'Gráficos de progreso por ejercicio, por alumno y por grupo. Datos que demuestran resultados.' },
  { title: 'Multi-tenant', desc: 'Cada coach con su espacio. Tus alumnos solo ven lo tuyo.' },
]

const TESTIMONIALS = [
  { quote: '"Me ahorré un montón de tiempo. No sabía que se podía tener todo en una sola plataforma."', name: 'Coach verificado', role: 'Coach de fuerza', initial: 'C' },
  { quote: '"Tener el seguimiento en vivo de mis alumnos a distancia ayuda a su evolución."', name: 'Coach verificado', role: 'Coach funcional', initial: 'C' },
  { quote: '"Como alumno, tener al coach al tanto de todo me motiva más."', name: 'Alumno verificado', role: 'Alumno', initial: 'A' },
  { quote: '"El sistema ayuda a que me motive con sus rachas y estadísticas."', name: 'Alumno verificado', role: 'Alumno', initial: 'A' },
]

const METRICS = [
  { value: '2 min', label: 'Para subir una rutina semanal', color: '#F1F5F9' },
  { value: '85%', label: 'Menos tiempo en planillas', color: G },
  { value: '+40%', label: 'Motivación del grupo con rachas', color: '#F1F5F9' },
  { value: '100%', label: 'De los datos siempre disponibles', color: G },
]

function FeatureIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
    </svg>
  )
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          io.unobserve(el)
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity .9s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform .9s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function AnimatedStat() {
  const ref = useRef<HTMLSpanElement>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || done) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.disconnect()
        setDone(true)
        const t0 = performance.now()
        const target = 12
        const step = (t: number) => {
          const k = Math.min((t - t0) / 1400, 1)
          if (el) el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))))
          if (k < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <span ref={ref}>0</span>
}

function RankingBars() {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true)
          io.unobserve(el)
        }
      },
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        borderRadius: 12,
        background: '#0A0A0A',
        boxShadow: 'inset 0 0 0 1px #222222',
        padding: 'clamp(20px,3vw,32px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 18 }}>Equipo Fuerza · Mañana</span>
        <span style={{ fontSize: 14, color: '#94A3B8' }}>Octubre</span>
      </div>
      {RANKING.map((r, i) => (
        <div key={r.pos} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) 64px', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: '#94A3B8' }}>{r.pos}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 15 }}>{r.name}</span>
            <div style={{ height: 6, borderRadius: 3, background: '#2A2A2A', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: started ? `${r.w}%` : 0,
                  borderRadius: 3,
                  background: r.color,
                  transition: `width 1.2s cubic-bezier(0.22,1,0.36,1) ${250 + i * 120}ms`,
                }}
              />
            </div>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, textAlign: 'right', color: r.color }}>{r.delta}</span>
        </div>
      ))}
    </div>
  )
}

const sectionHeading = (eyebrow: string, title: string, desc?: string, center = false) => (
  <Reveal>
    <div style={{ maxWidth: center ? undefined : 640, margin: center ? '0 auto' : undefined, textAlign: center ? 'center' : 'left', marginBottom: 'clamp(48px,8vh,72px)' }}>
      <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: 14 }}>{eyebrow}</div>
      <h2 style={{ margin: '0 0 16px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(32px,4.5vw,56px)', lineHeight: 1, letterSpacing: '-0.025em', textWrap: 'balance' }}>{title}</h2>
      {desc && <p style={{ margin: center ? '0 auto' : 0, color: '#94A3B8', fontSize: 16, lineHeight: 1.5, maxWidth: center ? 520 : undefined, textWrap: 'pretty' }}>{desc}</p>}
    </div>
  </Reveal>
)

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bioOpen, setBioOpen] = useState(false)
  const [navSolid, setNavSolid] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const [heroStyle, setHeroStyle] = useState<{ transform: string; opacity: number }>({ transform: 'translateY(0)', opacity: 1 })

  const coachLink = whatsappLink(WHATSAPP_MESSAGES.info)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const vh = window.innerHeight
      const p = Math.min(y / vh, 1)
      setNavSolid(y > 40)
      setHeroStyle({ transform: `translateY(${y * 0.3}px)`, opacity: Math.max(0, 1 - p * 1.3) })
      const max = document.documentElement.scrollHeight - vh
      setScrollPct(max > 0 ? (y / max) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ position: 'relative', background: '#0A0A0A', fontFamily: "'Inter',system-ui,sans-serif", color: '#F1F5F9' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400&display=swap');
        html,body{margin:0;padding:0;background:#0A0A0A}
        .pr-a{color:#F1F5F9;text-decoration:none}
        .pr-a:hover{color:#FFFFFF}
        .pr-cta-coach:hover{background:#0D9668}
        .pr-cta-outline:hover{border-color:rgba(241,245,249,0.6);background:rgba(255,255,255,0.1)}
        @keyframes fade-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, height: 2, width: `${scrollPct}%`, background: G, zIndex: 70 }} />

      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: navSolid ? '14px clamp(24px,4.5vw,64px)' : 'clamp(20px,2.4vw,28px) clamp(24px,4.5vw,64px)',
          background: navSolid ? 'rgba(10,10,10,0.85)' : 'transparent',
          backdropFilter: navSolid ? 'blur(12px)' : 'none',
          boxShadow: navSolid ? 'inset 0 -1px 0 rgba(255,255,255,0.06)' : 'none',
          transition: 'background .3s,backdrop-filter .3s,box-shadow .3s,padding .3s',
        }}
      >
        <a href="#" className="pr-a" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: G }}>
            <Dumbbell size={18} color="#FFFFFF" />
          </span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(20px,2vw,24px)', letterSpacing: '0.02em' }}>
            Power <span style={{ color: G }}>Routine</span>
          </span>
        </a>

        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 'clamp(24px,3vw,40px)' }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="pr-a" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(241,245,249,0.8)' }}>
              {l.label}
            </a>
          ))}
          <Link href="/login" className="pr-a" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(241,245,249,0.8)' }}>
            Iniciar sesión
          </Link>
        </div>
        <a
          href={coachLink}
          target="_blank"
          rel="noopener noreferrer"
          className="pr-cta-coach hidden md:flex"
          style={{ alignItems: 'center', gap: 8, padding: '12px 24px', border: '1px solid rgba(241,245,249,0.3)', borderRadius: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F1F5F9', transition: 'border-color .2s,background .2s' }}
        >
          Empezá gratis
        </a>

        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="md:hidden"
          style={{ background: 'none', border: 0, padding: '10px 0 10px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}
        >
          <span style={{ display: 'block', width: 24, height: 2, background: '#F1F5F9' }} />
          <span style={{ display: 'block', width: 24, height: 2, background: '#F1F5F9' }} />
          <span style={{ display: 'block', width: 16, height: 2, background: '#F1F5F9' }} />
        </button>
      </nav>

      <div
        className="md:hidden"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all .5s',
          opacity: menuOpen ? 1 : 0,
          visibility: menuOpen ? 'visible' : 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.02em' }}>
            Power <span style={{ color: G }}>Routine</span>
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            style={{ background: 'none', border: 0, padding: 10, marginRight: -10, cursor: 'pointer', color: '#F1F5F9', display: 'flex' }}
          >
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, padding: '0 24px 48px' }}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="pr-a"
              style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(36px,10vw,48px)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-0.01em' }}
            >
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)} className="pr-a" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(36px,10vw,48px)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            Ingresar
          </Link>
          <a
            href={coachLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            style={{ marginTop: 20, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px', background: G, borderRadius: 8, fontSize: 13, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFFFFF' }}
          >
            Empezá gratis
          </a>
        </div>
      </div>

      <section style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/hero-discos.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '65% 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(10,10,10,0.88) 0%,rgba(10,10,10,0.6) 45%,rgba(10,10,10,0.15) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%', background: 'linear-gradient(180deg,rgba(10,10,10,0) 0%,#0A0A0A 100%)' }} />

        <div style={{ ...heroStyle, position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(110px,16vh,150px) clamp(24px,4.5vw,64px) clamp(48px,8vh,80px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(24px,3vh,32px)', opacity: 0, animation: 'fade-up .8s ease-out forwards' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(241,245,249,0.75)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 21v-6" />
              <path d="M12 21V9" />
              <path d="M19 21V3" />
            </svg>
            <span style={{ fontSize: 'clamp(12px,1.1vw,14px)', fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(241,245,249,0.75)' }}>Gestión para profesionales</span>
          </div>

          <h1 style={{ margin: 0, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 'clamp(2.5rem,6.2vw,5.5rem)', lineHeight: 1.04, letterSpacing: '-0.03em', textWrap: 'balance', display: 'flex', flexDirection: 'column', opacity: 0, animation: 'fade-up .8s ease-out .2s forwards' }}>
            <span>Todo el entrenamiento</span>
            <span style={{ color: '#CBD5E1' }}>en un solo lugar.</span>
          </h1>

          <p style={{ margin: 'clamp(24px,3vh,32px) 0 0', maxWidth: 448, fontSize: 'clamp(14px,1.3vw,16px)', lineHeight: 1.65, color: '#CBD5E1', textWrap: 'pretty', opacity: 0, animation: 'fade-up .8s ease-out .4s forwards' }}>
            Rutinas, seguimiento, rankings, rachas, mejor evolución y más motivación para tu equipo — <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>todo en un solo lugar.</strong>
          </p>

          <div style={{ marginTop: 'clamp(32px,4vh,40px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(12px,1.6vw,16px)', opacity: 0, animation: 'fade-up .8s ease-out .6s forwards' }}>
            <a href={coachLink} target="_blank" rel="noopener noreferrer" className="pr-cta-coach" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'clamp(13px,1.4vw,16px) clamp(20px,2.4vw,28px)', background: G, borderRadius: 8, fontSize: 'clamp(11px,1vw,12px)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFFFFF' }}>
              Soy coach
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
            </a>
            <Link href="/login?as=alumno" className="pr-cta-outline" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'clamp(13px,1.4vw,16px) clamp(20px,2.4vw,28px)', border: '1px solid rgba(241,245,249,0.3)', borderRadius: 8, fontSize: 'clamp(11px,1vw,12px)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F1F5F9' }}>
              Soy alumno
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
            </Link>
          </div>

          <div style={{ marginTop: 'clamp(32px,6vh,56px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4.5vw,64px)', opacity: 0, animation: 'fade-up .8s ease-out .8s forwards' }}>
            {[['2 min', 'Para subir la rutina'], ['1 lugar', 'Para todo el progreso'], ['0', 'Planillas']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(24px,4vw,48px)', lineHeight: 1, letterSpacing: '-0.03em' }}>{v}</div>
                <div style={{ marginTop: 6, fontSize: 'clamp(10px,0.9vw,12px)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="rutinas" style={{ position: 'relative', padding: 'clamp(72px,12vh,140px) clamp(24px,4.5vw,64px)', maxWidth: 1200, margin: '0 auto' }}>
        {sectionHeading('Cómo funciona', 'Tres pasos. Cero planillas.', 'Todo tu trabajo como coach, ordenado en un sistema que no falla ni pierde datos.')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(64px,10vh,120px)' }}>
          {[
            { n: '01', title: 'Subí la rutina de la semana', desc: 'Armala una vez, en dos minutos. Tus alumnos la ven al instante, sin mandar PDFs ni audios.', reverse: false, img: '/landing/capture-rutina.jpg' },
            { n: '02', title: 'Seguí la evolución de cada alumno', desc: 'Cargas, repeticiones y asistencia registradas por sesión. Revisá quién avanza y quién necesita un ajuste.', reverse: true, img: '/landing/capture-progreso.jpg' },
            { n: '03', title: 'Mostrá rankings por equipo', desc: 'El progreso de tu grupo, en números concretos. Tus alumnos ven resultados y vos demostrás tu trabajo.', reverse: false, img: '/landing/capture-ranking.jpg' },
          ].map((step) => (
            <div key={step.n} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: 'clamp(24px,4vw,64px)', alignItems: 'center' }}>
              {step.reverse && (
                <Reveal delay={0}>
                  <div style={{ aspectRatio: '16/10', borderRadius: 12, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px #222222' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.img} alt={step.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  </div>
                </Reveal>
              )}
              <Reveal delay={100}>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 40, letterSpacing: '-0.02em', color: '#222222', marginBottom: 12 }}>{step.n}</div>
                  <h3 style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 22 }}>{step.title}</h3>
                  <p style={{ margin: 0, color: '#94A3B8', fontSize: 16, lineHeight: 1.5, maxWidth: 420, textWrap: 'pretty' }}>{step.desc}</p>
                </div>
              </Reveal>
              {!step.reverse && (
                <Reveal delay={100}>
                  <div style={{ aspectRatio: '16/10', borderRadius: 12, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px #222222' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.img} alt={step.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  </div>
                </Reveal>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="rankings" style={{ padding: 'clamp(72px,12vh,140px) clamp(24px,4.5vw,64px)', background: '#141414' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: 'clamp(40px,6vw,96px)', alignItems: 'center' }}>
          <Reveal>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: 14 }}>Rankings</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(72px,11vw,140px)', lineHeight: 0.95, letterSpacing: '-0.04em', color: G }}>
                +<AnimatedStat />%
              </div>
              <h2 style={{ margin: '16px 0 12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 'clamp(24px,3vw,36px)', lineHeight: 1.15, letterSpacing: '-0.02em' }}>Tu equipo avanzó un 12% este mes.</h2>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: 16, lineHeight: 1.5, maxWidth: 440, textWrap: 'pretty' }}>Cada carga registrada suma al ranking. Un dato concreto que motiva al grupo y respalda tu trabajo.</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <RankingBars />
          </Reveal>
        </div>
      </section>

      <section id="features" style={{ padding: 'clamp(72px,12vh,140px) clamp(24px,4.5vw,64px)', background: '#0A0A0A' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {sectionHeading('Funcionalidades', 'Todo lo que necesitás, nada que sobre.', 'Cada función pensada para el día a día de un coach que trabaja en serio.')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 24 }}>
            {FEATURES.map((f) => (
              <Reveal key={f.title}>
                <div style={{ padding: 'clamp(24px,3vw,32px)', borderRadius: 12, background: '#141414', boxShadow: 'inset 0 0 0 1px #222222', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FeatureIcon />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>{f.title}</h3>
                  <p style={{ margin: 0, color: '#94A3B8', fontSize: 15, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonios" style={{ padding: 'clamp(72px,12vh,140px) clamp(24px,4.5vw,64px)', background: '#141414' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {sectionHeading('Testimonios', 'Lo dicen ellos.', undefined, true)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 24 }}>
            {TESTIMONIALS.map((t) => (
              <Reveal key={t.quote}>
                <div style={{ padding: 'clamp(24px,3vw,32px)', borderRadius: 12, background: '#0A0A0A', boxShadow: 'inset 0 0 0 1px #222222', display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: '#CBD5E1', flex: 1 }}>{t.quote}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#94A3B8' }}>{t.initial}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: '#94A3B8' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="metricas" style={{ padding: 'clamp(72px,12vh,140px) clamp(24px,4.5vw,64px)', background: '#0A0A0A' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {sectionHeading('Impacto', 'Números que hablan.', undefined, true)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 'clamp(24px,4vw,48px)', textAlign: 'center' }}>
            {METRICS.map((m) => (
              <Reveal key={m.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(40px,6vw,72px)', lineHeight: 1, letterSpacing: '-0.04em', color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8', maxWidth: 180, textWrap: 'pretty' }}>{m.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="equipo" style={{ padding: 'clamp(72px,12vh,140px) clamp(24px,4.5vw,64px)', background: '#141414' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {sectionHeading('CEO', 'Quiénes hacemos esto.', 'Un equipo chico con foco en una sola cosa: que el coach trabaje mejor.')}
          <Reveal>
            <div
              onMouseEnter={() => setBioOpen(true)}
              onMouseLeave={() => setBioOpen(false)}
              onClick={() => setBioOpen((v) => !v)}
              style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(40px,5vw,56px)', borderRadius: 20, background: '#0A0A0A', boxShadow: 'inset 0 0 0 1px #222222', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 3px #222222, 0 0 0 6px ${G}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/diego.jpg" alt="Diego Ezequiel Macedo" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
              </div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: 26 }}>Diego Ezequiel Macedo</h3>
              <div style={{ fontSize: 14, color: G, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fundador &amp; Desarrollador</div>
              <p style={{ margin: 0, fontSize: 15, color: '#94A3B8', lineHeight: 1.5 }}>Profesor de Educación Física, personal trainer y emprendedor digital. Fundador de Mooven Web y creador de Power Routine.</p>
              <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.05em', transition: 'opacity .3s', opacity: bioOpen ? 0 : 1 }}>Hover o tap para conocer más →</div>
              <div style={{ maxHeight: bioOpen ? 500 : 0, overflow: 'hidden', transition: 'max-height .6s cubic-bezier(0.22,1,0.36,1), opacity .5s', opacity: bioOpen ? 1 : 0, width: '100%' }}>
                <div style={{ padding: '20px 24px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#CBD5E1', lineHeight: 1.65, textAlign: 'left' }}>Soy Diego Ezequiel Macedo, profesor de Educación Física, personal trainer y emprendedor digital.</p>
                  <p style={{ margin: '14px 0 0', fontSize: 14, color: '#CBD5E1', lineHeight: 1.65, textAlign: 'left' }}>A partir de mi experiencia en el ámbito del entrenamiento, comencé a identificar oportunidades para mejorar la forma en que entrenadores y alumnos organizan, registran y acompañan sus procesos de entrenamiento.</p>
                  <p style={{ margin: '14px 0 0', fontSize: 14, color: '#CBD5E1', lineHeight: 1.65, textAlign: 'left' }}>
                    Actualmente, también me estoy formando en el mundo del <em style={{ color: G, fontStyle: 'italic' }}>vibe coding</em>, explorando cómo combinar inteligencia artificial, tecnología y desarrollo de software para transformar ideas en soluciones concretas. Soy fundador de <strong style={{ color: '#F1F5F9' }}>Mooven Web</strong> y creador de <strong style={{ color: '#F1F5F9' }}>Power Routine</strong>, dos proyectos que nacen de una misma visión: utilizar la tecnología para simplificar procesos y resolver problemas reales.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="empezar" style={{ padding: 'clamp(96px,16vh,180px) clamp(24px,4.5vw,64px)', background: '#0A0A0A' }}>
        <Reveal>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h2 style={{ margin: '0 0 20px', maxWidth: 900, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(36px,6vw,80px)', lineHeight: 0.95, letterSpacing: '-0.025em', textWrap: 'balance' }}>Empezá a gestionar como profesional.</h2>
            <p style={{ margin: '0 0 32px', color: '#94A3B8', fontSize: 16, lineHeight: 1.5, textWrap: 'pretty' }}>Probá Power Routine gratis. Te respondemos por WhatsApp.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(12px,1.6vw,16px)' }}>
              <a href={coachLink} target="_blank" rel="noopener noreferrer" className="pr-cta-coach" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 28px', background: G, borderRadius: 8, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFFFFF' }}>
                Soy coach
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
              </a>
              <Link href="/login?as=alumno" className="pr-cta-outline" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 28px', border: '1px solid rgba(241,245,249,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F1F5F9' }}>
                Soy alumno
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer style={{ borderTop: '1px solid #222222' }}>
        <div style={{ padding: '28px clamp(24px,4.5vw,64px)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: G }}>
              <Dumbbell size={14} color="#FFFFFF" />
            </span>
            <span style={{ fontSize: 14, color: '#94A3B8' }}>La herramienta de gestión para coaches de gimnasio.</span>
          </div>
          <span style={{ fontSize: 14, color: '#94A3B8' }}>© 2026 Power Routine</span>
        </div>
      </footer>
    </div>
  )
}
