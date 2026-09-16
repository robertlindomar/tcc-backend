/**
 * Prepara o banco para uma simulação limpa do fluxo de produção.
 * DESTRUTIVO — não recria lojistas demo. Não rode seed completo depois.
 *
 * Uso: npm run db:teste-real:reset
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { Role } from "../../src/generated/prisma/enums.js";
import { fimDoDiaCivilNoFuso, instanteCivilNoFuso } from "../../src/shared/tempo/fusoNegocio";

const EMAIL_ASSOCIACAO = "associacao@gmail.com";
const EMAIL_CONSUMIDOR = "usuario1@gmail.com";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
});

async function main() {
    const resultado = await prisma.$transaction(async (tx) => {
        const usuarioAssociacao = await tx.usuario.findUnique({
            where: { email: EMAIL_ASSOCIACAO },
            include: { associacao: true, endereco: true },
        });
        if (!usuarioAssociacao || usuarioAssociacao.role !== Role.ASSOCIACAO) {
            throw new Error(`Conta associação não encontrada: ${EMAIL_ASSOCIACAO}`);
        }
        if (!usuarioAssociacao.associacao) {
            throw new Error(`Perfil associação ausente para ${EMAIL_ASSOCIACAO}`);
        }

        const usuarioConsumidor = await tx.usuario.findUnique({
            where: { email: EMAIL_CONSUMIDOR },
            include: { consumidor: true, endereco: true },
        });
        if (!usuarioConsumidor || usuarioConsumidor.role !== Role.CONSUMIDOR) {
            throw new Error(`Conta consumidor não encontrada: ${EMAIL_CONSUMIDOR}`);
        }
        if (!usuarioConsumidor.consumidor) {
            throw new Error(`Perfil consumidor ausente para ${EMAIL_CONSUMIDOR}`);
        }

        const associacaoId = usuarioAssociacao.associacao.id;
        const consumidorId = usuarioConsumidor.consumidor.id;
        const idsPreservarUsuario = [usuarioAssociacao.id, usuarioConsumidor.id];

        // --- limpar dependências de campanha / NFC-e / tickets ---
        const delNfce = await tx.processamentoNfce.deleteMany({});
        const delResidual = await tx.residualTicketCampanha.deleteMany({});
        const delSorteio = await tx.sorteio.deleteMany({});

        // --- histórico do consumidor (e de todos) ---
        const delResgates = await tx.resgateRecompensa.deleteMany({});
        const delMissoesConc = await tx.missaoConsumidor.deleteMany({});

        // --- domínio dos lojistas ---
        const delPromocoes = await tx.promocao.deleteMany({});
        const delProdutos = await tx.produto.deleteMany({});
        const delEventos = await tx.evento.deleteMany({});
        const delMissoes = await tx.missao.deleteMany({});
        const delRecompensas = await tx.recompensa.deleteMany({});
        const delCategorias = await tx.categoria.deleteMany({});

        await tx.consumidor.updateMany({
            data: { lojistaId: null },
            where: { lojistaId: { not: null } },
        });

        const lojistas = await tx.lojista.findMany({
            select: { id: true, usuarioId: true, enderecoId: true },
        });
        const idsUsuarioLojista = lojistas.map((l) => l.usuarioId);
        const idsEnderecoLojista = lojistas
            .map((l) => l.enderecoId)
            .filter((id): id is number => id != null);

        const delLojistas = await tx.lojista.deleteMany({});

        // campanhas da associação (todas — recriamos uma limpa)
        const delCampanhas = await tx.campanha.deleteMany({});

        // outros consumidores (exceto usuario1)
        const outrosConsumidores = await tx.consumidor.findMany({
            where: { id: { not: consumidorId } },
            select: { id: true, usuarioId: true },
        });
        const idsUsuarioOutrosConsumidores = outrosConsumidores.map((c) => c.usuarioId);
        if (outrosConsumidores.length > 0) {
            await tx.consumidor.deleteMany({
                where: { id: { in: outrosConsumidores.map((c) => c.id) } },
            });
        }

        const idsUsuarioRemover = [
            ...new Set([...idsUsuarioLojista, ...idsUsuarioOutrosConsumidores]),
        ].filter((id) => !idsPreservarUsuario.includes(id));

        // endereços dos usuários removidos (+ FK lojista.endereco já nula)
        const enderecosRemover = await tx.endereco.findMany({
            where: {
                OR: [
                    { usuarioId: { in: idsUsuarioRemover } },
                    { id: { in: idsEnderecoLojista } },
                ],
            },
            select: { id: true },
        });
        if (enderecosRemover.length > 0) {
            await tx.endereco.deleteMany({
                where: { id: { in: enderecosRemover.map((e) => e.id) } },
            });
        }

        if (idsUsuarioRemover.length > 0) {
            await tx.usuario.deleteMany({
                where: { id: { in: idsUsuarioRemover } },
            });
        }

        // reset consumidor usuario1
        await tx.consumidor.update({
            where: { id: consumidorId },
            data: { pontos: 0, nivel: 1, lojistaId: null },
        });

        // campanha vigente única
        const dataInicio = instanteCivilNoFuso({
            ano: 2026,
            mes: 1,
            dia: 1,
            hora: 0,
            minuto: 0,
            segundo: 0,
        });
        const dataFim = fimDoDiaCivilNoFuso({ ano: 2026, mes: 12, dia: 31 });

        const campanha = await tx.campanha.create({
            data: {
                nome: "Campanha Comércio Local 2026",
                descricao:
                    "Compre no comércio local e receba tickets para a campanha de 2026.",
                valorPorTicket: 10,
                dataInicio,
                dataFim,
                associacaoId,
            },
        });

        const contagens = {
            usuarios: await tx.usuario.groupBy({ by: ["role"], _count: true }),
            associacoes: await tx.associacao.count(),
            lojistas: await tx.lojista.count(),
            consumidores: await tx.consumidor.count(),
            campanhas: await tx.campanha.count(),
            nfce: await tx.processamentoNfce.count(),
            residual: await tx.residualTicketCampanha.count(),
            produtos: await tx.produto.count(),
            missoes: await tx.missao.count(),
        };

        return {
            deletados: {
                processamentoNfce: delNfce.count,
                residual: delResidual.count,
                sorteio: delSorteio.count,
                resgates: delResgates.count,
                missaoConsumidor: delMissoesConc.count,
                promocoes: delPromocoes.count,
                produtos: delProdutos.count,
                eventos: delEventos.count,
                missoes: delMissoes.count,
                recompensas: delRecompensas.count,
                categorias: delCategorias.count,
                lojistas: delLojistas.count,
                campanhasAntigas: delCampanhas.count,
                usuariosRemovidos: idsUsuarioRemover.length,
                enderecosRemovidos: enderecosRemover.length,
                outrosConsumidores: outrosConsumidores.length,
            },
            campanha: {
                id: campanha.id,
                nome: campanha.nome,
                dataInicio: campanha.dataInicio.toISOString(),
                dataFim: campanha.dataFim.toISOString(),
                valorPorTicket: Number(campanha.valorPorTicket),
            },
            preservados: {
                associacaoEmail: EMAIL_ASSOCIACAO,
                associacaoId,
                consumidorEmail: EMAIL_CONSUMIDOR,
                consumidorId,
            },
            contagens,
        };
    });

    console.log(JSON.stringify(resultado, null, 2));
}

main()
    .catch((erro) => {
        console.error("FALHA — rollback da transação:", erro);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
