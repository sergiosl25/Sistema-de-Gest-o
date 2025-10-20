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
  else document.getElementById("userEmail").textContent = user.email;
});

// Logout
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

/* Guarda o desconto atual aplicado no formulário antes de registrar a venda */
let currentSaleDiscount = {
  tipoAplicado: null, // 'produto' | 'venda' | null
  tipoValor: null,    // 'percentual' | 'valor' | null
  valor: 0
};

/* =========================
   Helpers / Elementos DOM
   ========================= */
// Tabelas e inputs (IDs do seu HTML)
const tabelaClientes = document.querySelector("#tabelaClientes tbody");
const nomeCliente = document.getElementById("nomeCliente");
const telefoneCliente = document.getElementById("telefoneCliente");
const btnCadastrarCliente = document.getElementById("btnCadastrarCliente");
const clienteSelect = document.getElementById("clienteSelect");

const tabelaEstoque = document.querySelector("#tabelaEstoque tbody");
const nomeProduto = document.getElementById("nomeProduto");
const quantidadeProduto = document.getElementById("quantidadeProduto");
const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
const produtoSelect = document.getElementById("produtoSelect");
const tipoPrecoSelect = document.getElementById("tipoPrecoSelect");
const precoVendaInput = document.getElementById("precoVenda");
const produtoSelectPreco = document.getElementById("produtoSelectPreco");

const quantidadeVenda = document.getElementById("quantidadeVenda");
const formaPagamento = document.getElementById("formaPagamento");
const btnVender = document.getElementById("btnVender");
const btnDesconto = document.getElementById("btnDesconto");
const btnDescontoVenda = document.getElementById("btnDescontoVenda");

const tabelaVendasUI = document.querySelector("#tabelaVendas tbody"); // tabela na view 'vendas'
const tabelaRegistros = document.querySelector("#tabelaRegistros tbody"); // tabela registros (historico)
const totalGeralRegistros = document.getElementById("totalGeralRegistros");

// Orçamentos / preços (mantive suas refs)
const tabelaOrcamento = document.querySelector("#tabelaOrcamento tbody");
const clienteInputOrcamento = document.getElementById("clienteInputOrcamento");
const produtoSelectOrcamento = document.getElementById("produtoSelectOrcamento");
const quantidadeOrcamento = document.getElementById("quantidadeOrcamento");
const btnAdicionarProduto = document.getElementById("btnAdicionarProduto");
const btnGerarPDF = document.getElementById("btnGerarPDF");
const tabelaOrcamentosSalvos = document.querySelector("#tabelaOrcamentosSalvos tbody");

const tabelaPrecos = document.querySelector("#tabelaPrecos tbody");
const btnNovaLinhaPreco = document.getElementById("btnNovaLinhaPreco");

// Modais edição/exclusão (mantive)
const modalEditar = document.getElementById("modalEditar");
const modalEditarTitulo = document.getElementById("modalEditarTitulo");
const modalEditarNome = document.getElementById("modalEditarNome");
const modalEditarTelefone = document.getElementById("modalEditarTelefone");
const modalEditarQuantidade = document.getElementById("modalEditarQuantidade");
const modalEditarCompra = document.getElementById("modalEditarCompra");
const modalEditarVenda = document.getElementById("modalEditarVenda");
const modalEditarPreco = document.getElementById("modalEditarPreco");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const modalExcluir = document.getElementById("modalExcluir");
const btnConfirmarExcluir = document.getElementById("btnConfirmarExcluir");
const btnCancelarExcluir = document.getElementById("btnCancelarExcluir");

// Modal de desconto (IDs do seu HTML)
const modalDesconto = document.getElementById("modalDesconto");
const tituloModalDesconto = document.getElementById("tituloModalDesconto");
const tipoDescontoSelect = document.getElementById("tipoDesconto"); // 'percentual' | 'valor'
const valorDescontoInput = document.getElementById("valorDesconto");
const btnAplicarDesconto = document.getElementById("btnAplicarDesconto");
const btnCancelarDesconto = document.getElementById("btnCancelarDesconto");

/* controle modal editar/excluir */
let itemEdicao = null;
let tipoEdicao = null;
let acaoExcluir = null;

/* =========================
   Small helpers
   ========================= */
