import { Role } from "../../auth/enum/Role";

export interface RespostaUsuario {
    id: number;
    nome: string;
    email: string;
    role: Role;
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
}
