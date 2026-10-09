export interface ArmazenamentoArquivo {
    gravar(pasta: string, nomeArquivo: string, conteudo: Buffer): Promise<string>;
    removerSeExistir(urlPublica: string | null | undefined): Promise<void>;
}
