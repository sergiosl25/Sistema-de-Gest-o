import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { db } from "./firebase-config.js";
const auth = getAuth();
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Clientes
async function carregarClientes() {
  const tabela = document.getElementById("tabelaClientes");
  if (!tabela) return console.error("Tabela de clientes não encontrada");
  tabela.innerHTML = ""; // limpa linhas antigas
  const snapshot = await getDocs(collection(db, "clientes"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${data.nome}</td><td>${data.email}</td>`;
    tabela.appendChild(tr);
  });
}

// Estoque
async function carregarEstoque() {
  const tabela = document.getElementById("tabelaEstoque");
  if (!tabela) return console.error("Tabela de estoque não encontrada");
  tabela.innerHTML = "";
  const snapshot = await getDocs(collection(db, "estoque"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${data.produto}</td><td>${data.quantidade}</td>`;
    tabela.appendChild(tr);
  });
}

// Vendas
async function carregarVendas() {
  const tabela = document.getElementById("tabelaItensVenda"); // 👈 ID correto
  if (!tabela) return console.error("Tabela de vendas não encontrada");
  tabela.innerHTML = "";
  const snapshot = await getDocs(collection(db, "vendas"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.produto}</td>
      <td>${data.quantidade}</td>
      <td>${data.precoUnitario}</td>
      <td>${data.desconto ?? 0}</td>
      <td>${data.totalAntes ?? 0}</td>
      <td>${data.totalDepois ?? 0}</td>
      <td>${data.pagamento ?? ""}</td>
    `;
    tabela.appendChild(tr);
  });
}

async function carregarRegistrosVendas() {
  console.log("Carregando registros de vendas...");
  const tabela = document.getElementById("tabelaRegistros");
  if (!tabela) return console.error("Tabela de registros de vendas não encontrada");
  tabela.innerHTML = "";
  
  const snapshot = await getDocs(collection(db, "registrosVendas"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.cliente}</td>
      <td>${data.produto}</td>
      <td>${data.valor}</td>`;
    tabela.appendChild(tr);
  });
} 

// Orçamentos
async function carregarOrcamentos() {
  const tabela = document.getElementById("tabelaOrcamentos");
  if (!tabela) return console.error("Tabela de orçamentos não encontrada");
  tabela.innerHTML = "";
  const snapshot = await getDocs(collection(db, "orcamentos"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${data.cliente}</td><td>${data.valor}</td>`;
    tabela.appendChild(tr);
  });
}

// Tabela de preços
async function carregarTabelaPrecos() {
  const tabela = document.getElementById("tabelaPrecos");
  if (!tabela) return console.error("Tabela de preços não encontrada");
  tabela.innerHTML = "";
  const snapshot = await getDocs(collection(db, "precos"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${data.produto}</td><td>${data.preco}</td>`;
    tabela.appendChild(tr);
  });
}

// Torna a função global para que os onclick inline possam acessá-la
window.mostrarSecao = function(id) {
  // Esconde todas as seções
  document.querySelectorAll(".secao").forEach(secao => {
    secao.style.display = "none";
  });

  // Mostra apenas a seção clicada
  const secaoAtual = document.getElementById(id);
  if (secaoAtual) secaoAtual.style.display = "block";

  // Chama as funções para carregar dados conforme a seção
  if (id === "clientes") carregarClientes();
  else if (id === "estoque") carregarEstoque();
  else if (id === "vendas") carregarVendas();
  else if (id === "orcamentos") carregarOrcamentos();
  else if (id === "registrosVendas") carregarRegistrosVendas(); // se existir
  else if (id === "precos") carregarTabelaPrecos();
}

/* =========================
   Proteção de acesso
   ========================= */
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "login.html";
  else {
    const el = document.getElementById("userEmail");
    if (el) el.textContent = user.email;
  }
});

function logout() {
  signOut(auth).then(() => {
    alert("Usuário desconectado!");
    window.location.href = "login.html"; // redirecionar para login
  }).catch((error) => {
    console.error(error);
    alert("Erro ao sair: " + error.message);
  });
}

window.logout = logout;

/* =========================
   Coleções Firestore
   ========================= */
const clientesCol = collection(db, "clientes");
const estoqueCol = collection(db, "estoque");
const precosCol = collection(db, "precos");
const vendasCol = collection(db, "vendas");
const orcamentosCol = collection(db, "orcamentos");
/* =========================
   Estado local (cache)
   ========================= */
let itemEdicao = null;
let tipoEdicao = null;
let itensVendaAtual = [];
let precos = [];
let orcamentos = [];
let orcamentosSalvos = [];
let clientes = [];
let produtos = [];
let vendas = [];

