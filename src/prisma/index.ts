import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não está definida");
}

const adapter = new PrismaPg(connectionString);

const prismaClient = new PrismaClient({
    adapter,
});

/** Tipo do cliente com delegates do schema atual; use nos repositorios para o language service reconhecer `usuario`, etc. */
export type AppPrismaClient = typeof prismaClient;

export default prismaClient;
