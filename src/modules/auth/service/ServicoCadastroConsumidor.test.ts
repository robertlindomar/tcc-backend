import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../enum/Role";
import { ClienteViaCep } from "../../../shared/infra/ClienteViaCep";
import { ServicoCadastroConsumidor } from "./ServicoCadastroConsumidor";

const { resolverGeografiaViaCepMock } = vi.hoisted(() => ({
    resolverGeografiaViaCepMock: vi.fn(),
}));

vi.mock("../../endereco/service/resolverGeografiaViaCep", () => ({
    resolverGeografiaViaCep: resolverGeografiaViaCepMock,
}));

describe("ServicoCadastroConsumidor", () => {
    const agora = new Date("2026-08-17T20:00:00.000Z");
    let clienteViaCepMock: { buscarPorCep: ReturnType<typeof vi.fn> };
    let transacaoMock: {
        usuario: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
        consumidor: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
        endereco: { create: ReturnType<typeof vi.fn> };
    };
    let prismaMock: {
        sexo: { findUnique: ReturnType<typeof vi.fn> };
        $transaction: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        clienteViaCepMock = { buscarPorCep: vi.fn() };
        transacaoMock = {
            usuario: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
            consumidor: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
            endereco: { create: vi.fn() },
        };
        prismaMock = {
            sexo: { findUnique: vi.fn() },
            $transaction: vi.fn(async (callback) => callback(transacaoMock)),
        };

        clienteViaCepMock.buscarPorCep.mockResolvedValue({
            cep: "01001-000",
            logradouro: "Praça da Sé",
            complemento: "",
            bairro: "Sé",
            localidade: "São Paulo",
            uf: "SP",
            estado: "São Paulo",
        });
        resolverGeografiaViaCepMock.mockResolvedValue({
            estadoId: 1,
            cidadeId: 2,
            bairroId: 3,
            ruaId: 4,
        });
        vi.spyOn(bcrypt, "hash").mockResolvedValue("senha-hash" as never);
    });

    it("cria usuario, endereco e consumidor na mesma transacao sem lojista legado", async () => {
        transacaoMock.usuario.create.mockResolvedValue({
            id: 10,
            nome: "Ana",
            email: "ana@teste.local",
            role: Role.CONSUMIDOR,
            ativo: true,
            dataCriacao: agora,
            dataAtualizacao: agora,
        });
        transacaoMock.endereco.create.mockResolvedValue({ id: 1 });
        transacaoMock.consumidor.create.mockResolvedValue({
            id: 20,
            cpf: "123.456.789-00",
            pontos: 0,
            nivel: 1,
            sexoId: null,
            usuarioId: 10,
            dataCriacao: agora,
            dataAtualizacao: agora,
        });

        const servico = new ServicoCadastroConsumidor(
            prismaMock as never,
            clienteViaCepMock as unknown as ClienteViaCep,
        );
        const resposta = await servico.executar({
            nome: " Ana ",
            email: "ana@teste.local",
            senha: "senha123",
            cpf: "123.456.789-00",
            cep: "01001000",
            numero: "100",
            lojistaId: 99,
        } as { nome: string; email: string; senha: string; cpf: string; cep: string; numero: string; lojistaId: number });

        expect(prismaMock.$transaction).toHaveBeenCalledOnce();
        expect(transacaoMock.usuario.create).toHaveBeenCalledWith({
            data: {
                nome: "Ana",
                email: "ana@teste.local",
                senha: "senha-hash",
                role: Role.CONSUMIDOR,
            },
        });
        expect(transacaoMock.endereco.create).toHaveBeenCalledWith({
            data: {
                cep: "01001-000",
                numero: "100",
                usuarioId: 10,
                estadoId: 1,
                cidadeId: 2,
                bairroId: 3,
                ruaId: 4,
            },
        });
        expect(transacaoMock.consumidor.create).toHaveBeenCalledWith({
            data: {
                cpf: "123.456.789-00",
                sexoId: null,
                usuarioId: 10,
                lojistaId: null,
            },
        });
        expect(resposta).not.toHaveProperty("lojistaId");
        expect(resposta).toMatchObject({
            usuario: { id: 10, role: Role.CONSUMIDOR },
            consumidor: { id: 20, pontos: 0, nivel: 1 },
        });
    });

    it("nao abre transacao quando o ViaCEP falha", async () => {
        clienteViaCepMock.buscarPorCep.mockRejectedValue(new Error("indisponivel"));
        const servico = new ServicoCadastroConsumidor(
            prismaMock as never,
            clienteViaCepMock as unknown as ClienteViaCep,
        );

        await expect(
            servico.executar({
                nome: "Ana",
                email: "ana@teste.local",
                senha: "senha123",
                cpf: "123.456.789-00",
                cep: "01001000",
            }),
        ).rejects.toThrow("indisponivel");

        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("interrompe a transacao antes de criar dados se o email ja existe", async () => {
        transacaoMock.usuario.findUnique.mockResolvedValue({ id: 1 });
        const servico = new ServicoCadastroConsumidor(
            prismaMock as never,
            clienteViaCepMock as unknown as ClienteViaCep,
        );

        await expect(
            servico.executar({
                nome: "Ana",
                email: "ana@teste.local",
                senha: "senha123",
                cpf: "123.456.789-00",
                cep: "01001000",
            }),
        ).rejects.toMatchObject({ statusCode: 400, message: "Email ja cadastrado" });

        expect(transacaoMock.usuario.create).not.toHaveBeenCalled();
        expect(transacaoMock.endereco.create).not.toHaveBeenCalled();
        expect(transacaoMock.consumidor.create).not.toHaveBeenCalled();
    });
});