/* =========================
   ELEMENTOS DOM
========================= */
const tabelaClientes = document.getElementById("tabelaClientes");
const tabelaEstoque = document.getElementById("tabelaEstoque");
const tabelaPrecos = document.getElementById("tabelaPrecos");
const tabelaRegistros = document.getElementById("tabelaRegistros");
const tabelaItensVenda = document.getElementById("tabelaItensVenda");
const tabelaOrcamento = document.getElementById("tabelaOrcamento");
const tabelaOrcamentosSalvos = document.getElementById("tabelaOrcamentosSalvos");
const descontoInput = document.getElementById("descontoInput");
const totalVendaInput = document.getElementById("totalVendaInput");
const produtoSelectPreco = document.getElementById("produtoSelectPreco");
const produtoSelectOrcamento = document.getElementById("produtoSelectOrcamento");
const quantidadeOrcamento = document.getElementById("quantidadeOrcamento");
const clienteInputOrcamento = document.getElementById("clienteInputOrcamento");
const btnVender = document.getElementById("btnVender");
const btnAdicionarProduto = document.getElementById("btnAdicionarProduto");
const btnNovaLinhaPreco = document.getElementById("btnNovaLinhaPreco");
const btnGerarPDF = document.getElementById("btnGerarPDF");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const btnConfirmarExcluir = document.getElementById("btnConfirmarExcluir");
const btnCancelarExcluir = document.getElementById("btnCancelarExcluir");
const modalEditar = document.getElementById("modalEditar");
const modalEditarTitulo = document.getElementById("modalEditarTitulo");
const modalEditarNome = document.getElementById("modalEditarNome");
const modalEditarTelefone = document.getElementById("modalEditarTelefone");
const modalEditarQuantidade = document.getElementById("modalEditarQuantidade");
const modalEditarPreco = document.getElementById("modalEditarPreco");
const modalExcluir = document.getElementById("modalExcluir");
const modalDesconto = document.getElementById("modalDesconto");
const totalGeralRegistros = document.getElementById("totalGeralRegistros")

/* =========================
   UTILIDADES
========================= */
function sanitizeFileName(str){
  return str.replace(/[^a-z0-9]/gi,'_').toLowerCase();
}
function money(value){
  return Number(value).toFixed(2).replace('.',',');
}
function nowDateTime(){
  return new Date().toLocaleString("pt-BR");
}

/* =========================
   Real-time listeners (Firestore)
   ========================= */
// --- LISTA DE PREÇOS ---
onSnapshot(collection(db, "precos"), snapshot => {
  window.precos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  renderTabelaPrecos(); // nome correto e função global
});

// --- ORÇAMENTOS SALVOS ---
onSnapshot(collection(db, "orcamentos"), snapshot => {
  window.orcamentosSalvos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  renderOrcamentosSalvos(); // nome correto e função global
});

// --- PRODUTOS PARA ORÇAMENTO ---
onSnapshot(collection(db, "produtos"), snapshot => {
  window.produtos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  renderProdutoSelectOrcamento(); // nome correto e função global
});

/* =========================
   CLIENTES CRUD
========================= */
async function cadastrarCliente(nome, telefone){
  if(!nome) return alert("Informe o nome do cliente");
  try{ await addDoc(clientesCol,{ nome, telefone }); } 
  catch(err){ console.error(err); alert("Erro ao salvar cliente: "+(err.message||err)); }
}

async function excluirCliente(id){
  try{ await deleteDoc(doc(clientesCol,id)); } 
  catch(err){ console.error(err); alert("Erro ao excluir cliente: "+(err.message||err)); }
}
window.excluirCliente = excluirCliente;

function renderClientes(){
   if(!tabelaClientes) return;
  tabelaClientes.innerHTML = "";
  const clientesOrdenados = [...clientes].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));
  clientesOrdenados.forEach(c=>{
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${c.nome}</td>
      <td>${c.telefone||"-"}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModalCliente('${c.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirCliente('${c.id}'))">Excluir</button>
      </td>
    `;
    tabelaClientes.appendChild(tr);
  });
}

/* =========================
   PRODUTOS CRUD
========================= */
async function cadastrarProduto(nome, quantidade){
  if(!nome) return alert("Informe nome do produto");
  try{
    const ref = await addDoc(estoqueCol,{ nome, quantidade });
    await addDoc(precosCol,{ produtoId:ref.id, produtoNome:nome, preco:0, estampaFrente:0, estampaFrenteVerso:0, branca:0, interiorCores:0, magicaFosca:0, magicaBrilho:0 });
  } catch(err){ console.error(err); alert("Erro ao cadastrar produto: "+(err.message||err)); }
}

async function excluirProduto(id){
  try{
    const q = query(precosCol, where("produtoId","==",id));
    const snaps = await getDocs(q);
    for(const s of snaps.docs) await deleteDoc(doc(precosCol,s.id));
    await deleteDoc(doc(estoqueCol,id));
  } catch(err){ console.error(err); alert("Erro ao excluir produto: "+(err.message||err)); }
}
window.excluirProduto = excluirProduto;

function renderEstoque(){
  if(!tabelaEstoque) return;
  tabelaEstoque.innerHTML="";
  const produtosOrdenados = [...produtos].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));
  produtosOrdenados.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${p.nome}</td>
      <td>${p.quantidade??0}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModalProduto('${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirProduto('${p.id}'))">Excluir</button>
        </td>
    `;
    tabelaEstoque.appendChild(tr);
  });
}

