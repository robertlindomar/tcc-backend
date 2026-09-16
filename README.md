# tcc-backend

API Express + Prisma do Conecta Comércio.

## Ambiente

Copie `.env.example` para `.env`. Variáveis:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `SECRET_KEY` | JWT |
| `PORT` | HTTP (default `3000`) |
| `FUSO_NEGOCIO` | Fuso civil global do TCC (período e validade de missões) |
| `RUN_SEED` | `true` só em demo; em Coolify/produção use `false` |
| `NFCE_PROVIDER` | `simulado` (default), `teste` (NÃO PRODUÇÃO) ou `sefaz` |
| `NFCE_TESTE_FONTE` | `consulta-publica` (default no teste, QR SP) ou `xml` (manual) |
| `SEFAZ_AMBIENTE` | `homologacao` \| `producao` (só com provider sefaz) |
| `SEFAZ_CERT_PFX_PATH` | Caminho local do A1 (fora do Git) |
| `SEFAZ_CERT_PASSPHRASE` | Senha do PFX |
| `NFCE_XML_DIR` | Dir. com XML procNFe para vNF/dhEmi (ConsultaProtocolo não retorna valor) |

### NFC-e

- **SIMULADO:** fixtures allowlist (BÁSICO BRASIL). Não consulta SEFAZ.
- **SEFAZ:** `NFeConsultaProtocolo4` (status fiscal). Valor/data via XML do lojista.
- Teste manual (não CI): `npm run nfce:teste:sefaz -- --chave=...`
- Decisão: `../brain/decisions/nfce-sefaz-consulta-somente-leitura.md`

### NFC-e: teste manual com qualquer lojista aprovado

O fluxo padrão de teste agora lê o QR completo e busca os dados automaticamente
na consulta pública SP. Não exige arquivo XML nem certificado:

```env
NFCE_PROVIDER=teste
NFCE_TESTE_FONTE=consulta-publica
NODE_ENV=development
```

Reinicie a API após mudar o `.env`. Cadastre/aprove a loja, selecione a campanha no
mobile e escaneie o QR. Somente o link completo dos endpoints oficiais SP
`/qrcode?p=...` (impresso na nota) ou
`/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=...` é aceito nesta fonte;
uma chave digitada sozinha não contém todos os parâmetros da consulta.

O backend valida chave/DV/modelo e loja antes da rede. Lê CNPJ, chave e emissão
da página, confere a identidade e usa **Valor a pagar** (líquido após descontos),
não a soma de produtos nem o valor pago/troco. Exemplo observado: R$34,42 em produtos
− R$12,90 de desconto = R$21,52 → 2 tickets + R$1,52 de residual se saldo anterior zero.
Mantém associação, vigência e chave única global. Não envia valor/data pelo mobile.

Requisições HTTPS restritas aos hosts oficiais, com limite de tamanho/tempo.
CAPTCHA, erro do portal, mudança de layout ou dados ausentes impedem crédito;
não há contorno de CAPTCHA. A fonte HTML é experimental e não substitui a
consulta fiscal por certificado: resposta `provider=teste`, `statusFiscal=DESCONHECIDO`.
`simulado` e `sefaz` mantêm seus fluxos anteriores. Bloqueado com `NODE_ENV=production`.

### Opção de teste anterior: XML local

No `.env` do backend, mantenha sua conexão e JWT e configure:

```env
NFCE_PROVIDER=teste
NFCE_TESTE_FONTE=xml
NFCE_XML_DIR=/home/robert/nfce/xmls
NODE_ENV=development
```

Reinicie a API (`npm run dev` em `tcc-backend`). Este modo não requer certificado
nem consulta SEFAZ; é bloqueado com `NODE_ENV=production`. Retorna `provider=teste`
e `statusFiscal=DESCONHECIDO`; o mobile mostra TESTE / NÃO PRODUÇÃO.

1. Cadastre a loja pela aplicação com seu CNPJ e aprove pela associação.
2. Obtenha o XML original da NFC-e com o emitente. QR/DANFE sozinho não fornece o XML.
3. Disponibilize um arquivo por nota diretamente em `/home/robert/nfce/xmls`,
   com permissão de leitura para o processo da API. Nome recomendado:
   `<CHAVE_DE_ACESSO_DE_44_DIGITOS>.xml`. Também aceita nomes que contenham a
   chave e terminem em `.xml`, como `<CHAVE>-procNFe.xml`. Evite múltiplos arquivos
   para a mesma chave; subpastas não são pesquisadas. Em Docker, monte a pasta e
   configure `NFCE_XML_DIR` com o caminho interno do container.
