-- Expande o catálogo com ervas de uso comum no terreiro que ainda não estavam
-- cadastradas. Lista de origem: levantamento de ~350 nomes (com muita repetição)
-- fornecido pelos médiuns; deduplicada e cruzada com as 170 espécies já existentes
-- no banco (por nome popular e científico) para não recadastrar o que já existia
-- sob o mesmo nome ou um sinônimo já presente (ex.: "Cravo da Índia" = "Cravo",
-- "Hortelã" já cobre a entrada genérica, "Avenca" = "Samambaia-americana" etc.).
-- Segue o mesmo padrão da migration 006 (nasce com status 'approved', default da coluna).

insert into public.species (scientific_name, common_name, family, origin, description) values
('Gossypium hirsutum', 'Algodão', 'Malvaceae', 'native', 'Planta têxtil cujas fibras são usadas na fabricação de tecidos e fios. Nos terreiros, o algodão cru é associado a Oxalá e usado em vestimentas e rituais de purificação.'),
('Sedum dendroideum', 'Bálsamo', 'Crassulaceae', 'exotic', 'Suculenta popular na medicina caseira brasileira, usada topicamente para cicatrizar feridas e aliviar inflamações. Também cultivada como planta ornamental de fácil manejo.'),
('Zantedeschia aethiopica', 'Copo-de-leite', 'Araceae', 'exotic', 'Planta ornamental de flores brancas em formato de funil, originária da África do Sul. Muito usada em arranjos florais e oferendas por seu simbolismo de pureza.'),
('Helianthus annuus', 'Girassol', 'Asteraceae', 'exotic', 'Planta de grandes flores amarelas que acompanham o movimento do sol, cultivada por suas sementes oleaginosas. Simboliza vitalidade e luz, sendo usada em oferendas solares.'),
('Malva sylvestris', 'Malva', 'Malvaceae', 'exotic', 'Erva de uso tradicional para inflamações da garganta e da pele, geralmente consumida em chá ou aplicada em compressas. Também cultivada como ornamental em jardins e quintais.'),
('Passiflora edulis', 'Maracujá', 'Passifloraceae', 'native', 'Trepadeira nativa do Brasil cujo fruto é amplamente consumido; as folhas são usadas em chás calmantes e ansiolíticos. Muito cultivada em quintais e associada à tranquilidade.'),
('Mentha pulegium', 'Poejo', 'Lamiaceae', 'exotic', 'Erva aromática da família da hortelã, usada popularmente em chás digestivos e para aliviar cólicas. Possui aroma mentolado marcante.'),
('Nicotiana tabacum', 'Tabaco / Fumo', 'Solanaceae', 'native', 'Planta nativa das Américas, tradicionalmente fumada em charutos e cachimbos nos trabalhos de Pretos-velhos, Caboclos e Exus em terreiros de Umbanda — uso ritual distinto do consumo recreativo, ligado à defumação espiritual.'),
('Luffa operculata', 'Buchinha-do-norte', 'Cucurbitaceae', 'native', 'Planta trepadeira cujo fruto seco é usado popularmente em inalações para sinusite, mas exige cautela pela toxicidade em uso incorreto. Nativa do Norte e Nordeste do Brasil.'),
('Tanacetum vulgare', 'Catinga-de-mulata', 'Asteraceae', 'exotic', 'Erva aromática de origem europeia, usada na medicina popular como vermífuga e repelente de insetos. Também empregada em banhos de defumação em algumas tradições.'),
('Valeriana officinalis', 'Valeriana', 'Valerianaceae', 'exotic', 'Erva medicinal conhecida por suas propriedades calmantes e indutoras do sono, usada tradicionalmente em chás e tinturas para ansiedade e insônia.'),
('Calendula officinalis', 'Calêndula', 'Asteraceae', 'exotic', 'Flor de uso medicinal cicatrizante e anti-inflamatório, muito empregada em pomadas, óleos e chás para a pele. Também cultivada como ornamental.'),
('Ayapana triplinervis', 'Erva-capitão / Japana', 'Asteraceae', 'native', 'Erva aromática amazônica usada na medicina popular para problemas digestivos e febres. Também conhecida como japana-branca em algumas regiões do Norte e Nordeste.'),
('Dysphania ambrosioides', 'Erva-de-Santa-Maria / Mastruz', 'Amaranthaceae', 'native', 'Erva de forte aroma usada tradicionalmente como vermífuga e em xaropes para tosse. Amplamente cultivada em quintais brasileiros e presente em banhos de limpeza espiritual.'),
('Achyrocline satureioides', 'Macela', 'Asteraceae', 'native', 'Planta nativa sul-americana usada em chás digestivos e calmantes, considerada uma alternativa popular à camomila. Flores pequenas e amareladas de aroma suave.'),
('Rosa banksiae', 'Rosa-amarela', 'Rosaceae', 'exotic', 'Variedade de roseira de flores amarelas, cultivada ornamentalmente. Usada em oferendas e banhos associados a alegria e prosperidade.'),
('Rosa × damascena', 'Rosa-rosa / cor-de-rosa', 'Rosaceae', 'exotic', 'Roseira de flores rosadas e perfume marcante, muito usada na produção de água de rosas e óleos essenciais. Presente em oferendas ligadas ao amor e à suavidade.'),
('Leonotis nepetifolia', 'Cordão-de-frade', 'Lamiaceae', 'naturalized', 'Erva de flores alaranjadas dispostas em verticilos ao longo do caule, naturalizada no Brasil. Usada na medicina popular para resfriados e, em terreiros, em banhos de descarrego.'),
('Solanum americanum', 'Erva-moura', 'Solanaceae', 'native', 'Planta nativa das Américas usada na medicina popular como anti-inflamatória, embora seus frutos verdes sejam tóxicos. Folhas cozidas são por vezes consumidas como verdura em algumas regiões.'),
('Annona squamosa', 'Fruta-do-conde / Pinha', 'Annonaceae', 'naturalized', 'Árvore frutífera de polpa doce e cremosa, muito apreciada no Brasil. Sementes e folhas têm uso inseticida na medicina popular.'),
('Citrus sinensis', 'Laranjeira', 'Rutaceae', 'exotic', 'Árvore frutífera cujas folhas e flores são amplamente usadas em banhos de limpeza e chás calmantes nos terreiros de Umbanda. Fruto rico em vitamina C.'),
('Citrus limon', 'Limoeiro', 'Rutaceae', 'exotic', 'Árvore cítrica cujo fruto e folhas são usados em banhos de descarrego muito comuns na Umbanda, além de uso culinário e medicinal como fonte de vitamina C.'),
('Myristica fragrans', 'Noz-moscada', 'Myristicaceae', 'exotic', 'Especiaria aromática usada na culinária e, em pequenas quantidades, na medicina popular como digestiva. Em doses elevadas é tóxica.'),
('Capsicum baccatum', 'Pimenta-dedo-de-moça', 'Solanaceae', 'native', 'Pimenta nativa sul-americana de ardência moderada, muito usada na culinária brasileira. Também associada a trabalhos de proteção e fechamento de corpo em algumas tradições.'),
('Equisetum giganteum', 'Cavalinha', 'Equisetaceae', 'native', 'Planta de caule articulado rico em sílica, tradicionalmente usada como diurética e para fortalecer unhas e cabelos.'),
('Mimosa pudica', 'Dormideira', 'Fabaceae', 'native', 'Planta cujas folhas se fecham ao toque, conhecida popularmente como dormideira ou malícia. Usada na medicina popular como calmante e, simbolicamente, associada à proteção e discrição.'),
('Solanum paniculatum', 'Jurubeba', 'Solanaceae', 'native', 'Arbusto nativo do Brasil, tradicionalmente usado em licores e chás amargos como tônico hepático e digestivo.'),
('Alternanthera brasiliana', 'Pára-raio', 'Amaranthaceae', 'native', 'Planta nativa conhecida popularmente como terramicina, usada topicamente para cicatrização de feridas e infecções de pele. Também cultivada como proteção espiritual junto às entradas de casas e terreiros.'),
('Solidago chilensis', 'Arnica', 'Asteraceae', 'native', 'Conhecida como arnica-brasileira, é usada topicamente em óleos e pomadas para contusões, hematomas e dores musculares.'),
('Scoparia dulcis', 'Vassourinha-de-relógio', 'Plantaginaceae', 'native', 'Erva nativa das Américas tropicais, usada na medicina popular como diurética e anti-inflamatória.'),
('Porophyllum ruderale', 'Arnica-do-mato', 'Asteraceae', 'native', 'Erva aromática sul-americana, também chamada arnica-do-campo, usada topicamente para contusões e por vezes na culinária regional.'),
('Davilla rugosa', 'Cipó-caboclo', 'Dilleniaceae', 'native', 'Liana nativa do Brasil usada na medicina popular como anti-inflamatória e diurética, com uso tradicional também em rituais de proteção e força.'),
('Sambucus australis', 'Sabugueiro', 'Adoxaceae', 'native', 'Arbusto cujas flores são tradicionalmente usadas em chás para gripes, resfriados e febres.'),
('Verbena officinalis', 'Verbena', 'Verbenaceae', 'exotic', 'Erva de origem europeia usada na medicina popular como calmante e digestiva, e em alguns rituais de proteção e purificação.'),
('Coix lacryma-jobi', 'Lágrimas-de-Nossa-Senhora', 'Poaceae', 'naturalized', 'Planta cujas sementes duras e brilhantes são tradicionalmente usadas em rosários e colares religiosos. Naturalizada em diversas regiões do Brasil.'),
('Struthanthus vulgaris', 'Erva-de-passarinho', 'Loranthaceae', 'native', 'Planta hemiparasita que cresce sobre outras árvores, disseminada por pássaros. Usada em trabalhos espirituais de amarração e proteção em algumas tradições populares.'),
('Cuphea carthagenensis', 'Sete-sangrias', 'Lythraceae', 'native', 'Erva nativa sul-americana tradicionalmente usada para controle da pressão arterial e como diurética.'),
('Tradescantia pallida', 'Trapoeraba-roxa', 'Commelinaceae', 'exotic', 'Planta ornamental de folhas arroxeadas, de fácil cultivo, também usada popularmente para inflamações leves da pele.'),
('Brunfelsia uniflora', 'Manacá', 'Solanaceae', 'native', 'Arbusto nativo do Brasil cujas flores mudam de cor — de roxo para branco — ao longo de poucos dias. Usado com cautela na medicina popular por sua toxicidade, e presente em jardins de terreiros por seu simbolismo de transformação.'),
('Sansevieria cylindrica', 'Lança-de-Ogum', 'Asparagaceae', 'exotic', 'Planta de folhas cilíndricas e rígidas, associada a Ogum nos terreiros de Umbanda e Candomblé por sua forma de lança. Cultivada em entradas de casas como proteção espiritual.');
