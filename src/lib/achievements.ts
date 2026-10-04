export type CardCategory = 'inicio' | 'resistencia' | 'elite' | 'legado' | 'miticas'
export type IconName = 'footprints' | 'shield' | 'crown' | 'landmark' | 'sparkle'

export interface CategoryMeta {
  label: string
  icon: IconName
  /** Tono principal de la categoría (plata, bronce, oro, platino...) */
  accent: string
  accentSoft: string
}

// Tiers ascendentes: acero -> bronce -> plata -> oro -> platino. Cada
// categoría agrupa 10 cartas (001-010, 011-020, ...).
export const CATEGORIES: Record<CardCategory, CategoryMeta> = {
  inicio: { label: 'Inicio', icon: 'footprints', accent: '#9ca3af', accentSoft: '#d1d5db' },
  resistencia: { label: 'Resistencia', icon: 'shield', accent: '#b8793f', accentSoft: '#e0a872' },
  elite: { label: 'Élite', icon: 'crown', accent: '#cbd5e1', accentSoft: '#f1f5f9' },
  legado: { label: 'Legado', icon: 'landmark', accent: '#d4af37', accentSoft: '#f0d375' },
  miticas: { label: 'Míticas', icon: 'sparkle', accent: '#f5f3ff', accentSoft: '#ffffff' },
}

export interface StreakCard {
  /** 1-50, posición en la colección */
  number: number
  id: string
  name: string
  category: CardCategory
  /** Racha (días reales consecutivos) necesaria para desbloquearla */
  requiredDays: number
  quote: string
}

const pad = (n: number) => String(n).padStart(3, '0')

