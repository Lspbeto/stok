# STOK - Sistema de Controle de Estoque

O projeto está separado em **back** (API/servidor) e **front** (site). A API usa Node.js, Express e MongoDB. O front é HTML, CSS e JavaScript puro.

## 1. Preparar o computador
Instale Node.js LTS e Git. Abra o PowerShell na pasta do projeto.

## 2. Configurar o back-end
```powershell
cd back
npm install
Copy-Item .env.example .env
notepad .env
```
No arquivo `.env`, informe a conexão do MongoDB Atlas em `MONGODB_URI` e crie um texto longo e aleatório em `JWT_SECRET`. Configure também o e-mail e senha inicial do administrador. Não compartilhe nem publique o arquivo `.env`.

Criar o administrador (uma única vez):
```powershell
npm run criar-admin
```
Iniciar a API:
```powershell
npm run dev
```
Teste no navegador: http://localhost:3000/api/health

## 3. Abrir o front-end
Em outro terminal, entre na pasta `front` e abra o arquivo `index.html` no navegador. Em `front/js/config.js`, a variável `API_URL` define o endereço do servidor. Para teste local use `http://localhost:3000/api`.

## 4. Publicar no GitHub
Na pasta principal do projeto:
```powershell
git status
git add .
git commit -m "Organiza projeto STOK em back e front"
git push origin reorganizacao-back-front
```
Confira os arquivos na branch antes de integrar à branch principal.

## 5. Publicar a API no Render
Crie um Web Service conectado ao repositório. Configure:
- Root Directory: `back`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` e as variáveis `ADMIN_*` usadas para criar o primeiro administrador.
- Configure `FRONT_ORIGIN` com o endereço publicado do front, se desejar restringir o CORS.

Depois de publicar, atualize `front/js/config.js` com `https://SEU-SERVICO.onrender.com/api`.

## 6. Publicar o front
No GitHub, habilite Pages para a pasta `/front` somente se o método de publicação escolhido permitir essa pasta como origem. Alternativamente, use um serviço de hospedagem estática conectado ao repositório e defina `front` como diretório de publicação.

## Observações importantes
- Perfis: `admin` e `operador`. Somente administrador cria usuários.
- Administrador vê todo o histórico; operador vê apenas suas próprias ações.
- Exclusão de produto é lógica: o registro de histórico permanece.
- O relatório usa a função de impressão do navegador (escolha "Salvar como PDF" para gerar PDF).
- A aplicação é uma base inicial funcional; teste em ambiente local antes de usar em produção.
- Se uma URI ou senha do MongoDB já foi publicada em algum commit, troque a senha no MongoDB Atlas. Apagar o arquivo atual não apaga o segredo do histórico do Git.