# Powerlifting Coach Platform

Plataforma para coaches de powerlifting - gestión de atletas, rutinas con periodización flexible, tracking de cargas en tiempo real y estadísticas automáticas (1RM, volumen, IPF Points, adherencia).

## Stack Tecnológico

- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **UI**: shadcn/ui (Radix UI) + Recharts
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Deploy**: Vercel

## Características MVP

### Para Coaches
- ✅ Dashboard con resumen de atletas
- ✅ Gestión de atletas (invitar por email)
- ✅ Constructor de rutinas visual (`/coach/routines/new`, `/coach/routines/[id]/edit`)
- ✅ Biblioteca de rutinas (`/coach/routines`)
- ✅ Asignación de rutinas a atletas (pausa el programa activo anterior)
- ✅ Analytics por atleta: 1RM, volumen, adherencia, racha (`/coach/analytics`)

### Para Atletas
- ✅ Portal con entrenamiento del día
- ✅ Registro de series (peso, reps, RPE, RIR)
- ✅ Progreso: gráficos 1RM, volumen, adherencia
- ✅ Historial de sesiones completo

### Estadísticas Automáticas
- ✅ 1RM estimado (Epley, Brzycki, RPE-based)
- ✅ Volumen semanal y por ejercicio
- ✅ Intensidad media (% 1RM)
- ✅ RPE/RIR promedio
- ✅ Adherencia (% sesiones completadas)
- ✅ IPF Points / DOTS / Wilks
- ✅ Heatmap de adherencia (calendario)

## Instalación

### 1. Clonar y instalar dependencias
```bash
cd powerlifting-coach
npm install
```

### 2. Configurar Supabase
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a SQL Editor y ejecutar `supabase/schema.sql`
   - Después ejecutar, en orden, los archivos de `supabase/migrations/` (son idempotentes):
     `20260925_fix_roles_rls.sql` → `20260926_custom_exercises.sql` → `20260926_feedback_media.sql`
3. Copiar credenciales: Project URL, Anon Key y Service Role Key
4. Auth → URL Configuration: agregar `http://localhost:3000/auth/callback` y `http://localhost:3000/auth/confirm` (y las de prod) a Redirect URLs
5. Las invitaciones usan el template por defecto: el link llega a `/auth/confirm`, que toma la sesión del hash de la URL.
   Con SMTP propio se puede usar en su lugar `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite`
6. Los atletas invitados entran luego con enlace mágico desde `/login`

### 3. Variables de entorno
```bash
cp .env.example .env.local
```

Editar `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Estructura del Proyecto

```
src/
├── app/
│   ├── (auth)/           # Login, Register, Callback
│   ├── (dashboard)/
│   │   ├── coach/        # Coach dashboard, athletes, routines, analytics
│   │   └── athlete/      # Athlete portal (today, log, progress, history)
│   └── api/stats/        # API routes for statistics
├── components/
│   ├── coach/            # Coach-specific components
│   ├── athlete/          # Athlete-specific components
│   ├── ui/               # shadcn/ui components
│   └── charts/           # Recharts wrappers
├── lib/
│   ├── supabase/         # Supabase clients (server/client)
│   ├── calculations/     # 1RM, volume, intensity, adherence, IPF
│   └── validations/      # Zod schemas
├── actions/              # Server Actions (mutations)
└── types/                # TypeScript types
```

## Base de Datos

Ver `supabase/schema.sql` para el esquema completo con:
- Tablas: profiles, coach_athletes, routines, athlete_routines, exercises, sets_log, estimated_1rm, bodyweight_log
- Row Level Security (RLS) para multi-tenancy
- Índices optimizados
- Triggers para auto-crear perfiles
- Datos semilla de ejercicios de powerlifting

## Despliegue

### Vercel (Frontend)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático

### Supabase (Backend)
- Ya configurado en la nube
- Configurar Auth providers (Email, Google, GitHub)
- Habilitar Realtime para tablas necesarias

## Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run start        # Servidor producción
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## Próximas Fases (Post-MVP)

- [ ] Video analysis / technique feedback
- [ ] Meet preparation / attempt selection
- [ ] Nutrition tracking
- [ ] Team management (assistant coaches)
- [ ] PWA + offline support
- [ ] Email notifications
- [ ] Subscription billing (Stripe)
- [ ] Multi-language (i18n)
- [ ] Apple Health / Google Fit sync

## Licencia

MIT