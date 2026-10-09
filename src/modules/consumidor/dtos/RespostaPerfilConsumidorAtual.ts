import { Role } from "../../auth/enum/Role";

/** Perfil usado pelo consumidor autenticado. Não expõe o vínculo legado com lojista. */
export interface RespostaPerfilConsumidorAtual {
    usuario: {
        id: number;
        nome: string;
        email: string;
        role: Role.CONSUMIDOR;
        ativo: boolean;
        dataCriacao: Date;
        dataAtualizacao: Date;
    };
    consumidor: {
        id: number;
        cpf: string;
        pontos: number;
        nivel: number;
        sexoId: number | null;
        usuarioId: number;
        dataCriacao: Date;
        dataAtualizacao: Date;
    };
}
