export interface RespostaConsumidor {
    id: number;
    cpf: string;
    pontos: number;
    nivel: number;
    sexoId: number | null;
    lojistaId: number | null;
    usuarioId: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
