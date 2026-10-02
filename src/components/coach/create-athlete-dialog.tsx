'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { Loader2, RefreshCw, Copy, Check, Dumbbell, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createAthleteSchema, type CreateAthleteInput } from '@/lib/validations/athlete'
import { generatePassword, credentialsText } from '@/lib/password'
import { whatsappLink, WHATSAPP_MESSAGES } from '@/lib/contact'

interface CreateAthleteDialogProps {
  children: React.ReactNode
  triggerClassName?: string
  onCreated: () => void
}

export function CreateAthleteDialog({ children, triggerClassName, onCreated }: CreateAthleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string; created: boolean; athleteId: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [limitError, setLimitError] = useState<string | null>(null)

  const form = useForm<CreateAthleteInput>({
    resolver: zodResolver(createAthleteSchema),
    defaultValues: { email: '', full_name: '', password: '' },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      form.reset({ email: '', full_name: '', password: generatePassword() })
      setCredentials(null)
      setCopied(false)
      setLimitError(null)
    }
  }

  async function onSubmit(data: CreateAthleteInput) {
    try {
      setLimitError(null)
      const res = await fetch('/api/coach/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.error) {
        if (result.code === 'STUDENT_LIMIT') {
          setLimitError(result.error)
          return
        }
        throw new Error(result.error)
      }

      setCredentials({
        email: data.email.toLowerCase(),
        password: data.password,
        created: result.created,
        athleteId: result.athleteId,
        name: data.full_name,
      })
      onCreated()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function copyCredentials() {
    if (!credentials) return
    await navigator.clipboard.writeText(credentialsText(credentials.email, credentials.password))
    setCopied(true)
    toast.success('Datos copiados')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className={triggerClassName} />}>{children}</DialogTrigger>
      <DialogContent>
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle>{credentials.created ? 'Alumno creado' : 'Alumno vinculado'}</DialogTitle>
              <DialogDescription>
                {credentials.created
                  ? 'Pásale estos datos para que entre a la app.'
                  : 'Ese email ya tenía cuenta: quedó vinculado a tu equipo y entra con su contraseña de siempre.'}
              </DialogDescription>
            </DialogHeader>
            {credentials.created && (
              <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{credentials.email}</span></p>
                <p><span className="text-muted-foreground">Contraseña:</span> <span className="font-mono font-medium">{credentials.password}</span></p>
              </div>
            )}
            <DialogFooter>
              {credentials.created && (
                <Button variant="outline" onClick={copyCredentials}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copiar datos
                </Button>
              )}
              <Button variant={credentials.created ? 'outline' : 'default'} onClick={() => setOpen(false)}>Listo</Button>
            </DialogFooter>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground">Siguiente paso: su rutina</p>
              <p className="mt-1 text-sm text-muted-foreground">Arma un plan personalizado para {credentials.name}: desde cero, con un modelo o una plantilla tuya.</p>
              <Button className="mt-3 w-full" nativeButton={false} render={<Link href={`/coach/routines/new?athlete=${credentials.athleteId}`} />}>
                <Dumbbell className="mr-2 h-4 w-4" />
                Armar su rutina ahora
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nuevo Alumno</DialogTitle>
              <DialogDescription>Creas la cuenta y le pasas el email y la contraseña.</DialogDescription>
            </DialogHeader>
            {limitError ? (
              <div className="rounded-lg border border-warning/30 bg-warning/15 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
                  <div>
                    <p className="font-medium text-warning-foreground">Llegaste al límite de tu plan</p>
                    <p className="mt-1 text-sm text-warning-foreground/90">{limitError}</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  nativeButton={false}
                  render={<a href={whatsappLink(WHATSAPP_MESSAGES.upgrade)} target="_blank" rel="noopener noreferrer" />}
                >
                  Ampliar mi plan por WhatsApp
                </Button>
              </div>
            ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" placeholder="Juan Pérez" {...form.register('full_name')} />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="alumno@email.com" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="flex gap-2">
                  <Input id="password" className="font-mono" autoComplete="off" {...form.register('password')} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => form.setValue('password', generatePassword(), { shouldValidate: true })}
                    aria-label="Generar otra contraseña"
                    title="Generar otra contraseña"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Crear alumno
                </Button>
              </DialogFooter>
            </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
