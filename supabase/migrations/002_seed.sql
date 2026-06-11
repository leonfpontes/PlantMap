-- =============================================================
-- SEED DE TESTES — PlantMap
-- Popula: species (20), profiles (3), occurrences (30), favorites
-- Coordenadas centradas em Brasília (DF) e arredores
-- =============================================================

-- ------------------------------------------------------------------
-- 1. ESPÉCIES
-- ------------------------------------------------------------------
insert into public.species (id, scientific_name, common_name, family, origin, description, image_url) values
  ('11111111-0001-0000-0000-000000000001', 'Handroanthus impetiginosus',  'Ipê-roxo',          'Bignoniaceae',    'native',       'Árvore símbolo do Brasil, floresce com flores roxas vistosas antes das folhas. Pode atingir 20 m de altura.',                                    null),
  ('11111111-0001-0000-0000-000000000002', 'Handroanthus albus',          'Ipê-amarelo',        'Bignoniaceae',    'native',       'Uma das árvores mais populares do cerrado, flores amarelas intensas no período seco.',                                                           null),
  ('11111111-0001-0000-0000-000000000003', 'Tabebuia roseoalba',          'Ipê-branco',         'Bignoniaceae',    'native',       'Árvore de médio porte com flores brancas suaves; floresce no inverno sem folhas.',                                                               null),
  ('11111111-0001-0000-0000-000000000004', 'Cecropia pachystachya',       'Embaúba',            'Urticaceae',      'native',       'Pioneira de crescimento rápido, folhas grandes prateadas na face inferior, abrigo de morcegos.',                                                 null),
  ('11111111-0001-0000-0000-000000000005', 'Eugenia uniflora',            'Pitangueira',        'Myrtaceae',       'native',       'Arbusto ou árvore pequena com frutos vermelhos comestíveis de sabor ácido-doce.',                                                                null),
  ('11111111-0001-0000-0000-000000000006', 'Tibouchina granulosa',        'Quaresmeira',        'Melastomataceae', 'native',       'Árvore ornamental com flores roxas intensas; floração abundante entre agosto e novembro.',                                                        null),
  ('11111111-0001-0000-0000-000000000007', 'Paubrasilia echinata',        'Pau-brasil',         'Fabaceae',        'native',       'Árvore que deu nome ao Brasil, hoje ameaçada de extinção. Madeira avermelhada muito valorizada.',                                                null),
  ('11111111-0001-0000-0000-000000000008', 'Mauritia flexuosa',           'Buriti',             'Arecaceae',       'native',       'Palmeira símbolo do cerrado e de Minas Gerais. Frutos alaranjados comestíveis e muito nutritivos.',                                               null),
  ('11111111-0001-0000-0000-000000000009', 'Caryocar brasiliense',        'Pequi',              'Caryocaraceae',   'native',       'Árvore do cerrado com frutos de polpa amarela muito apreciada na culinária do Centro-Oeste.',                                                     null),
  ('11111111-0001-0000-0000-000000000010', 'Qualea grandiflora',          'Pau-terra-grande',   'Vochysiaceae',    'native',       'Árvore de cerrado com flores amarelas; madeira usada em construção rural.',                                                                       null),
  ('11111111-0001-0000-0000-000000000011', 'Bowdichia virgilioides',      'Sucupira-preta',     'Fabaceae',        'native',       'Árvore de madeira extremamente dura, usada em pisos e construção. Vagem muito ornamental.',                                                       null),
  ('11111111-0001-0000-0000-000000000012', 'Hymenaea courbaril',          'Jatobá',             'Fabaceae',        'native',       'Árvore de grande porte com vagem lenhosa comestível; resina usada medicinalmente.',                                                               null),
  ('11111111-0001-0000-0000-000000000013', 'Mangifera indica',            'Mangueira',          'Anacardiaceae',   'exotic',       'Frutífera de grande porte originária da Ásia, amplamente cultivada no Brasil.',                                                                  null),
  ('11111111-0001-0000-0000-000000000014', 'Ficus benjamina',             'Figueira-benjamina', 'Moraceae',        'exotic',       'Ornamental amplamente plantada em praças e calçadas; pode invadir calçamentos com suas raízes.',                                                  null),
  ('11111111-0001-0000-0000-000000000015', 'Delonix regia',               'Flamboyant',         'Fabaceae',        'exotic',       'Árvore ornamental de origem malgaxe com flores vermelho-alaranjadas deslumbrantes.',                                                              null),
  ('11111111-0001-0000-0000-000000000016', 'Syzygium jambos',             'Jambo-amarelo',      'Myrtaceae',       'exotic',       'Frutífera de origem asiática naturalizada no Brasil; frutos aromáticos de cor amarela.',                                                         null),
  ('11111111-0001-0000-0000-000000000017', 'Leucaena leucocephala',       'Leucena',            'Fabaceae',        'exotic',       'Espécie invasora de crescimento muito rápido, usada como forragem mas problemática em ambientes naturais.',                                       null),
  ('11111111-0001-0000-0000-000000000018', 'Psidium guajava',             'Goiabeira',          'Myrtaceae',       'naturalized',  'Frutífera tropical naturalizada em praticamente todo o Brasil; frutos muito apreciados.',                                                        null),
  ('11111111-0001-0000-0000-000000000019', 'Morus nigra',                 'Amoreira-preta',     'Moraceae',        'naturalized',  'Frutífera de origem asiática naturalizada no Brasil, com frutos ácido-doces muito saborosos.',                                                  null),
  ('11111111-0001-0000-0000-000000000020', 'Anacardium occidentale',      'Cajueiro',           'Anacardiaceae',   'native',       'Árvore frutífera típica do Nordeste, pedúnculo (caju) comestível e castanha muito valorizada.',                                                 null)
