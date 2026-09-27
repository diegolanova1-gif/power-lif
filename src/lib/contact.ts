// Diego's WhatsApp: sales, plan upgrades and contact (no public self-service)
export const WHATSAPP_NUMBER = '5491138753141'

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export const WHATSAPP_MESSAGES = {
  info: 'Hola! Soy entrenador y quiero info sobre Power Routine para gestionar a mis alumnos.',
  upgrade: 'Hola! Uso Power Routine y llegué al límite de alumnos de mi plan. Quiero pasarme a un plan más grande.',
} as const

export const PLANS = {
  basic: { label: 'Básico', defaultLimit: 15 as number | null },
  pro: { label: 'Pro', defaultLimit: null as number | null }, // sin límite
} as const

export type PlanId = keyof typeof PLANS
