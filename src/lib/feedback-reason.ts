export type FeedbackReason = 'pain' | 'fatigue' | 'reps_incomplete' | 'other'

export const FEEDBACK_REASONS: Record<FeedbackReason, string> = {
  pain: 'Dolor/molestia',
  fatigue: 'Cansancio',
  reps_incomplete: 'No llegó a las repes pedidas',
  other: 'Otro motivo',
}

/** Motivos que el alumno elige a mano (excluye el que marca el sistema solo). */
export const SELECTABLE_FEEDBACK_REASONS = (Object.keys(FEEDBACK_REASONS) as FeedbackReason[]).filter(
  r => r !== 'reps_incomplete'
)
