/**
 * Contas de demonstração (seed, demo-reset, documentação).
 * Senha padrão: senha123
 */
export const SENHA_DEMO = "senha123";

export const EMAILS_DEMO = {
    ASSOCIACAO: "associacao@gmail.com",
    LOJISTA1: "lojista1@gmail.com",
    LOJISTA2: "lojista2@gmail.com",
    LOJISTA3: "lojista3@gmail.com",
    LOJISTA4: "lojista4@gmail.com",
    USUARIO1: "usuario1@gmail.com",
    USUARIO2: "usuario2@gmail.com",
    USUARIO3: "usuario3@gmail.com",
    USUARIO4: "usuario4@gmail.com",
} as const;

/** E-mails legados @demo.local → novos @gmail.com (migração VPS). */
export const MAPEAMENTO_EMAILS_ANTIGOS: Record<string, string> = {
    "associacao@demo.local": EMAILS_DEMO.ASSOCIACAO,
    "loja.aprovada@demo.local": EMAILS_DEMO.LOJISTA1,
    "loja.pendente@demo.local": EMAILS_DEMO.LOJISTA2,
    "loja.rejeitada@demo.local": EMAILS_DEMO.LOJISTA3,
    "loja.pendente2@demo.local": EMAILS_DEMO.LOJISTA4,
    "cliente1@demo.local": EMAILS_DEMO.USUARIO1,
    "cliente2@demo.local": EMAILS_DEMO.USUARIO2,
};

export const LISTA_EMAILS_DEMO: string[] = Object.values(EMAILS_DEMO);
