@AGENTS.md

# CLAUDE.md — Power Routine

> Plataforma SaaS multi-tenant para coaches de gimnasio: rutinas semanales por alumno, seguimiento, rankings de progreso por team y landing con embudo hacia WhatsApp.
> Nombre real: **Power Routine** (durante el desarrollo se llamó "Powerlifting Coach"; la UI ya usa el nombre nuevo).
>
> **Proyecto independiente:** no comparte stack, convenciones ni infraestructura con otros proyectos de Diego (Mooven/WOKI).
>
> Actualizado el 2026-10-17 comparando este documento con el código real. **Antes de asumir que algo no existe, confirmarlo en el proyecto.**

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
- Nota del coach por ejercicio (además de las notas de la rutina y "enfoque" por día) ✅.

### 3.2 Seguimiento y estadísticas — ✅ con matices
- Alumno: "Hecho tal cual" / "No pude completarlo" (carga reps y peso por serie), deshacer, editar.
- Avance automático de semana/día por trigger al completar la sesión.
- Coach: página de Seguimiento (calendario por colores, indicado vs. hecho), Analytics, Revisiones.
- Motivo rápido opcional (chips) además del comentario libre ✅.
- Evolución de cargas: 1RM para sentadilla/banca/peso muerto; accesorios muestran "Mejor peso por sesión" ✅.
- Orden de sesiones: los días deben completarse en orden dentro de la semana (trigger `enforce_session_order`); días extra y freeform quedan exentos ✅.
- Motivo `reps_incomplete`: series completas pero sin llegar al peso/reps pedidos → se marca "Hecho" y el motivo se registra automáticamente ✅.

### 3.3 Comentarios — ✅
- Alumno comenta por ejercicio; coach responde; contador de pendientes en Revisiones y punto azul en Seguimiento.

### 3.4 Teams y ranking — ✅
- Teams con subconjunto de alumnos; aislamiento entre coaches por `coach_id` (RLS).
- Vista en vivo del coach (`team_exercise_bests`, sin aprobar) + ranking oficial del ejercicio líder con criterio combinado (60% actual + 40% progreso), aprobado por el coach (`team_rankings`, snapshot inmutable). El alumno solo ve lo aprobado.

### 3.5 Fotos y videos — ✅
- Subida (máx. 50 MB), vista del coach, borrado manual. Bucket privado `exercise-media`.
- Retención automática: se borra el archivo al revisar o a los 14 días (Paso 3); repetir reemplaza el archivo anterior.
- Video de referencia por ejercicio: URL en `exercises.video_url`; se carga una vez, visible en todas las rutinas; el coach puede editar ✅.

### 3.6 Planes y capacidad — ✅
- Límite de alumnos por plan en `profiles.student_limit`; alta bloqueada al llegar al límite con mensaje de upgrade por WhatsApp.

### 3.7 Día extra — ✅
- El alumno puede agregar sesiones fuera de la rutina: `advance_credit` (avanza semana/día), `advance_no_credit` (entrena sin avanzar), `freeform` (ejercicios libres sin rutina).
- Soporta ejercicios de tiempo: columna `duration_seconds` en `sets_log` (reps opcionales).
- El alumno puede crear sus propios ejercicios (visibles para él y su coach).

### 3.8 Logros de racha — ✅
- Hitos: 10 / 30 / 60 / 100 días + "primera semana completa" / "primer mes de constancia".
- Se desbloquean server-side; el alumno los ve y puede descargar un sticker.

### 3.9 Sustitución de ejercicio — ✅
- El alumno reemplaza un ejercicio pautado por otro en el momento (ej. sentadilla → prensa por molestia).
- Cuenta igual para orden de sesiones, racha y estado "Hecho". Columna `substituted_exercise_id` en `sets_log`.

### 3.10 Perfil del alumno — ✅
- Datos físicos: fecha nacimiento, sexo, altura, peso corporal, objetivo, experiencia, días disponibles.
- Datos médicos: lesiones, notas médicas, contacto de emergencia.
- El alumno edita solo el suyo; el coach lee los de sus alumnos.

### 3.11 Avisos únicos — ✅
- Mensajes que se muestran al alumno una sola vez al ingresar; quedan guardados como vistos para siempre (`athlete_notices`).

---

## 4. Landing — ⚠️ la actual es provisoria → Paso 4

Hoy: portada simple con tarjetas "Soy Coach / Soy Alumno".

Objetivo:
- **Tono:** profesional, minimalista, serio; paleta neutra/oscura, tipografía sobria, mucho aire.
- **Embudo:** hero de una frase → problema (seguimiento manual es un caos) → solución (rutinas + seguimiento + ranking) → prueba/demo → **un único CTA final a WhatsApp** con mensaje prearmado. Sin CTAs compitiendo.
- **Técnico:** Vite + GSAP en `landing/`, sin WebGL. Se sirve **dentro de la app** (mismo proyecto Vercel): el build va a `public/home/` y `src/proxy.ts` reescribe `/` → `/home/index.html` si no hay sesión. Ver `landing/README.md`.

---

## 5. Modelo de datos real (fuente de verdad: `supabase/schema.sql` + `supabase/migrations/`)

