'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { submitSupportMessage } from '@/lib/actions/support'
import { SupportMessage } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

interface SupportMessageFormProps {
  initialMessages: SupportMessage[]
}

/** Formulário "Fale com a administração" + histórico das próprias mensagens enviadas. */
export default function SupportMessageForm({ initialMessages }: SupportMessageFormProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)

    const result = await submitSupportMessage(subject, message)
    setSending(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setMessages((prev) => [
      {
        id: crypto.randomUUID(),
        user_id: '',
        subject,
        message,
        status: 'open',
        admin_reply: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ])
    setSubject('')
    setMessage('')
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          required
          maxLength={120}
          placeholder="Assunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <textarea
          required
          rows={4}
          maxLength={2000}
          placeholder="Descreva sua dúvida ou problema..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        {sent && <p className="text-xs text-green-700 dark:text-green-400">Mensagem enviada! A administração vai te responder por aqui.</p>}
        <Button type="submit" loading={sending} className="w-full">
          <MessageCircle className="h-4 w-4" />
          Enviar para a administração
        </Button>
      </form>

      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Suas mensagens</h2>
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.subject}</span>
                <Badge variant={m.status === 'resolved' ? 'green' : 'yellow'}>
                  {m.status === 'resolved' ? 'Respondida' : 'Aberta'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{m.message}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(m.created_at)}</p>
              {m.admin_reply && (
                <div className="mt-2 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Resposta da administração</p>
                  <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{m.admin_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
