import { Router } from "express";
import { RotasAssociacao } from "./modules/associacao/rotas/associacao.rotas";
import { RotasAuth } from "./modules/auth/routes/auth.rotas";
import { RotasCampanha } from "./modules/campanha/rotas/campanha.rotas";
import { RotasConsumidor } from "./modules/consumidor/rotas/consumidor.rotas";
import { RotasEndereco } from "./modules/endereco/routes/endereco.rotas";
import { RotasEvento } from "./modules/evento/rotas/evento.rotas";
import { RotasLojista } from "./modules/lojista/rotas/lojista.rotas";
import { RotasMissao } from "./modules/missao/rotas/missao.rotas";
import { RotasProduto } from "./modules/produto/rotas/produto.rotas";
import { RotasPromocao } from "./modules/promocao/rotas/promocao.rotas";
import { RotasSexo } from "./modules/sexo/rotas/sexo.rotas";
import { RotasSorteio } from "./modules/sorteio/rotas/sorteio.rotas";
import { RotasUsuario } from "./modules/usuario/rotasUsuario";

export function routes() {
    const router = Router();

    router.use("/auth", RotasAuth());
    router.use("/associacao", RotasAssociacao());
    router.use("/campanha", RotasCampanha());
    router.use("/consumidor", RotasConsumidor());
    router.use("/endereco", RotasEndereco());
    router.use("/evento", RotasEvento());
    router.use("/lojista", RotasLojista());
    router.use("/missao", RotasMissao());
    router.use("/produto", RotasProduto());
    router.use("/promocao", RotasPromocao());
    router.use("/sexo", RotasSexo());
    router.use("/sorteio", RotasSorteio());
    router.use("/usuario", RotasUsuario());

    return router;
}
