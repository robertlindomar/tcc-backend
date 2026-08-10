import { ResumoDashboard } from "../dtos/ResumoDashboard";
import { RepositorioDashboard } from "../repository/RepositorioDashboard";

const LIMITE_ATIVIDADES = 10;

export class ServicoDashboard {
    constructor(private readonly repositorioDashboard: RepositorioDashboard) {}

    async resumo(associacaoId: number): Promise<ResumoDashboard> {
        const [
            lojasAguardandoAprovacao,
            campanhasCadastradas,
            sorteiosCadastrados,
            totalLojasParticipantes,
            candidatos,
        ] = await Promise.all([
            this.repositorioDashboard.contarLojasAguardandoAprovacao(associacaoId),
            this.repositorioDashboard.contarCampanhasCadastradas(associacaoId),
            this.repositorioDashboard.contarSorteiosCadastrados(associacaoId),
            this.repositorioDashboard.contarLojasParticipantes(associacaoId),
            this.repositorioDashboard.listarCandidatosAtividades(associacaoId),
        ]);

        const atividadesRecentes = [...candidatos]
            .sort((a, b) => b.ocorridoEm.getTime() - a.ocorridoEm.getTime())
            .slice(0, LIMITE_ATIVIDADES)
            .map((item) => ({
                tipo: item.tipo,
                entidadeId: item.entidadeId,
                titulo: item.titulo,
                ocorridoEm: item.ocorridoEm.toISOString(),
            }));

        return {
            metricas: {
                lojasAguardandoAprovacao,
                campanhasCadastradas,
                sorteiosCadastrados,
                totalLojasParticipantes,
            },
            atividadesRecentes,
        };
    }
}
