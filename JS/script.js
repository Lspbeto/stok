// ===== Controle de Validade de Estoque (sem banco de dados) =====
// Os dados ficam apenas na memória da página. Ao recarregar, voltam os exemplos.

const CATEGORIAS = {
    graos: "Grãos",
    carnes: "Carnes",
    verduras: "Verduras",
    frutas: "Frutas",
    laticinios: "Laticínios",
    temperos: "Temperos",
    legumes: "Legumes",
    outros: "Outros",
};

const UNIDADES = {
    kg: "kg",
    g: "g",
    l: "L",
    unidade: "un",
    caixa: "cx",
};

// Lista em memória, começando com produtos de exemplo
const produtos = [
    { nome: "Arroz", categoria: "graos", quantidade: 20, unidade: "kg", validade: "2026-12-20", local: "Prateleira 1" },
    { nome: "Leite", categoria: "laticinios", quantidade: 10, unidade: "l", validade: "2026-10-08", local: "Geladeira 1" },
    { nome: "Frango", categoria: "carnes", quantidade: 5, unidade: "kg", validade: "2026-09-28", local: "Freezer 2" },
    { nome: "Tomate", categoria: "verduras", quantidade: 8, unidade: "kg", validade: "2026-10-05", local: "Geladeira 2" },
    { nome: "Feijão", categoria: "graos", quantidade: 15, unidade: "kg", validade: "2026-11-15", local: "Prateleira 2" },
];

// ===== Datas e status =====

// Converte "AAAA-MM-DD" em Date local (evita problemas de fuso horário)
function parseData(texto) {
    const [ano, mes, dia] = texto.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}

function formatarData(texto) {
    const [ano, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${ano}`;
}

function diasRestantes(validade) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.round((parseData(validade) - hoje) / 86400000);
}

function textoPrazo(dias) {
    return Math.abs(dias) === 1 ? `${dias} dia` : `${dias} dias`;
}

// Regra: >7 verde | 1 a 7 amarelo | 0 ou menos vermelho
function obterStatus(dias) {
    if (dias > 7) return { cor: "verde", texto: "🟢 Dentro da validade" };
    if (dias >= 1) return { cor: "amarelo", texto: "🟡 Próximo do vencimento" };
    return { cor: "vermelho", texto: "🔴 Vencido" };
}

// ===== Renderização =====

function criarCelula(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
}

function renderizarTabela() {
    const tbody = document.getElementById("tabela-produtos");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Ordena pelos que vencem primeiro
    const ordenados = produtos
        .map((produto, indice) => ({ produto, indice }))
        .sort((a, b) => diasRestantes(a.produto.validade) - diasRestantes(b.produto.validade));

    ordenados.forEach(({ produto, indice }) => {
        const dias = diasRestantes(produto.validade);
        const status = obterStatus(dias);
        const tr = document.createElement("tr");

        tr.append(
            criarCelula(produto.nome),
            criarCelula(CATEGORIAS[produto.categoria] || produto.categoria),
            criarCelula(`${produto.quantidade} ${UNIDADES[produto.unidade] || produto.unidade}`),
            criarCelula(formatarData(produto.validade)),
            criarCelula(textoPrazo(dias)),
            criarCelula(status.texto),
            criarCelula(produto.local || "-")
        );

        // Coluna de ações (adicione <th>Ações</th> no cabeçalho da tabela)
        const tdAcoes = document.createElement("td");
        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "🗑️ Remover";
        botao.addEventListener("click", () => removerProduto(indice));
        tdAcoes.appendChild(botao);
        tr.appendChild(tdAcoes);

        tbody.appendChild(tr);
    });
}

function renderizarResumo() {
    const contagem = { verde: 0, amarelo: 0, vermelho: 0 };
    produtos.forEach((p) => contagem[obterStatus(diasRestantes(p.validade)).cor]++);

    const mapa = {
        "qtd-verde": contagem.verde,
        "qtd-amarelo": contagem.amarelo,
        "qtd-vermelho": contagem.vermelho,
    };
    Object.entries(mapa).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    });
}

function renderizarAlertas() {
    const container = document.getElementById("lista-alertas");
    if (!container) return;
    container.innerHTML = "";

    const alertas = produtos
        .map((p) => ({ p, dias: diasRestantes(p.validade) }))
        .filter(({ dias }) => dias <= 7)
        .sort((a, b) => a.dias - b.dias);

    if (alertas.length === 0) {
        const p = document.createElement("p");
        p.textContent = "✅ Nenhum alerta no momento.";
        container.appendChild(p);
        return;
    }

    alertas.forEach(({ p: produto, dias }) => {
        const artigo = document.createElement("article");
        artigo.setAttribute("role", "alert");

        const titulo = document.createElement("h3");
        const mensagem = document.createElement("p");

        if (dias < 0) {
            titulo.textContent = "🔴 Produto vencido";
            mensagem.textContent = `${produto.nome} está vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}. Retire o produto do estoque.`;
        } else if (dias === 0) {
            titulo.textContent = "🔴 Produto vencido";
            mensagem.textContent = `${produto.nome} vence hoje (0 dias) e, pela regra, é considerado vencido. Retire-o do estoque.`;
        } else {
            titulo.textContent = "🟡 Próximo do vencimento";
            mensagem.textContent = `${produto.nome} vence em ${dias} ${dias === 1 ? "dia" : "dias"}. Use-o com prioridade.`;
        }

        artigo.append(titulo, mensagem, document.createElement("hr"));
        container.appendChild(artigo);
    });
}

function atualizarTela() {
    renderizarTabela();
    renderizarResumo();
    renderizarAlertas();
}

// ===== Ações =====

function adicionarProduto(evento) {
    evento.preventDefault();
    const form = evento.target;
    const dados = new FormData(form);

    produtos.push({
        nome: dados.get("produto").trim(),
        categoria: dados.get("categoria"),
        quantidade: Number(dados.get("quantidade")),
        unidade: dados.get("unidade"),
        validade: dados.get("validade"),
        local: dados.get("local").trim(),
    });

    atualizarTela();
    form.reset();
}

function removerProduto(indice) {
    const produto = produtos[indice];
    if (!confirm(`Remover "${produto.nome}" do estoque?`)) return;
    produtos.splice(indice, 1);
    atualizarTela();
}

// ===== Cadastro de usuário (apenas validação) =====

function configurarCadastro() {
    const form = document.getElementById("formulario");
    if (!form) return;

    const senha = document.getElementById("senha");
    const confirmar = document.getElementById("ConfirmarSenha");

    function validarSenhas() {
        confirmar.setCustomValidity(
            senha.value !== confirmar.value ? "As senhas não coincidem." : ""
        );
    }

    senha.addEventListener("input", validarSenhas);
    confirmar.addEventListener("input", validarSenhas);

    form.addEventListener("submit", (evento) => {
        evento.preventDefault();
        validarSenhas();
        if (!form.reportValidity()) return;

        alert("Dados validados com sucesso! (Nada é salvo nesta versão.)");
        form.reset();
    });

    const botaoEntrar = form.querySelector('button[type="button"]');
    if (botaoEntrar) {
        botaoEntrar.addEventListener("click", () => {
            alert("O login ainda não está implementado.");
        });
    }
}

// ===== Inicialização =====

document.addEventListener("DOMContentLoaded", () => {
    const formProduto = document.getElementById("form-produto");
    if (formProduto) formProduto.addEventListener("submit", adicionarProduto);

    configurarCadastro();
    atualizarTela();
});
