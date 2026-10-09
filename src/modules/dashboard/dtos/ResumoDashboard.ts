export type TipoAtividadeDashboard =
    | "LOJA_PENDENTE"
    | "LOJA_APROVADA"
    | "CAMPANHA_CRIADA"
    | "SORTEIO_CRIADO";

export interface AtividadeDashboard {
    tipo: TipoAtividadeDashboard;
    entidadeId: number;
    titulo: string;
    ocorridoEm: string;
}

export interface ResumoDashboard {
    metricas: {
        lojasAguardandoAprovacao: number;
        campanhasCadastradas: number;
        sorteiosCadastrados: number;
        totalLojasParticipantes: number;
    };
    atividadesRecentes: AtividadeDashboard[];
}
