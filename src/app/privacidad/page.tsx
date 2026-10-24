import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Power Routine',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen text-[#f4f4f5]" style={{ background: 'radial-gradient(ellipse at 50% 50%, #15142a 0%, #0b0b0f 60%) fixed, #0b0b0f', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-4 sm:px-6" style={{ background: 'rgba(11,11,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" className="text-xl font-extrabold tracking-tight text-[#f4f4f5]">Power Routine</Link>
        <Link href="/login" className="text-sm font-medium text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors">Ingresar</Link>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-[#f4f4f5] mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <article className="prose prose-sm prose-invert max-w-none [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_p]:text-[#a1a1aa] [&_p]:leading-relaxed [&_li]:text-[#a1a1aa] [&_strong]:text-[#f4f4f5] [&_a]:text-[#a5a3ff] [&_a]:hover:text-[#6360ff] [&_table]:w-full [&_th]:text-left [&_th]:text-[#f4f4f5] [&_th]:text-sm [&_th]:font-semibold [&_th]:pb-2 [&_th]:border-b [&_th]:border-[rgba(255,255,255,0.08)] [&_td]:text-[#a1a1aa] [&_td]:text-sm [&_td]:py-2 [&_td]:border-b [&_td]:border-[rgba(255,255,255,0.04)]">
          <h1>Política de Privacidad</h1>
          <p className="!text-muted-foreground text-sm">Última actualización: 24 de octubre de 2026</p>

          <h2>1. Responsable del tratamiento</h2>
          <p><strong>Diego Macedo</strong><br />Contacto: WhatsApp +54 9 11 3875-3141</p>

          <h2>2. Datos personales que recopilamos</h2>

          <h3>2.1 Datos de cuenta (Coach y Atleta)</h3>
          <table>
            <thead>
              <tr><th>Dato</th><th>Obligatorio</th><th>Finalidad</th></tr>
            </thead>
            <tbody>
              <tr><td>Nombre completo</td><td>Sí</td><td>Identificación en la plataforma</td></tr>
              <tr><td>Correo electrónico</td><td>Sí</td><td>Acceso a la cuenta, notificaciones</td></tr>
              <tr><td>Contraseña</td><td>Sí</td><td>Autenticación (almacenada con hash, nunca en texto plano)</td></tr>
              <tr><td>Foto de perfil</td><td>No</td><td>Personalización de la cuenta</td></tr>
            </tbody>
          </table>

          <h3>2.2 Datos de perfil del Atleta</h3>
          <table>
            <thead>
              <tr><th>Dato</th><th>Obligatorio</th><th>Finalidad</th></tr>
            </thead>
            <tbody>
              <tr><td>Fecha de nacimiento</td><td>No</td><td>Cálculos de edad para programación de entrenamiento</td></tr>
              <tr><td>Altura (cm)</td><td>No</td><td>Métricas y proporciones corporales</td></tr>
              <tr><td>Peso corporal (kg)</td><td>No</td><td>Seguimiento de progreso, cálculos de carga relativa</td></tr>
              <tr><td>Teléfono</td><td>No</td><td>Contacto por parte del Coach</td></tr>
              <tr><td>Contacto de emergencia</td><td>No</td><td>Seguridad del Atleta durante el entrenamiento</td></tr>
            </tbody>
          </table>

          <h3>2.3 Datos de entrenamiento</h3>
          <table>
            <thead>
              <tr><th>Dato</th><th>Finalidad</th></tr>
            </thead>
            <tbody>
              <tr><td>Series, repeticiones, peso, RPE</td><td>Registro y seguimiento de progreso</td></tr>
              <tr><td>Fotos y videos de ejercicios</td><td>Revisión técnica por parte del Coach</td></tr>
              <tr><td>Feedback y sugerencias</td><td>Mejora del servicio y comunicación Coach-Atleta</td></tr>
            </tbody>
          </table>

          <h2>3. Finalidad del tratamiento</h2>
          <p>Los datos personales se tratan exclusivamente para:</p>
          <ul>
            <li>Proveer el servicio de gestión de entrenamiento.</li>
            <li>Permitir al Coach diseñar y ajustar rutinas según el progreso del Atleta.</li>
            <li>Generar estadísticas y analytics de entrenamiento.</li>
            <li>Enviar notificaciones relacionadas con el servicio.</li>
            <li>Responder consultas y solicitudes de los usuarios.</li>
            <li>Mejorar la plataforma en base al feedback recibido.</li>
          </ul>
          <p><strong>No utilizamos los datos para:</strong></p>
          <ul>
            <li>Marketing o publicidad de terceros.</li>
            <li>Venta o cesión a terceros con fines comerciales.</li>
            <li>Creación de perfiles con fines publicitarios.</li>
            <li>Entrenamiento de modelos de inteligencia artificial.</li>
          </ul>

          <h2>4. Base legal del tratamiento</h2>
          <ul>
            <li><strong>Consentimiento:</strong> El usuario consiente el tratamiento al aceptar estos términos al registrarse o al utilizar la plataforma.</li>
            <li><strong>Ejecución del contrato:</strong> El tratamiento es necesario para la prestación del servicio contratado.</li>
          </ul>

          <h2>5. Menores de edad</h2>
          <p>Power Routine puede ser utilizado por menores de edad bajo las siguientes condiciones:</p>
          <ul>
            <li>El Coach es responsable de obtener el consentimiento expreso del padre, madre o tutor legal antes de crear la cuenta del menor.</li>
            <li>Los datos de menores reciben el mismo nivel de protección que los de adultos.</li>
            <li>El padre, madre o tutor legal puede ejercer los derechos de acceso, rectificación, supresión y oposición sobre los datos del menor en cualquier momento.</li>
            <li>Para ejercer estos derechos, contactar por WhatsApp.</li>
          </ul>

          <h2>6. Proveedores y transferencia internacional de datos</h2>
          <p>Para la prestación del servicio, los datos son procesados por los siguientes proveedores:</p>
          <table>
            <thead>
              <tr><th>Proveedor</th><th>Función</th><th>Ubicación</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase (AWS)</td><td>Base de datos y autenticación</td><td>Estados Unidos</td></tr>
              <tr><td>Vercel</td><td>Alojamiento de la aplicación web</td><td>Estados Unidos</td></tr>
              <tr><td>Google Fonts</td><td>Tipografías</td><td>Estados Unidos</td></tr>
            </tbody>
          </table>
          <p><strong>Transferencia internacional:</strong> Los datos se almacenan en servidores ubicados en Estados Unidos. Esta transferencia se realiza en el marco de la prestación del servicio y con el consentimiento del usuario.</p>
          <p>No compartimos datos personales con terceros más allá de los proveedores técnicos listados, salvo requerimiento de autoridad competente.</p>

          <h2>7. Seguridad de los datos</h2>
          <p>Implementamos las siguientes medidas de seguridad:</p>
          <ul>
            <li>Contraseñas almacenadas con hash (nunca en texto plano).</li>
            <li>Comunicaciones cifradas mediante HTTPS/TLS.</li>
            <li>Row Level Security (RLS) en la base de datos: cada Coach solo accede a los datos de sus propios Atletas.</li>
            <li>Autenticación basada en tokens con expiración.</li>
          </ul>

          <h2>8. Conservación de los datos</h2>
          <ul>
            <li><strong>Mientras la cuenta esté activa:</strong> Los datos se conservan durante toda la relación contractual.</li>
            <li><strong>Tras la baja del servicio:</strong> Los datos se eliminan dentro de los 30 días corridos posteriores a la solicitud de baja, salvo obligación legal de conservarlos por un plazo mayor.</li>
            <li><strong>Datos de entrenamiento:</strong> El Atleta puede solicitar una copia de sus datos antes de la eliminación.</li>
          </ul>

          <h2>9. Derechos del titular de los datos</h2>
          <p>Conforme a la Ley 25.326, el usuario tiene derecho a:</p>
          <ul>
            <li><strong>Acceso:</strong> Conocer qué datos personales tenemos sobre usted.</li>
            <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos.</li>
            <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos personales.</li>
            <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos en determinadas circunstancias.</li>
            <li><strong>Información:</strong> Conocer la finalidad del tratamiento de sus datos.</li>
          </ul>
          <p>Para ejercer estos derechos, contactar por WhatsApp: +54 9 11 3875-3141. La solicitud será atendida en un plazo máximo de 10 días hábiles.</p>

          <h2>10. Cookies y tecnologías similares</h2>
          <p>Power Routine utiliza únicamente cookies técnicas esenciales para el funcionamiento del servicio (autenticación y sesión). No utilizamos cookies de seguimiento, analytics ni de terceros con fines publicitarios.</p>

          <h2>11. Modificaciones a esta política</h2>
          <p>Power Routine se reserva el derecho de modificar esta Política de Privacidad. Los cambios se notificarán a los usuarios con 15 días de anticipación. El uso continuado del servicio luego de la notificación implica aceptación de la nueva política.</p>

          <h2>12. Autoridad de aplicación</h2>
          <p>La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control en materia de protección de datos personales en Argentina.</p>

          <h2>13. Contacto</h2>
          <p>Para consultas sobre esta política o para ejercer sus derechos:</p>
          <ul>
            <li><strong>WhatsApp:</strong> +54 9 11 3875-3141</li>
          </ul>
        </article>
      </div>
      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }}>
        <div className="mx-auto max-w-3xl px-4 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <span>© {new Date().getFullYear()} Power Routine — Diego Macedo</span>
            <span className="hidden sm:inline opacity-40">·</span>
            <Link href="/terminos" className="text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors no-underline">Términos y Condiciones</Link>
            <span className="hidden sm:inline opacity-40">·</span>
            <Link href="/privacidad" className="text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors no-underline">Política de Privacidad</Link>
          </div>
          <span>Contacto: WhatsApp +54 9 11 3875-3141</span>
        </div>
      </footer>
    </div>
  )
}
