import { describe, expect, it } from "vitest";
import { identificarTipoImagem } from "./regrasImagem";

describe("identificarTipoImagem", () => {
    it("reconhece JPEG", () => {
        const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
        expect(identificarTipoImagem(buffer)).toBe("jpeg");
    });

    it("reconhece PNG", () => {
        const buffer = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
        ]);
        expect(identificarTipoImagem(buffer)).toBe("png");
    });

    it("reconhece WebP", () => {
        const buffer = Buffer.from("RIFF....WEBP", "ascii");
        expect(identificarTipoImagem(buffer)).toBe("webp");
    });

    it("rejeita SVG/texto", () => {
        const buffer = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
        expect(identificarTipoImagem(buffer)).toBeNull();
    });
});