/* =========================
   PREÇOS CRUD
========================= */
if(btnNovaLinhaPreco) btnNovaLinhaPreco.onclick=async()=>{
  const produtosOrdenados = produtos.slice().sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));
  if(produtoSelectPreco){
    produtoSelectPreco.innerHTML="";
    produtosOrdenados.forEach(p=>{ const opt=document.createElement("option"); opt.value=p.id; opt.textContent=p.nome; produtoSelectPreco.appendChild(opt); });
  }
  const prodId = produtoSelectPreco?.value;
  const prod = produtos.find(p=>p.id===prodId);
  try{ await addDoc(precosCol,{ produtoId:prodId||null, produtoNome:prod?prod.nome:"Produto não informado", preco:0, estampaFrente:0, estampaFrenteVerso:0, branca:0, interiorCores:0, magicaFosca:0, magicaBrilho:0 }); }
  catch(err){ console.error(err); alert("Erro ao adicionar linha de preço: "+(err.message||err)); }
};

function renderTabelaPrecos(){
  if(!tabelaPrecos) return;
  tabelaPrecos.innerHTML="";
  const precosOrdenados = [...(precos||[])].sort((a,b)=>(a.produtoNome||"").localeCompare(b.produtoNome||"","pt-BR"));
  precosOrdenados.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${p.produtoNome||""}</td>
      <td contenteditable data-field="preco">${p.preco??0}</td>
      <td contenteditable data-field="estampaFrente">${p.estampaFrente??0}</td>
      <td contenteditable data-field="estampaFrenteVerso">${p.estampaFrenteVerso??0}</td>
      <td contenteditable data-field="branca">${p.branca??0}</td>
      <td contenteditable data-field="interiorCores">${p.interiorCores??0}</td>
      <td contenteditable data-field="magicaFosca">${p.magicaFosca??0}</td>
      <td contenteditable data-field="magicaBrilho">${p.magicaBrilho??0}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModalPreco('${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirPreco('${p.id}'))">Excluir</button>
      </td>
    `;
    tabelaPrecos.appendChild(tr);
    tr.querySelectorAll("[contenteditable]").forEach(td=>{
      td.onblur=async()=>{
        const field=td.dataset.field;
        const num=parseFloat(td.textContent.trim().replace(",","."))||0;
        try{ await updateDoc(doc(precosCol,p.id),{ [field]:num }); } catch(err){ console.error(err); alert("Erro ao salvar preço"); }
      };
      td.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault(); td.blur();}});
    });
  });
}

async function excluirPreco(id){
  try{ await deleteDoc(doc(precosCol,id)); } catch(err){ console.error(err); alert("Erro ao excluir preço: "+(err.message||err)); }
}
window.excluirPreco = excluirPreco;

/* =========================
   VENDAS E ORÇAMENTOS
========================= */
function atualizarTotalVenda(){
  if(!totalVendaInput) return;
  const total = itensVendaAtual.reduce((sum,i)=>sum+(i.total||0),0);
  totalVendaInput.textContent = `R$ ${total.toFixed(2).replace(".",",")}`;
}
function adicionarItemVenda(produto, quantidade, precoUnit){
  if(!produto || quantidade<=0) return;
  const total = quantidade*precoUnit;
  itensVendaAtual.push({ produto, quantidade, preco:precoUnit, total });
  atualizarTotalVenda();
  renderItensVenda();
}
function renderItensVenda(){
  if(!tabelaItensVenda) return;
  tabelaItensVenda.innerHTML="";
  itensVendaAtual.forEach((i,index)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${i.produto}</td>
      <td>${i.quantidade}</td>
      <td>R$ ${i.preco.toFixed(2).replace(".",",")}</td>
      <td>R$ ${i.total.toFixed(2).replace(".",",")}</td>
      <td><button onclick="removerItemVenda(${index})">Excluir</button></td>
    `;
    tabelaItensVenda.appendChild(tr);
  });
}
function removerItemVenda(index){
  itensVendaAtual.splice(index,1);
  renderItensVenda();
  atualizarTotalVenda();
}
window.removerItemVenda = removerItemVenda;

async function finalizarVenda() {
  if (itensVendaAtual.length === 0) {
    alert("Adicione ao menos um produto à venda.");
    return;
  }

  const clienteId = document.getElementById("clienteSelect").value;
  if (!clienteId) {
    alert("Selecione um cliente.");
    return;
  }

  const formaPagamento = document.getElementById("formaPagamento").value || "Dinheiro";
  const vendasCol = collection(db, "vendas");

  try {
    await runTransaction(db, async (tx) => {
      for (const item of itensVendaAtual) {
        const estoqueRef = doc(db, "estoque", item.produtoId);
        const estoqueSnap = await tx.get(estoqueRef);
        if (!estoqueSnap.exists()) throw new Error("Produto não encontrado no estoque.");
        const estoqueAtual = estoqueSnap.data().quantidade || 0;
        if (estoqueAtual < item.quantidade) throw new Error(`Estoque insuficiente para ${item.nome}.`);
        tx.update(estoqueRef, { quantidade: estoqueAtual - item.quantidade });

        const vendaRef = doc(vendasCol);
        tx.set(vendaRef, {
          clienteId,
          produto: item.nome,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.preco,
          desconto: item.desconto || 0,
          totalAntes: item.totalAntes || item.preco * item.quantidade,
          totalApos: item.totalApos || (item.preco * item.quantidade - (item.desconto || 0)),
          formaPagamento,
          data: new Date().toISOString(),
        });
      }
    });

    alert("Venda registrada com sucesso!");
    itensVendaAtual = [];
    atualizarTabelaItensVenda();
    carregarRegistrosVendas();
  } catch (err) {
    console.error("Erro ao registrar venda:", err);
    alert("Falha ao registrar venda: " + err.message);
  }
}

