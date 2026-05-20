import { AppError } from "../errors/AppError";

export type RespostaViaCep = {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    estado: string;
    erro?: boolean;
};

export class ViaCepClient {
    private static readonly BASE_URL = "https://viacep.com.br/ws";

    async buscarPorCep(cep: string): Promise<RespostaViaCep> {
        const cepSomenteDigitos = cep.replace(/\D/g, "");

        if (cepSomenteDigitos.length !== 8) {
            throw new AppError("CEP invalido");
        }

        try {
            const response = await fetch(
                `${ViaCepClient.BASE_URL}/${cepSomenteDigitos}/json/`,
            );

            if (!response.ok) {
                throw new AppError("Erro ao consultar CEP", 502);
            }

            const dados = (await response.json()) as RespostaViaCep;

            if (dados.erro || !dados.uf || !dados.localidade) {
                throw new AppError("CEP nao encontrado", 404);
            }

            return dados;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Erro ao consultar CEP", 502);
        }
    }
}
