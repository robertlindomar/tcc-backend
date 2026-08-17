import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { FrequenciaMissao, Role, StatusLojista } from "../src/generated/prisma/enums.js";
import { fimDoDiaCivilNoFuso } from "../src/shared/tempo/fusoNegocio";
import { RepositorioMissao } from "../src/modules/missao/repository/RepositorioMissao";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
});

const SENHA_DEMO = "senha123";

/**
 * Conta de associação da demonstração. Precisa nascer do seed para a senha ser
 * conhecida: contas criadas fora dele (ex.: associacao@gmail.com) têm senha que
 * o seed não pode adivinhar nem sobrescrever.
 */
const EMAIL_ASSOCIACAO_DEMO = "associacao@demo.local";

const NOMES_SEXO = ["Masculino", "Feminino"] as const;

async function garantirUsuario(dados: {
    email: string;
    nome: string;
    role: Role;
}): Promise<{ id: number; criado: boolean }> {
    const existente = await prisma.usuario.findUnique({
        where: { email: dados.email },
    });
    if (existente) {
        return { id: existente.id, criado: false };
    }
    const senha = await bcrypt.hash(SENHA_DEMO, 10);
    const criado = await prisma.usuario.create({
        data: {
            nome: dados.nome,
            email: dados.email,
            senha,
            role: dados.role,
            ativo: true,
        },
    });
    return { id: criado.id, criado: true };
}

async function resolverAssociacaoAlvo() {
    const usuarioAssoc = await garantirUsuario({
        email: EMAIL_ASSOCIACAO_DEMO,
        nome: "Associação Comercial (Demo)",
        role: Role.ASSOCIACAO,
    });

    const existente = await prisma.associacao.findUnique({
        where: { usuarioId: usuarioAssoc.id },
    });
    if (existente) {
        console.log(
            `Associação alvo: id=${existente.id} (${existente.nomeFantasia}) via ${EMAIL_ASSOCIACAO_DEMO}`,
        );
        return existente;
    }

    const associacao = await prisma.associacao.create({
        data: {
            nomeFantasia: "Associação Comercial de Santa Fé do Sul",
            razaoSocial: "Associacao Comercial de Santa Fe do Sul",
            cnpj: "22.222.222/0001-22",
            inscricaoEstadual: null,
            usuarioId: usuarioAssoc.id,
        },
    });
    console.log(`Associação demo criada (id=${associacao.id})`);
    return associacao;
}

/** Endereço 1:1 do usuário, também vinculado em `lojista.enderecoId`. */
async function garantirEnderecoDemo(dados: {
    emailLojista: string;
    cep: string;
    numero: string;
    rua: string;
    bairro: string;
    cidade: string;
    estado: string;
    uf: string;
}) {
    const usuario = await prisma.usuario.findUnique({
        where: { email: dados.emailLojista },
    });
    if (!usuario) {
        return;
    }

    const lojista = await prisma.lojista.findUnique({
        where: { usuarioId: usuario.id },
    });
    if (!lojista) {
        return;
    }

    let endereco = await prisma.endereco.findUnique({
        where: { usuarioId: usuario.id },
    });

    if (!endereco) {
        const estado =
            (await prisma.estado.findFirst({ where: { uf: dados.uf } })) ??
            (await prisma.estado.create({
                data: { nome: dados.estado, uf: dados.uf },
            }));
        const cidade =
            (await prisma.cidade.findFirst({
                where: { nome: dados.cidade, estadoId: estado.id },
            })) ??
            (await prisma.cidade.create({
                data: { nome: dados.cidade, estadoId: estado.id },
            }));
        const bairro =
            (await prisma.bairro.findFirst({
                where: { nome: dados.bairro, cidadeId: cidade.id },
            })) ??
            (await prisma.bairro.create({
                data: { nome: dados.bairro, cidadeId: cidade.id },
            }));
        const rua =
            (await prisma.rua.findFirst({ where: { nome: dados.rua } })) ??
            (await prisma.rua.create({ data: { nome: dados.rua } }));

        endereco = await prisma.endereco.create({
            data: {
                cep: dados.cep,
                numero: dados.numero,
                usuarioId: usuario.id,
                ruaId: rua.id,
                bairroId: bairro.id,
                cidadeId: cidade.id,
                estadoId: estado.id,
            },
        });
        console.log(
            `Endereço demo criado para ${dados.emailLojista} (id=${endereco.id})`,
        );
    }

    if (lojista.enderecoId !== endereco.id) {
        await prisma.lojista.update({
            where: { id: lojista.id },
            data: { enderecoId: endereco.id },
        });
        console.log(
            `Lojista ${lojista.nomeFantasia}: enderecoId → ${endereco.id}`,
        );
    }
}

