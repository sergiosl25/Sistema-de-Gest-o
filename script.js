import { db, auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
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

window.logout = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

/* =========================
   Coleções Firestore
   ========================= */
const clientesCol = collection(db, "clientes");
const estoqueCol = collection(db, "estoque");
const vendasCol = collection(db, "vendas");
const orcamentosCol = collection(db, "orcamentos");
const precosCol = collection(db, "precos");

/* =========================
   Estado local (cache)
   ========================= */
let clientes = [];
let produtos = [];
let vendas = [];
let orcamentos = [];
let precos = [];

/* item selecionado para edição (uma única declaração) */
let itemEdicao = null;
let tipoEdicao = null;

/* desconto provisório aplicado antes de gravar venda */
let currentSaleDiscount = {
  tipoAplicado: null, // 'produto' | 'venda'
  tipoValor: null, // 'percentual' | 'valor'
  valor: 0
};

/* =========================
   Helpers / DOM refs (verifica presença)
   ========================= */
const $ = id => document.getElementById(id);

const tabelaClientes = document.querySelector("#tabelaClientes tbody");
const nomeCliente = $("nomeCliente");
const telefoneCliente = $("telefoneCliente");
const btnCadastrarCliente = $("btnCadastrarCliente");
const clienteSelect = $("clienteSelect");

const tabelaEstoque = document.querySelector("#tabelaEstoque tbody");
const nomeProduto = $("nomeProduto");
const quantidadeProduto = $("quantidadeProduto");
const btnCadastrarProduto = $("btnCadastrarProduto");
const produtoSelect = $("produtoSelect");
const tipoPrecoSelect = $("tipoPrecoSelect");
const precoVendaInput = $("precoVenda");
const produtoSelectPreco = $("produtoSelectPreco");

const quantidadeVenda = $("quantidadeVenda");
const formaPagamento = $("formaPagamento");
const btnVender = $("btnVender");
const btnDesconto = $("btnDesconto");
const btnDescontoVenda = $("btnDescontoVenda");

const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");
const totalGeralRegistros = $("totalGeralRegistros");

const tabelaOrcamento = document.querySelector("#tabelaOrcamento tbody");
const clienteInputOrcamento = $("clienteInputOrcamento");
const produtoSelectOrcamento = $("produtoSelectOrcamento");
const quantidadeOrcamento = $("quantidadeOrcamento");
const btnAdicionarProduto = $("btnAdicionarProduto");
const btnGerarPDF = $("btnGerarPDF");
const tabelaOrcamentosSalvos = document.querySelector("#tabelaOrcamentosSalvos tbody");

const tabelaPrecos = document.querySelector("#tabelaPrecos tbody");
const btnNovaLinhaPreco = $("btnNovaLinhaPreco");

// modais
const modalEditar = $("modalEditar");
const modalEditarTitulo = $("modalEditarTitulo");
const modalEditarNome = $("modalEditarNome");
const modalEditarTelefone = $("modalEditarTelefone");
const modalEditarQuantidade = $("modalEditarQuantidade");
const modalEditarCompra = $("modalEditarCompra");
const modalEditarVenda = $("modalEditarVenda");
const modalEditarPreco = $("modalEditarPreco");
const btnSalvarEdicao = $("btnSalvarEdicao");
const btnCancelarEdicao = $("btnCancelarEdicao");

const modalExcluir = $("modalExcluir");
const btnConfirmarExcluir = $("btnConfirmarExcluir");
const btnCancelarExcluir = $("btnCancelarExcluir");

// modal desconto
const modalDesconto = $("modalDesconto");
const tituloModalDesconto = $("tituloModalDesconto");
const tipoDescontoSelect = $("tipoDesconto"); // 'percentual' | 'valor'
const valorDescontoInput = $("valorDesconto");
const btnAplicarDesconto = $("btnAplicarDesconto");
const btnCancelarDesconto = $("btnCancelarDesconto");

/* =========================
   Pequenos helpers utilitários
   ========================= */
function sanitizeFileName(name){ return name ? name.replace(/[\/\\?%*:|"<>]/g,"_") : "cliente"; }
function money(val){ return Number(val||0).toFixed(2); }
function formatCurrency(val){ return Number(val||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function nowDateTime(){ return new Date().toLocaleString(); }
function toNumber(v){ const n = Number(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; }

/* =========================
   Real-time listeners (Firestore)
   ========================= */
onSnapshot(clientesCol, snapshot => {
  clientes = snapshot.docs.map(d=>({ id: d.id, ...d.data() }));
  renderClientes();
});

onSnapshot(precosCol, snapshot => {
  precos = snapshot.docs.map(d=>({ id: d.id, ...d.data() }));
  renderTabelaPrecos();
});

onSnapshot(vendasCol, snapshot => {
  vendas = snapshot.docs.map(d=>({ id: d.id, ...d.data() }));
  renderVendas();
});

onSnapshot(orcamentosCol, snapshot => {
  orcamentos = snapshot.docs.map(d=>({ id: d.id, ...d.data() }));
  // filtra orçamentos inválidos
  orcamentos = orcamentos.filter(o => o && o.clienteNome && Array.isArray(o.produtos) && o.produtos.length>0);
  renderOrcamentosSalvos();
});

onSnapshot(estoqueCol, snapshot => {
  produtos = snapshot.docs.map(d=>({ id: d.id, ...d.data() }));
  renderEstoque();
  renderProdutoSelectOrcamento();
  renderProdutoSelectPreco();
});

function mostrarSecao(secaoId) {
  document.querySelectorAll(".view").forEach(secao => secao.style.display = "none");
  document.getElementById(secaoId).style.display = "block";
}

/* =========================
   CLIENTES (CRUD)
   ========================= */
if (btnCadastrarCliente) btnCadastrarCliente.onclick = async () => {
  const nome = (nomeCliente?.value || "").trim();
  if (!nome) return alert("Informe o nome do cliente");
  const telefone = (telefoneCliente?.value || "").trim();
  try {
    await addDoc(clientesCol, { nome, telefone });
    if (nomeCliente) nomeCliente.value = "";
    if (telefoneCliente) telefoneCliente.value = "";
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar cliente: " + (err.message || err));
  }
};

function renderClientes() {
  if (!tabelaClientes) return;
  tabelaClientes.innerHTML = "";

  // Ordena os clientes pelo nome
  const clientesOrdenados = [...clientes].sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "", "pt-BR")
  );

  clientesOrdenados.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.nome}</td>
      <td>${c.email ?? ""}</td>
      <td>${c.telefone ?? ""}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('cliente','${c.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirCliente('${c.id}'))">Excluir</button>
      </td>
    `;
    tabelaClientes.appendChild(tr);
  });

  // Se houver algum <select> de clientes, ordena também
  const clienteSelect = document.getElementById("clienteSelect");
  if (clienteSelect) {
    clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";
    clientesOrdenados.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome || "";
      clienteSelect.appendChild(opt);
    });
  }
}

async function excluirCliente(id){
  try {
    await deleteDoc(doc(db, "clientes", id));
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir cliente: " + (err.message || err));
  }
}
window.excluirCliente = excluirCliente;

/* =========================
   PRODUTOS (CRUD)
   ========================= */
if (btnCadastrarProduto) btnCadastrarProduto.onclick = async () => {
  const nome = (nomeProduto?.value || "").trim();
  const quantidade = parseInt(quantidadeProduto?.value) || 0;
  if (!nome) return alert("Informe nome do produto");
  try {
    const ref = await addDoc(estoqueCol, { nome, quantidade });
    // cria linha padrão em 'precos' para esse produto
    await addDoc(precosCol, {
      produtoId: ref.id,
      produtoNome: nome,
      preco: 0,
      estampaFrente: 0,
      estampaFrenteVerso: 0,
      branca: 0,
      interiorCores: 0,
      magicaFosca: 0,
      magicaBrilho: 0
    });
    if (nomeProduto) nomeProduto.value = "";
    if (quantidadeProduto) quantidadeProduto.value = "";
  } catch (err) {
    console.error(err);
    alert("Erro ao cadastrar produto: " + (err.message || err));
  }
};

function renderEstoque() {
  if (!tabelaEstoque) return;
  tabelaEstoque.innerHTML = "";
  if (produtoSelect) produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";

  // 🧠 Ordena os produtos por nome (A → Z, com suporte a acentos)
  const produtosOrdenados = [...produtos].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  produtosOrdenados.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.quantidade ?? 0}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('produto','${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirProduto('${p.id}'))">Excluir</button>
      </td>
    `;
    tabelaEstoque.appendChild(tr);

    if (produtoSelect) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.nome;
      produtoSelect.appendChild(opt);
    }
  });
}

async function excluirProduto(id){
  try {
    // apaga linhas de precos referenciando esse produto
    const q = query(precosCol, where("produtoId","==",id));
    const snaps = await getDocs(q);
    for (const s of snaps.docs) await deleteDoc(doc(precosCol, s.id));
    await deleteDoc(doc(db, "estoque", id));
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir produto: " + (err.message || err));
  }
}
window.excluirProduto = excluirProduto;

/* =========================
   PREÇOS / selects
   ========================= */
if (produtoSelect) produtoSelect.onchange = () => {
  const produtoId = produtoSelect.value;
  if (!tipoPrecoSelect) return;
  tipoPrecoSelect.innerHTML = "<option value=''>Selecione tipo de preço</option>";
  if (precoVendaInput) precoVendaInput.value = "";
  if (!produtoId) return;
  const precoDoProduto = precos.find(p => p.produtoId === produtoId);
  if (!precoDoProduto) return;
  const tipos = [
    { campo: "preco", texto: "Preço" },
    { campo: "estampaFrente", texto: "Estampa Frente" },
    { campo: "estampaFrenteVerso", texto: "Estampa Frente e Verso" },
    { campo: "branca", texto: "Branca" },
    { campo: "interiorCores", texto: "Interior em Cores" },
    { campo: "magicaFosca", texto: "Mágica Fosca" },
    { campo: "magicaBrilho", texto: "Mágica Brilho" }
  ];
  tipos.forEach(tipo => {
    const valor = precoDoProduto[tipo.campo];
    if (valor !== undefined && valor !== null) {
      const opt = document.createElement("option");
      opt.value = tipo.campo;
      opt.textContent = `${tipo.texto} (R$ ${Number(valor).toFixed(2)})`;
      tipoPrecoSelect.appendChild(opt);
    }
  });
}

if (tipoPrecoSelect) tipoPrecoSelect.addEventListener("change", () => {
  const tipo = tipoPrecoSelect.value;
  const produtoId = produtoSelect?.value;
  if (!tipo || !produtoId) return;
  const precoDoProduto = precos.find(p => p.produtoId === produtoId);
  if (!precoDoProduto) return;
  const valor = toNumber(precoDoProduto[tipo]);
  if (precoVendaInput) precoVendaInput.value = valor > 0 ? valor.toFixed(2) : "";
});

/* =========================
   VENDAS (transação) + desconto
   ========================= */
if (btnVender) btnVender.onclick = async () => {
  const clienteId = clienteSelect?.value;
  const produtoId = produtoSelect?.value;
  const qtd = parseInt(quantidadeVenda?.value) || 0;
  const tipoPreco = tipoPrecoSelect?.value;
  if (!clienteId || !produtoId || qtd <= 0 || !tipoPreco) {
    return alert("Preencha cliente, produto, tipo de preço e quantidade corretamente.");
  }

  try {
    const produtoRef = doc(db, "estoque", produtoId);
    const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
    const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : "Cliente";

    const precoDoc = precos.find(p => p.produtoId === produtoId);
    if (!precoDoc) return alert("Tabela de preços não encontrada para esse produto.");
    const precoUnitarioBase = toNumber(precoDoc[tipoPreco]);
    if (precoUnitarioBase <= 0) return alert("Preço inválido. Verifique a tabela de preços.");

    const totalAntes = precoUnitarioBase * qtd;
    let totalDepois = totalAntes;
    let descontoSalvo = { tipoAplicado: null, tipoValor: null, valor: 0 };

    if (currentSaleDiscount && currentSaleDiscount.tipoAplicado) {
      descontoSalvo = { ...currentSaleDiscount };
      if (descontoSalvo.tipoAplicado === 'produto') {
        if (descontoSalvo.tipoValor === 'percentual') {
          const descontoUnit = precoUnitarioBase * (descontoSalvo.valor / 100);
          totalDepois = Math.max(0, (precoUnitarioBase - descontoUnit) * qtd);
        } else {
          const descontoUnit = descontoSalvo.valor;
          const afterUnit = Math.max(0, precoUnitarioBase - descontoUnit);
          totalDepois = afterUnit * qtd;
        }
      } else {
        if (descontoSalvo.tipoValor === 'percentual') {
          totalDepois = Math.max(0, totalAntes - (totalAntes * (descontoSalvo.valor / 100)));
        } else {
          totalDepois = Math.max(0, totalAntes - descontoSalvo.valor);
        }
      }
    }

    await runTransaction(db, async tx => {
      const produtoSnapTx = await tx.get(produtoRef);
      if (!produtoSnapTx.exists()) throw new Error("Produto não encontrado");
      const estoqueAtual = produtoSnapTx.data().quantidade || 0;
      if (estoqueAtual < qtd) throw new Error("Estoque insuficiente");
      tx.update(produtoRef, { quantidade: estoqueAtual - qtd });

      const vendaDoc = {
        data: nowDateTime(),
        clienteId,
        cliente: clienteNome,
        produtoId,
        produto: precoDoc.produtoNome || (produtoSelect?.options[produtoSelect.selectedIndex]?.text || "Produto"),
        quantidade: qtd,
        preco: precoUnitarioBase,
        totalAntes,
        totalDepois,
        desconto: descontoSalvo,
        pagamento: (formaPagamento?.value) || "Não informado"
      };
      tx.set(doc(vendasCol), vendaDoc);
    });

    // limpa form e desconto
    if (quantidadeVenda) quantidadeVenda.value = "";
    currentSaleDiscount = { tipoAplicado: null, tipoValor: null, valor: 0 };

    alert("Venda registrada com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar venda: " + (err.message || err));
  }
};

/* =========================
   Modal desconto (produto ou venda)
   ========================= */
let tipoDescontoAtual = null; // 'produto' | 'venda' | null

if (btnDesconto) btnDesconto.addEventListener('click', () => {
  tipoDescontoAtual = 'produto';
  if (tituloModalDesconto) tituloModalDesconto.textContent = "Desconto no Produto";
  if (tipoDescontoSelect) tipoDescontoSelect.value = "percentual";
  if (valorDescontoInput) valorDescontoInput.value = "";
  if (modalDesconto) modalDesconto.classList.add("active");
});

if (btnDescontoVenda) btnDescontoVenda.addEventListener('click', () => {
  tipoDescontoAtual = 'venda';
  if (tituloModalDesconto) tituloModalDesconto.textContent = "Desconto na Venda";
  if (tipoDescontoSelect) tipoDescontoSelect.value = "percentual";
  if (valorDescontoInput) valorDescontoInput.value = "";
  if (modalDesconto) modalDesconto.classList.add("active");
});

if (btnCancelarDesconto) btnCancelarDesconto.addEventListener('click', () => {
  if (modalDesconto) modalDesconto.classList.remove("active");
  if (valorDescontoInput) valorDescontoInput.value = "";
  tipoDescontoAtual = null;
});

if (btnAplicarDesconto) btnAplicarDesconto.addEventListener('click', () => {
  if (!tipoDescontoAtual) return alert("Tipo de desconto não definido.");
  const tipoValor = tipoDescontoSelect?.value;
  const raw = (valorDescontoInput?.value || "").trim();
  const valor = toNumber(raw);
  if (!valor || valor <= 0) return alert("Informe um valor de desconto válido.");

  currentSaleDiscount = {
    tipoAplicado: tipoDescontoAtual === 'produto' ? 'produto' : 'venda',
    tipoValor: tipoValor === 'percentual' ? 'percentual' : 'valor',
    valor: Number(valor)
  };

  // se desconto no produto, atualizar visual do preço unit (apenas UI)
  if (currentSaleDiscount.tipoAplicado === 'produto') {
    const produtoId = produtoSelect?.value;
    const tipoPreco = tipoPrecoSelect?.value;
    let base = toNumber(precoVendaInput?.value);
    if (!base && produtoId && tipoPreco) {
      const pdoc = precos.find(p => p.produtoId === produtoId);
      if (pdoc) base = toNumber(pdoc[tipoPreco]);
    }
    if (base > 0) {
      const desconto = currentSaleDiscount.tipoValor === 'percentual' ? base * (currentSaleDiscount.valor/100) : currentSaleDiscount.valor;
      const novo = Math.max(0, base - desconto);
      if (precoVendaInput) precoVendaInput.value = novo.toFixed(2);
    }
  }

  if (modalDesconto) modalDesconto.classList.remove("active");
  if (valorDescontoInput) valorDescontoInput.value = "";
  tipoDescontoAtual = null;

  alert(`Desconto aplicado: ${currentSaleDiscount.tipoValor === 'percentual' ? currentSaleDiscount.valor + '%' : formatCurrency(currentSaleDiscount.valor)} (${currentSaleDiscount.tipoAplicado})`);
});

/* =========================
   RENDER: vendas/histórico
   ========================= */
function renderVendas(){
  if (!tabelaRegistros) return;
  tabelaRegistros.innerHTML = "";
  let total = 0;
  vendas.forEach(v => {
    const totalAfter = toNumber(v.totalDepois ?? v.total ?? 0);
    total += totalAfter;
    const descontoTxt = v.desconto && v.desconto.tipoAplicado
      ? (v.desconto.tipoValor === 'percentual' ? `${v.desconto.valor}% (${v.desconto.tipoAplicado})` : `${formatCurrency(v.desconto.valor)} (${v.desconto.tipoAplicado})`)
      : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.data}</td>
      <td>${v.cliente}</td>
      <td>${v.produto}</td>
      <td>${v.quantidade}</td>
      <td>R$ ${money(v.preco)}</td>
      <td>${descontoTxt}</td>
      <td>R$ ${money(v.totalAntes ?? v.total ?? 0)}</td>
      <td>R$ ${money(v.totalDepois ?? v.total ?? 0)}</td>
      <td>${v.pagamento || "-"}</td>
      <td>
        <button class="acao-btn pdf" onclick="gerarRecibo('${v.id}')">Recibo</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirVenda('${v.id}'))">Excluir</button>
      </td>
    `;
    tabelaRegistros.appendChild(tr);
  });
  if (totalGeralRegistros) totalGeralRegistros.textContent = formatCurrency(total);
}

async function excluirVenda(id){
  try {
    const vendaRef = doc(db,"vendas",id);
    const vendaSnap = await getDoc(vendaRef);
    if (!vendaSnap.exists()) return;
    const venda = vendaSnap.data();
    await runTransaction(db, async tx => {
      const produtoRef = doc(db,"estoque",venda.produtoId);
      const produtoSnap = await tx.get(produtoRef);
      if (produtoSnap.exists()) {
        const atual = produtoSnap.data().quantidade || 0;
        tx.update(produtoRef, { quantidade: atual + (venda.quantidade || 0) });
      }
      tx.delete(vendaRef);
    });
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir venda: " + (err.message || err));
  }
}
window.excluirVenda = excluirVenda;

/* =========================
   ORÇAMENTOS (renders e PDF)
   ========================= */
function renderProdutoSelectOrcamento(){
  if (!produtoSelectOrcamento) return;
  produtoSelectOrcamento.innerHTML = "<option value=''>Selecione o produto</option>";
  produtos.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id; opt.textContent = p.nome;
    produtoSelectOrcamento.appendChild(opt);
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
  const precoAtual = precoDoc ? toNumber(precoDoc.estampaFrente || precoDoc.preco || 0) : 0;

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
      <td>R$ ${money(p.preco)}</td>
      <td>R$ ${money(p.total)}</td>
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

/* =========================
   TABELA DE PREÇOS (editável)
   ========================= */
if (btnNovaLinhaPreco) btnNovaLinhaPreco.onclick = async () => {
  const prodId = produtoSelectPreco?.value;
  const prod = produtos.find(p=>p.id===prodId);
  try {
    await addDoc(precosCol, {
      produtoId: prodId || null,
      produtoNome: prod ? prod.nome : "Produto não informado",
      preco:0, estampaFrente:0, estampaFrenteVerso:0, branca:0,
      interiorCores:0, magicaFosca:0, magicaBrilho:0
    });
  } catch (err) { console.error(err); alert("Erro ao adicionar linha de preço: " + (err.message || err)); }
}

function renderProdutoSelectPreco(){
  if (!produtoSelectPreco) return;
  produtoSelectPreco.innerHTML = "<option value=''>— Selecione produto —</option>";
  produtos.forEach(p=> {
    const opt = document.createElement("option"); opt.value = p.id; opt.textContent = p.nome;
    produtoSelectPreco.appendChild(opt);
  });
}

function renderTabelaPrecos() {
  if (!tabelaPrecos) return;
  tabelaPrecos.innerHTML = "";

  // 🧠 Ordena alfabeticamente pelo nome do produto
  const precosOrdenados = [...precos].sort((a, b) =>
    (a.produtoNome || "").localeCompare(b.produtoNome || "", "pt-BR")
  );

  precosOrdenados.forEach(p => {
    const tr = document.createElement("tr");
    const produtoNome = p.produtoNome || "";
    const cPreco = p.preco ?? p.valor ?? 0;
    const cEstampaFrente = p.estampaFrente ?? 0;
    const cEstampaFrenteVerso = p.estampaFrenteVerso ?? 0;
    const cBranca = p.branca ?? 0;
    const cInterior = p.interiorCores ?? 0;
    const cMagicaFosca = p.magicaFosca ?? 0;
    const cMagicaBrilho = p.magicaBrilho ?? 0;

    tr.innerHTML = `
      <td>${produtoNome}</td>
      <td contenteditable data-field="preco">${cPreco}</td>
      <td contenteditable data-field="estampaFrente">${cEstampaFrente}</td>
      <td contenteditable data-field="estampaFrenteVerso">${cEstampaFrenteVerso}</td>
      <td contenteditable data-field="branca">${cBranca}</td>
      <td contenteditable data-field="interiorCores">${cInterior}</td>
      <td contenteditable data-field="magicaFosca">${cMagicaFosca}</td>
      <td contenteditable data-field="magicaBrilho">${cMagicaBrilho}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('preco','${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirPreco('${p.id}'))">Excluir</button>
      </td>
    `;
    tabelaPrecos.appendChild(tr);

    tr.querySelectorAll("[contenteditable]").forEach(td => {
      td.onblur = async () => {
        const field = td.dataset.field;
        const raw = td.textContent.trim().replace(",", ".");
        const num = parseFloat(raw);
        const valueToSave = isNaN(num) ? 0 : num;
        try {
          await updateDoc(doc(db, "precos", p.id), { [field]: valueToSave });
        } catch (err) {
          console.error("Erro ao atualizar preço:", err);
          alert("Erro ao salvar preço. Veja console.");
        }
      };
      td.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          td.blur();
        }
      });
    });
  });

  // 🧩 Atualiza o <select> de produtos (se existir)
  const produtoSelectPreco = document.getElementById("produtoSelectPreco");
  if (produtoSelectPreco) {
    produtoSelectPreco.innerHTML = "<option value=''>Selecione o produto</option>";

    precosOrdenados.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.produtoNome || "";
      produtoSelectPreco.appendChild(opt);
    });
  }
}

function abrirModalPreco(id) {
  const preco = precos.find(p => p.id === id);
  if (!preco) return alert("Preço não encontrado");
  itemEdicao = id; tipoEdicao = "preco";
  if (!modalEditar) return;
  modalEditar.style.display = "block";
  if (modalEditarTitulo) modalEditarTitulo.textContent = `Editar Preço: ${preco.produtoNome || ""}`;
  if (modalEditarNome) modalEditarNome.value = preco.produtoNome || "";
  if (modalEditarPreco) modalEditarPreco.value = (preco.valor ?? preco.preco ?? 0);
}
window.abrirModalPreco = abrirModalPreco;

async function excluirPreco(id) {
  try {
    await deleteDoc(doc(precosCol, id));
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir preço: " + (err.message || err));
  }
}
window.excluirPreco = excluirPreco;

window.abrirModal = function(tipo, id) {
  itemEdicao = id;
  tipoEdicao = tipo;

  if (!modalEditar) {
    console.warn("modalEditar não encontrado");
    return;
  }

  const inputs = [modalEditarNome, modalEditarTelefone, modalEditarQuantidade, modalEditarCompra, modalEditarVenda, modalEditarPreco];
  inputs.forEach(inp => {
    if (!inp) return;
    const wrapper = inp.parentElement;
    if (wrapper) wrapper.style.display = "none";
    else inp.style.display = "none";
    inp.value = "";
  });

  if (tipo === "cliente") {
    if (modalEditarTitulo) modalEditarTitulo.textContent = "Editar Cliente";
    if (modalEditarNome?.parentElement) modalEditarNome.parentElement.style.display = "";
    else if (modalEditarNome) modalEditarNome.style.display = "";
    if (modalEditarTelefone?.parentElement) modalEditarTelefone.parentElement.style.display = "";
    else if (modalEditarTelefone) modalEditarTelefone.style.display = "";

    const cliente = clientes.find(c => c.id === id);
    if (cliente) {
      if (modalEditarNome) modalEditarNome.value = cliente.nome || "";
      if (modalEditarTelefone) modalEditarTelefone.value = cliente.telefone || "";
    }
  } else if (tipo === "produto") {
    if (modalEditarTitulo) modalEditarTitulo.textContent = "Editar Produto";
    if (modalEditarNome?.parentElement) modalEditarNome.parentElement.style.display = "";
    else if (modalEditarNome) modalEditarNome.style.display = "";
    if (modalEditarQuantidade?.parentElement) modalEditarQuantidade.parentElement.style.display = "";
    else if (modalEditarQuantidade) modalEditarQuantidade.style.display = "";

    const produto = produtos.find(p => p.id === id);
    if (produto) {
      if (modalEditarNome) modalEditarNome.value = produto.nome || "";
      if (modalEditarQuantidade) modalEditarQuantidade.value = produto.quantidade ?? 0;
    }
  } else if (tipo === "preco") {
    if (modalEditarTitulo) modalEditarTitulo.textContent = "Editar Preço";
    if (modalEditarNome?.parentElement) modalEditarNome.parentElement.style.display = "";
    else if (modalEditarNome) modalEditarNome.style.display = "";
    if (modalEditarPreco?.parentElement) modalEditarPreco.parentElement.style.display = "";
    else if (modalEditarPreco) modalEditarPreco.style.display = "";

    const preco = precos.find(p => p.id === id);
    if (preco) {
      if (modalEditarNome) modalEditarNome.value = preco.produtoNome || "";
      if (modalEditarPreco) modalEditarPreco.value = (preco.valor ?? preco.preco ?? 0);
    }
  } else {
    console.warn("abrirModal: tipo desconhecido", tipo);
  }

  modalEditar.style.display = "block";
};

if (btnSalvarEdicao) btnSalvarEdicao.onclick = async () => {
  if (!itemEdicao || !tipoEdicao) {
    alert("Nenhum item selecionado para editar.");
    return;
  }
  try {
    if (tipoEdicao === "cliente") {
      const nome = (modalEditarNome?.value || "").trim();
      const telefone = (modalEditarTelefone?.value || "").trim();
      if (!nome) return alert("Informe o nome do cliente.");
      await updateDoc(doc(db, "clientes", itemEdicao), { nome, telefone });
      alert("Cliente atualizado com sucesso!");
    } else if (tipoEdicao === "produto") {
      const nome = (modalEditarNome?.value || "").trim();
      const quantidade = parseInt(modalEditarQuantidade?.value) || 0;
      if (!nome) return alert("Informe o nome do produto.");
      await updateDoc(doc(db, "estoque", itemEdicao), { nome, quantidade });
      // sincroniza nome no precos
      const q = query(precosCol, where("produtoId","==",itemEdicao));
      const snaps = await getDocs(q);
      for (const s of snaps.docs) {
        await updateDoc(doc(db,"precos",s.id), { produtoNome: nome });
      }
      alert("Produto atualizado com sucesso!");
    } else if (tipoEdicao === "preco") {
      const produtoNome = (modalEditarNome?.value || "").trim();
      const valor = parseFloat(modalEditarPreco?.value) || 0;
      await updateDoc(doc(db, "precos", itemEdicao), { produtoNome, preco: valor, valor });
      alert("Preço atualizado com sucesso!");
    }

    modalEditar.style.display = "none";
    itemEdicao = null; tipoEdicao = null;
  } catch (err) {
    console.error("Erro ao salvar edição:", err);
    alert("Erro ao salvar edição: " + (err.message || err));
  }
};

if (btnCancelarEdicao) btnCancelarEdicao.onclick = () => {
  if (modalEditar) modalEditar.style.display = "none";
  itemEdicao = null; tipoEdicao = null;
};

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
  if (!tabelaOrcamentosSalvos) return;
  tabelaOrcamentosSalvos.innerHTML = "";

  orcamentos.forEach((o) => {
    const produtosText = o.produtos.map(p => p.nome).join(", ");
    const quantText = o.produtos.map(p => p.quantidade).join(", ");
    const precoUnitText = o.produtos.map(p => (p.preco ?? 0).toFixed(2)).join(", ");
    const precoTotalText = o.produtos.map(p => (p.total ?? 0).toFixed(2)).join(", ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.data}</td>
      <td>${o.clienteNome}</td>
      <td>${produtosText}</td>
      <td>${quantText}</td>
      <td>R$ ${precoUnitText}</td>
      <td>R$ ${precoTotalText}</td>
      <td>
        <button class="acao-btn pdf" onclick="reimprimirOrcamento('${o.id}')">PDF</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirOrcamento('${o.id}'))">Excluir</button>
      </td>
    `;
    tabelaOrcamentosSalvos.appendChild(tr);
  });
}

// Atualiza o total geral dos orçamentos
const totalGeral = orcamentos.reduce((acc, o) => {
  return acc + o.produtos.reduce((sum, p) => sum + p.precoTotal, 0);
}, 0);

document.getElementById("totalGeralRegistros").textContent = 
  `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;

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
  try {
    if (!window.jspdf) { alert("Biblioteca jsPDF não está carregada."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Vendas", 14, 20);
    const tabela = document.querySelector("#tabelaRegistros tbody");
    if (!tabela || tabela.rows.length === 0) { alert("Nenhum registro de venda encontrado."); return; }
    const dados = [];
    for (let i = 0; i < tabela.rows.length; i++) {
      const cols = tabela.rows[i].cells;
      dados.push([cols[1].innerText, cols[2].innerText, cols[3].innerText, cols[7].innerText, cols[0].innerText]);
    }
    doc.autoTable({ head: [["Cliente","Produto","Qtd","Total Após","Data"]], body: dados, startY: 30, styles: { fontSize: 10 }});
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
    doc.save(`Relatorio_Vendas_${Date.now()}.pdf`);
  } catch (e) {
    console.error("Erro ao exportar PDF:", e);
    alert("Erro ao exportar PDF. Veja o console.");
  }
}
window.exportarPDF = exportarPDF;

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
      ? (venda.desconto.tipoValor === 'percentual' ? `${venda.desconto.valor}% (${venda.desconto.tipoAplicado})` : `${formatCurrency(venda.desconto.valor)} (${venda.desconto.tipoAplicado})`)
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
function mostrar(viewId) {
  document.querySelectorAll(".view").forEach(sec => {
    sec.style.display = sec.id === viewId ? "block" : "none";
  });
}
window.mostrar = mostrar;
window.mostrarSecao = mostrar;

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
})();





