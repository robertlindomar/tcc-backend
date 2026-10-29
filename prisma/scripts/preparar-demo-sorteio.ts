/** Dados fictícios para revisão do modal. Cria uma campanha separada a cada execução. */
import bcrypt from "bcryptjs";
import prisma from "../../src/prisma";
import { RepositorioAssociacao } from "../../src/modules/associacao/repository/RepositorioAssociacao";
import { RepositorioCampanha } from "../../src/modules/campanha/repository/RepositorioCampanha";
import { normalizarNomeCampanha } from "../../src/modules/campanha/utils/normalizarNomeCampanha";
import { snapshotSorteioEdicao } from "../../src/modules/campanha/utils/snapshotSorteioEdicao";
import { RepositorioSorteio } from "../../src/modules/sorteio/repository/RepositorioSorteio";
import { ServicoSorteio } from "../../src/modules/sorteio/service/ServicoSorteio";

const SENHA = "senha123";
const CONTAS = [
    { nome: "Ana Silva (demonstração)", email: "ana.sorteio@demo.local" },
    { nome: "Bruno Santos (demonstração)", email: "bruno.sorteio@demo.local" },
    { nome: "Carla Oliveira (demonstração)", email: "carla.sorteio@demo.local" },
];

function gerarCpfFicticio(indice: number): string {
    const digitos = `99000000${indice + 1}`.split("").map(Number);
    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        const soma = digitos.reduce((total, numero, posicao) => total + numero * (tamanho + 1 - posicao), 0);
        const resto = (soma * 10) % 11;
        digitos.push(resto === 10 ? 0 : resto);
    }
    return digitos.join("").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

async function preparar() {
    const urlBanco = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(urlBanco.hostname)) {
        throw new Error("Esta preparação de dados fictícios é exclusiva do banco local.");
    }
    const senhaHash = await bcrypt.hash(SENHA, 10);
    const agora = new Date();
    const dados = await prisma.$transaction(async (tx) => {
        const loja = await tx.lojista.findFirstOrThrow({
            where: { status: "APROVADO" }, orderBy: { id: "asc" }, include: { associacao: true },
        });
        const nomeCampanha = `DEMO — Modal do ganhador (${agora.toISOString()})`;
        const campanha = await tx.campanha.create({ data: {
            nome: nomeCampanha,
            nomeNormalizado: normalizarNomeCampanha(nomeCampanha),
            descricao: "Demonstração solicitada para revisar o modal: consumidores, compras e tickets fictícios. Não representa NFC-e real nem validação fiscal.",
            associacaoId: loja.associacaoId, valorPorTicket: 10,
            dataInicio: new Date(agora.getTime() - 3 * 86400000),
            dataFim: new Date(agora.getTime() - 86400000),
        } });
        const contas = [];
        for (const [indice, conta] of CONTAS.entries()) {
            const cpf = gerarCpfFicticio(indice);
            let usuario = await tx.usuario.findUnique({ where: { email: conta.email }, include: { consumidor: true } });
            if (usuario) {
                if (usuario.role !== "CONSUMIDOR" || !usuario.ativo || usuario.consumidor?.cpf !== cpf || !await bcrypt.compare(SENHA, usuario.senha)) {
                    throw new Error(`Conta ${conta.email} já existe com dados diferentes. Nenhuma conta existente será sobrescrita.`);
                }
            } else {
                usuario = await tx.usuario.create({
                    data: { ...conta, senha: senhaHash, role: "CONSUMIDOR", consumidor: { create: { cpf } } },
                    include: { consumidor: true },
                });
            }
            const consumidorId = usuario.consumidor!.id;
            const numero = indice + 1;
            const processamento = await tx.processamentoNfce.create({ data: {
                // Fixture de demonstração, deliberadamente identificada na descrição da campanha.
                chaveAcesso: "0".repeat(24) + String(agora.getTime()).padStart(16, "0") + String(numero).padStart(4, "0"),
                campanhaId: campanha.id, consumidorId, lojistaId: loja.id,
                valorNota: 10, ticketsGerados: 1, residualAntes: 0, residualApos: 0,
                dataEmissao: new Date(agora.getTime() - 2 * 86400000),
            } });
            await tx.ticket.create({ data: { campanhaId: campanha.id, consumidorId, processamentoNfceId: processamento.id, numero } });
            await tx.residualTicketCampanha.create({ data: { campanhaId: campanha.id, consumidorId, ticketsTotais: 1, valorResidual: 0 } });
            contas.push({ ...conta, consumidorId });
        }
        const sorteio = await tx.sorteio.create({ data: snapshotSorteioEdicao(campanha) });
        return { campanha, sorteio, contas, usuarioAssociacaoId: loja.associacao.usuarioId };
    });

    // O vencedor é escolhido pelo serviço real, sem modificar RNG, contratos ou datas de resultados.
    const servico = new ServicoSorteio(new RepositorioSorteio(prisma), new RepositorioCampanha(prisma), new RepositorioAssociacao(prisma));
    const sorteado = await servico.sortear(dados.usuarioAssociacaoId, String(dados.sorteio.id));
    const resultado = sorteado.resultadoAtual!;
    console.log(JSON.stringify({
        campanhaId: dados.campanha.id, sorteioId: sorteado.id, resultadoId: resultado.id,
        vencedor: { nome: resultado.vencedor.nome, email: resultado.vencedor.email, numeroSorteado: resultado.numeroSorteado },
        prazoRetirada: resultado.dataLimiteRetirada,
        contas: dados.contas.map(({ nome, email }) => ({ nome, email })), senha: SENHA,
    }, null, 2));
}

preparar().catch((erro) => { console.error(erro); process.exitCode = 1; }).finally(() => prisma.$disconnect());