async function garantirCategoriasDemo(
    emailLojista: string,
    nomes: readonly string[],
) {
    const usuario = await prisma.usuario.findUnique({
        where: { email: emailLojista },
    });
    if (!usuario) {
        return;
    }
    const lojista = await prisma.lojista.findUnique({
        where: { usuarioId: usuario.id },
    });
    if (!lojista) {
        return;
    }

    for (const nome of nomes) {
        const existente = await prisma.categoria.findUnique({
            where: { lojistaId_nome: { lojistaId: lojista.id, nome } },
        });
        if (existente) {
            continue;
        }
        const criada = await prisma.categoria.create({
            data: { nome, lojistaId: lojista.id },
        });
        console.log(
            `Categoria demo criada: ${criada.nome} (loja ${lojista.nomeFantasia})`,
        );
    }
}

async function garantirProdutosDemo(
    emailLojista: string,
    produtos: readonly { nome: string; valor: number; categoria: string }[],
) {
    const usuario = await prisma.usuario.findUnique({
        where: { email: emailLojista },
    });
    if (!usuario) {
        return;
    }
    const lojista = await prisma.lojista.findUnique({
        where: { usuarioId: usuario.id },
    });
    if (!lojista) {
        return;
    }

    for (const produto of produtos) {
        const existente = await prisma.produto.findFirst({
            where: { nome: produto.nome, lojistaId: lojista.id },
        });
        if (existente) {
            continue;
        }
        const categoria = await prisma.categoria.findFirst({
            where: { nome: produto.categoria, lojistaId: lojista.id },
        });
        const criado = await prisma.produto.create({
            data: {
                nome: produto.nome,
                valor: produto.valor,
                lojistaId: lojista.id,
                categoriaId: categoria?.id ?? null,
            },
        });
        console.log(
            `Produto demo criado: ${criado.nome} (loja ${lojista.nomeFantasia})`,
        );
    }
}

/**
 * Consumidor demo. `lojistaId` no create é leftover legado (E4): a listagem da loja
 * deriva de MissaoConsumidor da missão sistema Visitar loja, não deste FK.
 */
async function garantirConsumidorDemo(dados: {
    email: string;
    nome: string;
    cpf: string;
    pontos: number;
    emailLojista: string;
}) {
    const usuario = await garantirUsuario({
        email: dados.email,
        nome: dados.nome,
        role: Role.CONSUMIDOR,
    });

    const usuarioLojista = await prisma.usuario.findUnique({
        where: { email: dados.emailLojista },
    });
    const lojista = usuarioLojista
        ? await prisma.lojista.findUnique({ where: { usuarioId: usuarioLojista.id } })
        : null;

    const existente = await prisma.consumidor.findUnique({
        where: { usuarioId: usuario.id },
    });
    if (existente) {
        const nivel = Math.floor(dados.pontos / 100) + 1;
        await prisma.consumidor.update({
            where: { id: existente.id },
            data: {
                pontos: dados.pontos,
                nivel,
            },
        });
        console.log(`Consumidor ${dados.nome}: pontos restaurados para ${dados.pontos}`);
        return;
    }

    if (await prisma.consumidor.findUnique({ where: { cpf: dados.cpf } })) {
        console.log(`CPF ${dados.cpf} já em uso — pulando consumidor demo`);
        return;
    }

    const sexo = await prisma.sexo.findFirst();
    const criado = await prisma.consumidor.create({
        data: {
            cpf: dados.cpf,
            pontos: dados.pontos,
            nivel: 1,
            usuarioId: usuario.id,
            lojistaId: lojista?.id ?? null,
            sexoId: sexo?.id ?? null,
        },
    });
    console.log(`Consumidor demo criado: ${dados.nome} (id=${criado.id})`);
}

