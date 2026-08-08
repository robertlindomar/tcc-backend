export class ErroAplicacao extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ErroAplicacao";
    }
}
