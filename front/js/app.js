// Interface do STOK: estoque, entregas, usuários, histórico e relatórios.
const API = window.STOK_CONFIG.API_URL.replace(/\/$/, "");
let token = localStorage.getItem("stok_token"), currentUser = null, cachedMovements = [], cachedProducts = [];
const $ = id => document.getElementById(id);
function message(text, error=false) { $("message").textContent=text; $("message").style.color=error?"#b42318":"#167044"; }
async function api(path, options={}) {
  const response=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.message||"Não foi possível concluir a operação.");
  return data;
}
function showLoggedIn(user) {
  currentUser=user; $("login").hidden=true; $("registerScreen").hidden=true; $("forgotScreen").hidden=true; $("resetScreen").hidden=true; $("app").hidden=false;
  $("welcome").textContent="Olá, "+user.name+" ("+user.role+")"; $("usersTab").hidden=user.role!=="admin"; $("databaseTab").hidden=user.role!=="admin"; $("databaseTools").hidden=true;
  loadProducts();
  if(user.role==="operador") $("deliveryForm").hidden=true;
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:$("email").value,password:$("password").value})});token=d.token;localStorage.setItem("stok_token",token);showLoggedIn(d.user);message("Login realizado.");}catch(err){message(err.message,true);}});
// Alterna entre login e cadastro mantendo o mesmo cartão visual.
$("showRegister").addEventListener("click",()=>{$("login").hidden=true;$("registerScreen").hidden=false;});
$("backToLogin").addEventListener("click",()=>{$("registerScreen").hidden=true;$("login").hidden=false;});
$("showForgotPassword").addEventListener("click",()=>{$("login").hidden=true;$("forgotScreen").hidden=false;});
$("backFromForgot").addEventListener("click",()=>{$("forgotScreen").hidden=true;$("login").hidden=false;});
$("forgotForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/forgot-password",{method:"POST",body:JSON.stringify({email:$("forgotEmail").value})});message(d.message);$("forgotScreen").hidden=true;$("login").hidden=false;}catch(err){message(err.message,true);}});
let resetToken=new URLSearchParams(window.location.search).get("reset");
if(resetToken){token=null;localStorage.removeItem("stok_token");$("app").hidden=true;$("login").hidden=true;$("registerScreen").hidden=true;$("forgotScreen").hidden=true;$("resetScreen").hidden=false;}
$("resetForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/reset-password",{method:"POST",body:JSON.stringify({token:resetToken,password:$("resetPassword").value})});message(d.message);window.history.replaceState({},"",window.location.pathname);$("resetScreen").hidden=true;$("login").hidden=false;resetToken=null;e.target.reset();}catch(err){message(err.message,true);}});
$("registerForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/register",{method:"POST",body:JSON.stringify({name:$("registerName").value,email:$("registerEmail").value,password:$("registerPassword").value,sector:$("registerSector").value})});token=d.token;localStorage.setItem("stok_token",token);showLoggedIn(d.user);e.target.reset();message("Conta de operador criada. Setor: "+d.user.sector);}catch(err){message(err.message,true);}});
$("logout").addEventListener("click",()=>{token=null;currentUser=null;localStorage.removeItem("stok_token");$("app").hidden=true;$("registerScreen").hidden=true;$("forgotScreen").hidden=true;$("resetScreen").hidden=true;$("login").hidden=false;});
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.hidden=x.id!==b.dataset.tab);
  document.querySelectorAll(".tab-button").forEach(x=>x.classList.toggle("active",x===b));
  if(b.dataset.tab==="history")loadHistory();
  if(b.dataset.tab==="products")loadProducts();
  if(b.dataset.tab==="deliveries")loadDeliveries();
}));
function formatDate(value){if(!value)return "—";const d=new Date(String(value).slice(0,10)+"T00:00:00");return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("pt-BR");}
function toggleProductFields(){
 const asset=$("productCategory").value==="BEM";
 $("goodsFields").hidden=asset;$("assetFields").hidden=!asset;
 $("productCode").required=!asset;
 $("quantity").required=!asset;
 $("unit").required=!asset;
 $("expiryDate").required=false;
 $("patrimonyCode").required=asset;
 $("responsibleSector").required=asset;
}
$("productCategory").addEventListener("change",toggleProductFields);
toggleProductFields();
$("productForm").addEventListener("submit",async e=>{e.preventDefault();try{
 const asset=$("productCategory").value==="BEM";
 const payload={
  name:$("productName").value.trim(),
  category:asset?"BEM":"MERCADORIA",
  quantity:asset?1:Number($("quantity").value),
  minimum:0,
  unit:asset?"un":$("unit").value,
  entryDate:(asset?$("assetEntryDate").value:$("entryDate").value)||new Date().toISOString().slice(0,10),
  expiryDate:asset?null:($("expiryDate").value||null),
  code:asset?"":$("productCode").value.trim(),
  description:asset?"":$("description").value.trim(),
  patrimonyCode:asset?$("patrimonyCode").value.trim():"",
  condition:asset?$("condition").value.trim():"",
  responsibleSector:asset?$("responsibleSector").value.trim():$("goodsSector").value.trim()
 };
 await api("/products",{method:"POST",body:JSON.stringify(payload)});
 e.target.reset();$("quantity").value=0;$("assetQuantity").value=1;toggleProductFields();await loadProducts();message("Item cadastrado.");
 }catch(err){message(err.message,true);}});
