'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { getPrivacyPrefs } from '@/lib/actions/privacy'
import PrivacyConsentModal from './PrivacyConsentModal'

/**
 * Componente invisível montado no layout raiz. Verifica, uma vez por sessão
 * de app aberta, se o usuário logado ainda não aceitou a política de
 * privacidade (profiles.privacy_accepted_at nulo) e, se for o caso, exibe o
 * modal de primeiro acesso por cima de qualquer tela.
 */
export default function PrivacyConsentGate() {
  const { user, loading } = useUser()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (loading || !user) {
      setShow(false)
      return
    }
    getPrivacyPrefs().then((prefs) => {
      if (prefs && !prefs.privacyAcceptedAt) setShow(true)
    })
  }, [user, loading])

  if (!show) return null

  return <PrivacyConsentModal onAccepted={() => setShow(false)} />
}
