// Código da tela: conversa com a API, exibe produtos e imprime o histórico.
const API = window.STOK_CONFIG.API_URL.replace(/\/$/, "");
let token = localStorage.getItem("stok_token");
let currentUser = null;
const $ = (id) => document.getElementById(id);
function message(text, error = false) { $("message").textContent = text; $("message").style.color = error ? "#b42318" : "#167044"; }
async function api(path, options = {}) {
  const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");
  return data;
}
function showLoggedIn(user) {
  currentUser = user; $("login").hidden = true; $("app").hidden = false;
  $("welcome").textContent = "Olá, " + user.name + " (" + user.role + ")";
  $("usersTab").hidden = user.role !== "admin";
  loadProducts();
}
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: $("email").value, password: $("password").value }) }); token = data.token; localStorage.setItem("stok_token", token); showLoggedIn(data.user); message("Login realizado."); }
  catch (err) { message(err.message, true); }
});
$("logout").addEventListener("click", () => { token = null; currentUser = null; localStorage.removeItem("stok_token"); $("app").hidden = true; $("login").hidden = false; });
document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((el) => el.hidden = el.id !== button.dataset.tab);
  if (button.dataset.tab === "history") loadHistory();
}));
$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await api("/products", { method: "POST", body: JSON.stringify({ name: $("productName").value, code: $("productCode").value, quantity: Number($("quantity").value), minimum: Number($("minimum").value), description: $("description").value }) }); e.target.reset(); $("quantity").value = 0; $("minimum").value = 0; await loadProducts(); message("Produto cadastrado."); }
  catch (err) { message(err.message, true); }
});
async function loadProducts() {
  try {
    const items = await api("/products");
    $("productsBody").replaceChildren();
    items.forEach((p) => {
      const tr = document.createElement("tr");
      [p.name, p.code, p.quantity, p.minimum].forEach((value) => { const td = document.createElement("td"); td.textContent = value ?? ""; tr.appendChild(td); });
      const td = document.createElement("td"), btn = document.createElement("button"); btn.textContent = "Excluir"; btn.className = "danger";
      btn.addEventListener("click", async () => { if (!confirm("Deseja excluir " + p.name + "?")) return; try { await api("/products/" + p._id, { method: "DELETE" }); loadProducts(); message("Produto excluído."); } catch (err) { message(err.message, true); } });
      td.appendChild(btn); tr.appendChild(td); $("productsBody").appendChild(tr);
    });
  } catch (err) { message(err.message, true); }
}
$("filterHistory").addEventListener("click", loadHistory);
async function loadHistory() {
  try {
    const params = new URLSearchParams(); if ($("fromDate").value) params.set("from", $("fromDate").value); if ($("toDate").value) params.set("to", $("toDate").value);
    const items = await api("/movements?" + params.toString()); $("historyBody").replaceChildren();
    items.forEach((item) => {
      const tr = document.createElement("tr");
      [new Date(item.createdAt).toLocaleString("pt-BR"), item.userName, item.role, item.action, item.details].forEach((value) => { const td = document.createElement("td"); td.textContent = value || ""; tr.appendChild(td); });
      $("historyBody").appendChild(tr);
    });
  } catch (err) { message(err.message, true); }
}
$("printHistory").addEventListener("click", () => window.print());
$("userForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await api("/users", { method: "POST", body: JSON.stringify({ name: $("userName").value, email: $("userEmail").value, password: $("userPassword").value, role: $("userRole").value }) }); e.target.reset(); message("Usuário criado."); }
  catch (err) { message(err.message, true); }
});
// Se já havia sessão salva, verifica se o token ainda é válido.
(async () => { if (!token) return; try { const user = await api("/auth/me"); showLoggedIn(user); } catch (_err) { localStorage.removeItem("stok_token"); token = null; } })();