/** Resposta enxuta para o consumidor escolher campanha ao processar NFC-e. */
export type RespostaCampanhaVigente = {
    id: number;
    nome: string;
    dataInicioCivil: string;
    dataFimCivil: string;
    valorPorTicket: number;
};
