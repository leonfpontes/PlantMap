import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import RegistrantCard from '@/components/plant/RegistrantCard'
import type { OccurrenceRegistrant } from '@/types'

const REGISTRANT: OccurrenceRegistrant = {
  id: 'user-1',
  full_name: 'Maria da Mata',
  avatar_url: null,
  points: 120,
  tier: 'raiz',
  deleted: false,
}

describe('RegistrantCard', () => {
  it('credita o autor com nome, tier e pontos', () => {
    render(<RegistrantCard registrant={REGISTRANT} />)

    expect(screen.getByText('Registrado por')).toBeInTheDocument()
    expect(screen.getByText('Maria da Mata')).toBeInTheDocument()
    expect(screen.getByText(/Raiz · 120 pontos/)).toBeInTheDocument()
  })

  it('mostra a moldura do tier no avatar (mesmo sinal visual do perfil e do ranking)', () => {
    render(<RegistrantCard registrant={REGISTRANT} />)

    expect(screen.getByRole('img', { name: /Maria da Mata — tier Raiz/ })).toBeInTheDocument()
  })

  it('marca quando o registro é de quem está vendo a tela', () => {
    render(<RegistrantCard registrant={REGISTRANT} isMe />)

    expect(screen.getByText('(você)')).toBeInTheDocument()
  })

  it('singular de ponto', () => {
    render(<RegistrantCard registrant={{ ...REGISTRANT, points: 1, tier: 'sementeira' }} />)

    expect(screen.getByText(/Sementeira · 1 ponto$/)).toBeInTheDocument()
  })

  it('cai para "Usuário" quando o perfil não tem nome preenchido', () => {
    render(<RegistrantCard registrant={{ ...REGISTRANT, full_name: null }} />)

    expect(screen.getByText('Usuário')).toBeInTheDocument()
  })

  it('identifica conta excluída em vez de exibir nome vazio (migration 019)', () => {
    render(
      <RegistrantCard
        registrant={{ ...REGISTRANT, full_name: null, avatar_url: null, deleted: true }}
      />
    )

    expect(screen.getByText('Usuário removido')).toBeInTheDocument()
    // Sem tier/pontos: a conta não existe mais, exibir progresso dela não faz sentido.
    expect(screen.queryByText(/ponto/)).not.toBeInTheDocument()
  })
})
