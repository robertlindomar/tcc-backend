import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RespostaUsuario } from "../../usuario/dtos/RespostaUsuario";
import { Usuario } from "../../usuario/model/Usuario";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { RequisicaoLogin } from "../dto/RequisicaoLogin";
import { RespostaLogin } from "../dto/RespostaLogin";

const JWT_EXPIRES_IN = "1d";

export class ServicoLogin {
    constructor(private readonly repositorioUsuario: RepositorioUsuario) {}

    async executar(request: RequisicaoLogin): Promise<RespostaLogin> {
        if (!request.email?.trim() || !request.senha?.trim()) {
            throw new ErroAplicacao("Email e senha sao obrigatorios", 400);
        }

        const usuario = await this.repositorioUsuario.buscarPorEmail(request.email.trim());
        if (!usuario) {
            throw new ErroAplicacao("Credenciais invalidas", 401);
        }

        const senhaValida = await bcrypt.compare(request.senha, usuario.senha);
        if (!senhaValida) {
            throw new ErroAplicacao("Credenciais invalidas", 401);
        }

        if (!usuario.ativo) {
            throw new ErroAplicacao("Usuario inativo. Contate o administrador.", 403);
        }

        const secret = process.env.SECRET_KEY;
        if (!secret) {
            throw new ErroAplicacao("SECRET_KEY nao configurada", 500);
        }

        const token = jwt.sign(
            { sub: usuario.id, role: usuario.role },
            secret,
            { expiresIn: JWT_EXPIRES_IN },
        );

        return {
            token,
            usuario: this.paraResposta(usuario),
        };
    }

    private paraResposta(usuario: Usuario): RespostaUsuario {
        return {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            ativo: usuario.ativo,
            createdAt: usuario.createdAt,
            updatedAt: usuario.updatedAt,
        };
    }
}