function renderVendas() {
  const lista = document.getElementById("listaVendas");
  if (!lista) return;
  tabelaRegistros.innerHTML = "";
  let total = 0;
  vendas.forEach(v => {
    const totalAfter = utils.toNumber(v.totalDepois ?? v.total ?? 0);
    total += totalAfter;
    const descontoTxt = v.desconto && v.desconto.tipoAplicado
      ? (v.desconto.tipoValor === 'percentual' ? `${v.desconto.valor}% (${v.desconto.tipoAplicado})` : `${utils.formatCurrency(v.desconto.valor)} (${v.desconto.tipoAplicado})`)
      : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.data}</td>
      <td>${v.cliente}</td>
      <td>${v.produto}</td>
      <td>${v.quantidade}</td>
      <td>R$ ${utils.money(v.preco)}</td>
      <td>${descontoTxt}</td>
      <td>R$ ${utils.money(v.totalAntes ?? v.total ?? 0)}</td>
      <td>R$ ${utils.money(v.totalDepois ?? v.total ?? 0)}</td>
      <td>${v.pagamento || "-"}</td>
      <td>
        <button class="acao-btn pdf" onclick="gerarRecibo('${v.id}')">Recibo</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirVenda('${v.id}'))">Excluir</button>
      </td>
    `;
    tabelaRegistros.appendChild(tr);
  });
  if (totalGeralRegistros) totalGeralRegistros.textContent = utils.formatCurrency(total);
};

  // atualiza total visível (se tiver componente)
  if (totalVendaInput) totalVendaInput.textContent = `R$ ${utils.money(total)}`;

// ✅ Controle de desconto unificado
let currentSaleDiscount = { tipoValor: "percentual", valor: 0 };

// Abrir modal de desconto
document.getElementById("btnDescontoVenda").addEventListener("click", () => {
  document.getElementById("modalDesconto").style.display = "flex";
});

// Cancelar
document.getElementById("btnCancelarDesconto").addEventListener("click", () => {
  document.getElementById("modalDesconto").style.display = "none";
});

// Aplicar desconto
document.getElementById("btnAplicarDesconto").addEventListener("click", () => {
  const tipo = document.getElementById("tipoDesconto").value;
  const valor = parseFloat(document.getElementById("valorDesconto").value) || 0;

  currentSaleDiscount = { tipoValor: tipo, valor };

  itensVendaAtual = itensVendaAtual.map(item => {
    const totalAntes = item.preco * item.quantidade;
    let totalApos = totalAntes;

    if (tipo === "percentual") totalApos -= totalAntes * (valor / 100);
    else totalApos -= valor;

    return { ...item, totalAntes, totalApos, desconto: totalAntes - totalApos };
  });

  atualizarTabelaItensVenda();
  document.getElementById("modalDesconto").style.display = "none";
});

/* ====================================
   FINALIZAR VENDA (MULTI PRODUTOS)
==================================== */
if (btnVender) btnVender.onclick = async () => {
  const clienteId = clienteSelect?.value;
  const pagamento = formaPagamento?.value || "Não informado";

  if (!clienteId) return alert("Selecione o cliente antes de finalizar.");
  if (itensVendaAtual.length === 0) return alert("Adicione pelo menos um produto antes de finalizar.");

  try {
    const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
    const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : "Cliente";

    await runTransaction(db, async (tx) => {
      for (const item of itensVendaAtual) {
        const produtoRef = doc(db, "estoque", item.produtoId);
        const produtoSnapTx = await tx.get(produtoRef);
        if (!produtoSnapTx.exists()) throw new Error(`Produto não encontrado: ${item.produtoNome}`);
        const estoqueAtual = produtoSnapTx.data().quantidade || 0;
        if (estoqueAtual < item.qtd) throw new Error(`Estoque insuficiente para ${item.produtoNome}`);
        tx.update(produtoRef, { quantidade: estoqueAtual - item.qtd });

        let totalDepois = item.total;
        if (currentSaleDiscount.tipoAplicado === "venda") {
          if (currentSaleDiscount.tipoValor === "percentual") {
            totalDepois = Math.max(0, item.total - (item.total * (currentSaleDiscount.valor / 100)));
          } else {
            totalDepois = Math.max(0, item.total - currentSaleDiscount.valor);
          }
        }

        const vendaDoc = {
          data: utils.nowDateTime(),
          clienteId,
          cliente: clienteNome,
          produtoId: item.produtoId,
          produto: item.produtoNome,
          quantidade: item.qtd,
          preco: item.precoUnit,
          totalAntes: item.total,
          totalDepois,
          desconto: { ...currentSaleDiscount },
          pagamento
        };
        tx.set(doc(vendasCol), vendaDoc);
      }
    });

    itensVendaAtual = [];
    renderItensVenda();
    alert("Venda finalizada com sucesso!");

    // Atualiza histórico
    renderVendas();

    currentSaleDiscount = { tipoAplicado: null, tipoValor: null, valor: 0 };

  } catch (err) {
    console.error(err);
    alert("Erro ao registrar venda: " + (err.message || err));
  }
};

/* =========================
   ORÇAMENTOS (renders e PDF)
   ========================= */
function renderProdutoSelectOrcamento() {
  const select = document.getElementById("produtoSelectOrcamento");
  if (!select) return;
  select.innerHTML = `<option value="">Selecione o produto</option>`;

  (window.produtos || []).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;                 // <-- usar o id aqui
    opt.textContent = p.nome || p.produtoNome || "Produto sem nome";
    select.appendChild(opt);
  });
}

if (btnAdicionarProduto) btnAdicionarProduto.onclick = () => {
  const clienteNome = (clienteInputOrcamento?.value || "").trim();
  const produtoId = produtoSelectOrcamento?.value;
  const qtd = parseInt(quantidadeOrcamento?.value) || 0;
  if (!clienteNome) return alert("Informe o nome do cliente antes de adicionar o produto.");
  if (!produtoId || qtd <= 0) return alert("Selecione um produto e informe a quantidade.");
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return alert("Produto não encontrado.");

  if (!window.orcamentoAtual || !Array.isArray(window.orcamentoAtual.produtos)) {
    window.orcamentoAtual = { clienteNome, produtos: [], data: new Date().toLocaleDateString("pt-BR") };
  }
  window.orcamentoAtual.clienteNome = clienteNome;
  window.orcamentoAtual.data = new Date().toLocaleDateString("pt-BR");

  const precoDoc = precos.find(pr => pr.produtoId === produtoId);
  const precoAtual = precoDoc ? utils.toNumber(precoDoc.estampaFrente || precoDoc.preco || 0) : 0;

  window.orcamentoAtual.produtos.push({
    produtoId,
    nome: produto.nome,
    quantidade: qtd,
    preco: precoAtual,
    total: precoAtual * qtd
  });

  renderTabelaOrcamentoAtual();
  if (produtoSelectOrcamento) produtoSelectOrcamento.value = "";
  if (quantidadeOrcamento) quantidadeOrcamento.value = "";
};

function renderTabelaOrcamentoAtual(){
  if (!tabelaOrcamento) return;
  tabelaOrcamento.innerHTML = "";
  if (!window.orcamentoAtual) return;
  window.orcamentoAtual.produtos.forEach((p,i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${window.orcamentoAtual.data || "-"}</td>
      <td>${window.orcamentoAtual.clienteNome || "-"}</td>
      <td>${p.nome}</td>
      <td>${p.quantidade}</td>
      <td>R$ ${utils.money(p.preco)}</td>
      <td>R$ ${utils.money(p.total)}</td>
      <td><button class="acao-btn excluir" onclick="removerProduto(${i})">Remover</button></td>
    `;
    tabelaOrcamento.appendChild(tr);
  });
}