function expiryInfo(date){
 if(!date)return {text:"Não informada",level:"neutral"};
 const today=new Date();today.setHours(0,0,0,0);
 const d=new Date(String(date).slice(0,10)+"T00:00:00");
 const days=Math.ceil((d-today)/86400000);
 if(days<0)return {text:"VENCIDO há "+Math.abs(days)+" dia(s)",level:"expired"};
 if(days===0)return {text:"VENCE HOJE",level:"expired"};
 if(days<=30)return {text:"ATENÇÃO: vence em "+days+" dia(s)",level:"soon"};
 return {text:d.toLocaleDateString("pt-BR"),level:"ok"};
}
async function loadProducts(){try{
 const items=await api("/products");$("goodsBody").replaceChildren();$("assetsBody").replaceChildren();
 items.forEach(p=>{
  const asset=p.category==="BEM",tr=document.createElement("tr");
  const values=asset
   ?[p.name,p.patrimonyCode||"—","1",formatDate(p.entryDate),formatDate(p.lastExitDate),formatDate(p.lastSectorExitDate),p.responsibleSector||"—",p.condition||"—"]
   :[p.name,p.code||"—",p.quantity??0,p.unit||"un",formatDate(p.entryDate)];
  values.forEach(v=>{const td=document.createElement("td");td.textContent=v??"—";tr.appendChild(td);});
  if(!asset){
   const td=document.createElement("td"),info=expiryInfo(p.expiryDate),tag=document.createElement("span");
   tag.className="expiry-alert expiry-"+info.level;tag.textContent=info.text;td.appendChild(tag);tr.appendChild(td);
   const exit=document.createElement("td");exit.textContent=formatDate(p.lastExitDate);tr.appendChild(exit);
   const sectorExit=document.createElement("td");sectorExit.textContent=formatDate(p.lastSectorExitDate);tr.appendChild(sectorExit);
   const sector=document.createElement("td");sector.textContent=p.responsibleSector||"—";tr.appendChild(sector);
   const obs=document.createElement("td");obs.textContent=p.description||"—";tr.appendChild(obs);
  }
  const actions=document.createElement("td");
  if(!asset){["ENTRADA","SAIDA"].forEach(type=>{
   const b=document.createElement("button");b.textContent=type==="ENTRADA"?"Entrada +":"Saída −";b.className=type==="SAIDA"?"secondary":"";b.style.margin="2px";b.addEventListener("click",()=>stockMove(p,type));actions.appendChild(b);
  });}
  if(asset&&currentUser.role==="admin"){
   const transfer=document.createElement("button");transfer.textContent="Transferir setor";transfer.style.margin="2px";
   transfer.addEventListener("click",async()=>{const sector=prompt("Novo setor responsável pelo bem "+p.name+":",p.responsibleSector||"");if(!sector)return;try{const d=await api("/products/"+p._id+"/transfer",{method:"POST",body:JSON.stringify({sector})});message(d.message);loadProducts();}catch(err){message(err.message,true);}});
   actions.appendChild(transfer);
   if(!p.lastExitDate){const exit=document.createElement("button");exit.textContent="Registrar saída";exit.className="secondary";exit.style.margin="2px";exit.addEventListener("click",async()=>{const reason=prompt("Motivo da saída definitiva do bem:");if(reason===null)return;try{const d=await api("/products/"+p._id+"/exit",{method:"POST",body:JSON.stringify({reason})});message(d.message);loadProducts();}catch(err){message(err.message,true);}});actions.appendChild(exit);}
  }
  const del=document.createElement("button");del.textContent="Excluir";del.className="danger";del.style.margin="2px";del.addEventListener("click",async()=>{if(!confirm("Deseja desativar "+p.name+"?"))return;try{await api("/products/"+p._id,{method:"DELETE"});loadProducts();message("Item desativado.");}catch(err){message(err.message,true);}});actions.appendChild(del);tr.appendChild(actions);
  (asset?$("assetsBody"):$("goodsBody")).appendChild(tr);
 });
 }catch(err){message(err.message,true);}}
