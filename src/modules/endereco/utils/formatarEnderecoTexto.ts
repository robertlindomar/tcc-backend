import { RespostaEndereco } from "../dtos/RespostaEndereco";

export function formatarEnderecoTexto(endereco: RespostaEndereco): string {
    const numero = endereco.numero?.trim() ? `, ${endereco.numero.trim()}` : "";
    return `${endereco.rua.nome}${numero} - ${endereco.bairro.nome}, ${endereco.cidade.nome} - ${endereco.estado.uf}`;
}
