import { StatusVigenciaPromocao } from "../../../shared/utils/calcularStatusVigenciaPromocao";

export interface RespostaPromocao {
    id: number;
    descricao: string | null;
    /** number — Decimal Prisma serializado via Number() */
    preco: number;
    produtoId: number;
    ativa: boolean;
    dataInicio: Date;
    dataFim: Date;
    statusVigencia: StatusVigenciaPromocao;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
