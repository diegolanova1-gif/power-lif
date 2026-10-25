import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Power Routine',
}

export default function TerminosPage() {
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

        <article className="prose prose-sm prose-invert max-w-none [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_p]:text-[#a1a1aa] [&_p]:leading-relaxed [&_li]:text-[#a1a1aa] [&_strong]:text-[#f4f4f5] [&_a]:text-[#a5a3ff] [&_a]:hover:text-[#6360ff]">
          <h1>Términos y Condiciones de Uso</h1>
          <p className="!text-muted-foreground text-sm">Última actualización: 24 de octubre de 2026</p>

          <h2>1. Objeto</h2>
          <p>Power Routine es una plataforma web de gestión de entrenamiento que permite a entrenadores personales (&quot;Coach&quot;) diseñar rutinas, asignar ejercicios y seguir el progreso de sus alumnos (&quot;Atletas&quot;). Estos Términos y Condiciones regulan el acceso y uso del servicio por parte de Coaches y Atletas.</p>

          <h2>2. Aceptación</h2>
          <p>Al acceder o utilizar Power Routine, el usuario acepta estos Términos y Condiciones y la <Link href="/privacidad" className="text-primary hover:underline">Política de Privacidad</Link>. Si no está de acuerdo, no debe utilizar el servicio.</p>

          <h2>3. Usuarios</h2>
          <h3>3.1 Coaches</h3>
          <p>El Coach contrata el servicio de Power Routine. El alta se gestiona a través de contacto directo por WhatsApp. El Coach es responsable de:</p>
          <ul>
            <li>La veracidad de los datos que ingresa.</li>
            <li>La creación y gestión de las cuentas de sus Atletas.</li>
            <li>Obtener el consentimiento de sus Atletas (o de sus representantes legales en caso de menores) para el uso de la plataforma y el tratamiento de sus datos personales.</li>
          </ul>

          <h3>3.2 Atletas</h3>
          <p>Los Atletas acceden al servicio mediante credenciales provistas por su Coach. No existe autoregistro de Atletas.</p>

          <h3>3.3 Menores de edad</h3>
          <p>Power Routine puede ser utilizado por menores de edad. En estos casos:</p>
          <ul>
            <li>El Coach debe contar con el consentimiento expreso del padre, madre o tutor legal del menor antes de crear su cuenta.</li>
            <li>El Coach es responsable de verificar y documentar dicho consentimiento.</li>
            <li>El padre, madre o tutor legal puede solicitar en cualquier momento el acceso, rectificación o eliminación de los datos del menor.</li>
          </ul>

          <h2>4. Servicio</h2>
          <p>Power Routine ofrece:</p>
          <ul>
            <li>Diseño y asignación de rutinas de entrenamiento.</li>
            <li>Registro de series, repeticiones, peso y RPE por parte del Atleta.</li>
            <li>Seguimiento de progreso y analytics.</li>
            <li>Carga de fotos y videos de ejercicios para revisión del Coach.</li>
            <li>Sistema de feedback entre Coach y Atleta.</li>
          </ul>
          <p><strong>Power Routine no brinda asesoramiento médico, nutricional ni diagnósticos de salud.</strong> La plataforma es una herramienta de gestión de entrenamiento. Cualquier decisión relacionada con la salud debe ser consultada con un profesional médico.</p>

          <h2>5. Precio, membresía y forma de pago</h2>
          <p>El servicio es pago. Los precios y formas de pago se comunican al Coach al momento de la contratación. Las modificaciones de precio se notifican con 30 días de anticipación.</p>

          <h3>5.1 Ciclo de membresía</h3>
          <p>La membresía del Coach tiene un ciclo de <strong>30 días corridos</strong> desde la fecha de activación o última renovación. Al vencer el período:</p>
          <ul>
            <li>Se otorga un <strong>período de gracia de 5 días corridos</strong> durante el cual el Coach puede seguir utilizando el servicio con recordatorios diarios de renovación.</li>
            <li>Transcurridos los 5 días de gracia sin renovación, el acceso del Coach queda <strong>bloqueado</strong> hasta que se renueve la membresía.</li>
            <li>Durante el bloqueo, los datos del Coach y sus Atletas se conservan íntegros.</li>
          </ul>

          <h3>5.2 Renovación</h3>
          <p>La renovación se gestiona a través del administrador por WhatsApp. Al renovar, el nuevo período de 30 días <strong>se cuenta desde la fecha de vencimiento del período anterior</strong>, no desde la fecha de pago. Los días de gracia no extienden el siguiente período.</p>

          <h2>6. Derecho de arrepentimiento</h2>
          <p>De acuerdo con el artículo 34 de la Ley 24.240 de Defensa del Consumidor, el Coach tiene derecho a revocar la contratación dentro de los 10 (diez) días corridos desde la aceptación del servicio, sin necesidad de justificación y sin penalidad alguna.</p>
          <p>Para ejercer este derecho, utilizar el <strong>Botón de Arrepentimiento</strong> disponible en la plataforma o contactar por WhatsApp.</p>
          <p>Si ya se efectuó algún pago, el reembolso se realizará dentro de los 10 días hábiles siguientes.</p>

          <h2>7. Baja del servicio</h2>
          <p>El Coach puede dar de baja el servicio en cualquier momento, sin penalidad ni justificación, utilizando el <strong>Botón de Baja</strong> disponible en la plataforma o contactando por WhatsApp.</p>
          <p>Al solicitar la baja:</p>
          <ul>
            <li>Se desactivará el acceso del Coach y sus Atletas.</li>
            <li>Los datos serán tratados conforme a la Política de Privacidad.</li>
            <li>La baja se procesará dentro de las 24 horas hábiles.</li>
            <li>Se notificará al administrador (en caso de baja de Coach) o al Coach (en caso de baja de Atleta) mediante un aviso dentro de la plataforma.</li>
          </ul>

          <h2>8. Obligaciones del usuario</h2>
          <p>El usuario se compromete a:</p>
          <ul>
            <li>Proveer información veraz y actualizada.</li>
            <li>No utilizar el servicio para fines ilícitos.</li>
            <li>No intentar acceder a cuentas de otros usuarios.</li>
            <li>No reproducir, distribuir ni modificar el contenido de la plataforma sin autorización.</li>
          </ul>

          <h2>9. Propiedad intelectual</h2>
          <p>Power Routine, su diseño, código, marca, logo y contenido son propiedad de Diego Macedo. El usuario retiene la propiedad de los datos y contenido que carga en la plataforma (fotos, videos, registros de entrenamiento).</p>

          <h2>10. Limitación de responsabilidad</h2>
          <p>Power Routine no se responsabiliza por:</p>
          <ul>
            <li>Lesiones o daños derivados de la ejecución de ejercicios registrados en la plataforma.</li>
            <li>Interrupciones del servicio por causas de fuerza mayor o mantenimiento programado.</li>
            <li>Pérdida de datos ocasionada por el uso indebido del servicio por parte del usuario.</li>
            <li>Decisiones médicas o de salud tomadas en base a los datos registrados en la plataforma.</li>
          </ul>

          <h2>11. Modificaciones</h2>
          <p>Power Routine se reserva el derecho de modificar estos Términos. Los cambios se notificarán a los usuarios con 15 días de anticipación. El uso continuado del servicio luego de la notificación implica aceptación de los nuevos términos.</p>

          <h2>12. Contacto</h2>
          <p>Para consultas, reclamos o ejercicio de derechos:</p>
          <ul>
            <li><strong>WhatsApp:</strong> +54 9 11 3875-3141</li>
          </ul>

          <h2>13. Legislación aplicable y jurisdicción</h2>
          <p>Estos Términos se rigen por las leyes de la República Argentina. Para cualquier controversia derivada de estos Términos, las partes se someten a la jurisdicción de los tribunales ordinarios competentes de la Ciudad Autónoma de Buenos Aires, sin perjuicio del derecho del consumidor a iniciar acciones ante los tribunales de su domicilio (art. 36, Ley 24.240).</p>

          <h2>14. Normativa aplicable</h2>
          <ul>
            <li>Ley 24.240 de Defensa del Consumidor y sus modificatorias.</li>
            <li>Ley 25.326 de Protección de los Datos Personales.</li>
            <li>Disposición 954/2025 de la Secretaría de Comercio.</li>
            <li>Código Civil y Comercial de la Nación (arts. 1100–1108).</li>
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