function removerProduto(index){
  if (!window.orcamentoAtual) return;
  window.orcamentoAtual.produtos.splice(index,1);
  renderTabelaOrcamentoAtual();
}
window.removerProduto = removerProduto;

if (btnGerarPDF) btnGerarPDF.onclick = async () => {
  if (!window.orcamentoAtual || !window.orcamentoAtual.clienteNome || !window.orcamentoAtual.produtos.length) {
    return alert("Informe o nome do cliente e adicione produtos");
  }
  if (!window.orcamentoAtual.data) window.orcamentoAtual.data = new Date().toLocaleDateString("pt-BR");
  try {
    const copia = JSON.parse(JSON.stringify(window.orcamentoAtual));
    await addDoc(orcamentosCol, copia);
    window.orcamentoAtual = { clienteNome: "", produtos: [], data: null };
    renderTabelaOrcamentoAtual();
    if (clienteInputOrcamento) clienteInputOrcamento.value = "";
    if (produtoSelectOrcamento) produtoSelectOrcamento.value = "";
    if (quantidadeOrcamento) quantidadeOrcamento.value = "";

    // gerar PDF (igual ao seu padrão)
    if (!window.jspdf) return alert("Biblioteca jsPDF não está carregada.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const imgLogo = new Image();
    imgLogo.src = "logo.png";
    imgLogo.onload = function () {
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoWidth = 40, logoHeight = 40;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(imgLogo, "PNG", logoX, 5, logoWidth, logoHeight);
      doc.setFontSize(16); doc.text("Orçamento", pageWidth/2, 40, { align: "center" });
      let y = 55;
      doc.setFontSize(12);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 10, y); y += 10;
      doc.text(`Cliente: ${copia.clienteNome}`, 10, y); y += 10;
      doc.text("Produto", 10, y); doc.text("Qtd", 90, y); doc.text("Preço Unit.", 120, y); doc.text("Total", 170, y);
      y += 8; doc.line(10, y, 200, y); y += 8;
      let totalGeral = 0;
      copia.produtos.forEach(p => {
        doc.text(p.nome, 10, y);
        doc.text(String(p.quantidade), 90, y);
        doc.text("R$ " + Number(p.preco).toFixed(2), 120, y);
        doc.text("R$ " + Number(p.total).toFixed(2), 170, y);
        totalGeral += p.total; y += 10;
        if (y > 260) { doc.addPage(); y = 20; }
      });
      y += 5; doc.line(10, y, 200, y); y += 10;
      doc.setFontSize(12); doc.text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, 10, y);
      doc.setFontSize(10); doc.text("Obrigado pela preferência!", pageWidth/2, 280, { align: "center" });
      doc.save(`orcamento_${sanitizeFileName(copia.clienteNome)}.pdf`);
    };
    imgLogo.onerror = function() {
      doc.text("Orçamento", 105, 20, { align: "center" });
      doc.save(`orcamento_${sanitizeFileName(copia.clienteNome)}.pdf`);
    };

  } catch (err) {
    console.error(err);
    alert("Erro ao salvar orçamento: " + (err.message || err));
  }
};
   
