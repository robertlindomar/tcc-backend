export interface EnderecoResponse {
    id: number;
    cep: string;
    numero: string | null;
    usuarioId: number;
    rua: {
        id: number;
        nome: string;
    };
    bairro: {
        id: number;
        nome: string;
    };
    cidade: {
        id: number;
        nome: string;
    };
    estado: {
        id: number;
        nome: string;
        uf: string;
    };
    dataCriacao: Date;
    dataAtualizacao: Date;
}
