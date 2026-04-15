import { AppError } from "../../../shared/errors/AppError";


type RuaProps = {
  id: number;
  nome: string;
  dataCriacao: Date;
  dataAtualizacao: Date;
}


export class Rua {
  private readonly props: RuaProps; 

  constructor(props: RuaProps) {
    if(!props.nome.trim()){
        throw new AppError('Nome da rua é obrigatório');
    }

    this.props = props;
  } 

  get id() {
    return this.props.id;
  }

  get nome() {
    return this.props.nome;
  }

  get dataCriacao() {
    return this.props.dataCriacao;
  }

  get dataAtualizacao() {
    return this.props.dataAtualizacao;
  }

 
}