// =========================
// Abrir modal de Cliente
// =========================
function abrirModalCliente(id) {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return alert("Cliente não encontrado");

  itemEdicao = id;
  tipoEdicao = "cliente";

  if (!modalEditar) return;
  modalEditar.style.display = "block";
  if (modalEditarTitulo) modalEditarTitulo.textContent = "Editar Cliente";

  // Mostra apenas inputs necessários
  modalEditarNome?.parentElement?.style.setProperty("display", "");
  modalEditarTelefone?.parentElement?.style.setProperty("display", "");
  modalEditarQuantidade?.parentElement?.style.setProperty("display", "none");
  modalEditarPreco?.parentElement?.style.setProperty("display", "none");

  // Preenche valores
  if (modalEditarNome) modalEditarNome.value = cliente.nome || "";
  if (modalEditarTelefone) modalEditarTelefone.value = cliente.telefone || "";

  // Salvar edição
  if (btnSalvarEdicao) {
    btnSalvarEdicao.onclick = async () => {
      const nome = (modalEditarNome?.value || "").trim();
      const telefone = (modalEditarTelefone?.value || "").trim();
      if (!nome) return alert("Informe o nome do cliente.");
      try {
        await updateDoc(doc(db, "clientes", id), { nome, telefone });
        alert("Cliente atualizado com sucesso!");
        modalEditar.style.display = "none";
        renderClientes();
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar cliente: " + (err.message || err));
      }
    };
  }
}

// =========================
// Abrir modal de Produto
// =========================
function abrirModalProduto(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return alert("Produto não encontrado");

  itemEdicao = id;
  tipoEdicao = "produto";

  if (!modalEditar) return;
  modalEditar.style.display = "block";
  if (modalEditarTitulo) modalEditarTitulo.textContent = "Editar Produto";

  // Mostra apenas inputs necessários
  modalEditarNome?.parentElement?.style.setProperty("display", "");
  modalEditarQuantidade?.parentElement?.style.setProperty("display", "");
  modalEditarTelefone?.parentElement?.style.setProperty("display", "none");
  modalEditarPreco?.parentElement?.style.setProperty("display", "none");

  // Preenche valores
  if (modalEditarNome) modalEditarNome.value = produto.nome || "";
  if (modalEditarQuantidade) modalEditarQuantidade.value = produto.quantidade ?? 0;

  // Salvar edição
  if (btnSalvarEdicao) {
    btnSalvarEdicao.onclick = async () => {
      const nome = (modalEditarNome?.value || "").trim();
      const quantidade = parseInt(modalEditarQuantidade?.value) || 0;
      if (!nome) return alert("Informe o nome do produto.");
      try {
        await updateDoc(doc(db, "estoque", id), { nome, quantidade });

        // Sincroniza nome nos preços
        const q = query(precosCol, where("produtoId", "==", id));
        const snaps = await getDocs(q);
        for (const s of snaps.docs) {
          await updateDoc(doc(db, "precos", s.id), { produtoNome: nome });
        }

        alert("Produto atualizado com sucesso!");
        modalEditar.style.display = "none";
        renderEstoque();
        renderTabelaPrecos();
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar produto: " + (err.message || err));
      }
    };
  }
}

// =========================
// Abrir modal de Preço
// =========================
function abrirModalPreco(id) {
  const preco = precos.find(p => p.id === id);
  if (!preco) return alert("Preço não encontrado");

  itemEdicao = id;
  tipoEdicao = "preco";

  if (!modalEditar) return;
  modalEditar.style.display = "block";
  if (modalEditarTitulo) modalEditarTitulo.textContent = `Editar Preço: ${preco.produtoNome || ""}`;

  // Mostra apenas inputs necessários
  modalEditarNome?.parentElement?.style.setProperty("display", "");
  modalEditarPreco?.parentElement?.style.setProperty("display", "");
  modalEditarTelefone?.parentElement?.style.setProperty("display", "none");
  modalEditarQuantidade?.parentElement?.style.setProperty("display", "none");

  // Preenche valores
  if (modalEditarNome) modalEditarNome.value = preco.produtoNome || "";
  if (modalEditarPreco) modalEditarPreco.value = preco.preco ?? 0;

  // Salvar edição
  if (btnSalvarEdicao) {
    btnSalvarEdicao.onclick = async () => {
      const produtoNome = (modalEditarNome?.value || "").trim();
      const valor = parseFloat(modalEditarPreco?.value) || 0;

      if (!produtoNome) return alert("Informe o nome do produto.");
      if (isNaN(valor)) return alert("Informe um valor válido para o preço.");

      try {
        await updateDoc(doc(db, "precos", id), {
          produtoNome,
          preco: valor
        });
        alert("Preço atualizado com sucesso!");
        modalEditar.style.display = "none";
        renderTabelaPrecos();
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar preço: " + (err.message || err));
      }
    };
  }
}