async function stockMove(p,type){const raw=prompt("Quantidade para "+(type==="ENTRADA"?"entrada":"saída")+" de "+p.name+" ("+(p.unit||"un")+"):");if(raw===null)return;const quantity=Number(raw);if(!Number.isFinite(quantity)||quantity<=0){message("Digite uma quantidade maior que zero.",true);return;}const reason=prompt("Motivo / observação (opcional):")||"";try{await api("/movements/stock",{method:"POST",body:JSON.stringify({productId:p._id,type,quantity,reason})});await loadProducts();message("Movimentação registrada.");}catch(err){message(err.message,true);}}
function dateParams(){const p=new URLSearchParams();if($("fromDate").value)p.set("from",$("fromDate").value);if($("toDate").value)p.set("to",$("toDate").value);return p.toString();}
$("filterHistory").addEventListener("click",loadHistory);
$("historySearch").addEventListener("input",renderHistory);
async function loadHistory(){try{[cachedMovements,cachedProducts]=await Promise.all([api("/movements?"+dateParams()),api("/products")]);renderHistory();}catch(err){message(err.message,true);}}
const DESTINATION_LABELS={DEVOLUCAO:"Devolvido ao estoque",CONSUMO:"Consumido",EXTRAVIO:"Extraviado",DOACAO:"Doado",VENDA:"Vendido",TRANSFERENCIA:"Transferido",OUTRO:"Outro destino"};
function renderHistory(){
 const term=($("historySearch").value||"").trim().toLocaleLowerCase("pt-BR");
 const rows=cachedMovements.filter(m=>[m.userName,m.role,m.action,m.productName,m.details,m.sector,m.destination,...(m.allocations||[]).flatMap(a=>[a.note,a.targetSector,a.type])].join(" ").toLocaleLowerCase("pt-BR").includes(term));
 $("historyBody").replaceChildren();
 rows.forEach(m=>{
  const allocation=(m.allocations||[])[0]||{};
  const destination=DESTINATION_LABELS[allocation.type||m.destination]||allocation.type||m.destination||"—";
  const note=allocation.note||m.details||"—";
  const tr=document.createElement("tr");
  [new Date(m.createdAt).toLocaleString("pt-BR"),m.userName,m.role,m.action,m.productName,(m.quantity??"")+(m.unit?" "+m.unit:""),destination,m.sector||"—",note].forEach(v=>{const td=document.createElement("td");td.textContent=v??"";tr.appendChild(td);});
  $("historyBody").appendChild(tr);
 });
 const catalog=$("registeredItemsBody");
 if(catalog){
  catalog.replaceChildren();
  cachedProducts.forEach(p=>{
   const tr=document.createElement("tr");
   const vals=[p.name,p.category==="BEM"?"Bem permanente":"Mercadoria / consumo",p.category==="BEM"?(p.patrimonyCode||"—"):(p.code||"—"),p.category==="BEM"?"1":(p.quantity??0),p.unit||"un",p.responsibleSector||"—",p.description||p.condition||"—"];
   vals.forEach(v=>{const td=document.createElement("td");td.textContent=v??"—";tr.appendChild(td);});
   catalog.appendChild(tr);
  });
 }
}
$("printHistory").addEventListener("click",()=>window.print());
$("emailForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/movements/email-report",{method:"POST",body:JSON.stringify({email:$("reportEmail").value,from:$("fromDate").value,to:$("toDate").value})});message(d.message);}catch(err){message(err.message,true);}});
// Carrega entregas e permite lançar destinos conforme o setor do operador.
async function loadDeliveries(){
 try{
  const [items,products]=await Promise.all([api("/deliveries"),api("/products")]);
  const select=$("deliveryProduct");select.replaceChildren();
  products.forEach(p=>{
   const o=document.createElement("option");o.value=p._id;
   o.dataset.category=p.category||"MERCADORIA";
   o.textContent=(p.category==="BEM"?"[BEM PERMANENTE] ":"[CONSUMO] ")+p.name+
    (p.category==="BEM"?" — Patrimônio: "+(p.patrimonyCode||"não informado")+" — Setor: "+(p.responsibleSector||"não informado"):
     " — disponível: "+p.quantity+" "+p.unit);
   select.appendChild(o);
  });
  function updateDeliveryQuantity(){
   const asset=select.selectedOptions[0]?.dataset.category==="BEM";
   $("deliveryQuantity").value=asset?1:"";
   $("deliveryQuantity").max=asset?"1":"";
   $("deliveryQuantity").readOnly=!!asset;
   $("deliveryQuantity").placeholder=asset?"Bem individual (quantidade 1)":"Quantidade entregue";
  }
  select.removeEventListener("change",updateDeliveryQuantity);
  select.addEventListener("change",updateDeliveryQuantity);
  updateDeliveryQuantity();
  $("deliveryForm").hidden=currentUser.role!=="admin";
  $("deliveryList").replaceChildren();
  items.forEach(d=>{
   const card=document.createElement("article");card.className="panel";
   const title=document.createElement("h3");title.textContent=(d.isAsset?"BEM PERMANENTE — ":"MERCADORIA — ")+d.productName+" — "+d.sector;card.appendChild(title);
   const summary=document.createElement("p");
   summary.textContent=d.isAsset
    ?"Patrimônio: "+(d.patrimonyCode||"não informado")+" | Quantidade: 1 unidade | Responsável atual: "+d.sector+" | "+(d.condition?"Conservação: "+d.condition:"Responsabilidade patrimonial registrada")
    :"Entregue: "+d.quantity+" "+d.unit+" | Prestado: "+d.accounted+" | Falta: "+(d.quantity-d.accounted)+" | "+(d.closed?"CONCLUÍDA":"EM ABERTO");
   card.appendChild(summary);
   (d.entries||[]).forEach(e=>{const p=document.createElement("p");p.textContent=((DESTINATION_LABELS[e.allocations?.[0]?.type||e.destination]||e.destination||"DESTINO")+" — "+e.quantity+" "+e.unit+" — "+(e.allocations?.[0]?.note||e.details||"Sem observação")+" — Responsável: "+(e.userName||"—")+" — "+new Date(e.createdAt).toLocaleString("pt-BR"));card.appendChild(p);});
   if(!d.closed && !d.isAsset){
    const form=document.createElement("form");form.className="form-grid";
    const type=document.createElement("select");[["CONSUMO","Consumido"],["EXTRAVIO","Extraviado"],["DOACAO","Doado"],["DEVOLUCAO","Devolvido ao estoque"],["TRANSFERENCIA","Transferido para outro setor"],["VENDA","Vendido"],["OUTRO","Outro destino"]].forEach(([v,label])=>{const o=document.createElement("option");o.value=v;o.textContent=label;type.appendChild(o);});
    const qty=document.createElement("input");qty.type="number";qty.min="0.001";qty.step="0.001";qty.placeholder="Quantidade";qty.required=true;
    const note=document.createElement("input");note.placeholder="Justificativa / observação (obrigatória)";note.required=true;
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
$("deliveryForm").addEventListener("submit",async e=>{e.preventDefault();try{
 const selected=$("deliveryProduct").selectedOptions[0];
 const isAsset=selected?.dataset.category==="BEM";
 const amount=isAsset?1:Number($("deliveryQuantity").value);
 await api("/deliveries",{method:"POST",body:JSON.stringify({productId:$("deliveryProduct").value,quantity:amount,sector:$("deliverySector").value})});e.target.reset();message("Entrega registrada e estoque baixado.");loadProducts();loadDeliveries();}catch(err){message(err.message,true);}});

/* Backup e restauração: a API confere novamente o perfil de administrador. */
$("backupButton").addEventListener("click",async()=>{
 try{
  const response=await fetch(API+"/database/backup",{headers:{Authorization:"Bearer "+token}});
  if(!response.ok){const d=await response.json().catch(()=>({}));throw new Error(d.message||"Não foi possível gerar o backup.");}
  const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="stok-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  message("Backup baixado. Guarde o arquivo em local seguro.");
 }catch(err){message(err.message,true);}
});
$("restoreButton").addEventListener("click",async()=>{
 const file=$("restoreFile").files[0];
 if(!file){message("Selecione primeiro um arquivo de backup JSON.",true);return;}
 if(!window.confirm("ATENÇÃO: a restauração substituirá os dados atuais do banco. Faça um backup antes. Deseja continuar?"))return;
 const typed=window.prompt("Digite exatamente RESTAURAR STOK para confirmar:");
 if(typed!=="RESTAURAR STOK"){message("Restauração cancelada.");return;}
 try{
  const backup=JSON.parse(await file.text());
  const d=await api("/database/restore",{method:"POST",body:JSON.stringify({backup:backup,confirmation:typed})});
  message(d.message);window.setTimeout(()=>window.location.reload(),1200);
 }catch(err){message(err.message||"Arquivo inválido ou falha na restauração.",true);}
});

$("userForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/users",{method:"POST",body:JSON.stringify({name:$("userName").value,email:$("userEmail").value,password:$("userPassword").value,role:$("userRole").value,sector:$("userSector").value})});e.target.reset();message("Usuário criado.");}catch(err){message(err.message,true);}});
(async()=>{if(!token)return;try{const user=await api("/auth/me");showLoggedIn(user);}catch(_){localStorage.removeItem("stok_token");token=null;}})();