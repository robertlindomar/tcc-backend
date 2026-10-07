import { calcularDataLimiteSorteio, prazoSorteioEncerrado } from "../utils/prazoSorteio";
import { resolverConsumidorLogado } from "../../../shared/authz/resolverConsumidorLogado";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { RepositorioConsumidor } from "../../consumidor/repository/RepositorioConsumidor";
import { RepositorioAvisoSorteio } from "./RepositorioAvisoSorteio";

export class ServicoAvisoSorteio {
    constructor(
        private readonly repositorio: RepositorioAvisoSorteio,
        private readonly consumidores: RepositorioConsumidor,
        private readonly agora: () => Date = () => new Date(),
    ) {}

    async listar(usuarioId: number) {
        const { consumidorId } = await resolverConsumidorLogado(this.consumidores, usuarioId);
        const resultados = await this.repositorio.listarVisiveis(consumidorId);
        return resultados.map((resultado) => ({
            resultadoId: resultado.id,
            sorteioId: resultado.sorteio.id,
            campanha: {
                id: resultado.sorteio.campanha.id,
                nome: resultado.sorteio.campanha.nome,
                descricao: resultado.sorteio.campanha.descricao,
            },
            associacao: resultado.sorteio.campanha.associacao.nomeFantasia,
            numeroSorteado: resultado.numeroSorteado,
            nomeVencedor: resultado.ticket.consumidor.usuario.nome,
            souVencedor: resultado.ticket.consumidorId === consumidorId,
            situacao: resultado.situacao,
            dataSorteio: resultado.dataSorteio,
            dataConfirmacaoLeitura: resultado.dataConfirmacaoLeitura,
            dataLimiteRetirada: calcularDataLimiteSorteio(resultado.dataSorteio),
            prazoEncerrado: prazoSorteioEncerrado(resultado.dataSorteio, this.agora()),
        }));
    }

    async confirmarLeitura(usuarioId: number, idParam: string) {
        const { consumidorId } = await resolverConsumidorLogado(this.consumidores, usuarioId);
        const id = Number(idParam);
        if (!Number.isSafeInteger(id) || id <= 0) throw new ErroAplicacao("ID do resultado invalido", 400);
        const resultado = await this.repositorio.buscar(id);
        if (!resultado || resultado.ticket.consumidorId !== consumidorId) {
            throw new ErroAplicacao("Premio nao encontrado para o consumidor", 404);
        }
        if (resultado.situacao !== "AGUARDANDO_ENTREGA") {
            throw new ErroAplicacao("Resultado nao esta aguardando retirada", 409);
        }
        const agora = this.agora();
        if (prazoSorteioEncerrado(resultado.dataSorteio, agora)) {
            throw new ErroAplicacao("Prazo de sete dias encerrado", 409, { codigo: "PRAZO_RETIRADA_ENCERRADO" });
        }
        const atualizado = await this.repositorio.confirmarLeitura(id, consumidorId, agora);
        if (!atualizado || atualizado.situacao !== "AGUARDANDO_ENTREGA" || !atualizado.dataConfirmacaoLeitura) {
            throw new ErroAplicacao("Resultado mudou; atualize o aviso", 409);
        }
        return { dataConfirmacaoLeitura: atualizado.dataConfirmacaoLeitura };
    }

    async ocultar(usuarioId: number, idParam: string): Promise<void> {
        const { consumidorId } = await resolverConsumidorLogado(this.consumidores, usuarioId);
        const id = Number(idParam);
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new ErroAplicacao("ID do resultado invalido", 400);
        }
        const resultado = await this.repositorio.buscar(id);
        if (!resultado || resultado.situacao === "CANCELADO") {
            throw new ErroAplicacao("Resultado do sorteio nao encontrado", 404);
        }
        if (resultado.ticket.consumidorId === consumidorId &&
            resultado.situacao === "AGUARDANDO_ENTREGA" &&
            !resultado.dataConfirmacaoLeitura &&
            !prazoSorteioEncerrado(resultado.dataSorteio, this.agora())) {
            throw new ErroAplicacao("Confirme que viu o resultado antes de ocultar o aviso", 409);
        }
        await this.repositorio.ocultar(id, consumidorId);
    }
}
