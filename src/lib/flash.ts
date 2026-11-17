/**
 * Mensagem de confirmação que sobrevive a uma navegação ("Planta salva!").
 *
 * Depois de salvar, editar ou excluir, o app troca de tela — e antes a
 * pessoa chegava no mapa sem nenhum sinal de que deu certo. A mensagem fica
 * guardada na sessão até a próxima tela mostrá-la (ver FlashToast), o que
 * funciona tanto na navegação do Next quanto num recarregamento completo.
 */

const KEY = 'plantmap:flash'

export function setFlash(message: string): void {
  try {
    sessionStorage.setItem(KEY, message)
  } catch {
    // Navegação privada ou armazenamento bloqueado: a confirmação é só um
    // agrado, a ação já deu certo.
  }
}

/** Lê e apaga a mensagem pendente, para ela aparecer uma vez só. */
export function takeFlash(): string | null {
  try {
    const msg = sessionStorage.getItem(KEY)
    if (msg) sessionStorage.removeItem(KEY)
    return msg
  } catch {
    return null
  }
}
