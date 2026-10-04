export type MilestoneType = 'days' | 'first_week' | 'first_month'
export type IconName = 'flame' | 'trophy' | 'medal'

export interface Milestone {
  id: string
  type: MilestoneType
  /** Day threshold, only for type 'days' */
  days?: number
  label: string
  description: string
  icon: IconName
  colors: [string, string]
}

export const MILESTONES: Milestone[] = [
  {
    id: 'first_week',
    type: 'first_week',
    label: 'Primera semana completa',
    description: 'Cumplí tu objetivo semanal por primera vez',
    icon: 'trophy',
    colors: ['#38bdf8', '#0369a1'],
  },
  {
    id: 'days_10',
    type: 'days',
    days: 10,
    label: 'Racha de hierro',
    description: 'Sumá 10 días reales de entrenamiento',
    icon: 'flame',
    colors: ['#f59e0b', '#ea580c'],
  },
  {
    id: 'days_15',
    type: 'days',
    days: 15,
    label: 'Racha de bronce',
    description: 'Sumá 15 días reales de entrenamiento',
    icon: 'flame',
    colors: ['#fb923c', '#c2410c'],
  },
  {
    id: 'days_20',
    type: 'days',
    days: 20,
    label: 'Racha de plata',
    description: 'Sumá 20 días reales de entrenamiento',
    icon: 'flame',
    colors: ['#9ca3af', '#4b5563'],
  },
  {
    id: 'first_month',
    type: 'first_month',
    label: 'Primer mes de constancia',
    description: '4 semanas reales seguidas cumpliendo tu objetivo',
    icon: 'medal',
    colors: ['#34d399', '#047857'],
  },
  {
    id: 'days_30',
    type: 'days',
    days: 30,
    label: 'Racha de oro',
    description: 'Sumá 30 días reales de entrenamiento',
    icon: 'flame',
    colors: ['#fbbf24', '#b45309'],
  },
]
