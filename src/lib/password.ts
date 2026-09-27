// No ambiguous chars (0/O, 1/l/I) so it can be dictated or typed from a screenshot
const PASSWORD_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePassword(length = 10) {
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, v => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join('')
}

// Message the coach pastes into WhatsApp for the athlete
export function credentialsText(email: string, password: string) {
  return `Power Routine\nIngreso: ${window.location.origin}/login?as=alumno\nEmail: ${email}\nContraseña: ${password}`
}
