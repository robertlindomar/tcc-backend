/** Seed aditiva local: não altera contas ou dados existentes, nem reseta a demonstração. */
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import prisma from "../../src/prisma";
import { calcularChavePeriodoMissao } from "../../src/shared/tempo/calcularChavePeriodoMissao";
import { calcularTicketsEResidual } from "../../src/modules/nfce/utils/calcularTicketsEResidual";
import { RepositorioAssociacao } from "../../src/modules/associacao/repository/RepositorioAssociacao";
import { RepositorioCampanha } from "../../src/modules/campanha/repository/RepositorioCampanha";
import { normalizarNomeCampanha } from "../../src/modules/campanha/utils/normalizarNomeCampanha";
import { snapshotSorteioEdicao } from "../../src/modules/campanha/utils/snapshotSorteioEdicao";
import { RepositorioSorteio } from "../../src/modules/sorteio/repository/RepositorioSorteio";
import { ServicoSorteio } from "../../src/modules/sorteio/service/ServicoSorteio";
import {
    NOME_MISSAO_VISITA_LOJA, DESCRICAO_MISSAO_VISITA_LOJA,
    PONTOS_MISSAO_VISITA_LOJA, FREQUENCIA_MISSAO_VISITA_LOJA,
} from "../../src/modules/missao/constantes/missaoSistema";

const RAIZ = resolve(__dirname, "../..");
const MARCADOR = "DEMO COMPLETA v1 — Comércio em movimento";
const SENHA = "senha123";
const DIA = 86400000;
const LOJAS = [
    { chave: "padaria", nome: "Padaria Pão da Praça", categoria: "Panificação", produtos: [["Pão artesanal", 18.9], ["Pão integral", 22.9], ["Pão de fermentação natural", 28.9]] },
    { chave: "moda", nome: "Moda Avenida", categoria: "Camisetas", produtos: [["Camiseta básica branca", 49.9], ["Camiseta algodão premium", 69.9], ["Camiseta casual unissex", 59.9]] },
    { chave: "mercado", nome: "Mercado Raízes", categoria: "Hortifrúti", produtos: [["Cesta de verduras", 29.9], ["Cesta de frutas da estação", 39.9], ["Cesta orgânica da semana", 59.9]] },
    { chave: "tecnologia", nome: "Conecta Tech", categoria: "Áudio", produtos: [["Fone de ouvido sem fio", 149.9], ["Headphone bluetooth", 229.9], ["Fone premium com microfone", 299.9]] },
    { chave: "livraria", nome: "Livraria Entre Páginas", categoria: "Livros", produtos: [["Seleção de romances", 39.9], ["Livro de desenvolvimento pessoal", 49.9], ["Coleção de literatura brasileira", 89.9]] },
    { chave: "esportes", nome: "Passo Certo Esportes", categoria: "Calçados esportivos", produtos: [["Tênis de caminhada", 159.9], ["Tênis de corrida", 249.9], ["Tênis esportivo casual", 189.9]] },
] as const;
const NOMES = ["Mariana Costa", "Pedro Almeida", "Juliana Ribeiro", "Rafael Souza", "Camila Martins", "Lucas Ferreira", "Beatriz Lima", "Gabriel Oliveira", "Fernanda Santos", "Thiago Pereira", "Isabela Rocha", "Diego Nascimento"];

