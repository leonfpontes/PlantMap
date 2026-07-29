'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import PrivacyPolicyContent from './PrivacyPolicyContent'
import Button from '@/components/ui/Button'
import { acceptPrivacyPolicy } from '@/lib/actions/privacy'

interface PrivacyConsentModalProps {
  onAccepted: () => void
}

/**
 * Modal de primeiro acesso: mostra a política de privacidade inteira e a
 * escolha inicial de compartilhamento de localização exata. Não tem botão de
 * fechar/X de propósito — só sai daqui confirmando que leu (ver migration 019,
 * accept_privacy_policy). A escolha de localização pode ser trocada depois em
 * Perfil → Privacidade a qualquer momento.
 */
export default function PrivacyConsentModal({ onAccepted }: PrivacyConsentModalProps) {
  const [shareExact, setShareExact] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setSubmitting(true)
    setError(null)
    const result = await acceptPrivacyPolicy(shareExact)
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    onAccepted()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-[430px] flex-col rounded-t-2xl bg-white sm:rounded-2xl dark:bg-gray-900">
        <div className="flex items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
            <ShieldCheck className="h-5 w-5 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Sua privacidade primeiro</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Antes de continuar, leia como cuidamos dos seus dados</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <PrivacyPolicyContent />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
          <label className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
            <input
              type="checkbox"
              checked={shareExact}
              onChange={(e) => setShareExact(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-green-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Quero mostrar a localização exata dos meus registros para outros usuários
              (senão, mostramos só uma área aproximada de ~500m). Você pode mudar isso depois em Perfil → Privacidade.
            </span>
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button variant="primary" size="lg" loading={submitting} onClick={handleAccept} className="w-full">
            Li e concordo, continuar
          </Button>
        </div>
      </div>
    </div>
  )
}
