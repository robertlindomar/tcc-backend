import { randomBytes } from "node:crypto";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { ArmazenamentoArquivo } from "./ArmazenamentoArquivo";
import {
    TAMANHO_MAXIMO_IMAGEM_BYTES,
    extensaoPorTipo,
    identificarTipoImagem,
} from "./regrasImagem";

export class ServicoUploadImagem {
    constructor(private readonly armazenamento: ArmazenamentoArquivo) {}

    async gravar(pasta: string, buffer: Buffer): Promise<string> {
        if (!buffer?.length) {
            throw new ErroAplicacao("Arquivo de imagem e obrigatorio", 400);
        }
        if (buffer.length > TAMANHO_MAXIMO_IMAGEM_BYTES) {
            throw new ErroAplicacao("Arquivo excede o limite de 2MB", 400);
        }
        const tipo = identificarTipoImagem(buffer);
        if (!tipo) {
            throw new ErroAplicacao("Formato de imagem nao permitido", 400);
        }
        const nome = `${randomBytes(16).toString("hex")}.${extensaoPorTipo(tipo)}`;
        return this.armazenamento.gravar(pasta, nome, buffer);
    }

    async substituir(
        pasta: string,
        buffer: Buffer,
        urlAnterior: string | null | undefined,
    ): Promise<string> {
        const novaUrl = await this.gravar(pasta, buffer);
        await this.armazenamento.removerSeExistir(urlAnterior);
        return novaUrl;
    }

    async remover(urlPublica: string | null | undefined): Promise<void> {
        await this.armazenamento.removerSeExistir(urlPublica);
    }
}
