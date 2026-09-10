import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { civilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { Campanha } from "../../campanha/model/Campanha";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { AdaptadorLeituraNfce } from "../adaptador/AdaptadorLeituraNfce";
import { RespostaCampanhaVigente } from "../dtos/RespostaCampanhaVigente";
import {
    RepositorioProcessamentoNfce,
    ResultadoCreditoNfce,
} from "../repository/RepositorioProcessamentoNfce";
import { formatarCnpj } from "../utils/extrairChaveAcessoNfce";

export type EntradaProcessarNfce = {
    consumidorId: number;
    payloadQr: string;
    /** Se omitido, usa a única campanha vigente em `agora`. */
    campanhaId?: number;
    agora?: Date;
};

export type ResultadoProcessarNfce = ResultadoCreditoNfce & {
    modoSimulado: true;
};

function dataCivilIso(data: Date): string {
    const civil = civilNoFuso(data);
    return `${civil.ano}-${String(civil.mes).padStart(2, "0")}-${String(civil.dia).padStart(2, "0")}`;
}

/**
 * Orquestra elegibilidade G13/G14 + crédito atômico de tickets.
 * Sem SEFAZ real.
 */
export class ServicoProcessarNfce {
    constructor(
        private readonly adaptador: AdaptadorLeituraNfce,
        private readonly repositorioCampanha: RepositorioCampanha,
        private readonly repositorioLojista: RepositorioLojista,
        private readonly repositorioProcessamento: RepositorioProcessamentoNfce,
    ) {}

    async listarCampanhasVigentes(agora: Date = new Date()): Promise<RespostaCampanhaVigente[]> {
        const vigentes = await this.repositorioCampanha.listarVigentesEm(agora);
        return vigentes.map((campanha) => this.paraCampanhaVigente(campanha));
    }

    async processar(entrada: EntradaProcessarNfce): Promise<ResultadoProcessarNfce> {
        if (!Number.isInteger(entrada.consumidorId) || entrada.consumidorId <= 0) {
            throw new ErroAplicacao("Consumidor invalido", 400);
        }
        if (typeof entrada.payloadQr !== "string" || !entrada.payloadQr.trim()) {
            throw new ErroAplicacao("Payload da NFC-e e obrigatorio", 400);
        }

        const agora = entrada.agora ?? new Date();
        const campanha = await this.resolverCampanha(entrada.campanhaId, agora);

        let dadosNfce;
        try {
            dadosNfce = await this.adaptador.ler(entrada.payloadQr.trim());
        } catch (erro) {
            const codigo = erro instanceof Error ? erro.message : "PAYLOAD_NFCE_INVALIDO";
            throw new ErroAplicacao(this.mensagemErroAdaptador(codigo), 400, {
                codigo,
            });
        }

        if (
            dadosNfce.dataEmissao.getTime() < campanha.dataInicio.getTime() ||
            dadosNfce.dataEmissao.getTime() > campanha.dataFim.getTime()
        ) {
            throw new ErroAplicacao("Data da compra fora do periodo da campanha", 400);
        }

        const cnpj = this.normalizarCnpj(dadosNfce.cnpjEmitente);
        const lojista = await this.repositorioLojista.buscarPorCnpj(cnpj);
        if (!lojista) {
            throw new ErroAplicacao("Loja nao cadastrada", 404);
        }
        if (lojista.status !== StatusLojista.APROVADO) {
            throw new ErroAplicacao("Loja nao aprovada", 400);
        }
        if (lojista.associacaoId !== campanha.associacaoId) {
            throw new ErroAplicacao("Loja nao participa desta campanha", 400);
        }

        const credito = await this.repositorioProcessamento.processarComCredito({
            chaveAcesso: dadosNfce.chaveAcesso,
            campanhaId: campanha.id,
            consumidorId: entrada.consumidorId,
            lojistaId: lojista.id,
            valorNota: dadosNfce.valorTotal,
            dataEmissao: dadosNfce.dataEmissao,
            valorPorTicket: campanha.valorPorTicket,
        });

        return {
            ...credito,
            modoSimulado: true,
        };
    }

    private paraCampanhaVigente(campanha: Campanha): RespostaCampanhaVigente {
        return {
            id: campanha.id,
            nome: campanha.nome,
            dataInicioCivil: dataCivilIso(campanha.dataInicio),
            dataFimCivil: dataCivilIso(campanha.dataFim),
            valorPorTicket: campanha.valorPorTicket,
        };
    }

    private async resolverCampanha(campanhaId: number | undefined, agora: Date) {
        if (campanhaId !== undefined) {
            if (!Number.isInteger(campanhaId) || campanhaId <= 0) {
                throw new ErroAplicacao("ID da campanha invalido", 400);
            }
            const campanha = await this.repositorioCampanha.buscar(campanhaId);
            if (!campanha) {
                throw new ErroAplicacao("Campanha nao encontrada", 404);
            }
            return campanha;
        }

        const vigentes = await this.repositorioCampanha.listarVigentesEm(agora);
        if (vigentes.length === 0) {
            throw new ErroAplicacao("Nenhuma campanha vigente", 404);
        }
        if (vigentes.length > 1) {
            throw new ErroAplicacao("Informe a campanha", 400, {
                campanhasVigentes: vigentes.map((c) => c.id),
            });
        }
        return vigentes[0]!;
    }

    private normalizarCnpj(cnpj: string): string {
        try {
            return formatarCnpj(cnpj.replace(/\D/g, ""));
        } catch {
            throw new ErroAplicacao("CNPJ da nota invalido", 400);
        }
    }

    private mensagemErroAdaptador(codigo: string): string {
        switch (codigo) {
            case "PAYLOAD_NFCE_VAZIO":
                return "Payload da NFC-e e obrigatorio";
            case "NFCE_DEMO_NAO_ENCONTRADA":
                return "Nota demo nao encontrada";
            case "CHAVE_NFCE_INVALIDA":
            case "CHAVE_NFCE_NAO_ENCONTRADA":
                return "Chave de acesso da NFC-e invalida";
            case "URI_NFCE_DEMO_INVALIDA":
                return "URI demo da NFC-e invalida";
            case "VALOR_NFCE_INVALIDO":
                return "Valor da NFC-e invalido";
            case "DATA_NFCE_INVALIDA":
                return "Data de emissao da NFC-e invalida";
            default:
                return "Nao foi possivel ler a NFC-e";
        }
    }
}
