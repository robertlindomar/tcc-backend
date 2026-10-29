export interface RespostaProgressoConsumidor {
    /** Saldo atual, gastável em recompensas. */
    pontos: number;
    pontosGastos: number;
    /** Total já ganho; nunca diminui ao resgatar. */
    xp: number;
    nivel: number;
    xpInicioNivel: number;
    xpProximoNivel: number;
    missoesConcluidas: number;
    lojasVisitadas: number;
    notasLidas: number;
    resgates: number;
    /** Tickets na edição atual das campanhas ativas. */
    ticketsCampanhasAtivas: number;
}