function documentoFicticio(indice: number, cnpj = false): string {
    const digitos = (cnpj ? `990008${String(indice).padStart(2, "0")}0001` : `980008${String(indice).padStart(3, "0")}`).split("").map(Number);
    for (let tentativa = 0; tentativa < 2; tentativa++) {
        const pesos = cnpj
            ? (tentativa === 0 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
            : digitos.map((_, i) => digitos.length + 1 - i);
        const resto = digitos.reduce((soma, digito, i) => soma + digito * pesos[i], 0) % 11;
        digitos.push(resto < 2 ? 0 : 11 - resto);
    }
    return cnpj ? digitos.join("").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        : digitos.join("").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

async function preparar() {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Seed fictícia exclusiva do PostgreSQL local.");
    const associacoes = await prisma.associacao.findMany();
    if (associacoes.length !== 1) throw new Error("É necessária exatamente uma associação já cadastrada.");
    const associacao = associacoes[0];
    const agora = new Date();
    const futuro = new Date(agora.getTime() + 90 * DIA);
    const ontem = new Date(agora.getTime() - DIA);
    const contas = [...LOJAS.map(l => `${l.chave}@vitrine.demo.local`), "pendente@vitrine.demo.local", "rejeitado@vitrine.demo.local", ...NOMES.map((_, i) => `cliente${i + 1}@vitrine.demo.local`)];

    // Os arquivos ficam disponíveis sem dependência de rede durante a apresentação.
    mkdirSync(resolve(RAIZ, "uploads/demo-completa"), { recursive: true });
    for (const loja of LOJAS) copyFileSync(resolve(RAIZ, `prisma/assets/demo-completa/${loja.chave}.jpg`), resolve(RAIZ, `uploads/demo-completa/${loja.chave}.jpg`));

    const existente = await prisma.campanha.findFirst({ where: { nome: MARCADOR } });
    if (!existente) {
        if (await prisma.usuario.count({ where: { email: { in: contas } } })) throw new Error("E-mail reservado já existe. Seed abortada para preservar contas existentes.");
        mkdirSync(resolve(RAIZ, "backups"), { recursive: true });
        const arquivoBackup = resolve(RAIZ, `backups/pre-demo-completa-${agora.toISOString().replace(/[:.]/g, "-")}.dump`);
        const urlBackup = new URL(url);
        urlBackup.search = "";
        execFileSync("pg_dump", ["--format=custom", "--file", arquivoBackup], { env: { ...process.env, PGHOST: urlBackup.hostname, PGPORT: urlBackup.port || "5432", PGUSER: decodeURIComponent(urlBackup.username), PGPASSWORD: decodeURIComponent(urlBackup.password), PGDATABASE: decodeURIComponent(urlBackup.pathname.slice(1)) }, stdio: "pipe" });
        console.log(`Backup anterior à seed: ${arquivoBackup}`);
        const senha = await bcrypt.hash(SENHA, 10);
        const usuariosAntes = await prisma.usuario.findMany({ orderBy: { id: "asc" } });
        const assinaturaAntes = createHash("sha256").update(JSON.stringify(usuariosAntes)).digest("hex");

        await prisma.$transaction(async tx => {
            // Serializa execuções concorrentes desta seed; o marcador é gravado na mesma transação.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(980008)`;
            if (await tx.campanha.findFirst({ where: { nome: MARCADOR } })) return;
            const estado = await tx.estado.findFirst({ where: { uf: "SP" } }) ?? await tx.estado.create({ data: { nome: "São Paulo", uf: "SP" } });
            const cidade = await tx.cidade.findFirst({ where: { nome: "Santa Fé do Sul", estadoId: estado.id } }) ?? await tx.cidade.create({ data: { nome: "Santa Fé do Sul", estadoId: estado.id } });
            const bairro = await tx.bairro.findFirst({ where: { nome: "Centro", cidadeId: cidade.id } }) ?? await tx.bairro.create({ data: { nome: "Centro", cidadeId: cidade.id } });
            const rua = await tx.rua.findFirst({ where: { nome: "Rua Quatorze" } }) ?? await tx.rua.create({ data: { nome: "Rua Quatorze" } });
            const lojas = [];
            for (let i = 0; i < 8; i++) {
                const configuracao = LOJAS[i];
                const nome = configuracao?.nome ?? (i === 6 ? "Ótica Novo Olhar" : "Empório Sabor Local");
                const status = i < 6 ? "APROVADO" : i === 6 ? "PENDENTE" : "REJEITADO";
                const usuario = await tx.usuario.create({ data: { nome: `${nome} (Demo)`, email: contas[i], senha, role: "LOJISTA" } });
                const endereco = await tx.endereco.create({ data: { usuarioId: usuario.id, cep: "15775-000", numero: String(400 + i * 100), estadoId: estado.id, cidadeId: cidade.id, bairroId: bairro.id, ruaId: rua.id, latitude: -20.211 + i * 0.001, longitude: -50.927 + i * 0.001 } });
                const loja = await tx.lojista.create({ data: { nomeFantasia: `${nome} (Demo)`, urlLogo: configuracao ? `/uploads/demo-completa/${configuracao.chave}.jpg` : null, razaoSocial: `${nome} Demonstração Ltda`, cnpj: documentoFicticio(i + 1, true), usuarioId: usuario.id, associacaoId: associacao.id, enderecoId: endereco.id, status, justificativaRejeicao: status === "REJEITADO" ? "DEMO: corrigir os dados cadastrais e reenviar para análise." : null } });
                if (!configuracao) continue;
                const categoria = await tx.categoria.create({ data: { nome: configuracao.categoria, lojistaId: loja.id } });
                for (const [j, [nomeProduto, valor]] of configuracao.produtos.entries()) {
                    const produto = await tx.produto.create({ data: { nome: nomeProduto, valor, categoriaId: categoria.id, lojistaId: loja.id, urlImagem: `/uploads/demo-completa/${configuracao.chave}.jpg` } });
                    await tx.promocao.create({ data: { produtoId: produto.id, descricao: j === 2 ? "DEMO: oferta encerrada (histórico)" : "Oferta especial do comércio local — demonstração", preco: Math.round(valor * (j === 0 ? 0.8 : 0.85) * 100) / 100, ativa: true, dataInicio: new Date(agora.getTime() - 7 * DIA), dataFim: j === 2 ? ontem : futuro } });
                }
                await tx.evento.create({ data: { nome: `Dia de ofertas — ${nome}`, descricao: "DEMO: encontro do comércio local, ofertas e apresentação das recompensas.", lojistaId: loja.id, urlImagem: `/uploads/demo-completa/${configuracao.chave}.jpg` } });
                const visita = await tx.missao.create({ data: { nome: NOME_MISSAO_VISITA_LOJA, descricao: DESCRICAO_MISSAO_VISITA_LOJA, pontoRecompensa: PONTOS_MISSAO_VISITA_LOJA, frequencia: FREQUENCIA_MISSAO_VISITA_LOJA, sistema: true, lojistaId: loja.id, tokenQr: randomUUID() } });
                const missoes = [];
                for (const [j, frequencia] of (["UMA_VEZ", "SEMANAL", "MENSAL"] as const).entries()) missoes.push(await tx.missao.create({ data: { nome: ["Conheça nosso catálogo", "Cliente da semana", "Explore as novidades do mês"][j], descricao: "DEMO: apresente o QR da missão na loja para registrar a participação.", pontoRecompensa: [100, 50, 150][j], frequencia, dataFim: futuro, lojistaId: loja.id, tokenQr: randomUUID() } }));
                const recompensas = [];
                for (let j = 0; j < 3; j++) recompensas.push(await tx.recompensa.create({ data: { nome: ["Brinde de boas-vindas", "Vale-compras de R$ 10", "Kit especial da loja"][j], descricao: "DEMO: recompensa fictícia para retirada no estabelecimento.", custoPontos: [30, 80, 200][j], estoque: j === 0 ? null : j === 1 ? 30 : 0, dataFim: futuro, lojistaId: loja.id } }));
                lojas.push({ loja, visita, missoes, recompensas });
            }
            await tx.recompensa.createMany({ data: [
                { nome: "Brinde temporariamente desativado (Demo)", custoPontos: 20, ativa: false, estoque: 10, lojistaId: lojas[0].loja.id, dataFim: futuro },
                { nome: "Vale da campanha anterior (Demo)", custoPontos: 20, estoque: 10, lojistaId: lojas[0].loja.id, dataFim: ontem },
            ] });
            const consumidores = [];
            for (const [i, nome] of NOMES.entries()) {
                const usuario = await tx.usuario.create({ data: { nome: `${nome} (Demo)`, email: `cliente${i + 1}@vitrine.demo.local`, senha, role: "CONSUMIDOR" } });
                const consumidor = await tx.consumidor.create({ data: { usuarioId: usuario.id, cpf: documentoFicticio(i + 1) } });
                consumidores.push(consumidor);
                // A conta 12 fica livre para demonstrar o primeiro uso; as demais têm saldo derivado do histórico.
                if (i === 11) continue;
                let pontos = 0;
                for (let j = 0; j < 3; j++) {
                    const loja = lojas[(i + j) % lojas.length];
                    for (const missao of [loja.visita, loja.missoes[0]]) {
                        await tx.missaoConsumidor.create({ data: { missaoId: missao.id, consumidorId: consumidor.id, chavePeriodo: calcularChavePeriodoMissao(missao.frequencia, ontem), dataCriacao: ontem } });
                        pontos += missao.pontoRecompensa;
                    }
                }
                // Fixtures de resgate mantêm débito, estoque e snapshots coerentes com o domínio.
                const loja = lojas[i % lojas.length];
                const recompensa = loja.recompensas[i % 2];
                const status = (["PENDENTE_ENTREGA", "ENTREGUE", "RECUSADO"] as const)[i % 3];
                await tx.resgateRecompensa.create({ data: { recompensaId: recompensa.id, consumidorId: consumidor.id, nomeRecompensaSnapshot: recompensa.nome, custoPontosSnapshot: recompensa.custoPontos, status, dataCriacao: ontem, dataEntrega: status === "ENTREGUE" ? agora : null } });
                if (status !== "RECUSADO") {
                    pontos -= recompensa.custoPontos;
                    if (recompensa.estoque !== null) await tx.recompensa.update({ where: { id: recompensa.id }, data: { estoque: { decrement: 1 } } });
                }
                await tx.consumidor.update({ where: { id: consumidor.id }, data: { pontos, nivel: Math.floor(pontos / 100) + 1 } });
            }
            for (let c = 0; c < 2; c++) {
                const nomeCampanha = c === 0 ? MARCADOR : `${MARCADOR} — apuração`;
                const campanha = await tx.campanha.create({ data: { nome: nomeCampanha, nomeNormalizado: normalizarNomeCampanha(nomeCampanha), descricao: "DEMO: consumidores, documentos, endereços, compras e tickets fictícios. R$ 10 = 1 ticket. Nenhuma NFC-e desta seed foi validada na SEFAZ.", associacaoId: associacao.id, valorPorTicket: 10, dataInicio: new Date(agora.getTime() - 7 * DIA), dataFim: c === 0 ? futuro : ontem } });
                let numero = 0;
                for (const [i, consumidor] of consumidores.entries()) {
                    let residual = 0;
                    let total = 0;
                    for (const valorNota of [27.5, 35]) {
                        const calculo = calcularTicketsEResidual({ valorNota, residualAnterior: residual, valorPorTicket: 10 });
                        const chaveAcesso = `00000${BigInt(`0x${randomBytes(16).toString("hex")}`).toString().padStart(39, "0")}`;
                        const processamento = await tx.processamentoNfce.create({ data: { chaveAcesso, campanhaId: campanha.id, consumidorId: consumidor.id, lojistaId: lojas[i % lojas.length].loja.id, valorNota, ticketsGerados: calculo.tickets, residualAntes: residual, residualApos: calculo.residualNovo, dataEmissao: new Date(agora.getTime() - 2 * DIA) } });
                        await tx.ticket.createMany({ data: Array.from({ length: calculo.tickets }, () => ({ numero: ++numero, campanhaId: campanha.id, consumidorId: consumidor.id, processamentoNfceId: processamento.id })) });
                        residual = calculo.residualNovo;
                        total += calculo.tickets;
                    }
                    await tx.residualTicketCampanha.create({ data: { campanhaId: campanha.id, consumidorId: consumidor.id, valorResidual: residual, ticketsTotais: total } });
                }
                await tx.sorteio.create({ data: snapshotSorteioEdicao(campanha) });
            }
        }, { timeout: 60000 });
        const usuariosDepois = await prisma.usuario.findMany({ where: { id: { in: usuariosAntes.map(u => u.id) } }, orderBy: { id: "asc" } });
        if (createHash("sha256").update(JSON.stringify(usuariosDepois)).digest("hex") !== assinaturaAntes) throw new Error("Falha na verificação de preservação dos usuários anteriores.");
        console.log(`${usuariosAntes.length} usuários anteriores preservados integralmente.`);
    } else console.log("Seed já aplicada: preservando datas, saldos, estoques e operações realizadas.");

    // Extensão autorizada em 08/10/2026: imagem do comércio no catálogo mobile.
    // Preenche só imagens ausentes das seis contas desta demo, preservando logos enviadas.
    for (const loja of LOJAS) {
        await prisma.lojista.updateMany({
            where: { usuario: { email: `${loja.chave}@vitrine.demo.local` }, urlLogo: null },
            data: { urlLogo: `/uploads/demo-completa/${loja.chave}.jpg` },
        });
    }

    // RNG real do serviço, sem escolher ganhador ou estender o prazo em reexecuções.
    const apuracao = await prisma.campanha.findFirstOrThrow({ where: { nome: `${MARCADOR} — apuração` }, include: { sorteios: { orderBy: { id: "asc" } } } });
    const sorteio = apuracao.sorteios[0];
    if (!(await prisma.resultadoSorteio.count({ where: { sorteioId: sorteio.id } }))) {
        const servico = new ServicoSorteio(new RepositorioSorteio(prisma), new RepositorioCampanha(prisma), new RepositorioAssociacao(prisma));
        await servico.sortear(associacao.usuarioId, String(sorteio.id));
    }
    const usuarios = await prisma.usuario.findMany({ where: { email: { in: contas } }, select: { email: true, role: true, consumidor: { select: { pontos: true, nivel: true } }, lojista: { select: { nomeFantasia: true, status: true } } }, orderBy: { email: "asc" } });
    const campanhas = await prisma.campanha.findMany({
        where: { nome: { in: [MARCADOR, `${MARCADOR} — apuração`] } },
        include: {
            _count: { select: { tickets: true } },
            sorteios: { include: { resultados: true } },
        },
    });
    const resultado = await prisma.resultadoSorteio.findFirstOrThrow({
        where: { sorteioId: sorteio.id }, orderBy: { id: "desc" },
        include: { ticket: { include: { consumidor: { include: { usuario: { select: { email: true, nome: true } } } } } } },
    });
    const relatorio = { senhaNovasContas: SENHA, usuarios, campanhas, vencedor: resultado.ticket.consumidor.usuario, prazoRetirada: new Date(resultado.dataSorteio.getTime() + 7 * DIA) };
    mkdirSync(resolve(RAIZ, "backups"), { recursive: true });
    writeFileSync(resolve(RAIZ, "backups/demo-completa-relatorio.json"), JSON.stringify(relatorio, null, 2));
    console.log(JSON.stringify(relatorio, null, 2));
}

preparar().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => prisma.$disconnect());
