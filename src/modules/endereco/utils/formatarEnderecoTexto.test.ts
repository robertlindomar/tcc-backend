import { describe, expect, it } from "vitest";
import { formatarEnderecoTexto } from "./formatarEnderecoTexto";

describe("formatarEnderecoTexto", () => {
    it("monta rua, numero, bairro, cidade e UF", () => {
        expect(
            formatarEnderecoTexto({
                id: 1,
                cep: "15730000",
                numero: "123",
                usuarioId: 9,
                rua: { id: 1, nome: "Rua Dez" },
                bairro: { id: 1, nome: "Centro" },
                cidade: { id: 1, nome: "Santa Fe do Sul" },
                estado: { id: 1, nome: "Sao Paulo", uf: "SP" },
                dataCriacao: new Date(),
                dataAtualizacao: new Date(),
            }),
        ).toBe("Rua Dez, 123 - Centro, Santa Fe do Sul - SP");
    });
});