on conflict (id) do nothing;


-- ------------------------------------------------------------------
-- 2. USUÁRIOS DE TESTE em auth.users
-- O trigger handle_new_user cria os perfis automaticamente.
-- Senha "Plantmap@123" hasheada com bcrypt (cost=10).
-- ------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token,
  reauthentication_token,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user,
  created_at, updated_at
) values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'ana.botanica@plantmap.test',
    crypt('Plantmap@123', gen_salt('bf', 10)),
    now() - interval '90 days',
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name": "Ana Botanica"}'::jsonb,
    false, false,
    now() - interval '90 days', now() - interval '90 days'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'carlos.verde@plantmap.test',
    crypt('Plantmap@123', gen_salt('bf', 10)),
    now() - interval '60 days',
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name": "Carlos Verde"}'::jsonb,
    false, false,
    now() - interval '60 days', now() - interval '60 days'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'julia.flora@plantmap.test',
    crypt('Plantmap@123', gen_salt('bf', 10)),
    now() - interval '30 days',
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name": "Julia Flora"}'::jsonb,
    false, false,
    now() - interval '30 days', now() - interval '30 days'
  )
on conflict (id) do update set
  email_change              = '',
  email_change_token_new    = '',
  email_change_token_current= '',
  phone_change              = '',
  phone_change_token        = '',
  reauthentication_token    = '',
  recovery_token            = '';
-- O trigger on_auth_user_created dispara e insere os perfis em public.profiles


-- ------------------------------------------------------------------
-- 3. OCORRÊNCIAS  (30 registros espalhados em ~15 km ao redor do
--    Parque Nacional de Brasília — lat ~-15.73 / lng ~-48.0)
-- ------------------------------------------------------------------
insert into public.occurrences
  (id, user_id, species_id, location, condition, stage, notes, verified, created_at, updated_at)
values

-- Ipê-roxo (5 ocorrências)
('cccccccc-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000001', st_point(-48.0283,-15.7217)::geography,'healthy','adult',  'Floração intensa em julho. Três exemplares agrupados perto do lago.',          true,  now()-interval '80 days', now()-interval '80 days'),
('cccccccc-0001-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000001', st_point(-47.9654,-15.7891)::geography,'healthy','adult',  'Espécime isolado na margem da mata de galeria.',                               false, now()-interval '55 days', now()-interval '55 days'),
('cccccccc-0001-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000001', st_point(-47.9102,-15.8334)::geography,'fair',   'adult',  'Sinais leves de herbivoria nas folhas, mas floração normal.',                  true,  now()-interval '40 days', now()-interval '40 days'),
('cccccccc-0001-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000001', st_point(-48.0714,-15.7623)::geography,'healthy','juvenile','Muda plantada pelo programa de arborização municipal há ~3 anos.',             false, now()-interval '20 days', now()-interval '20 days'),
('cccccccc-0001-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000001', st_point(-47.8943,-15.6981)::geography,'poor',   'adult',  'Casca danificada, provavelmente por vandalismo. Necessita atenção.',           true,  now()-interval '10 days', now()-interval '10 days'),

