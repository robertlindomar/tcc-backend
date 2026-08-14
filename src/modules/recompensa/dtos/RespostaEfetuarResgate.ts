import { RespostaConsumidor } from "../../consumidor/dtos/RespostaConsumidor";
import { RespostaResgateRecompensa } from "./RespostaResgateRecompensa";

export interface RespostaEfetuarResgate {
    resgate: RespostaResgateRecompensa;
    consumidor: RespostaConsumidor;
}
