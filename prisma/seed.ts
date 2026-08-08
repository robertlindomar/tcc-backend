import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definida");
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
});

const NOMES_SEXO = ["Masculino", "Feminino"] as const;

async function main() {
    for (const nome of NOMES_SEXO) {
        const existente = await prisma.sexo.findFirst({
            where: { nome },
        });

        if (existente) {
            console.log(`Sexo já existe: ${nome} (id=${existente.id})`);
            continue;
        }

        const criado = await prisma.sexo.create({
            data: { nome },
        });
        console.log(`Sexo cadastrado: ${nome} (id=${criado.id})`);
    }
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
