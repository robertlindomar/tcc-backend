import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { ErroAplicacao } from "../erros/ErroAplicacao";
import { ArmazenamentoArquivo } from "./ArmazenamentoArquivo";
import { pastasUploadPermitidas } from "./regrasImagem";

export function diretorioUploads(): string {
    return path.resolve(process.cwd(), "uploads");
}

export class ArmazenamentoDiscoLocal implements ArmazenamentoArquivo {
    constructor(private readonly raiz = diretorioUploads()) {}

    async gravar(pasta: string, nomeArquivo: string, conteudo: Buffer): Promise<string> {
        this.garantirPastaSegura(pasta, nomeArquivo);
        const destino = path.join(this.raiz, pasta, nomeArquivo);
        this.garantirDentroDaRaiz(destino);
        await mkdir(path.dirname(destino), { recursive: true });
        await writeFile(destino, conteudo);
        return `/uploads/${pasta}/${nomeArquivo}`;
    }

    async removerSeExistir(urlPublica: string | null | undefined): Promise<void> {
        if (!urlPublica) {
            return;
        }
        const relativo = this.relativoDeUrl(urlPublica);
        if (!relativo) {
            return;
        }
        const destino = path.join(this.raiz, relativo);
        try {
            this.garantirDentroDaRaiz(destino);
            await unlink(destino);
        } catch {
            // Falha física não deve quebrar o registro no banco.
        }
    }

    private relativoDeUrl(urlPublica: string): string | null {
        if (!urlPublica.startsWith("/uploads/")) {
            return null;
        }
        const resto = urlPublica.slice("/uploads/".length);
        const [pasta, arquivo] = resto.split("/");
        if (!pasta || !arquivo || resto.split("/").length !== 2) {
            return null;
        }
        this.garantirPastaSegura(pasta, arquivo);
        return path.join(pasta, arquivo);
    }

    private garantirPastaSegura(pasta: string, nomeArquivo: string): void {
        if (!pastasUploadPermitidas().includes(pasta)) {
            throw new ErroAplicacao("Pasta de upload invalida", 400);
        }
        if (nomeArquivo.includes("..") || nomeArquivo.includes("/") || nomeArquivo.includes("\\")) {
            throw new ErroAplicacao("Nome de arquivo invalido", 400);
        }
    }

    private garantirDentroDaRaiz(destino: string): void {
        const relativo = path.relative(this.raiz, destino);
        if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
            throw new ErroAplicacao("Caminho de upload invalido", 400);
        }
    }
}
