import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import AuthorshipCard from '@/components/plant/AuthorshipCard'
import type { OccurrenceCredit } from '@/types'

const CREDIT: OccurrenceCredit = {
  id: 'user-1',
  full_name: 'Maria da Mata',
  avatar_url: null,
  points: 120,
  tier: 'raiz',
  deleted: false,
  kind: 'registered',
  at: '2026-08-07T12:00:00Z',
}

describe('AuthorshipCard', () => {
  it('credita quem registrou, com nome, tier e pontos', () => {
    render(<AuthorshipCard credit={CREDIT} />)

    expect(screen.getByText('Registrado por')).toBeInTheDocument()
    expect(screen.getByText('Maria da Mata')).toBeInTheDocument()
    expect(screen.getByText(/Raiz · 120 pontos/)).toBeInTheDocument()
  })

  it('não repete a data do registro, que já aparece na lista de detalhes', () => {
    render(<AuthorshipCard credit={CREDIT} />)

    expect(screen.queryByText(/agosto de 2026/)).not.toBeInTheDocument()
  })

  it('credita quem editou, com a data da edição, quando o registro já foi atualizado', () => {
    render(
      <AuthorshipCard
        credit={{
          ...CREDIT,
          id: 'admin-1',
          full_name: 'João Guardião',
          kind: 'updated',
          at: '2026-08-15T09:30:00Z',
        }}
      />
    )

    expect(screen.getByText(/Atualizado por · 15 de agosto de 2026/)).toBeInTheDocument()
    expect(screen.getByText('João Guardião')).toBeInTheDocument()
    expect(screen.queryByText('Registrado por')).not.toBeInTheDocument()
  })

  it('mostra a moldura do tier no avatar (mesmo sinal visual do perfil e do ranking)', () => {
    render(<AuthorshipCard credit={CREDIT} />)

    expect(screen.getByRole('img', { name: /Maria da Mata — tier Raiz/ })).toBeInTheDocument()
  })

  it('marca quando quem está vendo a tela é a pessoa creditada', () => {
    render(<AuthorshipCard credit={CREDIT} isMe />)

    expect(screen.getByText('(você)')).toBeInTheDocument()
  })

  it('singular de ponto', () => {
    render(<AuthorshipCard credit={{ ...CREDIT, points: 1, tier: 'sementeira' }} />)

    expect(screen.getByText(/Sementeira · 1 ponto$/)).toBeInTheDocument()
  })

  it('cai para "Usuário" quando o perfil não tem nome preenchido', () => {
    render(<AuthorshipCard credit={{ ...CREDIT, full_name: null }} />)

    expect(screen.getByText('Usuário')).toBeInTheDocument()
  })

  it('identifica conta excluída em vez de exibir nome vazio (migration 019)', () => {
    render(<AuthorshipCard credit={{ ...CREDIT, full_name: null, avatar_url: null, deleted: true }} />)

    expect(screen.getByText('Usuário removido')).toBeInTheDocument()
    // Sem tier/pontos: a conta não existe mais, exibir progresso dela não faz sentido.
    expect(screen.queryByText(/ponto/)).not.toBeInTheDocument()
  })
})