| Tabla / función | Qué guarda |
|---|---|
| `profiles` | Usuarios (coach y alumno): `id`, `role`, `full_name`, `email`. ⚠️ Faltan `plan`, `student_limit`, `is_admin` (Paso 1) |
| `coach_athletes` | Vínculo `coach_id` ↔ `athlete_id` (sin nombre ni email; esos viven en `profiles`) |
| `routines` | Rutina: `coach_id`, `is_template`, `structure` JSONB (semana 1 en `schedule`, semanas distintas en `week_plans`) |
| `athlete_routines` | Asignación: `athlete_id`, `routine_id`, `status`, `current_week`, `current_day` |
| `exercises` | Catálogo global + ejercicios propios (`created_by`). Col extra: `video_url` (link de referencia) |
| `sets_log` | Una fila por serie registrada (reps, peso, RPE). "Hecho/Parcial" se **calcula** contra lo indicado. Cols extra: `extra_type`, `duration_seconds`, `substituted_exercise_id` |
| `estimated_1rm` | 1RM por serie de levantamientos de competencia (trigger) |
| `exercise_feedback` | Comentario del alumno por ejercicio/sesión, respuesta del coach, `reviewed_at` |
| `exercise_media` | Archivos, vinculados a `exercise_feedback` (`feedback_id`); "revisado" = `exercise_feedback.reviewed_at` |
| `teams`, `team_members` | Teams del coach |
| `team_exercise_bests()` y otras | Ranking en vivo para el coach. `team_rankings`: snapshot aprobado, inmutable, visible al alumno |
| `streak_achievements` | Logros de racha: `milestone` TEXT ("10", "30", "primera_semana", etc.) + `unlocked_at` |
| `athlete_profile` | Perfil físico: nacimiento, sexo, altura, peso, objetivo, experiencia, lesiones, notas médicas, contacto de emergencia |
| `athlete_notices` | Avisos únicos al alumno: `(athlete_id, notice_key)` + `dismissed_at` |

---

## 6. Stack (confirmado)

- **App:** Next.js 16 (App Router) sobre Node.js, desplegada en **Vercel** (`power-lif.vercel.app`, auto-deploy desde `main` en GitHub).
- **Base / Auth / Storage:** Supabase, RLS por `coach_id`.
- **Landing:** Vite + GSAP en `landing/`, servida por la app en `/` (prebuild en `package.json`).
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

### Paso 3 — Retención de fotos/videos · ✅ hecho
- Vercel Cron diario (`vercel.json` → `/api/cron/media-retention`, 06:00 UTC) borra del storage el archivo de `exercise_media` si la observación fue revisada o pasaron 14 días; el registro queda (`deleted_at`), sin archivo.
- Subir foto/video de nuevo para la misma observación reemplaza lo anterior (no acumula).
- **Pendiente de Diego:** cargar `CRON_SECRET` en las env vars de Vercel (Project Settings → Environment Variables) para que el cron pueda autenticarse.

### Paso 4 — Landing · ✅ hecho
- El botón de la app (FAB) como protagonista: las secciones se meten en él al scrollear y al final abre el abanico. CTA único a WhatsApp (5491138753141).
- Capturas con datos demo (`scripts/demo/seed.mjs`, cuentas `pr-demo-*@example.com`; `--cleanup` las borra).
- **Pendiente de Diego:** dominio propio (si se quiere).

### Paso 5 — Detalles de seguimiento · ✅ hecho
- Nota del coach por ejercicio (`structure.schedule[].exercises[].note`, editable en el builder, visible para el alumno y en la vista del coach).
- Motivo rápido y opcional (Dolor/molestia, Cansancio, Otro) cuando guarda menos de lo indicado — no reemplaza el comentario libre, no bloquea el guardado. Columna `exercise_feedback.reason`.
- Gráfico de progreso (`/athlete/progress`) ahora incluye accesorios: si el ejercicio no tiene 1RM (no es sentadilla/banca/peso muerto), muestra "Mejor peso por sesión" calculado directo de `sets_log`.

### Post-lanzamiento — implementado sin paso formal

| Fecha | Feature | Detalle |
|-------|---------|---------|
| 2026-10-03 | Orden de sesiones | Trigger `enforce_session_order`: completar días en orden dentro de la semana |
| 2026-10-04 | Día extra | `advance_credit/advance_no_credit/freeform`; ejercicios de tiempo; alumno crea propios |
| 2026-10-05–06 | Logros de racha | Hitos numéricos y textuales; sticker descargable |
| 2026-10-07 | Motivo `reps_incomplete` | Series completas sin llegar al objetivo → "Hecho" + motivo automático |
| 2026-10-08 | Sustitución de ejercicio | Reemplazar ejercicio pautado; cuenta igual para orden y racha |
| 2026-10-09 | Avisos únicos | Mensaje al alumno una sola vez al ingresar |
| 2026-10-10 | Video en ejercicio | `exercises.video_url`; cargado una vez, visible en todas las rutinas |
| 2026-10-11 | Perfil del alumno | `athlete_profile`: datos físicos, objetivo, lesiones, notas médicas, emergencia |

---

### Paso 6 — Renombrar a Power Routine · ✅ hecho
- Textos de UI (portada, login, headers de dashboard), `<title>`/metadata, copiado de contraseña al portapapeles, comentario de `schema.sql`. `README.md` sin tocar (doc interno, no visible a usuarios).

---

## 9. Decisiones

- [x] Stack: Next.js + Vercel + Supabase.
- [x] Nombre: Power Routine.
- [x] Fotos/video se mantienen, con borrado automático (Paso 3).
- [x] Registro público de coaches: se elimina (Paso 1).
- [ ] Planes: cantidad de alumnos por tier y precios.
- [ ] Número de WhatsApp para CTA y upgrades.
- [x] Retención: 14 días o al revisar; repetir reemplaza.
- [ ] Fórmula exacta del ranking combinado.
- [x] Motivo al no completar: opcional, chips (Dolor/molestia, Cansancio, Otro), no bloquea.
- [ ] ¿Límite de rutinas/semanas históricas por alumno?
- [ ] Pagos y método de upgrade.
