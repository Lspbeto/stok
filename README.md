Trabalho curso Programador WEB

Os arquivos fornecidos (index.html, script.js e style.css), estruturei a análise detalhada dos comandos, estruturas de controle (laços/condicionais) e relações presentes no código do Sistema de Gestão e Despensa.

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

Equipe.
- Beto
- Joao
- Izaque
- Pedro
- Nonato