4. O XML deve conter uma `infNFe` com `Id="NFe<CHAVE>"`, `ide/mod=65`,
   `ide/dhEmi`, `emit/CNPJ` e `total/ICMSTot/vNF`. Use XML padrão com namespace
   padrão, sem prefixos nas tags. CNPJ do XML, chave e cadastro devem coincidir.
5. No mobile conectado a esta API, entre como consumidor, selecione a campanha
   e escaneie o QR. A loja precisa pertencer à associação da campanha e a emissão
   estar na vigência. Não há cadastro manual de participação nem de chave.
6. Com R$10/ticket, XML de R$57,90 gera 5 tickets e R$7,90 residual;
   outra nota de R$12,10 gera 2 tickets e zera o residual na mesma campanha.
   Reutilizar a chave retorna 409 / `NFCE_JA_UTILIZADA`.

XML ausente ou inválido retorna 422 / `NFCE_DADOS_COMPLEMENTARES_INDISPONIVEIS`;
CNPJ divergente retorna `NFCE_XML_CNPJ_DIVERGENTE`. Não credita nesses casos.
O valor do QR/mobile nunca é utilizado. XML local é dado controlado pelo operador,
não comprovação fiscal: este modo não substitui `sefaz` e não verifica cancelamento
ou assinatura digital. `simulado` mantém suas fixtures; `sefaz` mantém ConsultaProtocolo
+ fonte XML. Não rode seed/reset para este teste e mantenha XMLs/certificados fora do Git.

## Docker local (API + Postgres)

```bash
docker compose up --build
```

API em `http://localhost:3000` (`0.0.0.0`, útil para mobile na LAN). Entrypoint: migrate + seed se `RUN_SEED=true`.

## Contas demo (senha: `senha123`)

| E-mail | Papel |
|---|---|
| `associacao@gmail.com` | Associação |
| `lojista1@gmail.com` | Lojista **APROVADO** (BÁSICO BRASIL) |
| `lojista2@gmail.com` | Lojista PENDENTE (Ótica Visão) |
| `lojista3@gmail.com` | Lojista REJEITADO |
| `lojista4@gmail.com` | Lojista PENDENTE (sem endereço) |
| `usuario1@gmail.com` | Consumidor (320 pts) |
| `usuario2@gmail.com` | Consumidor (200 pts) |
| `usuario3@gmail.com` | Consumidor (100 pts) |
| `usuario4@gmail.com` | Consumidor (0 pts) |

Migração VPS (e-mails antigos `@demo.local`): `prisma/sql/migrar-emails-demo-vps.sql`  
Banco **vazio** na VPS: `prisma/sql/seed-demo-vps.sql` ou `RUN_SEED=true` no deploy.

## Coolify (VM)

Recomendado: **dois apps Dockerfile** + **Postgres do Coolify**.

### 1) Postgres
Crie um Database PostgreSQL no Coolify e copie a `DATABASE_URL` interna.

### 2) API (`tcc-backend`)
- Build Pack: **Dockerfile**
- Base Directory: `tcc-backend` (ou root do repo se o repo for só o backend)
- Dockerfile: `Dockerfile`
- Ports Exposes: `3000`
- Healthcheck path: `/health` (ou desative se preferir)
- Env:

| Key | Valor |
|---|---|
| `DATABASE_URL` | URL do Postgres Coolify |
| `SECRET_KEY` | segredo forte |
| `PORT` | `3000` |
| `FUSO_NEGOCIO` | `America/Sao_Paulo` |
| `RUN_SEED` | `false` (ou `true` uma vez na 1ª subida) |

Persistent storage: monte um volume em `/app/uploads`.

### 3) Front
Ver README do `front/` — `NEXT_PUBLIC_API_URL` = URL **pública HTTPS** da API (Build Variable).

### Alternativa: Compose
Na raiz do TCC use `docker-compose.coolify.yml` como Compose file no Coolify.

## Fuso de negócio

`FUSO_NEGOCIO` é **global** nesta versão. Default: `America/Sao_Paulo` (Santa Fé do Sul / demo).

Todo cálculo de dia, semana, mês e fim do dia passa por `src/shared/tempo/` (`FUSO_NEGOCIO_TCC`). Não há timezone por loja.

Evolução futura: operação multi-fuso pode exigir timezone por estabelecimento.
