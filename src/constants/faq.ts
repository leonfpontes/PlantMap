export interface FaqItem {
  question: string
  answer: string
}

export interface FaqCategory {
  category: string
  items: FaqItem[]
}

/**
 * Perguntas frequentes da tela Ajuda e Suporte — cobre só o que já existe
 * hoje no PlantMap, para reduzir dúvidas reais em vez de texto genérico.
 */
export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    category: 'Registrar plantas no mapa',
    items: [
      {
        question: 'Como registro uma planta no mapa?',
        answer:
          'No mapa, toque no botão de adicionar e marque o ponto onde a planta está. Escolha a espécie (ou sugira uma nova, veja a seção "Espécies e catálogo"), a condição e o estágio da planta, e opcionalmente uma foto e notas.',
      },
      {
        question: 'O que significam os campos "condição" e "estágio"?',
        answer:
          'Condição descreve a saúde da planta no momento do registro: saudável, regular, debilitada ou morta. Estágio descreve o quão desenvolvida ela está: muda, jovem, adulta ou não identificado. Os dois ajudam outros médiuns a saber o que esperar ao visitar o ponto.',
      },
      {
        question: 'Posso editar ou excluir um registro que fiz?',
        answer:
          'Sim. Abra o registro na tela de detalhe e use as opções de editar ou excluir. A exclusão é lógica: o registro some do mapa, mas o histórico fica preservado para auditoria — administradores também podem editar ou remover qualquer registro quando necessário para manter a qualidade do catálogo.',
      },
    ],
  },
  {
    category: 'Localização e privacidade',
    items: [
      {
        question: 'O que significa "área aproximada" e "localização exata"?',
        answer:
          'É a sua escolha, em Perfil → Privacidade, de como outros usuários enxergam seus registros no mapa. "Área aproximada" arredonda a posição para uma região de ~500 metros; "localização exata" mostra o ponto certinho. Você e os administradores sempre veem a posição exata dos seus próprios registros, independentemente dessa escolha.',
      },
      {
        question: 'Como eu baixo meus dados ou excluo minha conta?',
        answer:
          'Em Perfil → Privacidade você encontra "Baixar meus dados" (gera um arquivo com seu perfil, registros, favoritos e sugestões) e, na Zona de risco, "Excluir minha conta" — essa ação é permanente e remove seu nome e foto, some com seus registros no mapa e apaga seus favoritos.',
      },
    ],
  },
  {
    category: 'Espécies e catálogo',
    items: [
      {
        question: 'Como sugiro uma nova erva para o catálogo?',
        answer:
          'Em Perfil → Ervas que sugeri, use a opção de sugerir uma nova espécie: nome popular, nome científico (se souber), família, origem, descrição e uma foto de referência. Sua sugestão fica com status "pendente" até ser revisada.',
      },
      {
        question: 'Por que minha sugestão não aparece na hora para todo mundo?',
        answer:
          'Toda espécie nova passa por uma revisão de um administrador antes de entrar no catálogo geral, para manter a qualidade e a segurança das informações (algumas plantas têm uso ritual ou medicinal delicado). Você recebe uma notificação assim que ela for aprovada ou recusada, com o motivo da recusa quando aplicável.',
      },
      {
        question: 'Quem são os administradores e o que eles podem fazer?',
        answer:
          'São médiuns responsáveis pela curadoria do catálogo, indicados pela administração do terreiro. Eles revisam espécies sugeridas, e podem editar ou remover registros e fotos quando necessário para manter a qualidade e a segurança do conteúdo.',
      },
    ],
  },
  {
    category: 'Favoritos e notificações',
    items: [
      {
        question: 'Como favorito uma planta?',
        answer:
          'Na tela de detalhe de um registro, toque no ícone de coração. Seus favoritos ficam disponíveis em Perfil → Plantas favoritas.',
      },
      {
        question: 'Quando eu recebo uma notificação?',
        answer:
          'Quando uma espécie que você sugeriu é aprovada ou recusada, quando um registro seu é verificado, editado ou removido por um administrador, ou quando há uma nova sugestão pendente de revisão (se você for administrador). Veja todas em Perfil → Notificações.',
      },
    ],
  },
  {
    category: 'Aparência e conta',
    items: [
      {
        question: 'Como mudo o tema (claro/escuro) e o tamanho do texto?',
        answer:
          'Em Perfil → Aparência. As mudanças aplicam na hora e ficam salvas na sua conta, acompanhando você em qualquer aparelho em que fizer login.',
      },
      {
        question: 'Por que o login é só com Google?',
        answer:
          'O PlantMap não guarda nem gerencia senhas — usamos o login do Google para autenticação, o que é mais seguro para você e mais simples de manter. Se não conseguir entrar, confirme que está usando o e-mail Google autorizado pela administração do terreiro.',
      },
    ],
  },
]
