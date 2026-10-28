-- Limpa o banco para testar o sistema do zero.
-- DESTRUTIVO: faça backup antes (pg_dump).
--
-- Mantém:  usuário(s) ASSOCIACAO + perfil associação + endereço deles;
--          catálogos sexo, estado, cidade; histórico de migrations (_prisma_migrations).
-- Apaga:   lojistas, consumidores, produtos, categorias, promoções, eventos, missões,
--          recompensas, resgates, campanhas, NFC-e, tickets, sorteios e resultados.
--
-- Arquivos em uploads/ (logos e imagens) não são apagados por este SQL.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM associacao a
        JOIN usuario u ON u.id_usuario = a.id_usuario
        WHERE u.role_usuario = 'ASSOCIACAO'
    ) THEN
        RAISE EXCEPTION 'Nenhuma associação encontrada; limpeza abortada para não perder o acesso ao painel.';
    END IF;
END $$;

-- Sorteio / campanha / NFC-e
DELETE FROM aviso_sorteio_oculto;
DELETE FROM resultado_sorteio;
DELETE FROM sorteio;
DELETE FROM ticket;
DELETE FROM processamento_nfce;
DELETE FROM residual_ticket_campanha;
DELETE FROM campanha;

-- Recompensas e missões
DELETE FROM resgate_recompensa;
DELETE FROM recompensa;
DELETE FROM missao_consumidor;
DELETE FROM missao;

-- Catálogo das lojas
DELETE FROM promocao;
DELETE FROM produto;
DELETE FROM categoria;
DELETE FROM evento;

-- Perfis
DELETE FROM consumidor;
DELETE FROM lojista;

-- Endereços e usuários (exceto associação)
DELETE FROM endereco
WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE role_usuario <> 'ASSOCIACAO');

DELETE FROM usuario
WHERE role_usuario <> 'ASSOCIACAO';

-- Ruas e bairros que ficaram sem endereço
DELETE FROM rua r
WHERE NOT EXISTS (SELECT 1 FROM endereco e WHERE e.id_rua = r.id_rua);

DELETE FROM bairro b
WHERE NOT EXISTS (SELECT 1 FROM endereco e WHERE e.id_bairro = b.id_bairro);

-- Conferência: só associação deve sobrar
SELECT 'usuario' AS tabela, count(*) AS total FROM usuario
UNION ALL SELECT 'associacao', count(*) FROM associacao
UNION ALL SELECT 'lojista', count(*) FROM lojista
UNION ALL SELECT 'consumidor', count(*) FROM consumidor
UNION ALL SELECT 'campanha', count(*) FROM campanha
UNION ALL SELECT 'ticket', count(*) FROM ticket
UNION ALL SELECT 'sorteio', count(*) FROM sorteio;

COMMIT;
