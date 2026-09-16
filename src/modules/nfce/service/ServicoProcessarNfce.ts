import { StatusLojista } from "../../../generated/prisma/enums";
import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";
import { civilNoFuso } from "../../../shared/tempo/fusoNegocio";
import { Campanha } from "../../campanha/model/Campanha";
import { RepositorioCampanha } from "../../campanha/repository/RepositorioCampanha";
import { RepositorioLojista } from "../../lojista/repository/RepositorioLojista";
import { AdaptadorNfce, NfceConsultada } from "../adaptador/AdaptadorNfce";
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
    modoSimulado: boolean;
    provider: NfceConsultada["provider"];
    statusFiscal: NfceConsultada["status"];
};

function dataCivilIso(data: Date): string {
    const civil = civilNoFuso(data);
    return `${civil.ano}-${String(civil.mes).padStart(2, "0")}-${String(civil.dia).padStart(2, "0")}`;
}

/**
 * Orquestra elegibilidade G13/G14 + crédito atômico de tickets.
 * Depende de AdaptadorNfce (simulado ou SEFAZ) — sem acoplamento a UF.
 */
export class ServicoProcessarNfce {
    constructor(
        private readonly adaptador: AdaptadorNfce,
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

        let dadosNfce: NfceConsultada;
        try {
            dadosNfce = await this.adaptador.consultar(entrada.payloadQr.trim());
        } catch (erro) {
            const codigo = erro instanceof Error ? erro.message : "PAYLOAD_NFCE_INVALIDO";
            throw this.erroDeCodigoAdaptador(codigo);
        }

        if (dadosNfce.status === "CANCELADA") {
            throw new ErroAplicacao("NFC-e cancelada", 400, { codigo: "NFCE_CANCELADA" });
        }
        if (dadosNfce.status !== "AUTORIZADA") {
            throw new ErroAplicacao("NFC-e nao autorizada", 400, {
                codigo: "NFCE_NAO_AUTORIZADA",
            });
        }

        if (dadosNfce.valorTotal === null || dadosNfce.dataEmissao === null) {
            throw new ErroAplicacao(
                "Valor ou data da NFC-e indisponiveis na fonte oficial consultada",
                422,
                { codigo: "SEFAZ_VALOR_INDISPONIVEL" },
            );
        }

        if (
            !Number.isFinite(dadosNfce.valorTotal) ||
            dadosNfce.valorTotal < 0
        ) {
            throw new ErroAplicacao("Valor da NFC-e invalido", 400, {
                codigo: "VALOR_NFCE_INVALIDO",
            });
        }

        if (
            dadosNfce.dataEmissao.getTime() < campanha.dataInicio.getTime() ||
            dadosNfce.dataEmissao.getTime() > campanha.dataFim.getTime()
        ) {
            throw new ErroAplicacao("Data da compra fora do periodo da campanha", 400, {
                codigo: "NFCE_FORA_PERIODO",
            });
        }

        const cnpj = this.normalizarCnpj(dadosNfce.cnpjEmitente);
        const lojista = await this.repositorioLojista.buscarPorCnpj(cnpj);
        if (!lojista) {
            throw new ErroAplicacao("Loja nao cadastrada", 404, {
                codigo: "NFCE_LOJISTA_NAO_PARTICIPANTE",
            });
        }
        if (lojista.status !== StatusLojista.APROVADO) {
            throw new ErroAplicacao("Loja nao aprovada", 400, {
                codigo: "NFCE_LOJISTA_NAO_APROVADO",
            });
        }
        if (lojista.associacaoId !== campanha.associacaoId) {
            throw new ErroAplicacao("Loja nao participa desta campanha", 400, {
                codigo: "NFCE_LOJISTA_NAO_PARTICIPANTE",
            });
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
            modoSimulado: dadosNfce.provider === "simulado",
            provider: dadosNfce.provider,
            statusFiscal: dadosNfce.status,
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

    private erroDeCodigoAdaptador(codigo: string): ErroAplicacao {
        const mapa: Record<string, { msg: string; status: number }> = {
            PAYLOAD_NFCE_VAZIO: { msg: "Payload da NFC-e e obrigatorio", status: 400 },
            NFCE_DEMO_NAO_ENCONTRADA: { msg: "Nota demo nao encontrada", status: 400 },
            CHAVE_NFCE_INVALIDA: { msg: "Chave de acesso da NFC-e invalida", status: 400 },
            CHAVE_NFCE_NAO_ENCONTRADA: { msg: "Chave de acesso da NFC-e invalida", status: 400 },
            CHAVE_NFCE_DV_INVALIDO: { msg: "Chave de acesso da NFC-e invalida", status: 400 },
            CHAVE_NFCE_MODELO_INVALIDO: { msg: "NFC-e deve ser modelo 65", status: 400 },
            CHAVE_NFCE_UF_INVALIDA: { msg: "UF da chave NFC-e invalida", status: 400 },
            URI_NFCE_DEMO_INVALIDA: { msg: "URI demo da NFC-e invalida", status: 400 },
            VALOR_NFCE_INVALIDO: { msg: "Valor da NFC-e invalido", status: 400 },
            DATA_NFCE_INVALIDA: { msg: "Data de emissao da NFC-e invalida", status: 400 },
            NFCE_NAO_ENCONTRADA: { msg: "NFC-e nao encontrada", status: 404 },
            NFCE_NAO_AUTORIZADA: { msg: "NFC-e nao autorizada", status: 400 },
            NFCE_CANCELADA: { msg: "NFC-e cancelada", status: 400 },
            NFCE_UF_NAO_SUPORTADA: { msg: "UF da NFC-e ainda nao suportada", status: 400 },
            NFCE_PROVIDER_DEMO_SOMENTE_SIMULADO: {
                msg: "URI demo so e aceita com NFCE_PROVIDER=simulado",
                status: 400,
            },
            SEFAZ_CERTIFICADO_AUSENTE: {
                msg: "Certificado SEFAZ nao configurado",
                status: 503,
            },
            SEFAZ_CERTIFICADO_INVALIDO: {
                msg: "Certificado SEFAZ invalido",
                status: 503,
            },
            SEFAZ_INDISPONIVEL: { msg: "SEFAZ indisponivel", status: 503 },
            SEFAZ_TIMEOUT: { msg: "Timeout na consulta SEFAZ", status: 503 },
            SEFAZ_RESPOSTA_INVALIDA: { msg: "Resposta SEFAZ invalida", status: 502 },
            SEFAZ_HOST_NAO_PERMITIDO: { msg: "Host de consulta NFC-e nao permitido", status: 400 },
            SEFAZ_IP_PRIVADO: { msg: "Host de consulta NFC-e nao permitido", status: 400 },
            SEFAZ_PROTOCOLO_INVALIDO: { msg: "Protocolo de consulta invalido", status: 400 },
            SEFAZ_RESPOSTA_GRANDE: { msg: "Resposta SEFAZ invalida", status: 502 },
            SEFAZ_REDIRECT_BLOQUEADO: { msg: "Redirect SEFAZ bloqueado", status: 502 },
            SEFAZ_DNS_FALHOU: { msg: "SEFAZ indisponivel", status: 503 },
            QR_NFCE_PROTOCOLO_INVALIDO: { msg: "QR Code NFC-e invalido", status: 400 },
        };

        const item = mapa[codigo] ?? {
            msg: "Nao foi possivel ler a NFC-e",
            status: 400,
        };
        return new ErroAplicacao(item.msg, item.status, { codigo });
    }
}