async function garantirMissaoDemo(emailLojista: string) {
    const usuario = await prisma.usuario.findUnique({ where: { email: emailLojista } });
    const lojista = usuario
        ? await prisma.lojista.findUnique({ where: { usuarioId: usuario.id } })
        : null;
    if (!lojista) {
        return;
    }

    const nome = "Conheça a vitrine da loja";
    const nomesLegado = ["Visite a loja e ganhe pontos", nome];
    const dataFim = fimDoDiaCivilNoFuso({ ano: 2026, mes: 12, dia: 31 });
    const descricao =
        "Missão demo comum (não é a missão permanente Visitar loja da E3b). Escaneie o QR no lab.";
    const existente = await prisma.missao.findFirst({
        where: { lojistaId: lojista.id, sistema: false, nome: { in: nomesLegado } },
    });
    if (existente) {
        await prisma.missao.update({
            where: { id: existente.id },
            data: {
                nome,
                descricao,
                frequencia: FrequenciaMissao.DIARIA,
                dataFim,
                sistema: false,
            },
        });
        console.log(`Missao demo atualizada: ${nome} (loja ${lojista.nomeFantasia})`);
        return;
    }

    const criada = await prisma.missao.create({
        data: {
            nome,
            descricao,
            pontoRecompensa: 50,
            frequencia: FrequenciaMissao.DIARIA,
            dataFim,
            sistema: false,
            lojistaId: lojista.id,
            tokenQr: randomBytes(32).toString("hex"),
        },
    });
    console.log(`Missao demo criada: ${criada.nome} (loja ${lojista.nomeFantasia})`);
}

async function garantirMissoesVisitarLoja() {
    const lojistas = await prisma.lojista.findMany({ select: { id: true, nomeFantasia: true } });
    const repo = new RepositorioMissao(prisma);
    for (const lojista of lojistas) {
        const missao = await repo.garantirSistemaVisitarLoja(lojista.id);
        console.log(
            `Missao sistema: ${missao.nome} (loja ${lojista.nomeFantasia}, token persistente)`,
        );
    }
}

async function garantirRecompensasDemo(emailLojista: string) {
    const usuario = await prisma.usuario.findUnique({ where: { email: emailLojista } });
    const lojista = usuario
        ? await prisma.lojista.findUnique({ where: { usuarioId: usuario.id } })
        : null;
    if (!lojista) {
        return;
    }

    const itens = [
        {
            nome: "Chaveiro da loja",
            descricao: "Brinde da Casa do Real.",
            custoPontos: 50,
            estoque: 10 as number | null,
            dataFim: null as Date | null,
        },
        {
            nome: "Cupom 10% de desconto",
            descricao: "Válido na loja física (demonstração).",
            custoPontos: 100,
            estoque: null as number | null,
            dataFim: fimDoDiaCivilNoFuso({ ano: 2026, mes: 12, dia: 31 }),
        },
    ];

    for (const item of itens) {
        const existente = await prisma.recompensa.findFirst({
            where: { lojistaId: lojista.id, nome: item.nome },
        });
        if (existente) {
            await prisma.recompensa.update({
                where: { id: existente.id },
                data: {
                    descricao: item.descricao,
                    custoPontos: item.custoPontos,
                    estoque: item.estoque,
                    dataFim: item.dataFim,
                    ativa: true,
                },
            });
            console.log(`Recompensa demo atualizada: ${item.nome}`);
            continue;
        }
        await prisma.recompensa.create({
            data: {
                nome: item.nome,
                descricao: item.descricao,
                custoPontos: item.custoPontos,
                estoque: item.estoque,
                dataFim: item.dataFim,
                lojistaId: lojista.id,
                ativa: true,
            },
        });
        console.log(`Recompensa demo criada: ${item.nome} (loja ${lojista.nomeFantasia})`);
    }
}

async function garantirCampanhasDemo(associacaoId: number) {
    const campanhas = [
        {
            nome: "Natal Premiado 2026",
            descricao: "Compre nas lojas participantes e concorra a prêmios.",
        },
        {
            nome: "Semana do Comércio Local",
            descricao: "Campanha de valorização dos comércios da cidade.",
        },
    ] as const;

    for (const campanha of campanhas) {
        const existente = await prisma.campanha.findFirst({
            where: { nome: campanha.nome, associacaoId },
        });
        if (existente) {
            continue;
        }
        const criada = await prisma.campanha.create({
            data: { ...campanha, associacaoId },
        });
        console.log(`Campanha demo criada: ${criada.nome} (id=${criada.id})`);

        await prisma.sorteio.create({
            data: { campanhaId: criada.id, qrcode: null },
        });
    }
}

