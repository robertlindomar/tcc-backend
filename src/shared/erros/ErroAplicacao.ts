export class ErroAplicacao extends Error {
    public readonly statusCode: number;
    public readonly detalhes?: Record<string, unknown>;

    constructor(message: string, statusCode = 400, detalhes?: Record<string, unknown>) {
        super(message);
        this.statusCode = statusCode;
        this.detalhes = detalhes;
        this.name = "ErroAplicacao";
    }
}
