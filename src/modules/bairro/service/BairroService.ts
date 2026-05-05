import { AppError } from "../../../shared/errors/AppError";
import { BairroRequest } from "../dtos/BairroRequest";
import { BairroResponse } from "../dtos/BairroResponse";
import { Bairro } from "../model/Bairro";
import { BairroRepository } from "../repository/BairroRepository";

export class BairroService {
    constructor(private readonly bairroRepository: BairroRepository) {}

    async criar(request: BairroRequest): Promise<BairroResponse> {
        const bairro = new Bairro({
            id: 0,
            nome: request.nome,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        });

        const criado = await this.bairroRepository.criar(bairro);
        return this.toResponse(criado);
    }

    async listar(): Promise<BairroResponse[]> {
        const lista = await this.bairroRepository.listar();
        return lista.map((b) => this.toResponse(b));
    }

    async buscar(idParam: string): Promise<BairroResponse> {
        const id = this.parseId(idParam);
        const bairro = await this.bairroRepository.buscar(id);

        if (!bairro) {
            throw new AppError("Bairro nao encontrado", 404);
        }

        return this.toResponse(bairro);
    }

    async atualizar(idParam: string, request: BairroRequest): Promise<BairroResponse> {
        const id = this.parseId(idParam);
        const atualizado = await this.bairroRepository.atualizar(id, request.nome);
        return this.toResponse(atualizado);
    }

    async deletar(idParam: string): Promise<void> {
        const id = this.parseId(idParam);
        return this.bairroRepository.deletar(id);
    }

    private toResponse(bairro: Bairro): BairroResponse {
        return {
            id: bairro.id,
            nome: bairro.nome,
            dataCriacao: bairro.dataCriacao,
            dataAtualizacao: bairro.dataAtualizacao,
        };
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);

        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("ID do bairro invalido", 400);
        }

        return id;
    }
}
