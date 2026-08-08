import { RespostaUsuario } from "../../usuario/dtos/RespostaUsuario";

export interface RespostaLogin {
    token: string;
    usuario: RespostaUsuario;
}
