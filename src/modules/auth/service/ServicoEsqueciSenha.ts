import bcrypt from "bcryptjs";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioUsuario } from "../../usuario/repository/RepositorioUsuario";
import { RequisicaoEsqueciSenha } from "../dto/RequisicaoEsqueciSenha";
import { Role } from "../enum/Role";

export const SENHA_PADRAO_TESTE = "senha123";

/**
 * Redefinição provisória sem e-mail: qualquer pessoa que conheça o e-mail troca a senha,
 * por isso só funciona com REDEFINICAO_SENHA_TESTE=true e apenas para consumidores.
 */
export class ServicoEsqueciSenha {
    constructor(private readonly repositorioUsuario: RepositorioUsuario) {}

    async executar(request: RequisicaoEsqueciSenha): Promise<{ mensagem: string }> {
        if (process.env.REDEFINICAO_SENHA_TESTE !== "true") {
            throw new ErroAplicacao("Redefinicao de senha indisponivel", 403);
        }

        const email = request.email?.trim();
        if (!email) {
            throw new ErroAplicacao("Email e obrigatorio", 400);
        }

        const usuario = await this.repositorioUsuario.buscarPorEmail(email);
        if (!usuario || usuario.role !== Role.CONSUMIDOR) {
            throw new ErroAplicacao("Conta de consumidor nao encontrada", 404);
        }

        const senhaHash = await bcrypt.hash(SENHA_PADRAO_TESTE, 10);
        await this.repositorioUsuario.atualizarSenha(usuario.id, senhaHash);

        return { mensagem: `Senha redefinida para ${SENHA_PADRAO_TESTE}` };
    }
}
