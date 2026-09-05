-- Seed demo completo para VPS com banco VAZIO (após prisma migrate deploy).
-- Senha de todas as contas: senha123
--
-- Alternativa equivalente: no backend, RUN_SEED=true uma vez (npm run db:seed).
--
-- NÃO use migrar-emails-demo-vps.sql em banco vazio — aquele script só renomeia e-mails antigos.

BEGIN;

-- ========== Referências ==========
INSERT INTO sexo (id_sexo, nome_sexo, data_criacao, data_atualizacao) VALUES
  (1, 'Masculino', NOW(), NOW()),
  (2, 'Feminino', NOW(), NOW());

INSERT INTO estado (id_estado, nome_estado, uf_estado, data_criacao, data_atualizacao) VALUES
  (1, 'São Paulo', 'SP', NOW(), NOW());

INSERT INTO cidade (id_cidade, nome_cidade, id_estado, data_criacao, data_atualizacao) VALUES
  (1, 'Santa Fé do Sul', 1, NOW(), NOW());

INSERT INTO bairro (id_bairro, nome_bairro, id_cidade, data_criacao, data_atualizacao) VALUES
  (1, 'Centro', 1, NOW(), NOW());

INSERT INTO rua (id_rua, nome_rua, data_criacao, data_atualizacao) VALUES
  (1, 'Avenida Navarro de Andrade', NOW(), NOW()),
  (2, 'Rua Nove', NOW(), NOW());

