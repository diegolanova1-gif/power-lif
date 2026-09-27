@AGENTS.md

# CLAUDE.md — Power Routine

> Plataforma SaaS multi-tenant para coaches de gimnasio: rutinas semanales por alumno, seguimiento, rankings de progreso por team y landing con embudo hacia WhatsApp.
> Nombre real: **Power Routine** (durante el desarrollo se llamó "Powerlifting Coach"; la UI todavía muestra ese nombre — ver Paso 6).
>
> **Proyecto independiente:** no comparte stack, convenciones ni infraestructura con otros proyectos de Diego (Mooven/WOKI).
>
> Actualizado el 2026-09-27 comparando este documento con el código real. **Antes de asumir que algo no existe, confirmarlo en el proyecto.**

---

## 0. Pautas de trabajo (leer primero)

### 0.1 Economía de tokens: modelo y esfuerzo según la tarea

Claude Code no cambia su propio modelo a mitad de sesión. Hay dos palancas:

1. **Diego elige el modelo de la sesión** con `/model` al empezar cada paso (cada paso de la sección 8 indica el recomendado).
2. **Claude delega en subagentes con un modelo más barato** las partes mecánicas (herramienta Agent con `model`), y se queda con lo que requiere criterio.

| Tipo de tarea | Modelo | Esfuerzo | Ejemplos |
|---|---|---|---|
| Mecánica / búsqueda | **Haiku** (subagente) | bajo | Buscar dónde se usa algo, renombrar textos, listar archivos, cambios de copy |
| Implementación estándar | **Sonnet** | medio | Pantallas CRUD, formularios, componentes, conectar UI con acciones existentes |
| Criterio / riesgo | **Opus** | alto | Diseño de datos, migraciones SQL, RLS y permisos, seguridad, bugs difíciles, fórmulas (ranking) |
| Verificación en navegador | **Sonnet** | medio | Pruebas con clics reales en Chrome |

Reglas:
- **Al empezar un paso:** Claude dice qué modelo conviene (`/model ...`) antes de arrancar.
- **Respuestas cortas:** sin explicaciones largas si no se piden; mostrar solo lo que cambió.
- **No releer lo que ya está en contexto;** buscar con Grep/Glob antes de abrir archivos enteros.
- **Un paso a la vez:** terminar, verificar (typecheck + build + prueba real si es UI) y cerrar antes del siguiente.
- **No commitear ni pushear sin pedido explícito de Diego.**

### 0.2 SQL / migraciones
- Cada cambio de base va en `supabase/migrations/AAAAMMDD_nombre.sql`, **idempotente**, y se refleja en `supabase/schema.sql`.
- Diego las corre en el SQL Editor: abrirle el archivo en el Bloc de notas (copiar desde la terminal corrompe comillas).
- Políticas RLS que consultan otra tabla con RLS → usar helpers `SECURITY DEFINER` (evita "infinite recursion", ya pasó con `routines` ↔ `athlete_routines`).

### 0.3 Verificación
- `npm run typecheck` y `npm run build` siempre.
- UI: probar con clics reales en Chrome (no llamar funciones desde la consola). En `127.0.0.1` usar build de producción (`npm run build && PORT=3123 npm start`), el modo dev bloquea scripts fuera de `localhost`. La ventana de Chrome tiene que estar visible.
- Contraseñas de prueba solo en entorno local; nunca en el sitio publicado.

---

## 1. Visión general del producto

Coaches de gimnasio gestionan a sus alumnos: rutinas semana a semana, seguimiento del progreso, teams y rankings sobre un ejercicio líder.

**Modelo de alta (no self-service para coaches):**
1. El coach ve la landing y pide info por WhatsApp (botón final del embudo).
2. Diego (admin) lo contacta, negocia el plan y le crea la cuenta.
3. El coach crea las cuentas de sus alumnos desde la plataforma.

⚠️ **Hoy existe registro público** (`/register` y "Crear cuenta" en la portada), lo que contradice este modelo → Paso 1.

---

## 2. Roles