async function garantirLojistaDemo(dados: {
    email: string;
    nomeUsuario: string;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    statusInicial: (typeof StatusLojista)[keyof typeof StatusLojista];
    justificativaRejeicao?: string | null;
    associacaoId: number;
}) {
    const usuario = await garantirUsuario({
        email: dados.email,
        nome: dados.nomeUsuario,
        role: Role.LOJISTA,
    });
    console.log(
        usuario.criado
            ? `Usuario lojista criado: ${dados.email} (id=${usuario.id})`
            : `Usuario lojista já existe: ${dados.email} (id=${usuario.id})`,
    );

    const perfil = await prisma.lojista.findUnique({
        where: { usuarioId: usuario.id },
    });
    if (perfil) {
        // Garante que o pré-cadastro aparece na associação que você usa no login
        if (perfil.associacaoId !== dados.associacaoId) {
            await prisma.lojista.update({
                where: { id: perfil.id },
                data: { associacaoId: dados.associacaoId },
            });
            console.log(
                `Lojista ${dados.nomeFantasia}: associacaoId ${perfil.associacaoId} → ${dados.associacaoId} (status=${perfil.status} preservado)`,
            );
        } else {
            console.log(
                `Lojista já existe: ${dados.nomeFantasia} (id=${perfil.id}, status=${perfil.status}) — status NÃO sobrescrito`,
            );
        }
        return;
    }

    const porCnpj = await prisma.lojista.findUnique({
        where: { cnpj: dados.cnpj },
    });
    if (porCnpj) {
        console.log(
            `CNPJ ${dados.cnpj} já em uso por lojista id=${porCnpj.id} — pulando criação`,
        );
        return;
    }

    const criado = await prisma.lojista.create({
        data: {
            nomeFantasia: dados.nomeFantasia,
            razaoSocial: dados.razaoSocial,
            cnpj: dados.cnpj,
            inscricaoEstadual: null,
            status: dados.statusInicial,
            justificativaRejeicao: dados.justificativaRejeicao ?? null,
            usuarioId: usuario.id,
            associacaoId: dados.associacaoId,
        },
    });
    console.log(
        `Lojista criado: ${dados.nomeFantasia} (id=${criado.id}, status=${criado.status}, associacaoId=${dados.associacaoId})`,
    );
}

