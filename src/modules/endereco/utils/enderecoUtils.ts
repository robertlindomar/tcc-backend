import { AppError } from "../../../shared/errors/AppError";

export function normalizarCep(cep: string): string {
    const digitos = cep.replace(/\D/g, "");

    if (digitos.length !== 8) {
        throw new AppError("CEP invalido");
    }

    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export function parseId(idParam: string, mensagem = "ID invalido"): number {
    const id = Number(idParam);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(mensagem, 400);
    }

    return id;
}

export function resolverNomeRua(logradouro: string): string {
    const nome = logradouro.trim();
    return nome.length > 0 ? nome : "S/N";
}
