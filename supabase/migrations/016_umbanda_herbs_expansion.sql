-- Segunda leva de ervas de Umbanda pedidas pelo terreiro: árvores sagradas,
-- ervas de banho/proteção, tônicos populares e variantes botânicas distintas
-- de plantas já cadastradas (ex.: Suinã é parente do Mulungu, mas é outra
-- espécie). Deduplicada contra as 210 espécies já existentes por nome comum
-- e científico. Segue o mesmo padrão das migrations 006/015 (nasce 'approved').
--
-- Trombeteira (Brugmansia suaveolens) é extremamente tóxica e alucinógena —
-- a descrição carrega um alerta explícito, no mesmo padrão já usado para
-- Mamona, Comigo-ninguém-pode e Manacá.

insert into public.species (scientific_name, common_name, family, origin, description) values
('Ceiba pentandra', 'Sumaúma', 'Malvaceae', 'native', 'Árvore gigante da mata atlântica e amazônica, uma das maiores do Brasil. Considerada morada de espíritos e associada ao Tempo e à ancestralidade em terreiros de Umbanda e Candomblé.'),
('Ficus gomelleira', 'Gameleira-branca', 'Moraceae', 'native', 'Figueira nativa de grande porte e raízes aéreas imponentes, tradicionalmente respeitada como árvore sagrada associada a Exu e às entidades do Tempo.'),
('Elaeis guineensis', 'Dendezeiro', 'Arecaceae', 'naturalized', 'Palmeira de origem africana cujo óleo (azeite de dendê) é ingrediente ritual essencial em oferendas de Candomblé e Umbanda, associado a Exu, Ogum e aos orixás em geral.'),
('Anadenanthera colubrina', 'Angico', 'Fabaceae', 'native', 'Árvore nativa cuja casca tem forte ação adstringente e cicatrizante na medicina popular. Resina e sementes têm uso ritual documentado em tradições indígenas e afro-brasileiras.'),
('Copaifera langsdorffii', 'Copaíba', 'Fabaceae', 'native', 'Árvore cujo óleo-resina é um dos anti-inflamatórios naturais mais tradicionais do Brasil, usado topicamente para ferimentos e em banhos de cura.'),
('Carapa guianensis', 'Andiroba', 'Meliaceae', 'native', 'Árvore amazônica cujo óleo extraído das sementes é usado como anti-inflamatório, repelente natural de insetos e em rituais de cura na medicina popular.'),
('Amburana cearensis', 'Umburana / Imburana', 'Fabaceae', 'native', 'Árvore do sertão nordestino cuja casca é tradicionalmente usada em xaropes para tosse e bronquite.'),
('Sideroxylon obtusifolium', 'Quixabeira', 'Sapotaceae', 'native', 'Árvore nativa da caatinga com casca usada na medicina popular como anti-inflamatória e cicatrizante.'),
('Alpinia zerumbet', 'Colônia', 'Zingiberaceae', 'exotic', 'Erva aromática também chamada cana-de-macaco, muito usada em banhos de purificação e defumação associados a Oxalá.'),
('Euphorbia tirucalli', 'Aveloz', 'Euphorbiaceae', 'exotic', 'Suculenta de ramos cilíndricos, tradicionalmente cultivada em quintais como proteção espiritual. Seu látex é cáustico e tóxico — exige cuidado no manuseio, evite contato com olhos e pele sensível.'),
('Hyptis pectinata', 'Alfazema-brava', 'Lamiaceae', 'native', 'Erva aromática nativa usada em banhos e chás anti-inflamatórios, distinta da alfazema europeia (Lavandula).'),
('Origanum majorana', 'Manjerona', 'Lamiaceae', 'exotic', 'Erva aromática da família do orégano, usada na culinária e em banhos calmantes associados à harmonia do lar.'),
('Mikania hirsutissima', 'Vence-tudo', 'Asteraceae', 'native', 'Erva usada em banhos e garrafadas associados a abrir caminhos e vencer obstáculos. Identificação popular varia conforme a região.'),
('Boerhavia diffusa', 'Erva-tostão', 'Nyctaginaceae', 'native', 'Erva rasteira usada na medicina popular como diurética e anti-inflamatória.'),
('Vernonanthura phosphorica', 'Assa-peixe', 'Asteraceae', 'native', 'Arbusto nativo usado em xaropes populares para tosse e problemas respiratórios.'),
('Casearia sylvestris', 'Chá-de-bugre', 'Salicaceae', 'native', 'Árvore nativa cujas folhas são usadas em chás digestivos e cicatrizantes.'),
('Eichhornia crassipes', 'Aguapé', 'Pontederiaceae', 'native', 'Planta aquática flutuante associada a Oxum e Nanã em algumas tradições, por seu habitat em águas doces e rios.'),
('Lilium candidum', 'Açucena', 'Liliaceae', 'exotic', 'Flor branca de forte simbolismo de pureza, associada a Oxalá em oferendas e arranjos.'),
('Trifolium repens', 'Trevo', 'Fabaceae', 'exotic', 'Planta rasteira associada popularmente à sorte e prosperidade, usada em simpatias.'),
('Bellis perennis', 'Bem-me-quer', 'Asteraceae', 'exotic', 'Pequena margarida usada tradicionalmente em simpatias de amor.'),
('Pyrostegia venusta', 'Cipó-de-são-joão', 'Bignoniaceae', 'native', 'Trepadeira de flores alaranjadas vistosas, associada a Ogum e São Jorge pela cor vibrante.'),
('Trichilia catigua', 'Catuaba', 'Meliaceae', 'native', 'Árvore cuja casca é tradicionalmente usada como tônico estimulante e afrodisíaco na medicina popular brasileira.'),
('Ptychopetalum olacoides', 'Muirapuama', 'Olacaceae', 'native', 'Conhecida como pau-para-tudo, árvore amazônica usada como tônico geral e estimulante na medicina popular.'),
('Symphytum officinale', 'Confrei', 'Boraginaceae', 'exotic', 'Erva cicatrizante muito cultivada em quintais brasileiros. Uso interno é desaconselhado pela toxicidade hepática, mas o uso tópico é tradicional.'),
('Coriandrum sativum', 'Coentro', 'Apiaceae', 'exotic', 'Erva aromática culinária também usada em simpatias de proteção e harmonia em algumas tradições populares.'),
('Acmella oleracea', 'Jambu', 'Asteraceae', 'native', 'Erva amazônica cujas flores provocam sensação de dormência na boca. Usada na culinária regional e em rituais de purificação no Norte do Brasil.'),
('Piper nigrum', 'Pimenta-do-reino', 'Piperaceae', 'exotic', 'Especiaria tradicional usada na culinária e, popularmente, em trabalhos de proteção e fechamento de corpo.'),
('Erythrina speciosa', 'Suinã', 'Fabaceae', 'native', 'Árvore nativa de flores vermelhas vistosas, parente do mulungu mas de espécie distinta. Usada ornamentalmente e associada a Iansã pela cor de suas flores.'),
('Jatropha curcas', 'Pinhão-branco / Pinhão-manso', 'Euphorbiaceae', 'native', 'Arbusto cujas sementes têm uso na produção de óleo, distinto do pinhão-roxo já cadastrado. Toda a planta é tóxica se ingerida.'),
('Brugmansia suaveolens', 'Trombeteira / Saia-branca', 'Solanaceae', 'native', 'Arbusto ornamental nativo do Brasil, de flores grandes e pendentes, extremamente tóxico e alucinógeno em todas as partes. Presente em alguns terreiros apenas como planta de jardim — nunca use para chá, defumação ou qualquer via interna sem orientação especializada.');
