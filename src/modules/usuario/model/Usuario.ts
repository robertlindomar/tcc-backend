import { AppError } from "../../../shared/errors/AppError";
import { Role } from "../../auth/enum/Role";

type UsuarioProps = {
    id: number;
    nome: string;
    email: string;
    senha: string;
    role: Role;
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export class Usuario {
    private readonly props: UsuarioProps;

    constructor(props: UsuarioProps) {
        if (!props.nome.trim()) {
            throw new AppError("Nome do usuario é obrigatório");
        }

        if (!props.email.trim()) {
            throw new AppError("Email do usuario é obrigatório");
        }

        if (!props.senha.trim()) {
            throw new AppError("Senha do usuario é obrigatória");
        }

        this.props = props;
    }

    get id() {
        return this.props.id;
    }

    get nome() {
        return this.props.nome;
    }

    get email() {
        return this.props.email;
    }

    get senha() {
        return this.props.senha;
    }

    get role() {
        return this.props.role;
    }

    get ativo() {
        return this.props.ativo;
    }

    get createdAt() {
        return this.props.createdAt;
    }

    get updatedAt() {
        return this.props.updatedAt;
    }
}
