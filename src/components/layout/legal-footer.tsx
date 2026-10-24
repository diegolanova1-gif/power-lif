import Link from 'next/link'

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-card/50 py-6 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <span>© {new Date().getFullYear()} Power Routine — Diego Macedo</span>
          <span className="hidden sm:inline">·</span>
          <Link href="/terminos" className="hover:text-foreground transition-colors">Términos y Condiciones</Link>
          <span className="hidden sm:inline">·</span>
          <Link href="/privacidad" className="hover:text-foreground transition-colors">Política de Privacidad</Link>
        </div>
        <span>Contacto: WhatsApp +54 9 11 3875-3141</span>
      </div>
    </footer>
  )
}