async function main() {
    for (const nome of NOMES_SEXO) {
        const existente = await prisma.sexo.findFirst({ where: { nome } });
        if (existente) {
            console.log(`Sexo já existe: ${nome} (id=${existente.id})`);
            continue;
        }
        const criado = await prisma.sexo.create({ data: { nome } });
        console.log(`Sexo cadastrado: ${nome} (id=${criado.id})`);
    }

    const associacao = await resolverAssociacaoAlvo();

    const lojasDemo = [
        {
            email: "loja.pendente@demo.local",
            nomeUsuario: "Demo Loja Pendente",
            nomeFantasia: "Ótica Visão",
            razaoSocial: "Otica Visao LTDA",
            cnpj: "11.111.111/0001-11",
            statusInicial: StatusLojista.PENDENTE,
        },
        {
            email: "loja.aprovada@demo.local",
            nomeUsuario: "Demo Loja Aprovada",
            nomeFantasia: "Casa do Real",
            razaoSocial: "Casa do Real Comercio LTDA",
            cnpj: "44.444.444/0001-44",
            statusInicial: StatusLojista.APROVADO,
        },
        {
            email: "loja.rejeitada@demo.local",
            nomeUsuario: "Demo Loja Rejeitada",
            nomeFantasia: "Estilo Kids",
            razaoSocial: "Estilo Kids LTDA",
            cnpj: "33.333.333/0001-33",
            statusInicial: StatusLojista.REJEITADO,
            justificativaRejeicao: "CNPJ informado esta incorreto.",
        },
        {
            email: "loja.pendente2@demo.local",
            nomeUsuario: "Demo Loja Pendente 2",
            nomeFantasia: "Sabor & Cia",
            razaoSocial: "Sabor e Cia LTDA",
            cnpj: "55.555.555/0001-55",
            statusInicial: StatusLojista.PENDENTE,
        },
        {
            email: "loja.pendente3@demo.local",
            nomeUsuario: "Demo Loja Pendente 3",
            nomeFantasia: "Tech Smart",
            razaoSocial: "Tech Smart LTDA",
            cnpj: "66.666.666/0001-66",
            statusInicial: StatusLojista.PENDENTE,
        },
    ] as const;

    for (const loja of lojasDemo) {
        await garantirLojistaDemo({
            ...loja,
            associacaoId: associacao.id,
        });
    }

    // Endereço pronto nas duas lojas do roteiro; "Sabor & Cia" fica sem, para
    // demonstrar o cadastro de endereço ao vivo.
    await garantirEnderecoDemo({
        emailLojista: "loja.pendente@demo.local",
        cep: "15775-000",
        numero: "1250",
        rua: "Avenida Navarro de Andrade",
        bairro: "Centro",
        cidade: "Santa Fé do Sul",
        estado: "São Paulo",
        uf: "SP",
    });
    await garantirEnderecoDemo({
        emailLojista: "loja.aprovada@demo.local",
        cep: "15775-000",
        numero: "480",
        rua: "Rua Nove",
        bairro: "Centro",
        cidade: "Santa Fé do Sul",
        estado: "São Paulo",
        uf: "SP",
    });

    await garantirCategoriasDemo("loja.aprovada@demo.local", [
        "Alimentos",
        "Bebidas",
        "Vestuário",
    ]);
    await garantirCategoriasDemo("loja.pendente@demo.local", ["Vestuário"]);

    await garantirProdutosDemo("loja.aprovada@demo.local", [
        { nome: "Cesta de café da manhã", valor: 89.9, categoria: "Alimentos" },
        { nome: "Vinho tinto seco 750ml", valor: 54.5, categoria: "Bebidas" },
        { nome: "Camiseta algodão premium", valor: 79.9, categoria: "Vestuário" },
    ]);
    await garantirProdutosDemo("loja.pendente@demo.local", [
        { nome: "Óculos de sol polarizado", valor: 249.9, categoria: "Vestuário" },
        { nome: "Armação infantil flexível", valor: 189.0, categoria: "Vestuário" },
    ]);

    await garantirConsumidorDemo({
        email: "cliente1@demo.local",
        nome: "Ana Souza",
        cpf: "111.222.333-44",
        pontos: 320,
        emailLojista: "loja.pendente@demo.local",
    });
    await garantirConsumidorDemo({
        email: "cliente2@demo.local",
        nome: "Bruno Lima",
        cpf: "222.333.444-55",
        pontos: 200,
        emailLojista: "loja.aprovada@demo.local",
    });

    await garantirMissaoDemo("loja.aprovada@demo.local");
    await garantirMissoesVisitarLoja();
    await garantirRecompensasDemo("loja.aprovada@demo.local");

    await garantirCampanhasDemo(associacao.id);

    const pendentes = await prisma.lojista.count({
        where: { associacaoId: associacao.id, status: StatusLojista.PENDENTE },
    });

    console.log("\n=== Credenciais DEMO (somente desenvolvimento) ===");
    console.log(`Senha das contas *@demo.local: ${SENHA_DEMO}`);
    console.log(
        `Pré-cadastros PENDENTE na associação id=${associacao.id}: ${pendentes}`,
    );
    console.log(`${EMAIL_ASSOCIACAO_DEMO}     → ASSOCIACAO`);
    console.log("loja.pendente@demo.local  → LOJISTA PENDENTE (com endereço)");
    console.log("loja.aprovada@demo.local  → LOJISTA APROVADO (com endereço)");
    console.log("loja.rejeitada@demo.local → LOJISTA REJEITADO");
    console.log("loja.pendente2@demo.local → LOJISTA PENDENTE (sem endereço)");
    console.log("Re-seed NÃO altera status de lojistas já existentes.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (erro) => {
        console.error(erro);
        await prisma.$disconnect();
        process.exit(1);
    });
