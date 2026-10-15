Trabalho curso Programador WEB


1. Comandos e Funções Principais (script.js)
O código utiliza comandos modernos do JavaScript (ES6+) para manipular o DOM, gerenciar eventos e persistir dados localmente.   
JS

Gerenciamento de Armazenamento (localStorage):

lerStorage(chave, padrao): Lê e converte dados salvos no navegador com tratamento de erro (try...catch) para evitar quebras caso o JSON esteja corrompido.   
JS

salvarStorage(chave, valor): Converte objetos/arrays em string JSON e armazena no localStorage.   
JS

Manipulação de Telas e Interface:

exibirAuth() e exibirApp(): Controlam a alternância de visibilidade entre a tela de autenticação e o painel principal do sistema.   
JS

exibirMsg(elemento, texto, isSucesso): Exibe mensagens temporárias de erro ou sucesso que desaparecem automaticamente após 4 segundos.   
JS

Módulo de Relatórios e Impressão:

montarDadosRelatorio(): Agrega e processa os dados da despensa e produtos gerais para exibição.   
JS

imprimirRelatorio() e baixarPdf(): Acionam a impressão via navegador ou geram arquivos PDF utilizando bibliotecas externas (jsPDF e autoTable).   
JS

2. Estruturas de Controle e Laços
As estruturas de decisão e repetição controlam o fluxo de dados, validações e a renderização dinâmica das tabelas.

A. Laços de Repetição (forEach, map)
O código evita laços tradicionais como for indexado em favor de métodos funcionais de arrays, que tornam a leitura mais limpa:

tabBtns.forEach(...): Percorre os botões de navegação das abas para gerenciar a troca de telas.   
JS

itensDespensa.forEach(...): Itera sobre os ingredientes cadastrados para calcular prazos de validade, montar alertas e injetar linhas (<tr>) na tabela HTML.   
JS

produtosSimples.forEach(...) e usuarios.forEach(...): Renderizam de forma dinâmica as tabelas de produtos gerais e de controle de usuários.   
JS

itensDespensa.map(...) / produtosSimples.map(...): Transformam os dados brutos em estruturas prontas para exibição ou exportação em PDF.   
JS

B. Estruturas Condicionais (if...else, Operador Ternário)
Controle de Autenticação e Modos: Verifica se o usuário está logado (if (usuarioLogado)) e alterna entre os estados de login e cadastro (if (modoLogin)).   
JS

Cálculo de Status de Validade (calcularStatus(dias)):

Se os dias forem maiores que 7 (dias > 7), define o status como verde (OK).   
JS

Se estiver entre 1 e 7 dias (dias >= 1), define como amarelo (próximo do vencimento).   
JS

Caso contrário, define como vermelho (vencido).   
JS

Validações de Formulário: Validam campos vazios, senhas divergentes ou nomes de usuários duplicados antes de prosseguir com o salvamento.   
JS

3. Relações entre os Componentes
O sistema interliga o layout estrutural (index.html), o estilo visual (style.css) e a lógica de programação (script.js):

Relação HTML e JavaScript (DOM): O script centraliza as referências aos elementos do DOM logo no início (document.addEventListener("DOMContentLoaded", ...)). Elementos interativos como botões de abas, formulários e tabelas respondem a ouvintes de eventos (addEventListener).   
JS
+ 1

Delegação de Eventos nas Tabelas: Em vez de atribuir eventos individuais a cada botão de exclusão ou edição gerado dinamicamente, o sistema utiliza a delegação de eventos nas tabelas (corpoTabelaDespensa.addEventListener). O clique é capturado no elemento pai e tratado com base nos atributos data-acao e data-id.   
JS
+ 1

Relação de Estilos Dinâmicos (style.css):

A classe .hidden controla a exibição ou ocultação de seções inteiras.   
CSS

Classes como .editando aplicam destaques visuais nas linhas das tabelas que estão em processo de edição.   
CSS

