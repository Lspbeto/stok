// Interface do STOK: cadastro, estoque, validade, histórico, desfazimento e relatório.
const API = window.STOK_CONFIG.API_URL.replace(/\/$/, "");
let token = localStorage.getItem("stok_token"), currentUser = null, cachedMovements = [];
const $ = id => document.getElementById(id);
function message(text, error=false) { $("message").textContent=text; $("message").style.color=error?"#b42318":"#167044"; }
async function api(path, options={}) {
  const response=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.message||"Não foi possível concluir a operação.");
  return data;
}
function showLoggedIn(user) {
  currentUser=user; $("login").hidden=true; $("app").hidden=false;
  $("welcome").textContent="Olá, "+user.name+" ("+user.role+")"; $("usersTab").hidden=user.role!=="admin";
  loadProducts();
  if(user.role==="operador") $("deliveryForm").hidden=true;
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:$("email").value,password:$("password").value})});token=d.token;localStorage.setItem("stok_token",token);showLoggedIn(d.user);message("Login realizado.");}catch(err){message(err.message,true);}});
$("logout").addEventListener("click",()=>{token=null;currentUser=null;localStorage.removeItem("stok_token");$("app").hidden=true;$("login").hidden=false;});
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.hidden=x.id!==b.dataset.tab);if(b.dataset.tab==="history")loadHistory();if(b.dataset.tab==="undo")loadUndo();if(b.dataset.tab==="products")loadProducts();if(b.dataset.tab==="deliveries")loadDeliveries();}));
$("productForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/products",{method:"POST",body:JSON.stringify({name:$("productName").value,code:$("productCode").value,quantity:Number($("quantity").value),minimum:Number($("minimum").value),unit:$("unit").value,expiryDate:$("expiryDate").value||null,description:$("description").value,category:$("productCategory").value,patrimonyCode:$("patrimonyCode").value,condition:$("condition").value,responsibleSector:$("responsibleSector").value})});e.target.reset();$("quantity").value=0;$("minimum").value=0;await loadProducts();message("Produto cadastrado.");}catch(err){message(err.message,true);}});
function expiryLabel(date){if(!date)return "Não informada";const today=new Date();today.setHours(0,0,0,0);const d=new Date(String(date).slice(0,10)+"T00:00:00");const days=Math.ceil((d-today)/86400000);if(days<0)return "VENCIDO";if(days<=30)return "Vence em "+days+" dia(s)";return d.toLocaleDateString("pt-BR");}
async function loadProducts(){try{const items=await api("/products");$("productsBody").replaceChildren();items.forEach(p=>{const tr=document.createElement("tr");[p.name+" ("+(p.category||"MERCADORIA")+")",p.code,(p.quantity??0)+" "+(p.unit||"un"),p.minimum,expiryLabel(p.expiryDate)].forEach(v=>{const td=document.createElement("td");td.textContent=v??"";tr.appendChild(td);});const td=document.createElement("td");(p.category==="BEM"?[]:["ENTRADA","SAIDA"]).forEach(type=>{const b=document.createElement("button");b.textContent=type==="ENTRADA"?"Entrada +":"Saída −";b.className=type==="SAIDA"?"secondary":"";b.style.margin="2px";b.addEventListener("click",()=>stockMove(p,type));td.appendChild(b);});if(p.category==="BEM"&&currentUser.role==="admin"){const transfer=document.createElement("button");transfer.textContent="Transferir setor";transfer.style.margin="2px";transfer.addEventListener("click",async()=>{const sector=prompt("Novo setor responsável pelo bem "+p.name+":",p.responsibleSector||"");if(!sector)return;try{const d=await api("/products/"+p._id+"/transfer",{method:"POST",body:JSON.stringify({sector})});message(d.message);loadProducts();}catch(err){message(err.message,true);}});td.appendChild(transfer);}const del=document.createElement("button");del.textContent="Excluir";del.className="danger";del.style.margin="2px";del.addEventListener("click",async()=>{if(!confirm("Deseja desativar "+p.name+"?"))return;try{await api("/products/"+p._id,{method:"DELETE"});loadProducts();message("Produto desativado.");}catch(err){message(err.message,true);}});td.appendChild(del);tr.appendChild(td);$("productsBody").appendChild(tr);});}catch(err){message(err.message,true);}}
async function stockMove(p,type){const raw=prompt("Quantidade para "+(type==="ENTRADA"?"entrada":"saída")+" de "+p.name+" ("+(p.unit||"un")+"):");if(raw===null)return;const quantity=Number(raw);if(!Number.isFinite(quantity)||quantity<=0){message("Digite uma quantidade maior que zero.",true);return;}const reason=prompt("Motivo / observação (opcional):")||"";try{await api("/movements/stock",{method:"POST",body:JSON.stringify({productId:p._id,type,quantity,reason})});await loadProducts();message("Movimentação registrada.");}catch(err){message(err.message,true);}}
function dateParams(){const p=new URLSearchParams();if($("fromDate").value)p.set("from",$("fromDate").value);if($("toDate").value)p.set("to",$("toDate").value);return p.toString();}
$("filterHistory").addEventListener("click",loadHistory);
async function loadHistory(){try{cachedMovements=await api("/movements?"+dateParams());$("historyBody").replaceChildren();cachedMovements.forEach(m=>{const tr=document.createElement("tr");[new Date(m.createdAt).toLocaleString("pt-BR"),m.userName,m.role,m.action,m.productName,(m.quantity??"")+(m.unit?" "+m.unit:""),m.details].forEach(v=>{const td=document.createElement("td");td.textContent=v??"";tr.appendChild(td);});$("historyBody").appendChild(tr);});}catch(err){message(err.message,true);}}
$("printHistory").addEventListener("click",()=>window.print());
$("emailForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/movements/email-report",{method:"POST",body:JSON.stringify({email:$("reportEmail").value,from:$("fromDate").value,to:$("toDate").value})});message(d.message);}catch(err){message(err.message,true);}});
// Carrega entregas e permite lançar destinos conforme o setor do operador.
async function loadDeliveries(){
 try{
  const [items,products]=await Promise.all([api("/deliveries"),api("/products")]);
  const select=$("deliveryProduct");select.replaceChildren();
  products.filter(p=>p.category!=="BEM").forEach(p=>{const o=document.createElement("option");o.value=p._id;o.textContent=p.name+" — disponível: "+p.quantity+" "+p.unit;select.appendChild(o);});
  $("deliveryForm").hidden=currentUser.role!=="admin";
  $("deliveryList").replaceChildren();
  items.forEach(d=>{
   const card=document.createElement("article");card.className="panel";
   const title=document.createElement("h3");title.textContent=d.productName+" — "+d.sector;card.appendChild(title);
   const summary=document.createElement("p");summary.textContent="Entregue: "+d.quantity+" "+d.unit+" | Prestado: "+d.accounted+" | Falta: "+(d.quantity-d.accounted)+" | "+(d.closed?"CONCLUÍDA":"EM ABERTO");card.appendChild(summary);
   (d.entries||[]).forEach(e=>{const p=document.createElement("p");p.textContent=(e.destination||"DESTINO")+" — "+e.quantity+" "+e.unit+" — "+(e.details||"");card.appendChild(p);});
   if(!d.closed){
    const form=document.createElement("form");form.className="form-grid";
    const type=document.createElement("select");["DEVOLUCAO","CONSUMO","EXTRAVIO","DOACAO","VENDA","TRANSFERENCIA","OUTRO"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;type.appendChild(o);});
    const qty=document.createElement("input");qty.type="number";qty.min="0.001";qty.step="0.001";qty.placeholder="Quantidade";qty.required=true;
    const note=document.createElement("input");note.placeholder="Justificativa / observação";
    const target=document.createElement("input");target.placeholder="Setor de destino (transferência)";
    const add=document.createElement("button");add.textContent="Registrar destino";
    form.append(type,qty,note,target,add);
    form.addEventListener("submit",async ev=>{ev.preventDefault();try{await api("/deliveries/"+d._id+"/account",{method:"POST",body:JSON.stringify({type:type.value,quantity:Number(qty.value),note:note.value,targetSector:target.value})});message("Destino registrado no histórico.");loadDeliveries();}catch(err){message(err.message,true);}});
    card.appendChild(form);
    const close=document.createElement("button");close.textContent="Concluir prestação de contas";close.addEventListener("click",async()=>{try{await api("/deliveries/"+d._id+"/close",{method:"POST"});message("Prestação concluída.");loadDeliveries();}catch(err){message(err.message,true);}});card.appendChild(close);
   }
   $("deliveryList").appendChild(card);
  });
 }catch(err){message(err.message,true);}
}
$("deliveryForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/deliveries",{method:"POST",body:JSON.stringify({productId:$("deliveryProduct").value,quantity:Number($("deliveryQuantity").value),sector:$("deliverySector").value})});e.target.reset();message("Entrega registrada e estoque baixado.");loadProducts();loadDeliveries();}catch(err){message(err.message,true);}});
async function loadUndo(){try{const items=await api("/movements");const eligible=items.filter(m=>["ENTRADA","SAIDA"].includes(m.action));$("undoBody").replaceChildren();eligible.forEach(m=>{const tr=document.createElement("tr");[new Date(m.createdAt).toLocaleString("pt-BR"),m.userName,m.action,m.productName,(m.quantity??"")+(m.unit?" "+m.unit:""),m.undoneAt?"DESFEITA":"Disponível"].forEach(v=>{const td=document.createElement("td");td.textContent=v??"";tr.appendChild(td);});const td=document.createElement("td");if(!m.undoneAt&&(currentUser.role==="admin"||String(m.userId)===String(currentUser.id||currentUser._id))){const b=document.createElement("button");b.textContent="Desfazer";b.className="danger";b.addEventListener("click",async()=>{const reason=prompt("Informe o motivo do desfazimento:");if(reason===null)return;if(!reason.trim()){message("O motivo é obrigatório.",true);return;}if(!confirm("Confirma desfazer esta movimentação? O saldo será ajustado."))return;try{const d=await api("/movements/"+m._id+"/undo",{method:"POST",body:JSON.stringify({reason})});message(d.message);loadUndo();loadProducts();}catch(err){message(err.message,true);}});td.appendChild(b);}tr.appendChild(td);$("undoBody").appendChild(tr);});}catch(err){message(err.message,true);}}
$("userForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/users",{method:"POST",body:JSON.stringify({name:$("userName").value,email:$("userEmail").value,password:$("userPassword").value,role:$("userRole").value,sector:$("userSector").value})});e.target.reset();message("Usuário criado.");}catch(err){message(err.message,true);}});
(async()=>{if(!token)return;try{const user=await api("/auth/me");showLoggedIn(user);}catch(_){localStorage.removeItem("stok_token");token=null;}})();