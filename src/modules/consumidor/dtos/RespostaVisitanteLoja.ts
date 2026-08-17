export interface RespostaVisitanteLoja {
    id: number;
    nome: string;
    quantidadeVisitas: number;
    primeiraVisita: Date;
    ultimaVisita: Date;
}

export interface RespostaListagemVisitantesLoja {
    consumidores: RespostaVisitanteLoja[];
    consumidoresUnicos: number;
    totalVisitas: number;
}