function sanitizeFileName(name){ return name ? name.replace(/[\/\\?%*:|"<>]/g,"_") : "cliente"; }
function money(val){ return Number(val||0).toFixed(2); }
function formatCurrency(val){ return Number(val||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function nowDateTime(){ return new Date().toLocaleString(); }
function toNumber(v){ const n = Number(v); return isNaN(n) ? 0 : n; }

/* =========================
   Real-time listeners (Firestore)
   ========================= */
onSnapshot(clientesCol, snapshot => {
  clientes = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderClientes();
});

onSnapshot(precosCol, snapshot => {
  precos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTabelaPrecos();
});

onSnapshot(vendasCol, snapshot => {
  vendas = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderVendas(); // histórico
});

onSnapshot(orcamentosCol, snapshot => {
  orcamentos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  // filtra inválidos
  orcamentos = orcamentos.filter(o => o && o.clienteNome && Array.isArray(o.produtos) && o.produtos.length>0);
  renderOrcamentosSalvos();
});

onSnapshot(estoqueCol, snapshot => {
  produtos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderEstoque();
  renderProdutoSelectOrcamento();
  renderProdutoSelectPreco();
});

/* =========================
   CLIENTES
   ========================= */
btnCadastrarCliente.onclick = async () => {
  const nome = (nomeCliente.value||"").trim();
  if(!nome) return alert("Informe o nome do cliente");
  const telefone = (telefoneCliente.value||"").trim();
  try {
    await addDoc(clientesCol, { nome, telefone });
    nomeCliente.value = telefoneCliente.value = "";
  } catch(err) { console.error(err); alert("Erro ao salvar cliente: "+err.message); }
};

function renderClientes(){
  tabelaClientes.innerHTML = "";
  clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";
  clientes.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.nome}</td>
      <td>${c.telefone || ""}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('cliente','${c.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirCliente('${c.id}'))">Excluir</button>
      </td>
    `;
    tabelaClientes.appendChild(tr);

    const opt = document.createElement("option");
    opt.value = c.id; opt.textContent = c.nome;
    clienteSelect.appendChild(opt);
  });
}

async function excluirCliente(id){
  try {
    await deleteDoc(doc(db,"clientes",id));
  } catch(err){ console.error(err); alert("Erro ao excluir cliente: "+err.message); }
}
window.excluirCliente = excluirCliente;

/* =========================
   PRODUTOS
   ========================= */
btnCadastrarProduto.onclick = async () => {
  const nome = (nomeProduto.value||"").trim();
  const quantidade = parseInt(quantidadeProduto.value) || 0;
  if(!nome) return alert("Informe nome do produto");
  try {
    const ref = await addDoc(estoqueCol, { nome, quantidade });
    // cria linha padrão na coleção de preços
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
    nomeProduto.value = quantidadeProduto.value = "";
  } catch(err){ console.error(err); alert("Erro ao cadastrar produto: "+err.message); }
};

function renderEstoque() {
  tabelaEstoque.innerHTML = "";
  produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";
  produtos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.quantidade || 0}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('produto','${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirProduto('${p.id}'))">Excluir</button>
      </td>
    `;
    tabelaEstoque.appendChild(tr);

    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nome;
    produtoSelect.appendChild(opt);
  });
}

async function excluirProduto(id){
  try {
    const q = query(precosCol, where("produtoId","==",id));
    const snaps = await getDocs(q);
    for(const s of snaps.docs) await deleteDoc(doc(precosCol, s.id));
    await deleteDoc(doc(db,"estoque",id));
  } catch(err){ console.error(err); alert("Erro ao excluir produto: "+err.message); }
}
window.excluirProduto = excluirProduto;

/* =========================
   PREÇOS e selects
   ========================= */
produtoSelect.onchange = () => {
  const produtoId = produtoSelect.value;
  tipoPrecoSelect.innerHTML = "<option value=''>Selecione tipo de preço</option>";
  precoVendaInput.value = "";
  if(!produtoId) return;
  const precoDoProduto = precos.find(p => p.produtoId === produtoId);
  if(!precoDoProduto) return;
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
};

tipoPrecoSelect.addEventListener("change", () => {
  const tipo = tipoPrecoSelect.value;
  const produtoId = produtoSelect.value;
  if (!tipo || !produtoId) return;
  const precoDoProduto = precos.find(p => p.produtoId === produtoId);
  if (!precoDoProduto) return;
  const valor = precoDoProduto[tipo];
  const preco = Number(valor);
  if (!isNaN(preco)) precoVendaInput.value = preco.toFixed(2);
  else precoVendaInput.value = "";
});

/* =========================
   VENDAS (com transação) + integração do desconto
   ========================= */
btnVender.onclick = async () => {
  const clienteId = clienteSelect.value;
  const produtoId = produtoSelect.value;
  const qtd = parseInt(quantidadeVenda.value);
  const tipoPreco = tipoPrecoSelect.value;

  if (!clienteId || !produtoId || !qtd || qtd <= 0 || !tipoPreco) {
    return alert("Preencha cliente, produto, tipo de preço e quantidade corretamente.");
  }

  try {
    const produtoRef = doc(db, "estoque", produtoId);
    const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
    const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : "Cliente";

    // pega preço do documento de precos local em cache
    const precoDoc = precos.find(p => p.produtoId === produtoId);
    if (!precoDoc) return alert("Tabela de preços para esse produto não encontrada.");

    const precoUnitarioBase = Number(precoDoc[tipoPreco]) || 0;
    if (precoUnitarioBase <= 0) return alert("Preço inválido. Verifique a tabela de preços.");

    // Calcula total antes e depois aplicando desconto em currentSaleDiscount
    const qtdNum = qtd;
    const totalAntes = precoUnitarioBase * qtdNum;
    let totalDepois = totalAntes;
    let descontoSalvo = { tipoAplicado: null, tipoValor: null, valor: 0 };

    if (currentSaleDiscount && currentSaleDiscount.tipoAplicado) {
      descontoSalvo = { ...currentSaleDiscount };
      if (descontoSalvo.tipoAplicado === 'produto') {
        // aplicar sobre unitário
        if (descontoSalvo.tipoValor === 'percentual') {
          const descontoUnit = precoUnitarioBase * (descontoSalvo.valor/100);
          totalDepois = (precoUnitarioBase - descontoUnit) * qtdNum;
        } else {
          const descontoUnit = descontoSalvo.valor;
          totalAfterUnit = Math.max(0, precoUnitarioBase - descontoUnit);
          totalDepois = totalAfterUnit * qtdNum;
        }
      } else {
        // aplicado sobre venda (total)
        if (descontoSalvo.tipoValor === 'percentual') {
          totalDepois = totalAntes - (totalAntes * (descontoSalvo.valor/100));
        } else {
          totalDepois = totalAntes - descontoSalvo.valor;
        }
      }
      if (totalDepois < 0) totalDepois = 0;
    }

    // Transação: atualiza estoque e grava venda com campos de desconto
    await runTransaction(db, async tx => {
      const produtoSnapTx = await tx.get(produtoRef);
      if (!produtoSnapTx.exists()) throw "Produto não encontrado";
      const estoqueAtual = produtoSnapTx.data().quantidade || 0;
      if (estoqueAtual < qtdNum) throw "Estoque insuficiente";

      tx.update(produtoRef, { quantidade: estoqueAtual - qtdNum });

      const vendaDoc = {
        data: nowDateTime(),
        clienteId,
        cliente: clienteNome,
        produtoId,
        produto: precoDoc.produtoNome || produtoSelect.options[produtoSelect.selectedIndex].text || "Produto",
        quantidade: qtdNum,
        preco: precoUnitarioBase,
        totalAntes,
        totalDepois,
        desconto: descontoSalvo, // { tipoAplicado, tipoValor, valor }
        pagamento: formaPagamento.value || "Não informado"
      };

      tx.set(doc(vendasCol), vendaDoc);
    });

    // limpa formulário e desconto atual
    quantidadeVenda.value = "";
    currentSaleDiscount = { tipoAplicado: null, tipoValor: null, valor: 0 };

    alert("Venda registrada com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar venda: " + (err.message || err));
  }
};

/* =========================
   Modal de desconto (genérico) — abre para 'produto' ou 'venda'
   ========================= */
let tipoDescontoAtual = null; // 'produto' ou 'venda'

btnDesconto && btnDesconto.addEventListener('click', () => {
  tipoDescontoAtual = 'produto';
  tituloModalDesconto.textContent = "Desconto no Produto";
  tipoDescontoSelect.value = "percentual";
  valorDescontoInput.value = "";
  modalDesconto.classList.add("active");
});

btnDescontoVenda && btnDescontoVenda.addEventListener('click', () => {
  tipoDescontoAtual = 'venda';
  tituloModalDesconto.textContent = "Desconto na Venda";
  tipoDescontoSelect.value = "percentual";
  valorDescontoInput.value = "";
  modalDesconto.classList.add("active");
});

// cancelar
btnCancelarDesconto && btnCancelarDesconto.addEventListener('click', () => {
  modalDesconto.classList.remove("active");
  valorDescontoInput.value = "";
  tipoDescontoAtual = null;
});

// aplicar desconto: atualiza currentSaleDiscount e, se for desconto unitário, atualiza precoVendaInput na UI
btnAplicarDesconto && btnAplicarDesconto.addEventListener('click', () => {
  const tipoValor = tipoDescontoSelect.value; // 'percentual' | 'valor'
  const valor = parseFloat(valorDescontoInput.value);
  if (isNaN(valor) || valor <= 0) return alert("Digite um valor de desconto válido.");

  // salva no estado da venda atual
  currentSaleDiscount = {
    tipoAplicado: tipoDescontoAtual === 'produto' ? 'produto' : 'venda',
    tipoValor: tipoValor === 'percentual' ? 'percentual' : 'valor',
    valor: Number(valor)
  };

  // Se for desconto no produto, atualiza o preço unitário mostrado no formulário (apenas visual)
  if (currentSaleDiscount.tipoAplicado === 'produto') {
    const precoBase = toNumber(precoVendaInput.value);
    if (precoBase <= 0) {
      // tenta recuperar preço a partir do produto selection + tipo preco
      const produtoId = produtoSelect.value;
      const tipoPreco = tipoPrecoSelect.value;
      const precoDoc = precos.find(p => p.produtoId === produtoId);
      if (precoDoc && tipoPreco) {
        const base = toNumber(precoDoc[tipoPreco]);
        if (base > 0) {
          // calcula desconto
          const desconto = currentSaleDiscount.tipoValor === 'percentual' ? base * (currentSaleDiscount.valor/100) : currentSaleDiscount.valor;
          const novo = Math.max(0, base - desconto);
          precoVendaInput.value = novo.toFixed(2);
        }
      }
    } else {
      const base = precoBase;
      const desconto = currentSaleDiscount.tipoValor === 'percentual' ? base * (currentSaleDiscount.valor/100) : currentSaleDiscount.valor;
      const novo = Math.max(0, base - desconto);
      precoVendaInput.value = novo.toFixed(2);
    }
  }

  // Fecha o modal
  modalDesconto.classList.remove("active");
  valorDescontoInput.value = "";
  tipoDescontoAtual = null;

  // Exibe um resumo rápido para o usuário
  alert(`Desconto aplicado: ${currentSaleDiscount.tipoValor === 'percentual' ? currentSaleDiscount.valor + '%' : formatCurrency(currentSaleDiscount.valor)} (${currentSaleDiscount.tipoAplicado})`);
});

/* =========================
   RENDERIZAÇÕES: vendas/histórico
   ========================= */
function renderVendas(){
  tabelaRegistros.innerHTML = "";
  let total = 0;
  vendas.forEach(v => {
    total += Number(v.totalDepois ?? v.total ?? 0);
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
  totalGeralRegistros.textContent = formatCurrency(total);
}

async function excluirVenda(id){
  try {
    const vendaRef = doc(db,"vendas",id);
    const vendaSnap = await getDoc(vendaRef);
    if(!vendaSnap.exists()) return;
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
  } catch(err){ console.error(err); alert("Erro ao excluir venda: " + err.message || err); }
}
window.excluirVenda = excluirVenda;

/* =========================
   ORÇAMENTOS (mantive suas funções)
   ========================= */
function renderProdutoSelectOrcamento(){
  if(!produtoSelectOrcamento) return;
  produtoSelectOrcamento.innerHTML = "<option value=''>Selecione o produto</option>";
  produtos.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id; opt.textContent = p.nome;
    produtoSelectOrcamento.appendChild(opt);
  });
}

btnAdicionarProduto && (btnAdicionarProduto.onclick = () => {
  const clienteNome = (clienteInputOrcamento.value||"").trim();
  const produtoId = produtoSelectOrcamento.value;
  const qtd = parseInt(quantidadeOrcamento.value) || 0;
  if (!clienteNome) return alert("Informe o nome do cliente antes de adicionar o produto.");
  if (!produtoId || qtd <= 0) return alert("Selecione um produto e informe a quantidade.");
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return alert("Produto não encontrado.");
  if (!orcamentos) orcamentos = [];

  // assegura orcamentoAtual
  if (!window.orcamentoAtual || !Array.isArray(window.orcamentoAtual?.produtos)) {
    window.orcamentoAtual = { clienteNome, produtos: [], data: new Date().toLocaleDateString("pt-BR") };
  }
  // garante existência
  window.orcamentoAtual.clienteNome = clienteNome;
  window.orcamentoAtual.data = new Date().toLocaleDateString("pt-BR");

  const precoDoc = precos.find(pr => pr.produtoId === produtoId);
  const precoAtual = precoDoc ? (precoDoc.estampaFrente || 0) : 0;

  window.orcamentoAtual.produtos.push({
    produtoId,
    nome: produto.nome,
    quantidade: qtd,
    preco: precoAtual,
    total: precoAtual * qtd
  });

  renderTabelaOrcamentoAtual();
  produtoSelectOrcamento.value = "";
  quantidadeOrcamento.value = "";
});

function renderTabelaOrcamentoAtual(){
  if(!window.orcamentoAtual) return;
  tabelaOrcamento.innerHTML = "";
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
  window.orcamentoAtual.produtos.splice(index,1);
  renderTabelaOrcamentoAtual();
}
window.removerProduto = removerProduto;

btnGerarPDF && (btnGerarPDF.onclick = async () => {
  if (!window.orcamentoAtual || !window.orcamentoAtual.clienteNome || window.orcamentoAtual.produtos.length === 0) {
    return alert("Informe o nome do cliente e adicione produtos");
  }
  if (!window.orcamentoAtual.data) window.orcamentoAtual.data = new Date().toLocaleDateString("pt-BR");
  try {
    const copia = JSON.parse(JSON.stringify(window.orcamentoAtual));
    await addDoc(orcamentosCol, copia);
    window.orcamentoAtual = { clienteNome: "", produtos: [], data: null };
    renderTabelaOrcamentoAtual();
    clienteInputOrcamento.value = "";
    produtoSelectOrcamento.value = "";
    quantidadeOrcamento.value = "";

    // gerar PDF (idêntico ao seu padrão)
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
        doc.text("R$ " + p.preco.toFixed(2), 120, y);
        doc.text("R$ " + p.total.toFixed(2), 170, y);
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
  } catch(err) {
    console.error(err);
    alert("Erro ao salvar orçamento: " + err.message || err);
  }
});

/* =========================
   TABELA DE PREÇOS (editável)
   ========================= */
btnNovaLinhaPreco && (btnNovaLinhaPreco.onclick = async () => {
  const prodId = produtoSelectPreco.value;
  const prod = produtos.find(p=>p.id===prodId);
  try {
    await addDoc(precosCol, {
      produtoId: prodId || null,
      produtoNome: prod ? prod.nome : "Produto não informado",
      preco:0, estampaFrente:0, estampaFrenteVerso:0, branca:0,
      interiorCores:0, magicaFosca:0, magicaBrilho:0
    });
  } catch(err){ console.error(err); alert("Erro ao adicionar linha de preço: "+err.message || err); }
});

function renderProdutoSelectPreco(){
  if(!produtoSelectPreco) return;
  produtoSelectPreco.innerHTML = "<option value=''>— Selecione produto —</option>";
  produtos.forEach(p=>{
    const opt=document.createElement("option"); opt.value=p.id; opt.textContent=p.nome;
    produtoSelectPreco.appendChild(opt);
  });
}

// === substituir renderTabelaPrecos por esta versão robusta ===
function renderTabelaPrecos() {
  if (!tabelaPrecos) return;
  tabelaPrecos.innerHTML = "";

  precos.forEach(p => {
    const tr = document.createElement("tr");

    // usa Json.stringify/Number para evitar 'undefined' no innerText
    const cellProduto = p.produtoNome || "";
    const cPreco = p.preco ?? p.valor ?? 0;
    const cEstampaFrente = p.estampaFrente ?? 0;
    const cEstampaFrenteVerso = p.estampaFrenteVerso ?? 0;
    const cBranca = p.branca ?? 0;
    const cInterior = p.interiorCores ?? 0;
    const cMagicaFosca = p.magicaFosca ?? 0;
    const cMagicaBrilho = p.magicaBrilho ?? 0;

    tr.innerHTML = `
      <td>${cellProduto}</td>
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

    // adiciona listener para atualizar firestore ao perder foco
    tr.querySelectorAll("[contenteditable]").forEach(td => {
      td.onblur = async () => {
        const field = td.dataset.field;
        // retira caracteres que não são números (permite vírgula/.) e converte
        const raw = td.textContent.trim().replace(",", ".");
        const num = parseFloat(raw);
        const valueToSave = isNaN(num) ? 0 : num;
        try {
          // usa doc(db,"precos", p.id) (forma consistente)
          await updateDoc(doc(db, "precos", p.id), { [field]: valueToSave });
        } catch (err) {
          console.error("Erro ao atualizar preço no Firestore:", err);
          alert("Erro ao salvar preço. Veja o console.");
        }
      };
      // evita que o ENTER crie nova linha no contenteditable
      td.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); td.blur(); }
      });
    });
  });
}

function abrirModalPreco(id) {
  const preco = precos.find(p => p.id === id);
  if (!preco) return alert("Preço não encontrado");
  itemEdicao = id; tipoEdicao = "preco";
  modalEditar.style.display = "block";
  modalEditarTitulo.textContent = `Editar Preço: ${preco.produtoNome || ""}`;
  modalEditarNome.value = preco.produtoNome || "";
  modalEditarPreco.value = preco.valor || preco.preco || 0;
}
window.abrirModalPreco = abrirModalPreco;

async function excluirPreco(id){
  try{ await deleteDoc(doc(precosCol, id)); }
  catch(err){ console.error(err); alert("Erro ao excluir preço: "+err.message || err); }
}
window.excluirPreco = excluirPreco;

/* =========================
   Modal edição (cliente/produto/preco)
   ========================= */
window.abrirModal = function(tipo, id) {
  itemEdicao = id;
  tipoEdicao = tipo;

  if (!modalEditar) {
    console.warn("modalEditar não encontrado no DOM");
    return;
  }

  // mostra modal
  modalEditar.style.display = "block";

  // limpa e esconde todos os campos presentes (faz proteção caso algum input não exista)
  const campos = {
    nome: modalEditarNome,
    telefone: modalEditarTelefone,
    quantidade: modalEditarQuantidade,
    compra: modalEditarCompra,
    venda: modalEditarVenda,
    preco: modalEditarPreco
  };

  Object.values(campos).forEach(inp => {
    if (!inp) return;
    // se estiver dentro de um wrapper (label/div) mostramos/escondemos esse wrapper,
    // senão mostramos o próprio input.
    const wrapper = inp.parentElement;
    if (wrapper) wrapper.style.display = "none";
    else inp.style.display = "none";
    // limpa valor antigo (opcional)
    // inp.value = "";
  });

  if (tipo === "cliente") {
    modalEditarTitulo.textContent = "Editar Cliente";
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
    modalEditarTitulo.textContent = "Editar Produto";
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
    modalEditarTitulo.textContent = "Editar Preço";
    if (modalEditarNome?.parentElement) modalEditarNome.parentElement.style.display = "";
    else if (modalEditarNome) modalEditarNome.style.display = "";
    if (modalEditarPreco?.parentElement) modalEditarPreco.parentElement.style.display = "";
    else if (modalEditarPreco) modalEditarPreco.style.display = "";

    const preco = precos.find(p => p.id === id);
    if (preco) {
      if (modalEditarNome) modalEditarNome.value = preco.produtoNome || "";
      // alguns registros usam 'valor' ou 'preco' — tenta ambos
      if (modalEditarPreco) modalEditarPreco.value = (preco.valor ?? preco.preco ?? 0);
    }
  } else {
    console.warn("abrirModal chamado com tipo desconhecido:", tipo);
  }
};

btnSalvarEdicao.onclick = async () => {
  if (!itemEdicao || !tipoEdicao) return alert("Nenhum item selecionado para editar.");

  try {
    if (tipoEdicao === "cliente") {
      const nome = (modalEditarNome.value || "").trim();
      const telefone = (modalEditarTelefone.value || "").trim();
      if (!nome) return alert("Nome do cliente não pode ficar vazio.");
      await updateDoc(doc(db, "clientes", itemEdicao), { nome, telefone });
    } else if (tipoEdicao === "produto") {
      const nome = (modalEditarNome.value || "").trim();
      const quantidade = parseInt(modalEditarQuantidade.value) || 0;
      if (!nome) return alert("Nome do produto não pode ficar vazio.");
      await updateDoc(doc(db, "estoque", itemEdicao), { nome, quantidade });

      // sincroniza nome no precos (caso haja)
      const q = query(precosCol, where("produtoId", "==", itemEdicao));
      const snaps = await getDocs(q);
      for (const s of snaps.docs) {
        await updateDoc(doc(db, "precos", s.id), { produtoNome: nome });
      }
    } else if (tipoEdicao === "preco") {
      const produtoNome = (modalEditarNome.value || "").trim();
      const valor = parseFloat(modalEditarPreco.value) || 0;
      // salva em 'valor' e também em 'preco' para compatibilidade
      await updateDoc(doc(db, "precos", itemEdicao), { produtoNome, valor, preco: valor });
    } else {
      throw new Error("Tipo de edição desconhecido: " + tipoEdicao);
    }

    // fecha modal e limpa estado
    if (modalEditar) modalEditar.style.display = "none";
    itemEdicao = null;
    tipoEdicao = null;
    // re-render opcional (onSnapshot geralmente cuida disso)
    renderEstoque();
    renderClientes();
    renderTabelaPrecos();
  } catch (err) {
    console.error("Erro ao salvar edição:", err);
    alert("Erro ao salvar edição: " + (err.message || err));
  }
};

btnCancelarEdicao.onclick = () => modalEditar.style.display = "none";

/* =========================
   Modal de exclusão genérico
   ========================= */
window.abrirModalExclusao = function(callback){
  if(!modalExcluir) return;
  modalExcluir.style.display = "block";
  btnConfirmarExcluir.onclick = () => { if(callback) callback(); modalExcluir.style.display = "none"; };
  btnCancelarExcluir.onclick = () => { modalExcluir.style.display = "none"; };
};

/* =========================
   Exportar PDF de vendas
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
      dados.push([
        cols[1].innerText, // Cliente
        cols[2].innerText, // Produto
        cols[3].innerText, // Quantidade
        cols[7].innerText, // Total Após (coluna 7)
        cols[0].innerText  // Data
      ]);
    }
    doc.autoTable({
      head: [["Cliente", "Produto", "Qtd", "Total Após", "Data"]],
      body: dados,
      startY: 30,
      styles: { fontSize: 10 }
    });
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
    doc.save(`Relatorio_Vendas_${Date.now()}.pdf`);
  } catch(e) { console.error("Erro ao exportar PDF:", e); alert("Erro ao exportar PDF. Veja o console."); }
}
window.exportarPDF = exportarPDF;

/* =========================
   Recibo (gera PDF de 1 venda)
   ========================= */
function gerarRecibo(vendaId) {
  const venda = vendas.find(v => v.id === vendaId);
  if (!venda) return alert("Venda não encontrada");
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
  imgLogo.onerror = function () {
    doc.text("Recibo de Venda", 105, 20, { align: "center" });
    doc.output("dataurlnewwindow");
  };
}
window.gerarRecibo = gerarRecibo;

/* =========================
   Utilidades expostas
   ========================= */
function mostrar(viewId) {
  document.querySelectorAll(".view").forEach(sec => {
    sec.style.display = sec.id === viewId ? "block" : "none";
  });
}
window.mostrar = mostrar;

function abrirModal(id) { const modal = document.getElementById(id); if(modal) modal.style.display = "block"; }
function fecharModal(id) { const modal = document.getElementById(id); if(modal) modal.style.display = "none"; }
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;

/* =========================
   Expondo funções restantes (para onclick strings no HTML)
   ========================= */
window.abrirModalExclusao = window.abrirModalExclusao;
window.removerProduto = removerProduto;
window.reimprimirOrcamento = function(orcId){ /* reusa renderização e PDF */ reimprimirOrcamento(orcId); };
window.salvarOrcamento = async function(){ /* opcional se usar btnGerarPDF */ return; };

/* =========================
   Função reimprimirOrcamento (mantida)
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
    y += 8; doc.line(10, y, 200, y); y+=8;
    let totalGeral = 0;
    orc.produtos.forEach(p => {
      doc.text(p.nome, 10, y);
      doc.text(String(p.quantidade), 90, y);
      doc.text("R$ " + p.preco.toFixed(2), 120, y);
      doc.text("R$ " + p.total.toFixed(2), 170, y);
      totalGeral += p.total; y+=10;
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
