import { RequisicaoCriarUsuario } from "../../usuario/dtos/RequisicaoCriarUsuario";
import { RespostaUsuario } from "../../usuario/dtos/RespostaUsuario";
import { ServicoUsuario } from "../../usuario/service/ServicoUsuario";
import { RequisicaoCadastro } from "../dto/RequisicaoCadastro";

export class ServicoCadastro {
    constructor(private readonly servicoUsuario: ServicoUsuario) {}

    async executar(request: RequisicaoCadastro): Promise<RespostaUsuario> {
        const criarRequest: RequisicaoCriarUsuario = {
            nome: request.nome,
            email: request.email,
            senha: request.senha,
            role: request.role,
        };

        return this.servicoUsuario.criar(criarRequest);
    }
}
