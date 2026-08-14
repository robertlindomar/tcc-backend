import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { StatusLojista } from "../src/generated/prisma/enums.js";

/**
 * Devolve as lojas *@demo.local ao estado inicial da apresentação, para o
 * roteiro (aprovar um pré-cadastro) poder ser repetido. Só toca em contas demo.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
});

const STATUS_INICIAL = {
    "loja.pendente@demo.local": StatusLojista.PENDENTE,
    "loja.aprovada@demo.local": StatusLojista.APROVADO,
    "loja.rejeitada@demo.local": StatusLojista.REJEITADO,
    "loja.pendente2@demo.local": StatusLojista.PENDENTE,
    "loja.pendente3@demo.local": StatusLojista.PENDENTE,
} as const;

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