-- Ipê-amarelo (4 ocorrências)
('cccccccc-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000002', st_point(-47.9883,-15.8012)::geography,'healthy','adult',  'Enorme exemplar, copa de ~12 m. Ponto turístico informal.',                    true,  now()-interval '75 days', now()-interval '75 days'),
('cccccccc-0002-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000002', st_point(-48.0441,-15.7345)::geography,'healthy','adult',  null,                                                                          false, now()-interval '50 days', now()-interval '50 days'),
('cccccccc-0002-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000002', st_point(-47.9321,-15.7789)::geography,'fair',   'adult',  'Crescendo sob fiação elétrica — risco de poda severa.',                        true,  now()-interval '35 days', now()-interval '35 days'),
('cccccccc-0002-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000002', st_point(-48.0123,-15.8456)::geography,'healthy','seedling','Germinação espontânea próxima à árvore-mãe.',                                  false, now()-interval '5 days',  now()-interval '5 days'),

-- Buriti (3)
('cccccccc-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000008', st_point(-48.1023,-15.7156)::geography,'healthy','adult',  'Veredas com ~20 buritis. Solo encharcado na época das chuvas.',                true,  now()-interval '88 days', now()-interval '88 days'),
('cccccccc-0008-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000008', st_point(-47.8823,-15.8234)::geography,'healthy','adult',  'Palmeira solitária em terreno particular. Proprietário preserva.',              false, now()-interval '45 days', now()-interval '45 days'),
('cccccccc-0008-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000008', st_point(-48.0756,-15.8012)::geography,'poor',   'adult',  'Sinais de ataque de broca. Estipe com orifícios visíveis.',                    true,  now()-interval '15 days', now()-interval '15 days'),

-- Pequi (2)
('cccccccc-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000009', st_point(-48.0567,-15.7534)::geography,'healthy','adult',  'Frutos maduros observados em novembro. Coletados por moradores locais.',       true,  now()-interval '70 days', now()-interval '70 days'),
('cccccccc-0009-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000009', st_point(-47.9234,-15.8678)::geography,'fair',   'adult',  null,                                                                          false, now()-interval '25 days', now()-interval '25 days'),

-- Embaúba (2)
('cccccccc-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000004', st_point(-47.9945,-15.7412)::geography,'healthy','adult',  'Colônia de formigas aztecas observada. Associação mutualista típica.',         true,  now()-interval '60 days', now()-interval '60 days'),
('cccccccc-0004-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000004', st_point(-48.0389,-15.8123)::geography,'healthy','juvenile',null,                                                                          false, now()-interval '18 days', now()-interval '18 days'),

-- Pitangueira (2)
('cccccccc-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000005', st_point(-47.9567,-15.8345)::geography,'healthy','adult',  'Frutos disponíveis em setembro/outubro. Usada como cerca viva.',               true,  now()-interval '65 days', now()-interval '65 days'),
('cccccccc-0005-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000005', st_point(-48.0234,-15.7234)::geography,'fair',   'adult',  'Poda recente deixou copa desbalanceada.',                                      false, now()-interval '22 days', now()-interval '22 days'),

-- Flamboyant (2) — exótica
('cccccccc-0015-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000015', st_point(-47.9123,-15.7567)::geography,'healthy','adult',  'Floração espetacular em novembro/dezembro. Árvore muito fotografada.',         false, now()-interval '55 days', now()-interval '55 days'),
('cccccccc-0015-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000015', st_point(-48.0678,-15.8267)::geography,'poor',   'adult',  'Raízes levantando o calçamento há meses. Prefeitura foi notificada.',          true,  now()-interval '8 days',  now()-interval '8 days'),

-- Mangueira (2) — exótica
('cccccccc-0013-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000013', st_point(-47.9789,-15.8567)::geography,'healthy','adult',  'Exemplar centenário, copa gigantesca servindo de sombra para feira local.',    true,  now()-interval '48 days', now()-interval '48 days'),
('cccccccc-0013-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000013', st_point(-48.0345,-15.7789)::geography,'fair',   'adult',  null,                                                                          false, now()-interval '14 days', now()-interval '14 days'),