const RAW_CARDS: Omit<StreakCard, 'id'>[] = [
  // I — INICIO
  { number: 1, name: 'Primer Paso', category: 'inicio', requiredDays: 1, quote: 'Todo cambio comienza con una decisión.' },
  { number: 2, name: 'Constancia', category: 'inicio', requiredDays: 4, quote: 'La disciplina se demuestra cuando nadie te obliga.' },
  { number: 3, name: 'Disciplina', category: 'inicio', requiredDays: 7, quote: 'Una semana entera es la prueba de que vas en serio.' },
  { number: 4, name: 'Compromiso', category: 'inicio', requiredDays: 10, quote: 'Diez días no son casualidad: son una decisión repetida.' },
  { number: 5, name: 'Determinación', category: 'inicio', requiredDays: 14, quote: 'Dos semanas seguidas: la excusa ya no alcanza.' },
  { number: 6, name: 'Persistencia', category: 'inicio', requiredDays: 21, quote: 'Se dice que así nace un hábito. Vos ya lo sabés.' },
  { number: 7, name: 'Voluntad', category: 'inicio', requiredDays: 30, quote: 'Un mes entero. Esto ya es parte de quién sos.' },
  { number: 8, name: 'Firmeza', category: 'inicio', requiredDays: 40, quote: 'Nada te movió de acá. Esa es la firmeza real.' },
  { number: 9, name: 'Enfoque', category: 'inicio', requiredDays: 50, quote: 'Cincuenta días mirando un solo objetivo.' },
  { number: 10, name: 'Convicción', category: 'inicio', requiredDays: 60, quote: 'Dos meses. Ya no hay vuelta atrás.' },

  // II — RESISTENCIA
  { number: 11, name: 'Resistencia', category: 'resistencia', requiredDays: 75, quote: 'El cuerpo aguanta lo que la mente decide no soltar.' },
  { number: 12, name: 'Fortaleza', category: 'resistencia', requiredDays: 90, quote: 'Tres meses construyendo algo que no se rompe fácil.' },
  { number: 13, name: 'Perseverancia', category: 'resistencia', requiredDays: 100, quote: 'Cien días. Pocos llegan hasta acá.' },
  { number: 14, name: 'Sacrificio', category: 'resistencia', requiredDays: 120, quote: 'Lo que otros no están dispuestos a dar, vos ya lo diste.' },
  { number: 15, name: 'Templanza', category: 'resistencia', requiredDays: 150, quote: 'Ni un arrebato. Solo trabajo, día tras día.' },
  { number: 16, name: 'Coraje', category: 'resistencia', requiredDays: 180, quote: 'Medio año sin bajar los brazos.' },
  { number: 17, name: 'Dominio', category: 'resistencia', requiredDays: 200, quote: 'Ya no entrenás por motivación. Entrenás por dominio propio.' },
  { number: 18, name: 'Control', category: 'resistencia', requiredDays: 250, quote: 'Tu rutina te obedece a vos, no al revés.' },
  { number: 19, name: 'Superación', category: 'resistencia', requiredDays: 300, quote: 'Trescientos días superando a quien eras ayer.' },
  { number: 20, name: 'Inquebrantable', category: 'resistencia', requiredDays: 365, quote: 'Un año entero. Nada te quebró.' },

  // III — ÉLITE
  { number: 21, name: 'Élite', category: 'elite', requiredDays: 400, quote: 'Pocos sostienen esto. Vos ya estás ahí.' },
  { number: 22, name: 'Imparable', category: 'elite', requiredDays: 450, quote: 'No hay freno que te alcance.' },
  { number: 23, name: 'Incansable', category: 'elite', requiredDays: 500, quote: 'Quinientos días sin pedir permiso para seguir.' },
  { number: 24, name: 'Invencible', category: 'elite', requiredDays: 600, quote: 'Lo intentaron parar mil veces. Nunca lo lograron.' },
  { number: 25, name: 'Titán', category: 'elite', requiredDays: 750, quote: 'Esto ya no se mide en días. Se mide en magnitud.' },
  { number: 26, name: 'Coloso', category: 'elite', requiredDays: 900, quote: 'Una presencia que impone, sostenida en el tiempo.' },
  { number: 27, name: 'Guerrero', category: 'elite', requiredDays: 1000, quote: 'Mil días de batalla silenciosa contra vos mismo.' },
  { number: 28, name: 'Maestro', category: 'elite', requiredDays: 1200, quote: 'Ya no aprendés el camino. Lo enseñás con el ejemplo.' },
  { number: 29, name: 'Referente', category: 'elite', requiredDays: 1500, quote: 'Otros te miran para saber que sí se puede.' },
  { number: 30, name: 'Ejemplo', category: 'elite', requiredDays: 1800, quote: 'Cinco años. Tu constancia ya es un testimonio.' },

  // IV — LEGADO
  { number: 31, name: 'Centenario', category: 'legado', requiredDays: 2000, quote: 'Dos mil días escritos en tu historia.' },
  { number: 32, name: 'Veterano', category: 'legado', requiredDays: 2500, quote: 'El tiempo te hizo veterano de esto.' },
  { number: 33, name: 'Monumental', category: 'legado', requiredDays: 3000, quote: 'Lo que construiste ya no se mueve fácil.' },
  { number: 34, name: 'Histórico', category: 'legado', requiredDays: 3500, quote: 'Esto va a quedar en tu historia personal para siempre.' },
  { number: 35, name: 'Extraordinario', category: 'legado', requiredDays: 4000, quote: 'Lo ordinario quedó muy atrás.' },
  { number: 36, name: 'Excepcional', category: 'legado', requiredDays: 4500, quote: 'Muy pocos sostienen algo así de parejo tanto tiempo.' },
  { number: 37, name: 'Admirable', category: 'legado', requiredDays: 5000, quote: 'Cinco mil días. Un número que impone respeto.' },
  { number: 38, name: 'Legendario', category: 'legado', requiredDays: 6000, quote: 'Tu constancia ya pasó a ser leyenda.' },
  { number: 39, name: 'Inmortal', category: 'legado', requiredDays: 7500, quote: 'Esto no se olvida. Esto queda.' },
  { number: 40, name: 'Eterno', category: 'legado', requiredDays: 10000, quote: 'Diez mil días. Una vida entera de disciplina.' },

  // V — MÍTICAS
  { number: 41, name: 'Leyenda', category: 'miticas', requiredDays: 12000, quote: 'Ya no se cuenta en días. Se cuenta en leyenda.' },
  { number: 42, name: 'Ícono', category: 'miticas', requiredDays: 15000, quote: 'Te convertiste en el símbolo de lo que se puede lograr.' },
  { number: 43, name: 'Pionero', category: 'miticas', requiredDays: 18000, quote: 'Abriste un camino que casi nadie se anima a recorrer.' },
  { number: 44, name: 'Maestro del Tiempo', category: 'miticas', requiredDays: 20000, quote: 'El tiempo dejó de ser tu límite y pasó a ser tu aliado.' },
  { number: 45, name: 'Voluntad de Acero', category: 'miticas', requiredDays: 25000, quote: 'Nada en el mundo dobla lo que forjaste acá.' },
  { number: 46, name: 'Espíritu Inquebrantable', category: 'miticas', requiredDays: 30000, quote: 'Ni el tiempo pudo contra esto.' },
  { number: 47, name: 'Campeón de la Constancia', category: 'miticas', requiredDays: 35000, quote: 'No hay título más difícil de sostener que este.' },
  { number: 48, name: 'Dueño de su Disciplina', category: 'miticas', requiredDays: 40000, quote: 'Nadie te la dio. La construiste vos, día a día.' },
  { number: 49, name: 'Más Allá del Límite', category: 'miticas', requiredDays: 45000, quote: 'Donde otros se detienen, vos seguiste.' },
  { number: 50, name: 'Legado', category: 'miticas', requiredDays: 50000, quote: 'Esto ya no es tuyo solamente. Es lo que vas a dejar.' },
]

/** Las 50 Cartas de Racha, en orden. Única fuente de verdad: para agregar la
 * carta 51 alcanza con sumar una entrada acá (y, si corresponde, un ícono de
 * categoría nuevo en CATEGORIES) — nada más del sistema necesita tocarse. */
export const STREAK_CARDS: StreakCard[] = RAW_CARDS.map(c => ({ ...c, id: `card_${pad(c.number)}` }))

export function cardDescription(card: StreakCard): string {
  return card.requiredDays === 1 ? 'Primera sesión completada' : `${card.requiredDays} días consecutivos`
}
