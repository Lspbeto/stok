# STOK - Sistema de Controle de Estoque

Projeto separado em **back** (API Node.js/Express/MongoDB) e **front** (HTML/CSS/JavaScript).

## 1. Testar localmente

No PowerShell, dentro da pasta do projeto:

```powershell
cd back
npm install
Copy-Item .env.example .env
notepad .env
```

Preencha `MONGODB_URI`, `JWT_SECRET` e os dados do administrador. Nunca publique o arquivo `.env`.

Configure o SMTP no mesmo `.env` para envio de relatório:
- `SMTP_HOST`: servidor SMTP (ex.: `smtp.gmail.com`)
- `SMTP_PORT`: normalmente `465` com SSL ou `587` com STARTTLS
- `SMTP_SECURE`: `true` para porta 465; `false` para 587
- `SMTP_USER`: conta de e-mail remetente
- `SMTP_PASS`: senha de aplicativo/token SMTP, nunca a senha normal da conta
- `SMTP_FROM`: nome e endereço que aparecerão como remetente
- `FRONT_URL`: endereço completo do front que o usuário abrirá pelo link de recuperação (ex.: `http://localhost:5500` no Live Server; na produção, URL pública do site).

Instale dependências (incluindo o envio de e-mail), crie o administrador se ainda não existir e inicie a API:

```powershell
npm install
npm run criar-admin
npm run dev
```

Teste: http://localhost:3000/api/health

Em outro terminal, abra a pasta principal e inicie o front com Live Server no VS Code. Em `front/js/config.js`, deixe `API_URL: "http://localhost:3000/api"` para teste local.

## 2. Recursos incluídos

- Cadastro de produtos com quantidade, estoque mínimo, código, descrição, unidade de medida e validade.
- Unidades disponíveis: unidade, kg, g, litro, ml, pacote, caixa, dúzia e fardo.
- Entradas e saídas com validação para impedir estoque negativo.
- Aba Desfazimento: reverte entrada/saída, exige motivo, mantém a operação original e cria registro de reversão. Admin pode desfazer movimentações de todos; operador somente as próprias. Não é possível desfazer a mesma operação duas vezes.
- Histórico com filtros de data e impressão/salvar em PDF.
- Envio manual do histórico por e-mail como arquivo CSV. Administrador recebe todo o histórico; operador recebe apenas as próprias movimentações.
- Recuperação de senha por link de uso único enviado por e-mail, com validade de 30 minutos. Requer SMTP e FRONT_URL configurados.
- Backup integral do banco em JSON Extended (preserva datas e identificadores) e restauração do arquivo, disponíveis somente para administrador. A restauração substitui os dados atuais; faça backup antes.
- Usuários com perfis admin e operador; cada operador deve ser vinculado a um setor (ex.: Cozinha, Limpeza, Padaria ou Atendimento).
- Mercadorias e bens permanentes cadastrados separadamente. Para cada bem, cadastre uma unidade por número de patrimônio, informe conservação e setor responsável.
- Entrega de mercadorias do estoque para um setor: o saldo do estoque é reduzido no momento da entrega.
- Prestação de contas do operador: devolução, consumo, extravio, doação, venda, transferência ou outro destino. Extravio, doação, venda e outros exigem justificativa.
- A prestação só pode ser concluída quando a soma das destinações for exatamente igual à quantidade entregue. A devolução volta ao estoque; os outros destinos não geram uma segunda baixa.
- Transferência de mercadoria cria uma nova responsabilidade para o setor de destino, sem voltar ao estoque. Bens permanentes podem ter o setor responsável transferido sem serem tratados como consumo.
- Registros de entrega, destinação, fechamento e transferência ficam no histórico; não se apaga a operação original.

**Atenção:** a validade atualmente é uma data por cadastro de produto. Se o mesmo produto tiver lotes diferentes com datas de validade diferentes, será necessário evoluir para controle de lotes, cada um com quantidade e validade próprias. Para mercadinhos isso é recomendado quando há reposições com vencimentos diferentes.

## 3. Publicar no GitHub

Na pasta principal:

```powershell
git status
git add .
git commit -m "Adiciona desfazimento e recursos para mercadinho"
git push origin reorganizacao-back-front
```

## 4. Publicar API no Render

- Root Directory: `back`
- Build Command: `npm install`
- Start Command: `npm start`
- Cadastre no painel Environment as variáveis do `.env`, incluindo `MONGODB_URI`, `JWT_SECRET`, SMTP e `FRONT_ORIGIN`.
- Não envie o arquivo `.env` ao GitHub. Após atualizar o projeto, execute `npm install` novamente para instalar a dependência BSON usada no backup.

Depois, atualize `front/js/config.js` para o endereço público da API, por exemplo `https://SEU-SERVICO.onrender.com/api`.

## 5. Observações

- Teste entradas, saídas, entregas, todos os tipos de destinação, devoluções, transferências entre setores, conclusão com saldo exato, bens patrimoniais, validade e e-mail localmente antes de publicar.
- Na configuração inicial, crie usuários operadores com o nome exato do setor que será usado nas entregas. O setor é informado como texto no cadastro e na entrega.
- Bens permanentes são cadastrados individualmente (quantidade 1 por número de patrimônio).
- Se uma senha/URI do MongoDB foi publicada anteriormente, troque-a no MongoDB Atlas.
