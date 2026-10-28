import { ErroAplicacao } from "../erros/ErroAplicacao";
import { civilNoFuso } from "./fusoNegocio";

function chaveDiaCivil(data: Date): number {
    const civil = civilNoFuso(data);
    return civil.ano * 10000 + civil.mes * 100 + civil.dia;
}

/**
 * Rejeita datas cujo dia civil (fuso de negócio) é anterior a hoje.
 * Se a data for igual à já salva (`original`), é aceita: permite editar
 * um item vencido sem trocar a data.
 */
export function garantirDataNaoPassada(
    data: Date | null | undefined,
    campo: string,
    original?: Date | null,
    agora: Date = new Date(),
): void {
    if (!data) {
        return;
    }
    if (original && original.getTime() === data.getTime()) {
        return;
    }
    if (chaveDiaCivil(data) < chaveDiaCivil(agora)) {
        throw new ErroAplicacao(`${campo} nao pode ser anterior a hoje`, 400);
    }
}
