import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Role, StatusLojista } from "../src/generated/prisma/enums.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
});

const SENHA_DEMO = "senha123";

/** Preferência: conta que você já usa no navegador. */
const EMAILS_ASSOCIACAO_DEMO = ["associacao@gmail.com"] as const;

const NOMES_SEXO = ["Masculino", "Feminino"] as const;
const NOMES_CATEGORIA = [
    "Alimentos",
    "Bebidas",
    "Vestuário",
    "Eletrônicos",
    "Serviços",
] as const;

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
    for (const email of EMAILS_ASSOCIACAO_DEMO) {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || usuario.role !== Role.ASSOCIACAO) {
            continue;
        }
        const associacao = await prisma.associacao.findUnique({
            where: { usuarioId: usuario.id },
        });
        if (associacao) {
            console.log(
                `Associação alvo: id=${associacao.id} (${associacao.nomeFantasia}) via ${email}`,
            );
            return associacao;
        }
    }

    const usuarioAssoc = await garantirUsuario({
        email: "associacao@gmail.com",
        nome: "Associação Demo",
        role: Role.ASSOCIACAO,
    });
    let associacao = await prisma.associacao.findUnique({
        where: { usuarioId: usuarioAssoc.id },
    });
    if (!associacao) {
        associacao = await prisma.associacao.create({
            data: {
                nomeFantasia: "Associação Comercial de Santa Fé do Sul",
                razaoSocial: "Associacao Comercial de Santa Fe do Sul",
                cnpj: "11.111.111/0001-11",
                inscricaoEstadual: null,
                usuarioId: usuarioAssoc.id,
            },
        });
        console.log(`Associação demo criada (id=${associacao.id})`);
    }
    return associacao;
}

async function garantirLojistaDemo(dados: {
    email: string;
    nomeUsuario: string;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    statusInicial: (typeof StatusLojista)[keyof typeof StatusLojista];
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

    for (const nome of NOMES_CATEGORIA) {
        const existente = await prisma.categoria.findFirst({ where: { nome } });
        if (existente) {
            console.log(`Categoria já existe: ${nome} (id=${existente.id})`);
            continue;
        }
        const criada = await prisma.categoria.create({ data: { nome } });
        console.log(`Categoria cadastrada: ${nome} (id=${criada.id})`);
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

    const pendentes = await prisma.lojista.count({
        where: { associacaoId: associacao.id, status: StatusLojista.PENDENTE },
    });

    console.log("\n=== Credenciais DEMO (somente desenvolvimento) ===");
    console.log(`Senha das contas *@demo.local: ${SENHA_DEMO}`);
    console.log(
        `Pré-cadastros PENDENTE na associação id=${associacao.id}: ${pendentes}`,
    );
    console.log("Associação (única): associacao@gmail.com");
    console.log("loja.pendente@demo.local  → LOJISTA PENDENTE");
    console.log("loja.aprovada@demo.local  → LOJISTA APROVADO");
    console.log("loja.rejeitada@demo.local → LOJISTA REJEITADO");
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