Regras de @media print garantem que apenas a área dedicada ao relatório (#relatorioImpressao) seja exibida no momento da impressão física ou salvamento em PDF.   
CSS

Abaixo está o comentário detalhado de todos os principais comandos, funções e instruções presentes no código do sistema (script.js), explicando a intenção (objetivo) de cada trecho no funcionamento da aplicação:

1. Inicialização e Captura do DOM (DOMContentLoaded)
Comando: document.addEventListener("DOMContentLoaded", () => { ... })

Intenção: Garante que o código JavaScript só será executado após todo o documento HTML estar completamente carregado e pronto para ser manipulado.   
JS

2. Referências aos Elementos HTML (getElementById e querySelectorAll)
Comando: document.getElementById("...") e document.querySelectorAll("...")

Intenção: Busca e armazena em constantes os elementos da interface (como botões, campos de texto, tabelas e seções) para evitar buscas repetitivas no DOM, melhorando a performance.   
JS

3. Estado Global e Persistência (localStorage)
Comando: let usuarios = lerStorage("sis_usuarios", []); (e análogos para produtos e despensa)

Intenção: Carrega os dados salvos na memória do navegador. Caso não exista nenhum dado salvo ou ocorra erro, inicializa com um array vazio.   
JS

Função lerStorage(chave, padrao): Utiliza try...catch com JSON.parse para ler os dados do localStorage com segurança, impedindo que dados corrompidos quebrem a aplicação inteira.   
JS

Função salvarStorage(chave, valor): Converte arrays/objetos em string JSON através de JSON.stringify e os salva no navegador.   
JS

Função obterHoje(): Cria um objeto Date com as horas zeradas (00:00:00), servindo para comparar apenas dias exatos na contagem de validade dos produtos.   
JS

4. Inicialização e Troca de Telas / Abas
Função init(): Verifica se existe um usuário logado (usuarioLogado). Se sim, exibe o aplicativo principal; caso contrário, exibe a tela de login.   
JS

Funções exibirAuth() e exibirApp(): Adicionam ou removem a classe .hidden para alternar a visibilidade entre a tela de autenticação e o painel do sistema.   
JS

Comando tabBtns.forEach(...): Percorre os botões de navegação das abas e adiciona um ouvinte de clique (addEventListener) para alternar a aba ativa e ocultar/mostrar os conteúdos correspondentes.   
JS

Função exibirMsg(elemento, texto, isSucesso): Define uma mensagem de feedback visual (com cor verde para sucesso e vermelha para erro) e configura um temporizador setTimeout para limpá-la automaticamente após 4 segundos.   
JS

5. Sistema de Autenticação (Login, Cadastro e Logout)
Botão btnTroca: Alterna a interface entre o modo de "Entrar" e "Criar conta", alterando títulos e exibindo ou ocultando o campo de confirmação de senha.   
JS

Botão btnAuth:

Se estiver no modo de login, busca no array de usuários se o nome e a senha conferem (usuarios.find).   
JS

Se estiver no modo de cadastro, valida se as senhas coincidem e se o usuário já não existe (usuarios.some), salvando o novo registro em seguida.   
JS

Ouvinte de Tecla (keydown em [aUser, aPass, aPass2]): Permite que o usuário pressione a tecla "Enter" para disparar o clique do botão de autenticação de forma prática.   
JS

Botão btnSair (id="btnSair"): Remove o usuário logado do localStorage, limpa os estados de edição ativos e retorna o sistema para a tela de autenticação.   
JS

6. Módulo da Despensa (CRUD e Alertas)
Formulário formProdutoDespensa (Evento submit):

Interrompe o recarregamento padrão da página com e.preventDefault().   
JS

Coleta e formata os dados inseridos nos campos do ingrediente.   
JS

Verifica se o sistema está em modo de edição (editandoDespensaId !== null) para atualizar o item existente, ou em modo de cadastro para adicionar um novo item com ID único baseado em Date.now().   
JS

Função iniciarEdicaoDespensa(id): Preenche o formulário com os dados do ingrediente selecionado, altera o texto do botão para salvar alterações e foca no campo inicial.   
JS

Função atualizarDespensa():

Recalcula a data atual, limpa a tabela e ordena os itens por data de validade mais próxima.   
JS

Utiliza split("-") para manipular datas de forma segura contra fuso horário e calcula a diferença de dias até o vencimento.   
JS

Aciona a função calcularStatus(dias) para classificar o produto em verde (OK), amarelo (próximo) ou vermelho (vencido).   
JS

Atualiza os contadores do resumo no topo da aba e renderiza os alertas visuais.   
JS

Delegação de Eventos (corpoTabelaDespensa.addEventListener): Captura cliques em qualquer botão de ação dentro da tabela de despensa, identificando se a intenção é "editar-despensa" ou "excluir-despensa" através de atributos de dados (data-acao e data-id).   
JS

7. Módulo de Produtos Gerais (tabProdutos)
Botão btnProduto: Valida se os campos de nome, preço e quantidade são válidos usando isNaN ("is Not a Number"). Salva um novo produto ou atualiza um existente de forma similar à despensa e limpa o formulário em seguida.   
JS
+ 1

Função renderizarProdutosSimples(): Limpa e redesenha a tabela de produtos gerais, exibindo uma mensagem de aviso (vazioProd) caso o array esteja vazio.   
JS

Funções de Edição e Delegação (iniciarEdicaoProduto, removerProdutoSimples, etc.): Controlam o fluxo de alteração e exclusão dos produtos gerais através de ouvintes de eventos centralizados na tabela.   
JS

8. Módulo de Gestão de Usuários (tabUsuarios)
Botão btnUsuario: Valida o preenchimento de usuário e senha, checa duplicidades e cadastra novos usuários no sistema.   
JS

Função renderizarUsuarios(): Lista todos os usuários cadastrados na tabela. Insere um rótulo (Você) no usuário atualmente logado para impedir que ele exclua a si mesmo, gerando botões de exclusão apenas para os demais perfis.   
JS
+ 1

Função removerUsuario(username): Executa uma proteção extra para garantir que o usuário logado não seja apagado e remove o registro correspondente do array e do localStorage.   
JS

9. Módulo de Relatórios (Impressão e PDF)
Função montarDadosRelatorio(): Agrega, ordena e processa as informações de validade, contadores, soma total de preços e lista de produtos para alimentar o relatório final.   
JS

Função imprimirRelatorio(): Preenche dinamicamente uma área HTML oculta (relatorioImpressao) e aciona o comando nativo do navegador window.print().   
JS

Função baixarPdf():

Verifica se as bibliotecas externas jsPDF e autoTable estão disponíveis.   
JS

Configura o documento em formato paisagem (landscape) e desenha o cabeçalho, tabelas estilizadas e cores dinâmicas para o status dos produtos.   
JS

Adiciona numeração dinâmica de páginas no rodapé e dispara o download automático do arquivo PDF.   
JS

10. Funções Utilitárias
Função formatarDataBR(data): Converte um objeto Date padrão do JavaScript para o formato textual legível no Brasil (dia/mes/ano), utilizando padStart para garantir os dois dígitos.   
JS

Função escapeHtml(text): Cria um elemento div temporário para tratar strings e prevenir vulnerabilidades de segurança contra injeção de código malicioso (XSS).   
JS
  
Equipe.
- Beto
- Joao
- Izaque
- Pedro
- Nonato
