import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DirectionsButton from '@/components/plant/DirectionsButton'

describe('DirectionsButton', () => {
  beforeEach(() => localStorage.clear())

  it('sem preferência, pergunta o app e lembra a escolha', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<DirectionsButton latitude={-21.17} longitude={-47.82} />)

    await user.click(screen.getByRole('button', { name: /Como chegar/ }))
    const waze = screen.getByRole('link', { name: /Waze/ })
    expect(waze).toHaveAttribute('href', expect.stringContaining('waze.com/ul'))
    expect(screen.getByRole('link', { name: /Google Maps/ })).toBeInTheDocument()

    waze.addEventListener('click', (e) => e.preventDefault())
    await user.click(waze)
    unmount()

    // Na próxima abertura o botão já leva direto ao Waze.
    render(<DirectionsButton latitude={-21.17} longitude={-47.82} />)
    const direto = await screen.findByRole('link', { name: /Como chegar.*Waze/ })
    expect(direto).toHaveAttribute('href', expect.stringContaining('waze.com/ul'))
    expect(screen.getByRole('button', { name: 'Abrir em outro app' })).toBeInTheDocument()
  })

  it('não lembra quando a caixa é desmarcada', async () => {
    const user = userEvent.setup()
    render(<DirectionsButton latitude={-21.17} longitude={-47.82} />)

    await user.click(screen.getByRole('button', { name: /Como chegar/ }))
    await user.click(screen.getByLabelText('Lembrar minha escolha'))
    const google = screen.getByRole('link', { name: /Google Maps/ })
    google.addEventListener('click', (e) => e.preventDefault())
    await user.click(google)

    expect(localStorage.getItem('plantmap:nav-app')).toBeNull()
    expect(screen.getByRole('button', { name: /Como chegar/ })).toBeInTheDocument()
  })
})