// Fechar modais genéricos
if (btnCancelarEdicao) btnCancelarEdicao.onclick = () => {
  if (modalEditar) modalEditar.style.display = "none";
  itemEdicao = null;
  tipoEdicao = null;
};

if (btnCancelarExcluir) btnCancelarExcluir.onclick = () => {
  if (modalExcluir) modalExcluir.style.display = "none";
};

// Clique fora do modal para fechar
window.onclick = (event) => {
  if (event.target === modalEditar) modalEditar.style.display = "none";
  if (event.target === modalExcluir) modalExcluir.style.display = "none";
};

// Exposição global
window.abrirModalCliente = abrirModalCliente;
window.abrirModalProduto = abrirModalProduto;
window.abrirModalPreco = abrirModalPreco;


window.abrirModalExclusao = function(callback) {
  if (!modalExcluir) return;
  modalExcluir.style.display = "block";
  btnConfirmarExcluir.onclick = () => { try { if (callback) callback(); } finally { modalExcluir.style.display = "none"; } };
  btnCancelarExcluir.onclick = () => { modalExcluir.style.display = "none"; };
};

/* =========================
   Render orcamentos salvos (implementado)
   ========================= */
function renderOrcamentosSalvos() {
  const tabela = document.getElementById("tabelaOrcamentosSalvos");
  if (!tabela) return;
  tabela.innerHTML = "";

  (window.orcamentosSalvos || []).forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.data || ""}</td>
      <td>${o.cliente || ""}</td>
      <td>${o.produto || ""}</td>
      <td>${o.quantidade || 0}</td>
      <td>${o.precoUnitario || 0}</td>
      <td>${o.precoTotal || 0}</td>
      <td>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirOrcamento('${o.id}'))">Excluir</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

