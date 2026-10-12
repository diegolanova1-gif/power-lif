const WHATSAPP_NUMBER = '5491138753141'
const WHATSAPP_MESSAGE = 'Hola Diego, soy coach y quiero conocer Power Routine. Hoy tengo ___ alumnos.'

export const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

export function wireWhatsappLinks() {
  document.querySelectorAll('[data-cta]').forEach(link => {
    link.href = whatsappUrl
  })
}
