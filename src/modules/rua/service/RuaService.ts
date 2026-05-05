import { RuaRepository } from "../repository/RuaRepository";
import { RuaRequest } from "../dtos/RuaRequest";
import { Rua } from "../model/Rua";
import { RuaResponse } from "../dtos/RuaResponse";
import { AppError } from "../../../shared/errors/AppError";

export class RuaService {
    constructor(private readonly ruaRepository: RuaRepository) {}

    async criar(request: RuaRequest): Promise<RuaResponse> {
        
        const rua = new Rua({
            id: 0,
            nome: request.nome,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
        });

        const ruaCriada = await this.ruaRepository.criar(rua);
        return this.toResponse(ruaCriada);
    }

    async listar(): Promise<RuaResponse[]> {
        const ruas = await this.ruaRepository.listar();
        return ruas.map((rua) => this.toResponse(rua));
    }

    async buscar(idParam: string): Promise<RuaResponse> {
        const id = this.parseId(idParam);
        const rua = await this.ruaRepository.buscar(id);

        if (!rua) {
            throw new AppError("Rua nao encontrada", 404);
        }

        return this.toResponse(rua);
    }

    async atualizar(idParam: string, request: RuaRequest): Promise<RuaResponse> {
        const id = this.parseId(idParam);
        const rua = await this.ruaRepository.atualizar(id, request.nome);
        return this.toResponse(rua);
    }
    
    async deletar(idParam: string): Promise<void> {
        const id = this.parseId(idParam);
        return this.ruaRepository.deletar(id);
    }

    private toResponse(rua: Rua): RuaResponse {
        return {
            id: rua.id,
            nome: rua.nome,
            dataCriacao: rua.dataCriacao,
            dataAtualizacao: rua.dataAtualizacao,
        };
    }

    private parseId(idParam: string): number {
        const id = Number(idParam);

        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("ID da rua invalido", 400);
        }

        return id;
    }
}