export interface DTOCadastroConsumidor {
    nome: string;
    email: string;
    senha: string;
    cpf: string;
    cep: string;
    numero?: string | null;
    sexoId?: number | null;
}
