import { db, auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
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
   Estado local (cache)
   ========================= */
let clientes = [];
let produtos = [];
let vendas = [];
let orcamentos = [];

let orcamentoAtual = {
  clienteNome: "",
  produtos: [],
  data: null
};

window.mostrar = function (secao) {
  document.querySelectorAll(".secao").forEach(s => s.style.display = "none");
  document.getElementById(secao).style.display = "block";
};

/* =========================
   Helpers / Elementos DOM
   ========================= */
// Navegação
// =======================
// Elementos (mesmos ids do HTML)
const tabelaClientes = document.querySelector("#tabelaClientes tbody");
const nomeCliente = document.getElementById("nomeCliente");
const telefoneCliente = document.getElementById("telefoneCliente");
const btnCadastrarCliente = document.getElementById("btnCadastrarCliente");
const clienteSelect = document.getElementById("clienteSelect");

const tabelaProdutos = document.querySelector("#tabelaProdutos tbody");
const nomeProduto = document.getElementById("nomeProduto");
const quantidadeProduto = document.getElementById("quantidadeProduto");
const valorCompraProduto = document.getElementById("valorCompraProduto");
const valorVendaProduto = document.getElementById("valorVendaProduto");
const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
const produtoSelect = document.getElementById("produtoSelect");
const totalCompraEl = document.getElementById("totalCompra");
const totalVendaEl = document.getElementById("totalVenda");

const quantidadeVenda = document.getElementById("quantidadeVenda");
const formaPagamento = document.getElementById("formaPagamento");
const btnVender = document.getElementById("btnVender");

const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");
const totalGeralRegistros = document.getElementById("totalGeralRegistros");

const tabelaOrcamento = document.querySelector("#tabelaOrcamento tbody");
const clienteInputOrcamento = document.getElementById("clienteInputOrcamento");
const produtoSelectOrcamento = document.getElementById("produtoSelectOrcamento");
const quantidadeOrcamento = document.getElementById("quantidadeOrcamento");
const btnAdicionarProduto = document.getElementById("btnAdicionarProduto");
const btnGerarPDF = document.getElementById("btnGerarPDF");
const tabelaOrcamentosSalvos = document.querySelector("#tabelaOrcamentosSalvos tbody");

const modalEditar = document.getElementById("modalEditar");
const modalEditarTitulo = document.getElementById("modalEditarTitulo");
const modalEditarNome = document.getElementById("modalEditarNome");
const modalEditarTelefone = document.getElementById("modalEditarTelefone");
const modalEditarQuantidade = document.getElementById("modalEditarQuantidade");
const modalEditarCompra = document.getElementById("modalEditarCompra");
const modalEditarVenda = document.getElementById("modalEditarVenda");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const modalExcluir = document.getElementById("modalExcluir");
const btnConfirmarExcluir = document.getElementById("btnConfirmarExcluir");
const btnCancelarExcluir = document.getElementById("btnCancelarExcluir");

let itemEdicao = null;
let tipoEdicao = null;
let acaoExcluir = null;

/* =========================
   Utilidades
   ========================= */
function telephoneOrEmpty(t){ return t ? t.trim() : ""; }
function sanitizeFileName(name) {
  return name ? name.replace(/[\/\\?%*:|"<>]/g, "_") : "cliente";
}

const clientesCol = collection(db, "clientes");
const produtosCol = collection(db, "produtos");
const vendasCol = collection(db, "vendas");
const orcamentosCol = collection(db, "orcamentos");

/* =========================
   Real-time listeners (Firestore)
   =========================
   usamos onSnapshot para ter sincronização entre dispositivos
   ========================= */
onSnapshot(clientesCol, snapshot => {
  clientes = [];
  snapshot.forEach(docSnap => clientes.push({ id: docSnap.id, ...docSnap.data() }));
  carregarClientesUI();
});

onSnapshot(produtosCol, snapshot => {
  produtos = [];
  snapshot.forEach(docSnap => produtos.push({ id: docSnap.id, ...docSnap.data() }));
  carregarProdutosUI();
  carregarProdutosOrcamento(); // atualiza selects do orçamento
});

onSnapshot(vendasCol, snapshot => {
  vendas = [];
  snapshot.forEach(docSnap => vendas.push({ id: docSnap.id, ...docSnap.data() }));
  montarRegistrosVendas();
});

onSnapshot(orcamentosCol, snapshot => {
  orcamentos = [];
  snapshot.forEach(docSnap => orcamentos.push({ id: docSnap.id, ...docSnap.data() }));
  montarOrcamentosSalvos();
});

/* =========================
   CLIENTES
   ========================= */
btnCadastrarCliente.onclick = async () => {
  try {
    if(!nomeCliente.value.trim()) return alert("Informe o nome do cliente");
    const cliente = { nome: nomeCliente.value.trim(), telefone: telephoneOrEmpty(telefoneCliente.value) };
    await addDoc(clientesCol, cliente);
    nomeCliente.value = telefoneCliente.value = "";
    // onSnapshot vai recarregar UI automaticamente
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar cliente: " + err.message);
  }
};

function carregarClientesUI(){
  tabelaClientes.innerHTML = "";
  clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";
  clientes.forEach((c) => {
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.nome}</td>
      <td>${c.telefone || ""}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('cliente','${c.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirCliente('${c.id}'))">Excluir</button>
      </td>
    `;
    tabelaClientes.appendChild(tr);

    let option = document.createElement("option");
    option.value = c.id;
    option.textContent = c.nome;
    clienteSelect.appendChild(option);
  });
}

async function excluirCliente(id){
  try {
    // Opcional: checar se cliente tem vendas/relacionamentos antes de remover
    await deleteDoc(doc(db, "clientes", id));
    // remova por onSnapshot
  } catch(err){
    console.error(err);
    alert("Erro ao excluir cliente: " + err.message);
  }
}

/* =========================
   PRODUTOS
   ========================= */
btnCadastrarProduto.onclick = async () => {
  try {
    const nome = nomeProduto.value.trim();
    const quantidade = parseInt(quantidadeProduto.value);
    const valorCompra = parseFloat(valorCompraProduto.value);
    const valorVenda = parseFloat(valorVendaProduto.value);
    if(!nome || isNaN(quantidade) || isNaN(valorCompra) || isNaN(valorVenda)) return alert("Preencha todos os campos corretamente");
    const produto = { nome, quantidade, valorCompra, valorVenda };
    await addDoc(produtosCol, produto);
    nomeProduto.value = quantidadeProduto.value = valorCompraProduto.value = valorVendaProduto.value = "";
  } catch(err){
    console.error(err);
    alert("Erro ao cadastrar produto: " + err.message);
  }
};

function carregarProdutosUI(){
  tabelaProdutos.innerHTML = "";
  produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";
  let totalCompra = 0;
  let totalVenda = 0;
  produtos.forEach((p) => {
    totalCompra += (p.quantidade || 0) * (p.valorCompra || 0);
    totalVenda += (p.quantidade || 0) * (p.valorVenda || 0);
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.quantidade ?? 0}</td>
      <td>R$ ${Number(p.valorCompra ?? 0).toFixed(2)}</td>
      <td>R$ ${Number(p.valorVenda ?? 0).toFixed(2)}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('produto','${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirProduto('${p.id}'))">Excluir</button>
      </td>
    `;
    tabelaProdutos.appendChild(tr);

    let option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.nome} (Estoque: ${p.quantidade ?? 0})`;
    produtoSelect.appendChild(option);
  });
  totalCompraEl.textContent = "R$ " + totalCompra.toFixed(2);
  totalVendaEl.textContent = "R$ " + totalVenda.toFixed(2);
}

async function excluirProduto(id){
  try {
    await deleteDoc(doc(db, "produtos", id));
  } catch(err){
    console.error(err);
    alert("Erro ao excluir produto: " + err.message);
  }
}

/* =========================
   VENDAS (com transação para atualizar estoque)
   ========================= */
btnVender.onclick = async () => {
  try {
    const clienteId = clienteSelect.value;
    const produtoId = produtoSelect.value;
    const qtd = parseInt(quantidadeVenda.value);
    if(!clienteId || !produtoId || !qtd || qtd <= 0) return alert("Preencha todos os campos corretamente");

    const produtoRef = doc(db, "produtos", produtoId);
    const cliente = clientes.find(c => c.id === clienteId);
    if(!cliente) return alert("Cliente inválido");

    // Run transaction: checar estoque e criar venda
    await runTransaction(db, async (tx) => {
      const produtoSnap = await tx.get(produtoRef);
      if(!produtoSnap.exists()) throw new Error("Produto não encontrado");
      const produtoData = produtoSnap.data();
      const estoque = produtoData.quantidade || 0;
      if(estoque < qtd) throw new Error("Estoque insuficiente");
      // decrementar estoque
      tx.update(produtoRef, { quantidade: estoque - qtd });

      // criar documento de venda
      const venda = {
        data: new Date().toLocaleString(),
        cliente: cliente.nome,
        clienteId: cliente.id,
        produtoId: produtoId,
        produto: produtoData.nome,
        quantidade: qtd,
        preco: Number(produtoData.valorVenda || 0),
        total: Number(produtoData.valorVenda || 0) * qtd,
        pagamento: formaPagamento.value || "Não informado"
      };
      // adiciona venda (não precisamos do resultado aqui; onSnapshot atualizará)
      const vendasCollectionRef = collection(db, "vendas");
      await addDoc(vendasCollectionRef, venda);
    });

    quantidadeVenda.value = "";
    // onSnapshot atualiza UI
  } catch(err) {
    console.error(err);
    alert("Erro ao registrar venda: " + err.message);
  }
};

function montarRegistrosVendas(){
  tabelaRegistros.innerHTML = "";
  let totalGeral = 0;
  vendas.forEach((v, index) => {
    totalGeral += Number(v.total || 0);
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.data}</td>
      <td>${v.cliente}</td>
      <td>${v.produto}</td>
      <td>${v.quantidade}</td>
      <td>R$ ${Number(v.preco ?? 0).toFixed(2)}</td>
      <td>R$ ${Number(v.total ?? 0).toFixed(2)}</td>
      <td>${v.pagamento}</td>
      <td>
        <button class="acao-btn pdf" onclick="gerarRecibo('${v.id}')">Gerar Recibo</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirVenda('${v.id}'))">Excluir</button>
      </td>
    `;
    tabelaRegistros.appendChild(tr);
  });
  totalGeralRegistros.textContent = "R$ " + totalGeral.toFixed(2);
}

async function excluirVenda(vendaId){
  try {
    const vendaRef = doc(db, "vendas", vendaId);
    // Recupera info da venda
    const vendaSnap = await getDoc(vendaRef);
    if(!vendaSnap.exists()) return alert("Venda não encontrada");
    const venda = vendaSnap.data();

    // Transação: restaurar estoque e remover venda
    await runTransaction(db, async (tx) => {
      const produtoRef = doc(db, "produtos", venda.produtoId);
      const produtoSnap = await tx.get(produtoRef);
      if(produtoSnap.exists()){
        const atual = produtoSnap.data().quantidade || 0;
        tx.update(produtoRef, { quantidade: atual + (venda.quantidade || 0) });
      }
      tx.delete(vendaRef);
    });
    // onSnapshot irá atualizar UI
  } catch(err){
    console.error(err);
    alert("Erro ao excluir venda: " + err.message);
  }
}

function gerarRecibo(vendaId) {
  const venda = vendas.find(v => v.id === vendaId);
  if(!venda) return alert("Venda não encontrada");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Recibo de Venda", 105, 20, { align: "center" });
  doc.text("Alvespersonalizados", 105, 30, { align: "center" });
  let y = 50;
  doc.setFontSize(12);
  doc.text(`Data: ${venda.data}`, 10, y); y+=10;
  doc.text(`Cliente: ${venda.cliente}`, 10, y); y+=10;
  doc.text(`Produto: ${venda.produto}`, 10, y); y+=10;
  doc.text(`Quantidade: ${venda.quantidade}`, 10, y); y+=10;
  doc.text(`Preço Unitário: R$ ${Number(venda.preco).toFixed(2)}`, 10, y); y+=10;
  doc.text(`Total: R$ ${Number(venda.total).toFixed(2)}`, 10, y); y+=10;
  doc.text(`Forma de Pagamento: ${venda.pagamento}`, 10, y);
  doc.setFontSize(10);
  doc.text("Obrigado pela preferência!", 105, 280, { align: "center" });
  doc.output("dataurlnewwindow");
}

/* =========================
   ORÇAMENTOS
   ========================= */
function carregarProdutosOrcamento() {
  produtoSelectOrcamento.innerHTML = "<option value=''>Selecione o produto</option>";
  produtos.forEach(p => {
    let option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.nome}`;
    produtoSelectOrcamento.appendChild(option);
  });
}

btnAdicionarProduto.onclick = () => {
  const clienteNomeLocal = clienteInputOrcamento.value.trim();
  const produtoId = produtoSelectOrcamento.value;
  const qtd = parseInt(quantidadeOrcamento.value);
  if (!clienteNomeLocal) return alert("Informe o nome do cliente (ou visitante)");
  if (!produtoId) return alert("Selecione um produto");
  if (!qtd || qtd <= 0) return alert("Informe a quantidade");
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return alert("Produto não encontrado");

  if (!orcamentoAtual.clienteNome) orcamentoAtual.clienteNome = clienteNomeLocal;
  if (!orcamentoAtual.data) orcamentoAtual.data = new Date().toLocaleString();

  const item = {
    produtoId: produto.id,
    nome: produto.nome,
    quantidade: qtd,
    preco: Number(produto.valorVenda || 0),
    total: Number(produto.valorVenda || 0) * qtd
  };
  orcamentoAtual.produtos.push(item);
  montarTabelaOrcamentoAtual();
  produtoSelectOrcamento.value = "";
  quantidadeOrcamento.value = "";
};

function montarTabelaOrcamentoAtual() {
  tabelaOrcamento.innerHTML = "";
  let totalGeral = 0;
  orcamentoAtual.produtos.forEach((p, index) => {
    totalGeral += p.total;
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${orcamentoAtual.data || "-"}</td>
      <td>${orcamentoAtual.clienteNome || "-"}</td>
      <td>${p.nome}</td>
      <td>${p.quantidade}</td>
      <td>R$ ${p.preco.toFixed(2)}</td>
      <td>R$ ${p.total.toFixed(2)}</td>
      <td>
        <button class="acao-btn excluir" onclick="removerProduto(${index})">Remover</button>
      </td>
    `;
    tabelaOrcamento.appendChild(tr);
  });

  if (orcamentoAtual.produtos.length > 0) {
    let trTotal = document.createElement("tr");
    trTotal.innerHTML = `
      <td colspan="5" style="text-align:right"><strong>Total:</strong></td>
      <td colspan="2"><strong>R$ ${totalGeral.toFixed(2)}</strong></td>
    `;
    tabelaOrcamento.appendChild(trTotal);
  }
}

function removerProduto(index) {
  orcamentoAtual.produtos.splice(index, 1);
  montarTabelaOrcamentoAtual();
}

btnGerarPDF.onclick = async () => {
  if (!orcamentoAtual.clienteNome || orcamentoAtual.produtos.length === 0 ) {
    return alert("Informe o nome do cliente e adicione produtos");
  }
  if (!orcamentoAtual.data) orcamentoAtual.data = new Date().toLocaleString();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Orçamento", 105, 20, { align: "center" });
  let y = 40;
  doc.setFontSize(12);
  doc.text(`Data: ${orcamentoAtual.data}`, 10, y); y += 10;
  doc.text(`Cliente: ${orcamentoAtual.clienteNome}`, 10, y); y += 10;
  doc.text("Produto", 10, y);
  doc.text("Qtd", 80, y);
  doc.text("Preço Unit.", 110, y);
  doc.text("Total", 150, y);
  y += 10;
  let totalGeral = 0;
  orcamentoAtual.produtos.forEach(p => {
    doc.text(p.nome, 10, y);
    doc.text(String(p.quantidade), 80, y);
    doc.text("R$ " + p.preco.toFixed(2), 110, y);
    doc.text("R$ " + p.total.toFixed(2), 150, y);
    totalGeral += p.total;
    y += 10;
    if (y > 260) { doc.addPage(); y = 20; }
  });
  doc.text("Total Geral: R$ " + totalGeral.toFixed(2), 10, y + 10);
  doc.text("Obrigado pela preferência!", 105, 280, { align: "center" });
  doc.save(`orcamento_${sanitizeFileName(orcamentoAtual.clienteNome)}.pdf`);

  // salvar no Firestore
  try {
    const copia = JSON.parse(JSON.stringify(orcamentoAtual));
    await addDoc(orcamentosCol, copia);
    // limpar
    orcamentoAtual = { clienteNome: "", produtos: [], data: null };
    montarTabelaOrcamentoAtual();
    clienteInputOrcamento.value = "";
    produtoSelectOrcamento.value = "";
    quantidadeOrcamento.value = "";
    // onSnapshot atualiza lista de orçamentos
  } catch(err){
    console.error(err);
    alert("Erro ao salvar orçamento: " + err.message);
  }
};

function montarOrcamentosSalvos() {
  tabelaOrcamentosSalvos.innerHTML = "";
  if (orcamentos.length === 0) {
    let tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" style="text-align:center">Nenhum orçamento salvo</td>`;
    tabelaOrcamentosSalvos.appendChild(tr);
    return;
  }
  orcamentos.forEach((orc, index) => {
    orc.produtos.forEach((p, i) => {
      let tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i === 0 ? orc.data : ""}</td>
        <td>${i === 0 ? (orc.clienteNome || "Cliente não informado") : ""}</td>
        <td>${p.nome}</td>
        <td>${p.quantidade}</td>
        <td>R$ ${p.preco.toFixed(2)}</td>
        <td>R$ ${p.total.toFixed(2)}</td>
        <td>
          ${i === 0 ? `
            <button class="acao-btn pdf" onclick="reimprimirOrcamento('${orc.id}')">PDF</button>
            <button class="acao-btn excluir" onclick="excluirOrcamento('${orc.id}')">Excluir</button>
          ` : ""}
        </td>
      `;
      tabelaOrcamentosSalvos.appendChild(tr);
    });
  });
}

function reimprimirOrcamento(orcId) {
  const orc = orcamentos.find(o => o.id === orcId);
  if (!orc) return alert("Orçamento não encontrado");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Orçamento", 105, 20, { align: "center" });
  let y = 40;
  doc.setFontSize(12);
  doc.text(`Data: ${orc.data}`, 10, y); y += 10;
  doc.text(`Cliente: ${orc.clienteNome || "Cliente não informado"}`, 10, y); y += 10;
  doc.text("Produto", 10, y);
  doc.text("Qtd", 80, y);
  doc.text("Preço Unit.", 110, y);
  doc.text("Total", 150, y);
  y += 10;
  let totalGeral = 0;
  orc.produtos.forEach(p => {
    doc.text(p.nome, 10, y);
    doc.text(String(p.quantidade), 80, y);
    doc.text("R$ " + p.preco.toFixed(2), 110, y);
    doc.text("R$ " + p.total.toFixed(2), 150, y);
    totalGeral += p.total;
    y += 10;
    if (y > 260) { doc.addPage(); y = 20; }
  });
  doc.text("Total Geral: R$ " + totalGeral.toFixed(2), 10, y + 10);
  doc.text("Obrigado pela preferência!", 105, 280, { align: "center" });
  doc.save(`orcamento_${sanitizeFileName(orc.clienteNome || "cliente_desconhecido")}.pdf`);
}

async function excluirOrcamento(orcId) {
  if (!confirm("Deseja realmente excluir este orçamento?")) return;
  try {
    await deleteDoc(doc(db, "orcamentos", orcId));
  } catch(err){
    console.error(err);
    alert("Erro ao excluir orçamento: " + err.message);
  }
}

/* =========================
   Modal Edição / Exclusão
   ========================= */
function abrirModal(tipo, id){
  tipoEdicao = tipo;
  itemEdicao = id;
  if(tipo === 'cliente'){
    const c = clientes.find(x=>x.id===id);
    modalEditarTitulo.textContent = "Editar Cliente";
    modalEditarNome.value = c?.nome || "";
    modalEditarTelefone.value = c?.telefone || "";
    modalEditarQuantidade.style.display = 'none';
    modalEditarCompra.style.display = 'none';
    modalEditarVenda.style.display = 'none';
    modalEditarTelefone.style.display = 'block';
  } else {
    const p = produtos.find(x=>x.id===id);
    modalEditarTitulo.textContent = "Editar Produto";
    modalEditarNome.value = p?.nome || "";
    modalEditarQuantidade.value = p?.quantidade ?? "";
    modalEditarCompra.value = p?.valorCompra ?? "";
    modalEditarVenda.value = p?.valorVenda ?? "";
    modalEditarTelefone.style.display = 'none';
    modalEditarQuantidade.style.display = 'block';
    modalEditarCompra.style.display = 'block';
    modalEditarVenda.style.display = 'block';
  }
  modalEditar.style.display = 'flex';
}

btnSalvarEdicao.onclick = async () => {
  try {
    if(tipoEdicao === 'cliente'){
      if(!modalEditarNome.value.trim()) return alert("Nome obrigatório");
      await updateDoc(doc(db, "clientes", itemEdicao), {
        nome: modalEditarNome.value.trim(),
        telefone: modalEditarTelefone.value.trim()
      });
      modalEditar.style.display = 'none';
    } else {
      if(!modalEditarNome.value.trim()) return alert("Nome obrigatório");
      const novos = {
        nome: modalEditarNome.value.trim(),
        quantidade: parseInt(modalEditarQuantidade.value) || 0,
        valorCompra: parseFloat(modalEditarCompra.value) || 0,
        valorVenda: parseFloat(modalEditarVenda.value) || 0
      };
      await updateDoc(doc(db, "produtos", itemEdicao), novos);
      modalEditar.style.display = 'none';
    }
    // onSnapshot atualizará UI
  } catch(err){
    console.error(err);
    alert("Erro ao salvar edição: " + err.message);
  }
};
btnCancelarEdicao.onclick = () => modalEditar.style.display = 'none';

function abrirModalExclusao(func){
  acaoExcluir = func;
  modalExcluir.style.display = 'flex';
}
btnConfirmarExcluir.onclick = () => { if(acaoExcluir) acaoExcluir(); modalExcluir.style.display='none'; }
btnCancelarExcluir.onclick = () => modalExcluir.style.display = 'none';

/* =========================
   Exportar Relatório (PDF)
   ========================= */
function exportarRelatorio(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Relatório de Vendas",10,15);
  let y = 25;
  let totalGeral = 0;
  doc.setFontSize(8);
  doc.text("Data",8,y);
  doc.text("Cliente",40,y);
  doc.text("Produto",80,y);
  doc.text("Qtd",120,y);
  doc.text("Preço",140,y);
  doc.text("Total",160,y);
  doc.text("Pagamento",180,y);
  y+=8;
  vendas.forEach(v=>{
    totalGeral += v.total;
    doc.text(v.data,10,y);
    doc.text(v.cliente,40,y);
    doc.text(v.produto,80,y);
    doc.text(String(v.quantidade),120,y);
    doc.text("R$ "+Number(v.preco).toFixed(2),140,y);
    doc.text("R$ "+Number(v.total).toFixed(2),160,y);
    doc.text(v.pagamento,180,y);
    y+=8;
    if(y>270){doc.addPage();y=20;}
  });
  y+=10;
  doc.setFontSize(14);
  doc.text("Total Geral: R$ "+Number(totalGeral).toFixed(2),10,y);
  doc.save("relatorio_vendas.pdf");
}
// Expor funções globais para o HTML
window.gerarRecibo = gerarRecibo;
window.abrirModal = abrirModal;
window.abrirModalExclusao = abrirModalExclusao;
window.excluirCliente = excluirCliente;
window.excluirProduto = excluirProduto;
window.excluirVenda = excluirVenda;
window.excluirOrcamento = excluirOrcamento;
window.exportarRelatorio = exportarRelatorio;
window.reimprimirOrcamento = reimprimirOrcamento;
window.logout = logout;
/* =========================
   Inicialização UI
   ========================= */
// Não precisa chamar carregar*() — onSnapshot já inicializa tudo
carregarProdutosOrcamento();
montarTabelaOrcamentoAtual();
