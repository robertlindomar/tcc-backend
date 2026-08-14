export const TAMANHO_MAXIMO_IMAGEM_BYTES = 2 * 1024 * 1024;

export type TipoImagemPermitido = "jpeg" | "png" | "webp";

const TIPOS: Record<TipoImagemPermitido, { mime: string; extensao: string }> = {
    jpeg: { mime: "image/jpeg", extensao: "jpg" },
    png: { mime: "image/png", extensao: "png" },
    webp: { mime: "image/webp", extensao: "webp" },
};

export function identificarTipoImagem(buffer: Buffer): TipoImagemPermitido | null {
    if (buffer.length < 12) {
        return null;
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "jpeg";
    }
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return "png";
    }
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") {
        return "webp";
    }
    return null;
}

export function mimePorTipo(tipo: TipoImagemPermitido): string {
    return TIPOS[tipo].mime;
}

export function extensaoPorTipo(tipo: TipoImagemPermitido): string {
    return TIPOS[tipo].extensao;
}

export function pastasUploadPermitidas(): readonly string[] {
    return ["produtos", "eventos"];
}
