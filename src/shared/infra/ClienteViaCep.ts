import { ErroAplicacao } from "../erros/ErroAplicacao";

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

export class ClienteViaCep {
    private static readonly BASE_URL = "https://viacep.com.br/ws";

    async buscarPorCep(cep: string): Promise<RespostaViaCep> {
        const cepSomenteDigitos = cep.replace(/\D/g, "");

        if (cepSomenteDigitos.length !== 8) {
            throw new ErroAplicacao("CEP invalido");
        }

        try {
            const response = await fetch(
                `${ClienteViaCep.BASE_URL}/${cepSomenteDigitos}/json/`,
            );

            if (!response.ok) {
                throw new ErroAplicacao("Erro ao consultar CEP", 502);
            }

            const dados = (await response.json()) as RespostaViaCep;

            if (dados.erro || !dados.uf || !dados.localidade) {
                throw new ErroAplicacao("CEP nao encontrado", 404);
            }

            return dados;
        } catch (error) {
            if (error instanceof ErroAplicacao) {
                throw error;
            }

            throw new ErroAplicacao("Erro ao consultar CEP", 502);
        }
    }
}
