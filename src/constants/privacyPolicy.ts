export const PRIVACY_POLICY_UPDATED_AT = '2026-07-29'

export interface PrivacyPolicySection {
  heading: string
  paragraphs: string[]
}

/**
 * Conteúdo da Política de Privacidade, usado tanto no modal de primeiro
 * acesso quanto na tela /profile/privacy — texto único, uma fonte da verdade.
 *
 * Rascunho sério e orientado à LGPD, mas não é aconselhamento jurídico —
 * vale revisão por um advogado antes de tratar como blindagem legal definitiva.
 */
export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    heading: '1. Quem somos',
    paragraphs: [
      'O PlantMap é um aplicativo colaborativo de mapeamento de plantas medicinais, rituais e alimentícias, mantido pela administração do Terreiro Tia Maria e Cabocla Jupira para uso de seus médiuns e colaboradores.',
      'Esta política explica quais dados coletamos, por que coletamos, com quem são compartilhados e quais direitos você tem sobre eles, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).',
    ],
  },
  {
    heading: '2. Quais dados coletamos',
    paragraphs: [
      'Dados de conta: nome, e-mail e foto de perfil, fornecidos pelo Google no momento em que você faz login (o PlantMap não tem nem armazena sua senha).',
      'Dados de localização: a coordenada geográfica (latitude/longitude) de cada planta que você registra no mapa.',
      'Conteúdo enviado por você: fotos de ocorrências e de espécies, notas, condição e estágio da planta, e sugestões de novas espécies para o catálogo.',
      'Dados de uso e preferências: favoritos, tema e tamanho de texto escolhidos, e a própria escolha de compartilhamento de localização descrita na seção 4.',
    ],
  },
  {
    heading: '3. Por que coletamos e com quem compartilhamos',
    paragraphs: [
      'Usamos esses dados para operar o mapa colaborativo (mostrar as plantas registradas a outros usuários e visitantes), permitir a moderação de novas espécies sugeridas por administradores do terreiro, e manter um histórico de alterações por segurança e prestação de contas (auditoria).',
      'Seu nome e foto não são exibidos publicamente junto aos registros de plantas. Administradores do terreiro (usuários com permissão especial) podem ver seu nome e e-mail ao revisar uma espécie que você sugeriu, e podem editar ou remover registros de qualquer usuário quando necessário para manter a qualidade do catálogo.',
      'Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade. Não há nenhum rastreamento de terceiros (analytics, anúncios) neste aplicativo.',
    ],
  },
  {
    heading: '4. Sua localização exata é opcional',
    paragraphs: [
      'Por padrão, a localização de cada planta que você registra é mostrada de forma aproximada (dentro de uma área de aproximadamente 500 metros) para outros usuários e visitantes — não o ponto exato.',
      'Se você preferir mostrar a localização exata dos seus registros (por exemplo, para facilitar que outros médiuns encontrem a planta fisicamente), pode ativar esse compartilhamento a qualquer momento em Perfil → Privacidade. Você (o dono do registro) e os administradores do terreiro sempre veem a localização exata, independentemente dessa escolha.',
    ],
  },
  {
    heading: '5. Seus direitos',
    paragraphs: [
      'Você pode, a qualquer momento pela tela Perfil → Privacidade: baixar uma cópia de todos os seus dados (perfil, registros, favoritos e sugestões de espécies), corrigir seus dados de perfil, ou excluir sua conta.',
      'Ao excluir sua conta, seu nome e foto são removidos permanentemente do nosso banco de dados, seus registros de ocorrência deixam de ser exibidos no mapa, e seus favoritos são apagados. Como o login é feito pelo Google, não temos acesso à sua conta Google e não podemos (nem precisamos) excluí-la — a exclusão aqui remove o que o PlantMap armazenou e impede um novo acesso ao aplicativo com essa conta.',
      'Dados de auditoria (registro de quem alterou o quê e quando) são mantidos mesmo após a exclusão, sem informação que identifique você diretamente, para fins de segurança e integridade do histórico do catálogo.',
    ],
  },
  {
    heading: '6. Segurança',
    paragraphs: [
      'O acesso aos dados é controlado por regras de permissão no banco de dados (cada pessoa só edita o que é seu, exceto administradores), toda comunicação é criptografada (HTTPS), e alterações sensíveis ficam registradas em log de auditoria.',
    ],
  },
  {
    heading: '7. Alterações nesta política',
    paragraphs: [
      'Podemos atualizar esta política conforme o aplicativo evolui. Mudanças relevantes serão comunicadas dentro do próprio app.',
    ],
  },
  {
    heading: '8. Contato',
    paragraphs: [
      'Dúvidas sobre esta política ou sobre seus dados podem ser encaminhadas à administração do terreiro pelos canais habituais de contato do PlantMap.',
    ],
  },
]