- **Admin (Diego):** crea coaches, define plan y límite de alumnos. ✅
- **Coach:** crea alumnos ✅ (límite de plan ✅), rutinas y clonado ✅, teams ✅, ejercicio líder ✅, aprobación del ranking ✅, estadísticas y comentarios ✅.
- **Alumno:** ve su rutina ✅, marca hecho / no pude ✅, comenta ✅, ve su progreso ✅, ve solo el ranking aprobado por el coach ✅.

---

## 3. Funcionalidades

### 3.1 Rutinas semanales — ✅
- Rutina por alumno, semana a semana; días de la semana elegidos por el coach (iguales en todas las semanas).
- Clonar: "Duplicar semana N → N+1" y "Copiar a todas las siguientes"; la copia se edita sin afectar la original.
- Por ejercicio: nombre (buscador con alta inline), series, reps o rango, peso en kg o % RM, RPE, descanso.
- Modelos listos (PPL, Torso/Pierna, Full Body, 5×5, Powerlifting) y plantillas propias; asignar una plantilla crea una copia personal.
- 🟡 **Notas del coach por ejercicio:** no existen (solo notas de la rutina y "enfoque" por día) → Paso 5.

### 3.2 Seguimiento y estadísticas — ✅ con matices
- Alumno: "Hecho tal cual" / "No pude completarlo" (carga reps y peso por serie), deshacer, editar.
- Avance automático de semana/día por trigger al completar la sesión.
- Coach: página de Seguimiento (calendario por colores, indicado vs. hecho), Analytics, Revisiones.
- 🟡 **Motivo cuando no completó:** no hay campo obligatorio, solo comentario libre → Paso 5.
- 🟡 **Evolución de cargas:** completa solo para sentadilla/banca/peso muerto (1RM). Accesorios: volumen y registro por sesión, sin gráfico de peso por ejercicio → Paso 5.

### 3.3 Comentarios — ✅
- Alumno comenta por ejercicio; coach responde; contador de pendientes en Revisiones y punto azul en Seguimiento.

### 3.4 Teams y ranking — ✅
- Teams con subconjunto de alumnos; aislamiento entre coaches por `coach_id` (RLS).
- Vista en vivo del coach (`team_exercise_bests`, sin aprobar) + ranking oficial del ejercicio líder con criterio combinado (60% actual + 40% progreso), aprobado por el coach (`team_rankings`, snapshot inmutable). El alumno solo ve lo aprobado.

### 3.5 Fotos y videos — ✅ construido, falta retención
- Subida (máx. 50 MB), vista del coach, borrado manual. Bucket privado `exercise-media`.
- **Decisión:** no ocupar espacio permanente. Borrado automático cuando la observación fue revisada o pasados N días → Paso 3.

### 3.6 Planes y capacidad — ⚠️ no existe → Paso 1
- Límite de alumnos por plan; bloquear alta al llegar al límite y ofrecer upgrade por WhatsApp.

---

## 4. Landing — ⚠️ la actual es provisoria → Paso 4

Hoy: portada simple con tarjetas "Soy Coach / Soy Alumno".

Objetivo:
- **Tono:** profesional, minimalista, serio; paleta neutra/oscura, tipografía sobria, mucho aire.
- **Embudo:** hero de una frase → problema (seguimiento manual es un caos) → solución (rutinas + seguimiento + ranking) → prueba/demo → **un único CTA final a WhatsApp** con mensaje prearmado. Sin CTAs compitiendo.
- **Técnico:** JavaScript + Three.js, scroll-driven, **proyecto y deploy separados** de la app. Degradar en mobile/equipos lentos.

---

## 5. Modelo de datos real (fuente de verdad: `supabase/schema.sql` + `supabase/migrations/`)

