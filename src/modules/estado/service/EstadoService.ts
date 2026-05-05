import { AppError } from "../../../shared/errors/AppError";
import { EstadoRequest } from "../dtos/EstadoRequest";
import { EstadoResponse } from "../dtos/EstadoResponse";
import { Estado } from "../model/Estado";
import { EstadoRepository } from "../repository/EstadoRepository";

export class EstadoService {
    constructor(private readonly estadoRepository: EstadoRepository) {}

    async criar(request: EstadoRequest): Promise<EstadoResponse> {
        const estado = new Estado({
            id: 0,
            nome: request.nome,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        });

        const criado = await this.estadoRepository.criar(estado);
        return this.toResponse(criado);
    }

    async listar(): Promise<EstadoResponse[]> {
        const lista = await this.estadoRepository.listar();
        return lista.map((e) => this.toResponse(e));
    }

    async buscar(idParam: string): Promise<EstadoResponse> {
        const id = this.parseId(idParam);
        const estado = await this.estadoRepository.buscar(id);

        if (!estado) {
            throw new AppError("Estado nao encontrado", 404);
        }

        return this.toResponse(estado);
    }

    async atualizar(idParam: string, request: EstadoRequest): Promise<EstadoResponse> {
        const id = this.parseId(idParam);
        const atualizado = await this.estadoRepository.atualizar(id, request.nome);
        return this.toResponse(atualizado);
    }

    async deletar(idParam: string): Promise<void> {
        const id = this.parseId(idParam);
        return this.estadoRepository.deletar(id);
    }

    private toResponse(estado: Estado): EstadoResponse {
        return {
            id: estado.id,
            nome: estado.nome,
            dataCriacao: estado.dataCriacao,
            dataAtualizacao: estado.dataAtualizacao,
        };
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);

        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("ID do estado invalido", 400);
        }

        return id;
    }
}
