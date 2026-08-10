import { RespostaConsumidor } from "../../consumidor/dtos/RespostaConsumidor";
import { RespostaMissaoConsumidor } from "./RespostaMissaoConsumidor";

export interface RespostaConclusaoMissao {
    missaoConsumidor: RespostaMissaoConsumidor;
    consumidor: RespostaConsumidor;
}