/* =========================
   Atualiza total geral dos orçamentos
========================= */
function atualizarTotalGeralOrcamentos() {
  if (!totalGeralRegistros) return;
  const totalGeral = orcamentos.reduce((acc, o) => {
    return acc + (o.produtos?.reduce((sum, p) => sum + (p.total || 0), 0) || 0);
  }, 0);
  totalGeralRegistros.textContent = `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;
}
renderOrcamentosSalvos();
atualizarTotalGeralOrcamentos();

/* =========================
   Reimprimir orcamento / excluir
   ========================= */
function reimprimirOrcamento(orcId) {
  const orc = orcamentos.find(o => o.id === orcId);
  if (!orc) return alert("Orçamento não encontrado");
  if (!window.jspdf) return alert("Biblioteca jsPDF não está carregada.");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const imgLogo = new Image(); imgLogo.src = "logo.png";
  imgLogo.onload = function () {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 40, logoHeight = 40;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(imgLogo, "PNG", logoX, 5, logoWidth, logoHeight);
    doc.setFontSize(16); doc.text("Orçamento", pageWidth/2, 40, { align: "center" });
    let y = 55; doc.setFontSize(12);
    doc.text(`Data: ${orc.data}`, 10, y); y+=10;
    doc.text(`Cliente: ${orc.clienteNome || "Cliente não informado"}`, 10, y); y+=10;
    doc.text("Produto", 10, y); doc.text("Qtd", 90, y); doc.text("Preço Unit.", 120, y); doc.text("Total", 170, y);
    y += 8; doc.line(10, y, 200, y); y += 8;
    let totalGeral = 0;
    orc.produtos.forEach(p => {
      doc.text(p.nome, 10, y);
      doc.text(String(p.quantidade), 90, y);
      doc.text("R$ " + Number(p.preco).toFixed(2), 120, y);
      doc.text("R$ " + Number(p.total).toFixed(2), 170, y);
      totalGeral += p.total; y += 10;
      if (y > 260) { doc.addPage(); y = 20; }
    });
    y += 5; doc.line(10, y, 200, y); y+=10;
    doc.text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, 10, y);
    doc.setFontSize(10); doc.text("Obrigado pela preferência!", pageWidth/2, 280, { align: "center" });
    doc.save(`orcamento_${sanitizeFileName(orc.clienteNome || "cliente_desconhecido")}.pdf`);
  };
  imgLogo.onerror = function(){ doc.text("Orçamento", 105, 20, { align: "center" }); doc.save(`orcamento_${sanitizeFileName(orc.clienteNome || "cliente_desconhecido")}.pdf`); };
}
window.reimprimirOrcamento = reimprimirOrcamento;

async function excluirOrcamento(id) {
  try {
    await deleteDoc(doc(db, "orcamentos", id));
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir orçamento: " + (err.message || err));
  }
}
window.excluirOrcamento = excluirOrcamento;

/* =========================
   Exportar PDF vendas
   ========================= */
async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const docPDF = new jsPDF();

  const logo = new Image();
  logo.src = "logo.png";

  await new Promise(resolve => {
    logo.onload = resolve;
    logo.onerror = resolve;
  });

  if (logo.complete) docPDF.addImage(logo, "PNG", 10, 10, 30, 30);
  docPDF.setFontSize(18);
  docPDF.text("Relatório de Vendas", 70, 20);

  const tabela = document.getElementById("tabelaRegistros");
  const linhas = [...tabela.querySelectorAll("tbody tr")].map(tr => [
    ...[...tr.querySelectorAll("td")].map(td => td.textContent.trim())
  ]);

  docPDF.autoTable({
    head: [["Data", "Cliente", "Produto", "Qtd", "Preço Unit.", "Desconto", "Total", "Forma"]],
    body: linhas,
    startY: 50,
  });

  docPDF.save("Relatorio_Vendas.pdf");
}

/* =========================
   Gerar recibo (PDF de venda)
   ========================= */
function gerarRecibo(vendaId) {
  const venda = vendas.find(v => v.id === vendaId);
  if (!venda) return alert("Venda não encontrada");
  if (!window.jspdf) return alert("Biblioteca jsPDF não está carregada.");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const imgLogo = new Image(); imgLogo.src = "logo.png";
  imgLogo.onload = function () {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 40, logoHeight = 40;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(imgLogo, "PNG", logoX, 5, logoWidth, logoHeight);
    doc.setFontSize(16); doc.text("Recibo de Venda", pageWidth/2, 40, { align: "center" });
    doc.setFontSize(12);
    let y = 65;
    doc.text(`Data: ${venda.data}`, 10, y); y += 10;
    doc.text(`Cliente: ${venda.cliente}`, 10, y); y += 10;
    doc.text(`Produto: ${venda.produto}`, 10, y); y += 10;
    doc.text(`Quantidade: ${venda.quantidade}`, 10, y); y += 10;
    doc.text(`Preço Unitário: R$ ${Number(venda.preco).toFixed(2)}`, 10, y); y += 10;
    doc.text(`Total Antes: R$ ${Number(venda.totalAntes ?? venda.total ?? 0).toFixed(2)}`, 10, y); y += 10;
    doc.text(`Total Após: R$ ${Number(venda.totalDepois ?? venda.total ?? 0).toFixed(2)}`, 10, y); y += 10;
    const descontoTxt = venda.desconto && venda.desconto.tipoAplicado
      ? (venda.desconto.tipoValor === 'percentual' ? `${venda.desconto.valor}% (${venda.desconto.tipoAplicado})` : `${utils.formatCurrency(venda.desconto.valor)} (${venda.desconto.tipoAplicado})`)
      : "-";
    doc.text(`Desconto: ${descontoTxt}`, 10, y); y += 10;
    doc.text(`Forma de Pagamento: ${venda.pagamento || "-"}`, 10, y); y += 10;
    doc.setFontSize(10); doc.text("Obrigado pela preferência!", pageWidth/2, 280, { align: "center" });
    doc.output("dataurlnewwindow");
  };
  imgLogo.onerror = function(){ doc.text("Recibo de Venda", 105, 20, { align: "center" }); doc.output("dataurlnewwindow"); };
}
window.gerarRecibo = gerarRecibo;

/* =========================
   Utilidades e exposição de funções globais
   ========================= */
function abrirModalSimples(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "block";
}

function fecharModalSimples(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

window.abrirModalSimples = abrirModalSimples;
window.fecharModalSimples = fecharModalSimples;

// exposição restante (para onclick inline)
window.abrirModalExclusao = window.abrirModalExclusao;
window.removerProduto = removerProduto;
window.reimprimirOrcamento = reimprimirOrcamento;
window.salvarOrcamento = async function() { /* se precisar salvar sem gerar PDF */ return; };

/* =========================
   Inicialização final
   ========================= */
(function init() {
  // instanciações seguras: esconde modais se existirem
  if (modalEditar) modalEditar.style.display = "none";
  if (modalExcluir) modalExcluir.style.display = "none";
  if (modalDesconto) modalDesconto.classList.remove("active");
  // render inicial (caso snapshots demorem)
  renderClientes();
  renderEstoque();
  renderTabelaPrecos();
  renderVendas();
  renderOrcamentosSalvos();
  window.renderTabelaPrecos = renderTabelaPrecos;
  window.renderOrcamentosSalvos = renderOrcamentosSalvos;
  window.renderProdutoSelectOrcamento = renderProdutoSelectOrcamento;
  window.mostrarSecao = mostrarSecao; 

window.addEventListener("DOMContentLoaded", () => {
  mostrarSecao("clientes");
  carregarClientes();
  carregarEstoque();
  carregarTabelaPrecos();
  carregarRegistrosVendas();
});
})



