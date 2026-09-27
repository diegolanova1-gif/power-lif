// Exercise photos/videos stored in the private `exercise-media` bucket.
// Path convention (enforced by storage RLS): {athlete_id}/{feedback_id}/{file}
export const MEDIA_BUCKET = 'exercise-media'
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024
export const SIGNED_URL_TTL_SECONDS = 60 * 60

export type MediaType = 'image' | 'video'

export function getMediaType(file: File): MediaType | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

export function buildMediaPath(athleteId: string, feedbackId: string, file: File) {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin'
  return `${athleteId}/${feedbackId}/${crypto.randomUUID()}.${ext}`
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

export function signedUrlMap(signed: { path: string | null; signedUrl: string }[] | null | undefined) {
  return new Map<string, string>((signed ?? []).filter(s => s.path).map(s => [s.path!, s.signedUrl]))
}