-- ========== Usuários (bcrypt senha123) ==========
-- $2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK
INSERT INTO usuario (id_usuario, nome_usuario, email_usuario, senha_usuario, role_usuario, ativo_usuario, data_criacao, data_atualizacao) VALUES
  (1, 'Associação Comercial (Demo)', 'associacao@gmail.com', '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'ASSOCIACAO', true, NOW(), NOW()),
  (2, 'Demo Loja Pendente',          'lojista2@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'LOJISTA',    true, NOW(), NOW()),
  (3, 'Demo Loja Aprovada',          'lojista1@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'LOJISTA',    true, NOW(), NOW()),
  (4, 'Demo Loja Rejeitada',         'lojista3@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'LOJISTA',    true, NOW(), NOW()),
  (5, 'Demo Loja Pendente 2',        'lojista4@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'LOJISTA',    true, NOW(), NOW()),
  (6, 'Ana Souza',                   'usuario1@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'CONSUMIDOR', true, NOW(), NOW()),
  (7, 'Bruno Lima',                  'usuario2@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'CONSUMIDOR', true, NOW(), NOW()),
  (8, 'Carlos Silva',                'usuario3@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'CONSUMIDOR', true, NOW(), NOW()),
  (9, 'Diana Costa',                 'usuario4@gmail.com',   '$2b$10$CSUGgKnp4qITnD4O1RC8euDSXevaQc974JtbKJ79ZgItY5n3XgMdK', 'CONSUMIDOR', true, NOW(), NOW());

-- ========== Associação ==========
INSERT INTO associacao (id_associacao, nome_fantasia_associacao, razao_social_associacao, cnpj_associacao, inscricao_estadual_associacao, id_usuario, data_criacao, data_atualizacao) VALUES
  (1, 'Associação Comercial de Santa Fé do Sul', 'Associacao Comercial de Santa Fe do Sul', '22.222.222/0001-22', NULL, 1, NOW(), NOW());

-- ========== Lojistas ==========
INSERT INTO lojista (id_lojista, nome_fantasia_lojista, razao_social_lojista, cnpj_lojista, inscricao_estadual_lojista, status_lojista, justificativa_rejeicao, id_usuario, id_associacao, id_endereco, data_criacao, data_atualizacao) VALUES
  (1, 'Ótica Visão',    'Otica Visao LTDA',              '11.111.111/0001-11', NULL, 'PENDENTE',  NULL,                              2, 1, NULL, NOW(), NOW()),
  (2, 'Casa do Real',   'Casa do Real Comercio LTDA',    '44.444.444/0001-44', NULL, 'APROVADO',  NULL,                              3, 1, NULL, NOW(), NOW()),
  (3, 'Estilo Kids',    'Estilo Kids LTDA',              '33.333.333/0001-33', NULL, 'REJEITADO', 'CNPJ informado esta incorreto.', 4, 1, NULL, NOW(), NOW()),
  (4, 'Sabor & Cia',    'Sabor e Cia LTDA',              '55.555.555/0001-55', NULL, 'PENDENTE',  NULL,                              5, 1, NULL, NOW(), NOW());

-- ========== Endereços (lojista2 e lojista1) ==========
INSERT INTO endereco (id_endereco, cep_endereco, numero_endereco, id_usuario, id_rua, id_bairro, id_cidade, id_estado, data_criacao, data_atualizacao) VALUES
  (1, '15775-000', '1250', 2, 1, 1, 1, 1, NOW(), NOW()),
  (2, '15775-000', '480',  3, 2, 1, 1, 1, NOW(), NOW());

UPDATE lojista SET id_endereco = 1 WHERE id_lojista = 1;
UPDATE lojista SET id_endereco = 2 WHERE id_lojista = 2;

-- ========== Consumidores (lojistaId = legado E4) ==========
INSERT INTO consumidor (id_consumidor, cpf_consumidor, pontos_consumidor, nivel_consumidor, id_sexo, id_lojista, id_usuario, data_criacao, data_atualizacao) VALUES
  (1, '111.222.333-44', 320, 4, 1, 1, 6, NOW(), NOW()),
  (2, '222.333.444-55', 200, 3, 1, 2, 7, NOW(), NOW()),
  (3, '333.444.555-66', 100, 2, 1, 2, 8, NOW(), NOW()),
  (4, '444.555.666-77',   0, 1, 1, 1, 9, NOW(), NOW());

-- ========== Categorias ==========
INSERT INTO categoria (id_categoria, nome_categoria, id_lojista, data_criacao, data_atualizacao) VALUES
  (1, 'Alimentos',  2, NOW(), NOW()),
  (2, 'Bebidas',    2, NOW(), NOW()),
  (3, 'Vestuário',  2, NOW(), NOW()),
  (4, 'Vestuário',  1, NOW(), NOW());

-- ========== Produtos ==========
INSERT INTO produto (id_produto, nome_produto, valor_produto, categoria_fk, id_lojista, url_imagem, data_criacao, data_atualizacao) VALUES
  (1, 'Cesta de café da manhã',     89.90,  1, 2, NULL, NOW(), NOW()),
  (2, 'Vinho tinto seco 750ml',     54.50,  2, 2, NULL, NOW(), NOW()),
  (3, 'Camiseta algodão premium',   79.90,  3, 2, NULL, NOW(), NOW()),
  (4, 'Óculos de sol polarizado',  249.90,  4, 1, NULL, NOW(), NOW()),
  (5, 'Armação infantil flexível', 189.00,  4, 1, NULL, NOW(), NOW());

-- ========== Missões ==========
INSERT INTO missao (id_missao, nome_missao, descricao_missao, ponto_recompensa_missao, frequencia_missao, data_fim, sistema_missao, id_lojista, token_qr, data_criacao, data_atualizacao) VALUES
  (1, 'Visitar loja', 'Escaneie o QR no balcão uma vez por dia e ganhe pontos.', 5,  'DIARIA', NULL,                    true,  1, 'demo_sistema_visitar_loja_00000000000000000000000000000001', NOW(), NOW()),
  (2, 'Visitar loja', 'Escaneie o QR no balcão uma vez por dia e ganhe pontos.', 5,  'DIARIA', NULL,                    true,  2, 'demo_sistema_visitar_loja_00000000000000000000000000000002', NOW(), NOW()),
  (3, 'Visitar loja', 'Escaneie o QR no balcão uma vez por dia e ganhe pontos.', 5,  'DIARIA', NULL,                    true,  3, 'demo_sistema_visitar_loja_00000000000000000000000000000003', NOW(), NOW()),
  (4, 'Visitar loja', 'Escaneie o QR no balcão uma vez por dia e ganhe pontos.', 5,  'DIARIA', NULL,                    true,  4, 'demo_sistema_visitar_loja_00000000000000000000000000000004', NOW(), NOW()),
  (5, 'Conheça a vitrine da loja', 'Missão demo comum (não é a missão permanente Visitar loja da E3b). Escaneie o QR no lab.', 50, 'DIARIA', '2026-12-31 23:59:59', false, 2, 'demo_missao_vitrine_casa_do_real_00000000000000000000000001', NOW(), NOW());

-- ========== Recompensas (Casa do Real) ==========
INSERT INTO recompensa (id_recompensa, nome_recompensa, descricao_recompensa, custo_pontos_recompensa, ativa_recompensa, estoque_recompensa, data_fim_recompensa, id_lojista, data_criacao, data_atualizacao) VALUES
  (1, 'Chaveiro da loja',       'Brinde da Casa do Real.',              50,  true, 10,   NULL,                    2, NOW(), NOW()),
  (2, 'Cupom 10% de desconto',  'Válido na loja física (demonstração).', 100, true, NULL, '2026-12-31 23:59:59', 2, NOW(), NOW());

-- ========== Campanhas + sorteios ==========
INSERT INTO campanha (id_campanha, nome_campanha, descricao_campanha, qrcode_campanha, data_inicio_campanha, data_fim_campanha, valor_por_ticket_campanha, id_associacao, data_criacao, data_atualizacao) VALUES
  (1, 'Natal Premiado 2026',        'Compre nas lojas participantes e concorra a prêmios.',     NULL, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 10.00, 1, NOW(), NOW()),
  (2, 'Semana do Comércio Local',   'Campanha de valorização dos comércios da cidade.',         NULL, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 10.00, 1, NOW(), NOW());

INSERT INTO sorteio (id_sorteio, qrcode_sorteio, id_campanha, data_criacao, data_atualizacao) VALUES
  (1, NULL, 1, NOW(), NOW()),
  (2, NULL, 2, NOW(), NOW());

-- ========== Sequences ==========
SELECT setval('sexo_id_sexo_seq', (SELECT MAX(id_sexo) FROM sexo));
SELECT setval('estado_id_estado_seq', (SELECT MAX(id_estado) FROM estado));
SELECT setval('cidade_id_cidade_seq', (SELECT MAX(id_cidade) FROM cidade));
SELECT setval('bairro_id_bairro_seq', (SELECT MAX(id_bairro) FROM bairro));
SELECT setval('rua_id_rua_seq', (SELECT MAX(id_rua) FROM rua));
SELECT setval('usuario_id_usuario_seq', (SELECT MAX(id_usuario) FROM usuario));
SELECT setval('associacao_id_associacao_seq', (SELECT MAX(id_associacao) FROM associacao));
SELECT setval('lojista_id_lojista_seq', (SELECT MAX(id_lojista) FROM lojista));
SELECT setval('endereco_id_endereco_seq', (SELECT MAX(id_endereco) FROM endereco));
SELECT setval('consumidor_id_consumidor_seq', (SELECT MAX(id_consumidor) FROM consumidor));
SELECT setval('categoria_id_categoria_seq', (SELECT MAX(id_categoria) FROM categoria));
SELECT setval('produto_id_produto_seq', (SELECT MAX(id_produto) FROM produto));
SELECT setval('missao_id_missao_seq', (SELECT MAX(id_missao) FROM missao));
SELECT setval('recompensa_id_recompensa_seq', (SELECT MAX(id_recompensa) FROM recompensa));
SELECT setval('campanha_id_campanha_seq', (SELECT MAX(id_campanha) FROM campanha));
SELECT setval('sorteio_id_sorteio_seq', (SELECT MAX(id_sorteio) FROM sorteio));

COMMIT;

-- Conferência:
-- SELECT email_usuario, role_usuario FROM usuario ORDER BY id_usuario;
