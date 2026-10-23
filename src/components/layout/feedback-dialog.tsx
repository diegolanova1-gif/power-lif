'use client'

import { useState } from 'react'
import { Lightbulb, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { submitUserFeedback } from '@/actions/feedback'

const TYPES = [
  { value: 'suggestion', label: 'Sugerencia' },
  { value: 'bug', label: 'Error / Falla' },
  { value: 'feature', label: 'Nueva función' },
  { value: 'other', label: 'Otro' },
] as const

export function FeedbackDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setSending(true)
    const res = await submitUserFeedback(type, message)
    setSending(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('¡Gracias por tu feedback!')
    setMessage('')
    setType('suggestion')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-default rounded-sm hover:bg-accent hover:text-accent-foreground" />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envianos tu feedback</DialogTitle>
          <DialogDescription>Sugerencias, errores, ideas para mejorar… todo sirve.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Contanos qué mejorarías, qué falló, o qué te gustaría que tenga la app..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={sending || !message.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
