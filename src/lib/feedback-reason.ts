export type FeedbackReason = 'pain' | 'fatigue' | 'other'

export const FEEDBACK_REASONS: Record<FeedbackReason, string> = {
  pain: 'Dolor/molestia',
  fatigue: 'Cansancio',
  other: 'Otro motivo',
}
