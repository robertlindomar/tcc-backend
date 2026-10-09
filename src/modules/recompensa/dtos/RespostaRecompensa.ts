import { SituacaoRecompensa } from "../utils/calcularSituacaoRecompensa";

export interface RespostaRecompensa {
    id: number;
    nome: string;
    descricao: string | null;
    custoPontos: number;
    ativa: boolean;
    estoque: number | null;
    dataFim: Date | null;
    dataFimCivil: string | null;
    situacao: SituacaoRecompensa;
    lojistaId: number;
    nomeLoja?: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