| Tabla / función | Qué guarda |
|---|---|
| `profiles` | Usuarios (coach y alumno): `id`, `role`, `full_name`, `email`. ⚠️ Faltan `plan`, `student_limit`, `is_admin` (Paso 1) |
| `coach_athletes` | Vínculo `coach_id` ↔ `athlete_id` (sin nombre ni email; esos viven en `profiles`) |
| `routines` | Rutina: `coach_id`, `is_template`, `structure` JSONB (semana 1 en `schedule`, semanas distintas en `week_plans`) |
| `athlete_routines` | Asignación: `athlete_id`, `routine_id`, `status`, `current_week`, `current_day` |
| `exercises` | Catálogo global + ejercicios propios (`created_by`) |
| `sets_log` | Una fila por serie registrada (reps, peso, RPE). "Hecho/Parcial" se **calcula** contra lo indicado |
| `estimated_1rm` | 1RM por serie de levantamientos de competencia (trigger) |
| `exercise_feedback` | Comentario del alumno por ejercicio/sesión, respuesta del coach, `reviewed_at` |
| `exercise_media` | Archivos, vinculados a `exercise_feedback` (`feedback_id`); "revisado" = `exercise_feedback.reviewed_at` |
| `teams`, `team_members` | Teams del coach |
| `team_exercise_bests()` y otras | Ranking calculado al vuelo. ⚠️ No existe tabla de rankings ni aprobación (Paso 2) |

---

## 6. Stack (confirmado)

- **App:** Next.js 16 (App Router) sobre Node.js, desplegada en **Vercel** (`power-lif.vercel.app`, auto-deploy desde `main` en GitHub).
- **Base / Auth / Storage:** Supabase, RLS por `coach_id`.
- **Landing:** JavaScript + Three.js, proyecto separado.
- **Pagos:** a definir (no asumir Mercado Pago).
- Reglas de Next.js 16: ver `@AGENTS.md` (ej. `proxy.ts` en vez de `middleware.ts`).

---

## 7. Convenciones

- Nombres técnicos en inglés (tablas, columnas, código); textos de UI en español ("alumno", no "atleta").
- Multi-tenancy por RLS con `coach_id`; nunca confiar solo en filtros del frontend.
- Acciones sensibles (aprobar ranking, cambiar plan) auditables: guardar quién y cuándo.

---

## 8. Plan de trabajo por pasos

Cada paso: alcance → criterio de terminado → modelo recomendado. Un paso a la vez.

### Paso 1 — Admin, alta de coaches y planes · ✅ hecho (commit `f47598c`)
- `profiles.is_admin`, `plan`, `student_limit`; panel `/admin`; `/register` eliminado; límite enforced en `POST /api/coach/athletes`.
- **Pendiente de Diego:** números de planes (alumnos por tier) y número de WhatsApp.

### Paso 2 — Ranking con ejercicio líder, criterio combinado y aprobación · ✅ hecho (commit `3f74789`)
- `teams.lead_exercise_id`, tabla `team_rankings` (snapshot inmutable via trigger), 60% actual + 40% progreso normalizados, aprobación del coach.
- El alumno ve solo el último ranking aprobado; nunca en vivo.

### Paso 3 — Retención de fotos/videos · `/model sonnet`
- Job programado (Vercel Cron) que borra del storage los archivos con observación revisada o con más de N días; deja registro sin archivo.
- **Pendiente de Diego:** N días; si "repetir" reemplaza o crea uno nuevo.

### Paso 4 — Landing inmersiva (proyecto aparte) · `/model sonnet` para construir, `opus` para el diseño del embudo
- Nuevo proyecto (Three.js), deploy propio, CTA único a WhatsApp.
- **Pendiente de Diego:** textos, número de WhatsApp, dominio.

### Paso 5 — Detalles de seguimiento · `/model sonnet`
- Nota del coach por ejercicio; motivo al "No pude completarlo" (¿obligatorio?); gráfico de peso por ejercicio para accesorios.

### Paso 6 — Renombrar a Power Routine · Haiku (subagente)
- Textos de UI, título, metadata; revisar portada y emails.

---

## 9. Decisiones

- [x] Stack: Next.js + Vercel + Supabase.
- [x] Nombre: Power Routine.
- [x] Fotos/video se mantienen, con borrado automático (Paso 3).
- [x] Registro público de coaches: se elimina (Paso 1).
- [ ] Planes: cantidad de alumnos por tier y precios.
- [ ] Número de WhatsApp para CTA y upgrades.
- [ ] Días de retención de fotos/video; "repetir" reemplaza o crea nuevo.
- [ ] Fórmula exacta del ranking combinado.
- [ ] ¿Límite de rutinas/semanas históricas por alumno?
- [ ] Pagos y método de upgrade.
