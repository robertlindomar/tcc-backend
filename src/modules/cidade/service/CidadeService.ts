import { AppError } from "../../../shared/errors/AppError";
import { CidadeRequest } from "../dtos/CidadeRequest";
import { CidadeResponse } from "../dtos/CidadeResponse";
import { Cidade } from "../model/Cidade";
import { CidadeRepository } from "../repository/CidadeRepository";

export class CidadeService {
    constructor(private readonly cidadeRepository: CidadeRepository) {}

    async criar(request: CidadeRequest): Promise<CidadeResponse> {
        const cidade = new Cidade({
            id: 0,
            nome: request.nome,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        });

        const criado = await this.cidadeRepository.criar(cidade);
        return this.toResponse(criado);
    }

    async listar(): Promise<CidadeResponse[]> {
        const lista = await this.cidadeRepository.listar();
        return lista.map((c) => this.toResponse(c));
    }

    async buscar(idParam: string): Promise<CidadeResponse> {
        const id = this.parseId(idParam);
        const cidade = await this.cidadeRepository.buscar(id);

        if (!cidade) {
            throw new AppError("Cidade nao encontrada", 404);
        }

        return this.toResponse(cidade);
    }

    async atualizar(idParam: string, request: CidadeRequest): Promise<CidadeResponse> {
        const id = this.parseId(idParam);
        const atualizado = await this.cidadeRepository.atualizar(id, request.nome);
        return this.toResponse(atualizado);
    }

    async deletar(idParam: string): Promise<void> {
        const id = this.parseId(idParam);
        return this.cidadeRepository.deletar(id);
    }

    private toResponse(cidade: Cidade): CidadeResponse {
        return {
            id: cidade.id,
            nome: cidade.nome,
            dataCriacao: cidade.dataCriacao,
            dataAtualizacao: cidade.dataAtualizacao,
        };
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);

        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("ID da cidade invalido", 400);
        }

        return id;
    }
}