-- Leucena invasora (2) — exótica problemática
('cccccccc-0017-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000017', st_point(-47.8934,-15.7923)::geography,'healthy','adult',  'Invasão densa numa área de cerrado degradado. ~50 indivíduos no polígono.',    true,  now()-interval '42 days', now()-interval '42 days'),
('cccccccc-0017-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000017', st_point(-48.0892,-15.7412)::geography,'healthy','juvenile','Plântulas surgindo em área recém-queimada.',                                   false, now()-interval '6 days',  now()-interval '6 days'),

-- Jatobá (2)
('cccccccc-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000012', st_point(-47.9456,-15.7234)::geography,'healthy','adult',  'Vagens encontradas no chão. Polpa farinácea usada por moradores.',             true,  now()-interval '78 days', now()-interval '78 days'),
('cccccccc-0012-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000012', st_point(-48.0123,-15.7934)::geography,'fair',   'adult',  null,                                                                          false, now()-interval '33 days', now()-interval '33 days'),

-- Quaresmeira (1)
('cccccccc-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000006', st_point(-47.9678,-15.8789)::geography,'healthy','adult',  'Floração em setembro foi intensa. Árvore bem estabelecida em calçada.',        true,  now()-interval '52 days', now()-interval '52 days'),

-- Goiabeira naturalizada (1)
('cccccccc-0018-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000018', st_point(-48.0234,-15.8456)::geography,'healthy','adult',  'Subespontânea, cresceu em área abandonada. Frutos abundantes.',                false, now()-interval '28 days', now()-interval '28 days'),

-- Cajueiro (1)
('cccccccc-0020-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000020', st_point(-47.9012,-15.8123)::geography,'healthy','adult',  'Cajueiro de grande porte, muito produtivo. Frutos colhidos em setembro.',      true,  now()-interval '38 days', now()-interval '38 days'),

-- Pau-brasil (1) — ameaçado
('cccccccc-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0001-0000-0000-000000000007', st_point(-47.9345,-15.7678)::geography,'healthy','adult',  'Exemplar em jardim botânico privado. Placa informativa presente no local.',    true,  now()-interval '90 days', now()-interval '90 days'),

-- Sucupira (1)
('cccccccc-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000003','11111111-0001-0000-0000-000000000011', st_point(-48.0567,-15.7123)::geography,'fair',   'adult',  'Alguns galhos secos no dossel superior. Tronco sólido.',                       false, now()-interval '16 days', now()-interval '16 days'),

-- Figueira-benjamina morta (1) — exótica
('cccccccc-0014-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','11111111-0001-0000-0000-000000000014', st_point(-47.9876,-15.7345)::geography,'dead',   'adult',  'Raízes cortadas durante obra de saneamento. Árvore não sobreviveu.',           true,  now()-interval '3 days',  now()-interval '3 days')

on conflict (id) do nothing;


-- ------------------------------------------------------------------
-- 4. FAVORITOS
-- ------------------------------------------------------------------
insert into public.favorites (user_id, occurrence_id, created_at) values
  -- Ana favoritou algumas
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001', now()-interval '79 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000001', now()-interval '74 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0008-0000-0000-000000000001', now()-interval '60 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0007-0000-0000-000000000001', now()-interval '30 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0009-0000-0000-000000000001', now()-interval '10 days'),
  -- Carlos favoritou algumas
  ('aaaaaaaa-0000-0000-0000-000000000002','cccccccc-0001-0000-0000-000000000001', now()-interval '50 days'),
  ('aaaaaaaa-0000-0000-0000-000000000002','cccccccc-0008-0000-0000-000000000001', now()-interval '40 days'),
  ('aaaaaaaa-0000-0000-0000-000000000002','cccccccc-0015-0000-0000-000000000001', now()-interval '20 days'),
  -- Júlia favoritou algumas
  ('aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0002-0000-0000-000000000001', now()-interval '45 days'),
  ('aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0006-0000-0000-000000000001', now()-interval '25 days'),
  ('aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0020-0000-0000-000000000001', now()-interval '5 days')
on conflict do nothing;
