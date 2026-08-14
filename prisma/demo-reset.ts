import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Role, StatusLojista } from "../src/generated/prisma/enums.js";

/**
 * Devolve contas *@demo.local ao estado inicial da apresentação.
 * Só toca em usuários cujo e-mail termina com @demo.local.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
});

const SUFIXO_DEMO = "@demo.local";

const STATUS_INICIAL = {
    "loja.pendente@demo.local": StatusLojista.PENDENTE,
    "loja.aprovada@demo.local": StatusLojista.APROVADO,
    "loja.rejeitada@demo.local": StatusLojista.REJEITADO,
    "loja.pendente2@demo.local": StatusLojista.PENDENTE,
    "loja.pendente3@demo.local": StatusLojista.PENDENTE,
} as const;

const PONTOS_CONSUMIDOR_DEMO: Record<string, number> = {
    "cliente1@demo.local": 320,
    "cliente2@demo.local": 200,
};

function nivelDePontos(pontos: number): number {
    return Math.floor(pontos / 100) + 1;
}

async function main() {
    for (const [email, status] of Object.entries(STATUS_INICIAL)) {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) {
            console.log(`Conta demo ausente: ${email} (rode npm run db:seed)`);
            continue;
        }

        const lojista = await prisma.lojista.findUnique({
            where: { usuarioId: usuario.id },
        });
        if (!lojista) {
            console.log(`Sem perfil de loja: ${email}`);
            continue;
        }

        if (lojista.status === status) {
            console.log(`${lojista.nomeFantasia}: já está ${status}`);
            continue;
        }

        await prisma.lojista.update({
            where: { id: lojista.id },
            data: { status },
        });
        console.log(`${lojista.nomeFantasia}: ${lojista.status} → ${status}`);
    }

    const consumidoresDemo = await prisma.consumidor.findMany({
        where: {
            usuario: {
                email: { endsWith: SUFIXO_DEMO },
                role: Role.CONSUMIDOR,
            },
        },
        select: {
            id: true,
            usuario: { select: { email: true } },
        },
    });
    const idsConsumidorDemo = consumidoresDemo.map((item) => item.id);

    if (idsConsumidorDemo.length > 0) {
        const removidos = await prisma.resgateRecompensa.deleteMany({
            where: { consumidorId: { in: idsConsumidorDemo } },
        });
        console.log(
            `Resgates de consumidores *@demo.local removidos: ${removidos.count}`,
        );
    }

    for (const [email, pontos] of Object.entries(PONTOS_CONSUMIDOR_DEMO)) {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) {
            continue;
        }
        const consumidor = await prisma.consumidor.findUnique({
            where: { usuarioId: usuario.id },
        });
        if (!consumidor) {
            continue;
        }
        await prisma.consumidor.update({
            where: { id: consumidor.id },
            data: { pontos, nivel: nivelDePontos(pontos) },
        });
        console.log(`${email}: pontos restaurados para ${pontos}`);
    }

    console.log("\nRoteiro pronto para ser apresentado novamente.");
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
