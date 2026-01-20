import { app } from "./firebase-config.js";
import { 
  getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, setPersistence, browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// Garantir persistência de login
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("✅ Persistência de login garantida"))
  .catch((err) => console.error("❌ Erro ao definir persistência:", err));
  
// Elementos do DOM
const telaLogin = document.getElementById("tela-login");
const formLogin = document.getElementById("formLogin");
const emailLogin = document.getElementById("emailLogin");
const senhaLogin = document.getElementById("senhaLogin");
const header = document.querySelector("header");
const userEmailSpan = document.getElementById("userEmail");
const btnLogout = document.getElementById("btnLogout");

// Tabelas e selects
const tabelaClientes = document.querySelector('#tabelaClientes tbody');
const tabelaEstoque = document.querySelector('#tabelaEstoque tbody');
const tabelaItensVenda = document.querySelector('#tabelaItensVenda tbody');
const tabelaOrcamentos = document.querySelector('#tabelaOrcamentos tbody');
const clienteSelect = document.getElementById('clienteSelect');
const produtoSelect = document.getElementById('produtoSelect');
const produtoSelectOrcamento = document.getElementById('produtoSelectOrcamento');
const tipoPrecoSelect = document.getElementById('tipoPrecoSelect'); // Ex: Estampa Frente, Branca, etc
const precoSelecionado = document.getElementById("precoSelecionado");
const quantidadeVenda = document.getElementById("quantidadeVenda");

// Coleções
const clientesCol = collection(db, 'clientes');
const produtosCol = collection(db, 'produtos');
const vendasCol = collection(db, 'vendas');
const orcamentosCol = collection(db, 'orcamentos');

let itensVendaAtual = [];
let totalVenda = 0;       // Total da venda
let descontoPercentualVenda = 0; 
let descontoTotalVenda = 0;
let produtosMap = {}; // será carregado do Firestor

// =====================
// 🔹 Funções de interface
// =====================
function mostrarPaginaLogada(user) {
  telaLogin.style.display = "none";
  header.style.display = "flex";
  userEmailSpan.textContent = user.email;
}

function mostrarLogin() {
  // Esconder todas as seções
  document.querySelectorAll(".secao").forEach(secao => secao.style.display = "none");

  telaLogin.style.display = "block";
  header.style.display = "none";
}

// =====================
// 🔹 Autenticação
// =====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Usuário logado:", user.email);
    mostrarPaginaLogada(user);

    try {
      await carregarClientes();
      await carregarEstoque();
      await carregarTabelaPrecos();
    } catch (erro) {
      console.error("❌ Erro ao carregar dados:", erro);
    }
  } else {
    console.log("❌ Nenhum usuário logado");
    mostrarLogin();
  }
})

// Login via formulário
formLogin?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailLogin.value, senhaLogin.value);
    mostrarPaginaLogada(userCredential.user);
    formLogin.reset();
  } catch (erro) {
    mostrarModal("Login ou senha inválidos!");
    console.error(erro);
  }
});

// Logout
btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  mostrarLogin();
})

// =====================
// 🔹 Controle de seções
// =====================
function mostrarSecao(secaoId) {
  document.querySelectorAll(".secao").forEach(secao => secao.style.display = "none");

  const secao = document.getElementById(secaoId); // pega o elemento
  if (secao) {                                 // verifica se existe
    secao.style.display = "block";             // só aí atribui
  }

  switch (secaoId) {
  case "clientes":
    carregarClientes();
    break;
  case "estoque":
    carregarEstoque();
    break;
  case "vendas":
    carregarClientesVenda();
    carregarProdutosVenda();
    break;
  case "orcamentos":
    renderizarOrcamentos();
    break;
  case "registrosVendas":
    // ✅ aguarda o DOM atualizar antes de carregar
    setTimeout(() => carregarTabelaRegistrosVendas(), 110);
    break;
  case "precos":
    carregarTabelaPrecos();
    break;
  case "simulador":
    carregarSimuladorPrecosUnitarios();
    break;
  }
}

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => mostrarSecao(btn.dataset.target));
});

// ==========================
// 🔹 Clientes
// ==========================
async function carregarClientes() {
    const q = query(clientesCol, orderBy("nome")); // 🔹 Ordena pelo nome
    const snapshot = await getDocs(q);

    tabelaClientes.innerHTML = '';
    clienteSelect.innerHTML = '<option value="">Selecione o cliente</option>';

    if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const cliente = docSnap.data() || {};
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cliente.nome || ''}</td>
                <td>${cliente.telefone || ''}</td>
                <td>
                    <button onclick="editarCliente('${docSnap.id}', '${cliente.nome || ''}', '${cliente.telefone || ''}')">Editar</button>
                    <button onclick="excluirCliente('${docSnap.id}')">Excluir</button>
                </td>`;
            tabelaClientes.appendChild(tr);

            clienteSelect.innerHTML += `<option value="${docSnap.id}">${cliente.nome || ''}</option>`;
        });
    }
}

window.editarCliente = async (id, nome, telefone) => {
    const novoNome = await mostrarPrompt("Novo nome:", nome);
     if (novoNome !== null) {
    const novoTel = await mostrarPrompt("Novo telefone:", telefone);
     if (novoTel !== null) {
        await updateDoc(doc(db, "clientes", id), { nome: novoNome, telefone: novoTel });
        carregarClientes();
    }
}
}

window.excluirCliente = async (id) => {
    if (await mostrarConfirm("Deseja realmente excluir?")) {
    await deleteDoc(doc(db, "clientes", id));
    carregarClientes();
}
}

document.getElementById("btnCadastrarCliente")?.addEventListener("click", async () => {
    const nome = document.getElementById("nomeCliente").value.trim();
    const telefone = document.getElementById("telefoneCliente").value.trim();
    if (!nome) return mostrarModal("Nome é obrigatório");
    await addDoc(clientesCol, { nome, telefone });
    document.getElementById("nomeCliente").value = "";
    document.getElementById("telefoneCliente").value = "";
    carregarClientes();
});

// ==========================
// 🔹 Estoque / Produtos
// ==========================
async function carregarEstoque() {
    const q = query(produtosCol, orderBy("nome")); // 🔹 Ordena pelo nome
    const snapshot = await getDocs(q);

    tabelaEstoque.innerHTML = '';
    produtoSelect.innerHTML = '<option value="">Selecione o produto</option>';
    produtoSelectOrcamento.innerHTML = '<option value="">Selecione o produto</option>';
    produtosMap = {};

    if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const produto = docSnap.data() || {};
            produtosMap[docSnap.id] = produto;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${produto.nome || ''}</td>
                <td>${produto.quantidade || 0}</td>
                <td>
                    <button onclick="editarProduto('${docSnap.id}', '${produto.nome || ''}', ${produto.quantidade || 0}, ${produto.preco || 0})">Editar</button>
                    <button onclick="excluirProduto('${docSnap.id}')">Excluir</button>
                </td>`;
            tabelaEstoque.appendChild(tr);

            produtoSelect.innerHTML += `<option value="${docSnap.id}">${produto.nome || ''}</option>`;
            produtoSelectOrcamento.innerHTML += `<option value="${docSnap.id}">${produto.nome || ''}</option>`;
        });
    }
}

// ===============================
// AO SELECIONAR PRODUTO OU TIPO DE PREÇO
// ===============================
function atualizarPrecoProduto() {
  const produtoId = produtoSelect.value;
  const tipo = tipoPrecoSelect.value;
  const produto = produtosMap[produtoId];

  if (!produto) {
    document.getElementById("precoSelecionado").value = '';
    return;
  }

  const precos = {
    preco: produto.preco || 0,
    estampaFrente: produto.estampaFrente || 0,
    estampaFrenteVerso: produto.estampaFrenteVerso || 0,
  };

  document.getElementById("precoSelecionado").value = precos[tipo] || 0;
}

produtoSelect.addEventListener("change", atualizarPrecoProduto);
tipoPrecoSelect.addEventListener("change", atualizarPrecoProduto);

window.editarProduto = async (id, nome, qtd, preco) => {
    const novoNome = await mostrarPrompt("Nome:", nome);
    const novaQtd = parseInt(await mostrarPrompt("Quantidade:", qtd));
    const novoPreco = parseFloat(await mostrarPrompt("Preço:", preco));
    if (novoNome) {
        await updateDoc(doc(db, "produtos", id), { nome: novoNome, quantidade: novaQtd, preco: novoPreco });
        carregarEstoque();
    }
}

window.excluirProduto = async (id) => {
    if (await mostrarConfirm("Excluir produto?")) {
        await deleteDoc(doc(db, "produtos", id));
        carregarEstoque();
    }
}

document.getElementById("btnCadastrarProduto")?.addEventListener("click", async () => {
    const nome = document.getElementById("nomeProduto").value.trim();
    const quantidade = parseInt(document.getElementById("quantidadeProduto").value) || 0;
    if (!nome) return mostrarModal("Nome é obrigatório");
    await addDoc(produtosCol, { nome, quantidade });
    document.getElementById("nomeProduto").value = "";
    document.getElementById("quantidadeProduto").value = "";
    carregarEstoque();
});

document.addEventListener("DOMContentLoaded", () => {
  const btnAdicionarItemVenda = document.getElementById("btnAdicionarItemVenda");
  btnAdicionarItemVenda.addEventListener("click", adicionarItemVenda);

  const btnDescontoItem = document.getElementById("btnDescontoItem");
  btnDescontoItem?.addEventListener("click", aplicarDescontoItemPrompt);

  const btnDescontoVenda = document.getElementById("btnDescontoVenda");
  btnDescontoVenda?.addEventListener("click", aplicarDescontoVendaPrompt);

  const btnFinalizarVenda = document.getElementById("btnFinalizarVenda");
  btnFinalizarVenda?.addEventListener("click", finalizarVenda);
});

// ==========================
// 🔹 Adicionar Item à Venda
// ==========================
function adicionarItemVenda() {
  const produtoSelect = document.getElementById("produtoSelect");
  const tipoPrecoSelect = document.getElementById("tipoPrecoSelect");
  const quantidadeInput = document.getElementById("quantidadeVenda");
  const precoInput = document.getElementById("precoSelecionado");

  if (!produtoSelect || !tipoPrecoSelect || !quantidadeInput || !precoInput) {
    console.error("Algum elemento do formulário não foi encontrado!");
    return;
  }

  const produtoId = produtoSelect.value;
  const tipoPreco = tipoPrecoSelect.value;
  const quantidade = Number(quantidadeInput.value);
  const preco = Number(precoInput.value);

  if (!produtoId || quantidade <= 0 || preco <= 0) {
    mostrarModal("Preencha todos os campos corretamente!");
    return;
  }

  const produtoNome = produtoSelect.options[produtoSelect.selectedIndex].text;

  itensVendaAtual.push({
  produtoId,
  nome: produtoNome,
  quantidade,
  valorUnitario: preco,
  desconto: 0,          
  total: quantidade * preco
});

  atualizarTabelaItensVenda();
  atualizarTotalVenda();
}

// ==========================
// 🔹 Desconto por Item
// ==========================
async function promptDescontoItem(indexItem) {
  const item = itensVendaAtual[indexItem];
  if (!item) return;

  const tipo = await mostrarPrompt(
    `Escolher tipo de desconto para ${item.nome}:\n1 - Valor (R$)\n2 - Percentual (%)`,
    "1"
  );

  if (tipo !== "1" && tipo !== "2") {
    mostrarModal("Tipo de desconto inválido!");
    return;
  }

  if (tipo === "1") {
    const descStr = await mostrarPrompt(`Digite o valor do desconto (R$) para ${item.nome}:`, "0");
    const valor = parseFloat(descStr);
    if (isNaN(valor) || valor < 0) {
      mostrarModal("Desconto inválido!");
      return;
    }
    item.desconto = valor;
  } else {
    const percStr = await mostrarPrompt(`Digite o percentual de desconto (%) para ${item.nome}:`, "0");
    const perc = parseFloat(percStr);
    if (isNaN(perc) || perc < 0 || perc > 100) {
      mostrarModal("Percentual inválido!");
      return;
    }
    const subtotal = item.quantidade * item.valorUnitario;
    item.desconto = (subtotal * perc) / 100;
  }

  item.total = Math.max(0, (item.quantidade * item.valorUnitario) - item.desconto);

  atualizarTabelaItensVenda();
  atualizarTotalVenda();
}

// Botão genérico para aplicar desconto por item
async function aplicarDescontoItemPrompt() {
  if (itensVendaAtual.length === 0) {
    mostrarModal("Nenhum item na venda para aplicar desconto.");
    return;
  }

  const listaProdutos = itensVendaAtual
    .map((item, index) => `${index + 1} - ${item.nome}`)
    .join("\n");

  const indiceStr = await mostrarPrompt(`Escolha o número do item:\n${listaProdutos}`);
  const indice = parseInt(indiceStr) - 1;

  if (isNaN(indice) || indice < 0 || indice >= itensVendaAtual.length) {
    mostrarModal("Item inválido!");
    return;
  }

  promptDescontoItem(indice);
}

// ==========================
// 🔹 Desconto Total da Venda
// ==========================
async function aplicarDescontoVendaPrompt() {
  if (itensVendaAtual.length === 0) {
    mostrarModal("Nenhum item na venda para aplicar desconto.");
    return;
  }

  const totalAtual = itensVendaAtual.reduce((soma, item) => soma + item.total, 0);

  const tipo = await mostrarPrompt(
    `Total atual: R$ ${totalAtual.toFixed(2)}\n1 - Valor (R$)\n2 - Percentual (%)`,
    "1"
  );

  if (tipo !== "1" && tipo !== "2") {
    mostrarModal("Tipo inválido!");
    return;
  }

  if (tipo === "1") {
    const descStr = await mostrarPrompt(`Desconto geral (R$):`, "0");
    const valor = parseFloat(descStr);
    if (isNaN(valor) || valor < 0 || valor > totalAtual) {
      mostrarModal("Desconto inválido!");
      return;
    }
    descontoTotalVenda = valor;
    descontoPercentualVenda = 0;
  } else {
    const percStr = await mostrarPrompt(`Desconto geral (%):`, "0");
    const perc = parseFloat(percStr);
    if (isNaN(perc) || perc < 0 || perc > 100) {
      mostrarModal("Percentual inválido!");
      return;
    }
    descontoPercentualVenda = perc;
    descontoTotalVenda = (totalAtual * perc) / 100;
  }

  atualizarTotalVenda();
}

// ==========================
// 🔹 Atualizar Tabela e Total
// ==========================
function atualizarTabelaItensVenda() {
  const tbody = document.querySelector("#tabelaItensVenda tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  itensVendaAtual.forEach((item, index) => {
    const quantidade = Number(item.quantidade) || 0;
    const valorUnitario = Number(item.valorUnitario) || 0;
    const desconto = Number(item.desconto) || 0;

    const subtotal = quantidade * valorUnitario;
    const total = subtotal - desconto;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${quantidade}</td>
      <td>R$ ${valorUnitario.toFixed(2)}</td>
      <td>R$ ${desconto.toFixed(2)}</td>
      <td>R$ ${subtotal.toFixed(2)}</td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>
        <button onclick="removerItemVenda(${index})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function atualizarTotalVenda() {
  let somaItens = itensVendaAtual.reduce((acc, item) => acc + item.total, 0);
  const totalComDesconto = Math.max(0, somaItens - (descontoTotalVenda || 0));
  document.getElementById("totalVenda").textContent = totalComDesconto.toFixed(2);
}

// ==========================
// 🔹 Remover Item
// ==========================
function removerItemVenda(index) {
  itensVendaAtual.splice(index, 1);
  atualizarTabelaItensVenda();
  atualizarTotalVenda();
}

window.removerItemVenda = removerItemVenda;


// ==========================
// 🔹 Finalizar Venda
// ==========================
async function finalizarVenda() {
  const btnFinalizarVenda = document.getElementById("btnFinalizarVenda");
  try {
    if (btnFinalizarVenda.disabled) return;
    btnFinalizarVenda.disabled = true;

    const tipoPagamentoSelect = document.getElementById("tipoPagamento");
    const clienteSelect = document.getElementById("clienteSelect");

    if (!clienteSelect || !tipoPagamentoSelect) {
      mostrarModal("Selecione cliente e tipo de pagamento.");
      btnFinalizarVenda.disabled = false;
      return;
    }
    if (itensVendaAtual.length === 0) {
      mostrarModal("Nenhum item adicionado à venda.");
      btnFinalizarVenda.disabled = false;
      return;
    }

    const tipoPagamento = tipoPagamentoSelect.value;
    const clienteId = clienteSelect.value;
    const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].text;

    const somaSubtotais = itensVendaAtual.reduce(
      (acc, item) => acc + (item.quantidade * item.valorUnitario),
      0
    );

    const itensParaSalvar = itensVendaAtual.map(item => {
      const descontoProporcional = descontoTotalVenda
        ? (item.total / somaSubtotais) * descontoTotalVenda
        : 0;
      const totalItem = Math.max(0, item.total - descontoProporcional);

      return {
        produtoId: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        subtotal: item.quantidade * item.valorUnitario,
        desconto: item.desconto + descontoProporcional,
        totalItem
      };
    });

    const totalParaSalvar = itensParaSalvar.reduce((acc, item) => acc + item.totalItem, 0);

    const venda = {
      clienteId,
      clienteNome,
      tipoPagamento,
      itens: itensParaSalvar,
      total: totalParaSalvar,
      descontoVenda: descontoTotalVenda || 0,
      data: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "vendas"), venda);

    // Atualiza estoque
    for (const item of itensParaSalvar) {
      const produtoRef = doc(db, "produtos", item.produtoId);
      const produtoSnap = await getDoc(produtoRef);
      if (produtoSnap.exists()) {
        const produto = produtoSnap.data();
        const novaQtd = (produto.quantidade || 0) - item.quantidade;
        await updateDoc(produtoRef, { quantidade: novaQtd });
      }
    }

    gerarPdfVendaPremium({
      id: docRef.id,
      clienteNome,
      tipoPagamento,
      itens: itensParaSalvar,
      total: totalParaSalvar,
      data: new Date()
    });

    mostrarModal(`✅ Venda registrada! Total: R$ ${totalParaSalvar.toFixed(2)}`);
    await carregarTabelaRegistrosVendas();
    limparTelaVenda();

  } catch (error) {
    console.error("Erro ao registrar venda:", error);
    mostrarModal("Erro ao registrar venda: " + error.message);
  } finally {
    btnFinalizarVenda.disabled = false;
  }
}

// ==========================
// 🔹 Limpar Tela
// ==========================
function limparTelaVenda() {
  itensVendaAtual = [];
  descontoTotalVenda = 0;
  descontoPercentualVenda = 0;

  const campos = ["clienteSelect", "produtoSelect", "tipoPrecoSelect", "precoSelecionado", "quantidadeVenda", "tipoPagamento"];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const tbody = document.querySelector("#tabelaItensVenda tbody");
  if (tbody) tbody.innerHTML = "";

  document.getElementById("totalVenda").textContent = "0.00";
}

// ==========================
// 🔹 PDF da Venda (Itens com desconto)
// ==========================
async function gerarPdfVendaPremium(venda) {
try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();

    // ---------------- Logo ----------------
    const logo = document.getElementById("logo");
    if (logo) {
       const imgProps = doc.getImageProperties(logo);
       const logoWidth = 40;
       const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
       const xPos = (pdfWidth - logoWidth) / 2;
       doc.addImage(logo, "PNG", xPos, 10, logoWidth, logoHeight);
    }

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Recibo de venda", pdfWidth / 2, 55, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Cliente: ${venda.clienteNome}`, 8, 35);
    doc.text(`Pagamento: ${venda.tipoPagamento}`, 8, 42);
    
    // Tabela de Itens
    const startY = 60;
    const rowHeight = 8;
    const colX = [8, 60, 90, 130, 160];

    doc.setFont(undefined, "bold");
    ["Produto", "Qtde", "Valor Unitário", "Desconto", "Total"].forEach((text, i) => {
      doc.text(text, colX[i], startY);
    });
    
    doc.setFont(undefined, "normal");
    let currentY = startY + rowHeight;
    venda.itens.forEach(item => {
      const totalItem =  
        item.totalItem ??
        item.quantidade * item.valorUnitario - (item.desconto || 0);

      doc.text(item.nome, colX[0], currentY);
      doc.text(String(item.quantidade), colX[1], currentY);
      doc.text(`R$ ${item.valorUnitario.toFixed(2)}`, colX[2], currentY);
      doc.text(`R$ ${item.desconto.toFixed(2)}`, colX[3], currentY);
      doc.text(`R$ ${totalItem.toFixed(2)}`, colX[4], currentY);
      currentY += rowHeight;
    });

     // ---------------- TOTAL GERAL ----------------
    currentY += 5;
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text(
      `TOTAL DA VENDA: R$ ${venda.total.toFixed(2)}`,
      pdfWidth - 8,
      currentY,
      { align: "right" }
    );

    // ---------------- Rodapé ----------------
    doc.setFontSize(10);
    doc.setFont(undefined, "italic");
    doc.text(
      "Obrigado pela sua compra!",
      pdfWidth / 2,
      pdfHeight - 10,
      { align: "center" }
    );

    doc.save(`venda_${venda.clienteNome}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    mostrarModal("Erro ao gerar PDF!");
  }
}

// ===============================
// CARREGAR REGISTROS DE VENDAS
// ===============================
async function carregarTabelaRegistrosVendas() {
  const tabela = document
    .getElementById("tabelaRegistrosVendas")
    ?.querySelector("tbody");

  const totalGeralSpan = document.getElementById("totalGeralRegistros");

  if (!tabela || !totalGeralSpan) return;

  tabela.innerHTML = "";
  let totalGeral = 0;

  const vendasSnapshot = await getDocs(collection(db, "vendas"));

  vendasSnapshot.forEach((docSnap) => {
    const venda = docSnap.data();
    const id = docSnap.id;

    // ---------------- DATA ----------------
    let dataFormatada = "-";
    if (venda.data) {
      dataFormatada = venda.data.seconds
        ? new Date(venda.data.seconds * 1000).toLocaleDateString("pt-BR")
        : new Date(venda.data).toLocaleDateString("pt-BR");
    }

    const itens = venda.itens || [];
    const totalVenda = venda.total || 0;
    totalGeral += totalVenda;

    // ===============================
    // 1️⃣ LINHA PRINCIPAL DA VENDA
    // ===============================
    const rowVenda = document.createElement("tr");
    rowVenda.classList.add("linha-venda");
    rowVenda.style.cursor = "pointer";

    rowVenda.onclick = () => toggleItensVenda(id);

    rowVenda.innerHTML = `
      <td>${dataFormatada}</td>
      <td>${venda.clienteNome || "-"}</td>
      <td colspan="4"><strong>Clique para ver itens</strong></td>
      <td>R$ ${totalVenda.toFixed(2)}</td>
      <td>R$ ${totalVenda.toFixed(2)}</td>
      <td>${venda.tipoPagamento || "-"}</td>
      <td>
        <button class="btnExcluir"
          onclick="event.stopPropagation(); abrirModalExcluir('${id}')">🗑️</button>
        <button class="btnPDF"
          onclick="event.stopPropagation(); gerarPdfVenda('${id}')">📄</button>
      </td>
    `;

    tabela.appendChild(rowVenda);

    // ===============================
    // 2️⃣ ITENS DA VENDA (OCULTOS)
    // ===============================
    itens.forEach((item) => {
      const qtd = item.quantidade || 0;
      const vUnit = item.valorUnitario || 0;
      const desconto = item.desconto || 0;
      const subtotal = qtd * vUnit;
      const totalItem =
        item.totalItem ?? subtotal - desconto;

      const rowItem = document.createElement("tr");
      rowItem.classList.add(`itens-${id}`);
      rowItem.style.display = "none";
      rowItem.style.background = "#fafafa";

      rowItem.innerHTML = `
        <td></td>
        <td></td>
        <td>${item.nome}</td>
        <td>${qtd} un</td>
        <td>R$ ${vUnit.toFixed(2)}</td>
        <td>R$ ${desconto.toFixed(2)}</td>
        <td>R$ ${subtotal.toFixed(2)}</td>
        <td>R$ ${totalItem.toFixed(2)}</td>
        <td></td>
        <td></td>
      `;

      tabela.appendChild(rowItem);
    });
  });

  totalGeralSpan.textContent = `R$ ${totalGeral.toFixed(2)}`;
}

function toggleItensVenda(idVenda) {
  const linhas = document.querySelectorAll(`.itens-${idVenda}`);
  if (!linhas.length) return;

  const mostrar = linhas[0].style.display === "none";

  linhas.forEach((linha) => {
    linha.style.display = mostrar ? "table-row" : "none";
  });
}

window.toggleItensVenda = toggleItensVenda;

// --- Função para excluir venda ---
async function abrirModalExcluir(idVenda) {
  try {
    const confirmar = confirm("Deseja realmente excluir esta venda?");
    if (!confirmar) return;

    const vendaRef = doc(db, "vendas", idVenda);
    const vendaSnap = await getDoc(vendaRef);

    if (vendaSnap.exists()) {
      const venda = vendaSnap.data();

      // 🔹 Devolve itens ao estoque
      for (const item of venda.itens || []) {
        if (!item.produtoId) continue; // ignora se não houver id
        const produtoRef = doc(db, "produtos", item.produtoId);
        const produtoSnap = await getDoc(produtoRef);

        if (produtoSnap.exists()) {
          const produto = produtoSnap.data();
          const novaQtd = (produto.quantidade || 0) + item.quantidade;
          await updateDoc(produtoRef, { quantidade: novaQtd });
        }
      }
    }

    // 🔹 Exclui a venda
    await deleteDoc(vendaRef);

    mostrarModal("Venda excluída e estoque atualizado!");
    carregarTabelaRegistrosVendas();
    carregarEstoque();
  } catch (error) {
    console.error("Erro ao excluir venda:", error);
    mostrarModal("Erro ao excluir venda. Verifique o console.");
  }
}

window.abrirModalExcluir = abrirModalExcluir;

async function gerarPdfVenda(idVenda) {
  try {
    const vendaRef = doc(db, "vendas", idVenda);
    const vendaSnap = await getDoc(vendaRef);

    if (!vendaSnap.exists()) {
      mostrarModal("Venda não encontrada!");
      return;
    }

    const venda = vendaSnap.data();

    gerarPdfVendaPremium({
      id: idVenda,
      clienteNome: venda.clienteNome,
      tipoPagamento: venda.tipoPagamento,
      itens: venda.itens || [],
      total: venda.total || 0,
      data: venda.data?.seconds
        ? new Date(venda.data.seconds * 1000)
        : new Date()
    });

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    mostrarModal("Erro ao gerar PDF da venda.");
  }
}

window.gerarPdfVenda = gerarPdfVenda;

// --- Função para abrir modal ou aplicar desconto (versão funcional) ---
window.abrirModalDesconto = async function (idVenda) {
  const valorDesconto = parseFloat(await mostrarPrompt("Digite o valor do desconto em R$:"));
  if (isNaN(valorDesconto) || valorDesconto <= 0) {
    mostrarModal("Valor inválido!");
    return;
  }

  try {
    const vendaRef = doc(db, "vendas", idVenda);
    const vendaSnap = await getDoc(vendaRef);

    if (!vendaSnap.exists()) return mostrarModal("Venda não encontrada!");

    const venda = vendaSnap.data();
    const totalAtual = venda.total || 0;
    const novoTotal = Math.max(0, totalAtual - valorDesconto);

    await updateDoc(vendaRef, {
      descontoVenda: valorDesconto,
      totalComDesconto: novoTotal
    });

    mostrarModal(`✅ Desconto de R$ ${valorDesconto.toFixed(2)} aplicado!`);
    carregarTabelaRegistrosVendas();
  } catch (error) {
    console.error("Erro ao aplicar desconto:", error);
    mostrarModal("Erro ao aplicar desconto!");
  }
};

window.abrirModalDesconto = abrirModalDesconto;

function mostrarModal(mensagem) {
  const modal = document.getElementById("modalAlerta");
  const modalMensagem = document.getElementById("modalMensagem");
  const modalFechar = document.getElementById("modalFechar");

  modalMensagem.textContent = mensagem;
  modal.style.display = "block";

  modalFechar.onclick = () => modal.style.display = "none";
  window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
  };
}

function mostrarPrompt(mensagem, valorPadrao = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("modalPrompt");
    const mensagemEl = document.getElementById("modalPromptMensagem");
    const inputEl = document.getElementById("modalPromptInput");
    const btnOk = document.getElementById("modalPromptOk");
    const btnCancelar = document.getElementById("modalPromptCancelar");
    const fechar = document.getElementById("modalPromptFechar");

    mensagemEl.textContent = mensagem;
    inputEl.value = valorPadrao;
    modal.style.display = "block";

    const fecharModal = () => {
      modal.style.display = "none";
    };

    btnOk.onclick = () => {
      fecharModal();
      resolve(inputEl.value);
    };
    btnCancelar.onclick = () => {
      fecharModal();
      resolve(null);
    };
    fechar.onclick = () => {
      fecharModal();
      resolve(null);
    };
    window.onclick = (event) => {
      if (event.target == modal) fecharModal();
    };
  });
}

function mostrarConfirm(mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modalConfirm");
    const mensagemEl = document.getElementById("modalConfirmMensagem");
    const btnSim = document.getElementById("modalConfirmSim");
    const btnNao = document.getElementById("modalConfirmNao");

    mensagemEl.textContent = mensagem;
    modal.style.display = "block";

    const fecharModal = () => {
      modal.style.display = "none";
      btnSim.onclick = null;
      btnNao.onclick = null;
      window.onclick = null;
    };

    btnSim.onclick = () => {
      fecharModal();
      resolve(true);
    };

    btnNao.onclick = () => {
      fecharModal();
      resolve(false);
    };

    window.onclick = (event) => {
      if (event.target === modal) {
        fecharModal();
        resolve(false);
      }
    };
  });
}

// ==========================
// 🔹 Orçamentos
// ==========================
let itensOrcamentoAtual = [];
let produtosCache = {}; // Armazena produtos do Firestore

// =======================
// CARREGAR PRODUTOS
// =======================
async function carregarProdutosOrcamento() {
  const select = document.getElementById("produtoSelectOrcamento");
  if (!select) return;

  select.innerHTML = "<option value=''>Selecione o produto</option>";

  try {
    const produtosSnapshot = await getDocs(collection(db, "produtos"));
    produtosSnapshot.forEach(docSnap => {
      const produto = docSnap.data();
      produtosCache[docSnap.id] = produto;

      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = produto.nome || "Produto sem nome";
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
  }
}

// =======================
// ATUALIZAR PREÇO AUTOMATICAMENTE
// =======================
function atualizarPrecoOrcamento() {
  const produtoId = document.getElementById("produtoSelectOrcamento").value;
  const tipoPreco = document.getElementById("tipoPrecoSelectOrcamento").value;
  const precoInput = document.getElementById("precoInputOrcamento");

  if (!produtoId || !tipoPreco) {
    precoInput.value = "";
    return;
  }

  const produto = produtosCache[produtoId];
  if (!produto) return;

  let preco = 0;

  const tipo = tipoPreco.trim().toLowerCase();
  switch (tipo) {
    case "frente":
    case "estampafrente":
      preco = Number(produto.estampaFrente || 0);
      break;
    case "frente e verso":
    case "estampafrenteverso":
      preco = Number(produto.estampaFrenteVerso || 0);
      break;
    default:
      preco = Number(produto.preco || produto.precoUnitario || 0);
      break;
  }

  precoInput.value = preco > 0 ? preco.toFixed(2) : "";
}

// =======================
// ADICIONAR PRODUTO AO ORÇAMENTO
// =======================
window.adicionarProdutoOrcamento = function () {
  const clienteNome = document.getElementById("clienteInputOrcamento").value.trim();
  const produtoId = document.getElementById("produtoSelectOrcamento").value;
  const tipoPreco = document.getElementById("tipoPrecoSelectOrcamento").value;
  const precoInput = document.getElementById("precoInputOrcamento");
  const quantidade = Number(document.getElementById("quantidadeOrcamento").value || 1);
  const descontoValor = Number(document.getElementById("descontoItemOrcamento").value || 0);
  const tipoDescontoItem = document.getElementById("tipoDescontoItem").value;

  atualizarPrecoOrcamento();
  const precoUnitario = Number(precoInput.value || 0);

  if (!clienteNome) return mostrarModal("Informe o nome do cliente!");
  if (!produtoId) return mostrarModal("Selecione um produto!");
  if (!tipoPreco) return mostrarModal("Selecione o tipo de preço!");
  if (precoUnitario <= 0) return mostrarModal("Preço inválido!");

  const existe = itensOrcamentoAtual.some(item =>
    item.produtoId === produtoId &&
    item.clienteNome === clienteNome &&
    item.tipoPreco === tipoPreco
  );
  if (existe) return mostrarModal("Este produto já foi adicionado para este cliente.");

  const produto = produtosCache[produtoId];
  const nomeProduto = produto?.nome || "Produto";

  itensOrcamentoAtual.push({
    produtoId,
    produtoNome: nomeProduto,
    preco: precoUnitario,
    quantidade,
    clienteNome,
    tipoPreco,
    descontoValor,
    tipoDescontoItem
  });

  renderizarOrcamentos();
  atualizarTotalGeral()
};

// =======================
// RENDERIZAR ORÇAMENTOS
// =======================
function renderizarOrcamentos() {
  const tabela = document.querySelector("#tabelaOrcamentos tbody");
  tabela.innerHTML = "";

  itensOrcamentoAtual.forEach((item, index) => {
    const preco = Number(item.preco);
    const qtd = Number(item.quantidade);
    const desconto = Number(item.descontoValor);

    const total = calcularTotalItem(item); // ✅ cálculo centralizado

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produtoNome}</td>
      <td>${qtd}</td>
      <td>R$ ${preco.toFixed(2)}</td>
      <td>
        ${item.tipoDescontoItem === "percent"
          ? desconto + "%"
          : "R$ " + desconto.toFixed(2)}
      </td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>
        <button class="btn-remover" onclick="removerItemOrcamento(${index})">
          Remover
        </button>
      </td>
    `;

    tabela.appendChild(tr);
  });

  atualizarTotalGeral(); 
}

function calcularTotalItem(item) {
  const preco = Number(item.preco) || 0;
  const qtd = Number(item.quantidade) || 0;
  const desconto = Number(item.descontoValor) || 0;

  let total = preco * qtd;

  if (item.tipoDescontoItem === "percent") {
    total *= (1 - desconto / 100);
  } else if (item.tipoDescontoItem === "valor") {
    total -= desconto;
  }

  return Math.max(0, total);
}

function atualizarTotalGeral() {
  const totalGeral = itensOrcamentoAtual.reduce(
    (acc, item) => acc + calcularTotalItem(item),
    0
  );

  document.getElementById("totalGeral").textContent =
    totalGeral.toFixed(2);
}

window.atualizarTotalGeral = atualizarTotalGeral

// =======================
// REMOVER ITEM
// =======================
window.removerItemOrcamento = (index) => {
  itensOrcamentoAtual.splice(index, 1);
  renderizarOrcamentos();
};

// Carrega produtos na inicialização
carregarProdutosOrcamento();

const btnAdd = document.getElementById("btnAdicionarProduto");
if (btnAdd && !btnAdd.dataset.listenerAttached) {
  btnAdd.addEventListener("click", adicionarProdutoOrcamento);
  btnAdd.dataset.listenerAttached = "true";
} 

// =======================
// GERAR PDF DO ORÇAMENTO
// =======================
window.gerarPdfOrcamento = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pdfWidth = doc.internal.pageSize.getWidth();

  const clienteNome = document
    .getElementById("clienteInputOrcamento")
    .value
    .trim() || "Não informado";

  doc.text(`Cliente: ${clienteNome}`, 8, 35);

  // ---------------- LOGO ----------------
  const logo = document.getElementById("logo");
  if (logo) {
    const imgProps = doc.getImageProperties(logo);
    const logoWidth = 40;
    const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
    const xPos = (pdfWidth - logoWidth) / 2;
    doc.addImage(logo, "PNG", xPos, 15, logoWidth, logoHeight);
  }

  // ---------------- TÍTULO ----------------
  doc.setFontSize(16);
  doc.text("ORÇAMENTO", pdfWidth / 2, 10, { align: "center" });

  // ---------------- LINHAS DA TABELA ----------------
  const rows = itensOrcamentoAtual.map(item => {
    const preco = Number(item.preco) || 0;
    const qtd = Number(item.quantidade) || 0;
    const desconto = Number(item.descontoValor) || 0;
    let total = preco * qtd;

    if (item.tipoDescontoItem === "percent") {
      total *= (1 - desconto / 100);
    } else if (item.tipoDescontoItem === "valor") {
      total -= desconto;
    }

    return [
      item.produtoNome,
      qtd,
      `R$ ${preco.toFixed(2)}`,
      item.tipoDescontoItem === "percent"
        ? `${desconto}%`
        : `R$ ${desconto.toFixed(2)}`,
      `R$ ${total.toFixed(2)}`
    ];
  });

  // ---------------- TABELA ----------------
  doc.autoTable({
    head: [['Produto', 'Qtd', 'Preço Unitário', 'Desconto', 'Total']],
    body: rows,
    startY: 60
  });

  // ---------------- SUBTOTAL ----------------
  const subtotal = itensOrcamentoAtual.reduce((acc, item) => {
    const preco = Number(item.preco) || 0;
    const qtd = Number(item.quantidade) || 0;
    const desconto = Number(item.descontoValor) || 0;
    let total = preco * qtd;

    if (item.tipoDescontoItem === "percent") {
      total *= (1 - desconto / 100);
    } else if (item.tipoDescontoItem === "valor") {
      total -= desconto;
    }

    return acc + total;
  }, 0);

  // ---------------- TOTAL FINAL ----------------
  let totalFinal = subtotal;

  totalFinal = Math.max(0, totalFinal);

  const y = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(14);
  doc.text(`TOTAL FINAL: R$ ${totalFinal.toFixed(2)}`, 14, y);

  doc.save("orcamento.pdf");
};

document.getElementById("produtoSelectOrcamento").addEventListener("change", atualizarPrecoOrcamento);
document.getElementById("tipoPrecoSelectOrcamento").addEventListener("change", atualizarPrecoOrcamento);
document.getElementById("btnGerarPDF").addEventListener("click", gerarPdfOrcamento);

// ==========================
// 🔹 CARREGAR TABELA DE PREÇOS
// ==========================
async function carregarTabelaPrecos() {
  console.log("carregarTabelaPrecos() iniciada");

  const tabela = document.querySelector("#tabelaPrecos tbody");
  tabela.innerHTML = "";

  try {
    const q = query(collection(db, "produtos"), orderBy("nome")); // 🔹 Ordena pelo nome
    const produtosSnapshot = await getDocs(q);
    console.log("Qtd de produtos:", produtosSnapshot.size);

    produtosSnapshot.forEach(docSnap => {
      const produto = docSnap.data();
      if (!produto || !produto.nome) return;

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${produto.nome || ""}</td>
        <td><input type="number" value="${produto.preco || 0}" step="0.01"></td>
        <td><input type="number" value="${produto.estampaFrente || 0}" step="0.01"></td>
        <td><input type="number" value="${produto.estampaFrenteVerso || 0}" step="0.01"></td>
      `;

      tabela.appendChild(linha);

      linha.querySelectorAll("input").forEach((input, index) => {
        input.addEventListener("change", async () => {
          const campos = ["preco", "estampaFrente", "estampaFrenteVerso"];
          const campo = campos[index];
          const novoValor = parseFloat(input.value) || 0;

          try {
            await updateDoc(doc(db, "produtos", docSnap.id), { [campo]: novoValor });
            console.log(`✅ ${campo} atualizado: R$ ${novoValor.toFixed(2)} (${produto.nome})`);
          } catch (erro) {
            console.error("❌ Erro ao atualizar preço:", erro);
            mostrarModal("Erro ao salvar o novo valor. Verifique sua conexão.");
          }
        });
      });
    });

    console.log("Tabela preenchida com sucesso!");
  } catch (erro) {
    console.error("❌ Erro ao carregar produtos:", erro);
  }
}

// exportar registros vendas
async function exportarPDFRegistros() {
  try {
    const vendasSnapshot = await getDocs(collection(db, "vendas"));
    if (vendasSnapshot.empty) return mostrarModal("Nenhuma venda encontrada.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pdfWidth = doc.internal.pageSize.getWidth();

    // Logo
    const logo = document.getElementById("logo");
    if (logo) {
      const imgProps = doc.getImageProperties(logo);
      const logoWidth = 40;
      const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
      const xPos = (pdfWidth - logoWidth) / 2;
      doc.addImage(logo, "PNG", xPos, 10, logoWidth, logoHeight);
    }

    doc.setFontSize(16);
    doc.text("REGISTROS DE VENDAS", pdfWidth / 2, 60, { align: "center" });

    // Cabeçalho da tabela
    const cabecalho = [
      [
        "Data",
        "Cliente",
        "Produto",
        "Qtde",
        "Unitário",
        "Desconto",
        "Total Antes",
        "Total Após",
        "Pagamento"
      ]
    ];

    const linhas = [];
    let totalGeral = 0;

    // MONTAR ESTRUTURA IGUAL À TABELA HTML
    vendasSnapshot.forEach((vendaDoc) => {
      const venda = vendaDoc.data();
      const itens = venda.itens || [];

      const data = venda.data?.seconds
        ? new Date(venda.data.seconds * 1000)
        : new Date();
      const dataTexto = data.toLocaleDateString("pt-BR");
      const cliente = venda.clienteNome || "-";
      const pagamento = venda.tipoPagamento || "-";

      let totalVenda = 0;
      itens.forEach((item) => {
        const qtd = item.quantidade || 0;
        const unit = item.valorUnitario || 0;
        const desc = item.desconto || 0;
        const subtotal = qtd * unit;
        const totalItem = item.totalItem || (subtotal - desc);
        totalVenda += totalItem;
      });

      totalGeral += totalVenda;

      // -------------------------------
      // 1) LINHA DA VENDA
      // -------------------------------
      linhas.push([
        dataTexto,
        cliente,
        "-",
        "-",
        "-",
        "-",
        `R$ ${totalVenda.toFixed(2)}`,
        `R$ ${totalVenda.toFixed(2)}`,
        pagamento
      ]);

      // -------------------------------
      // 2) LINHAS DOS PRODUTOS
      // -------------------------------
      itens.forEach((item) => {
        const qtd = item.quantidade || 0;
        const unit = item.valorUnitario || 0;
        const desc = item.desconto || 0;

        const subtotal = qtd * unit;
        const totalItem = item.totalItem || (subtotal - desc);

        linhas.push([
          "",                  // Data
          "",                  // Cliente
          item.nome,           // Produto
          `${qtd} un`,         // Qtde
          `R$ ${unit.toFixed(2)}`, // Unitário
          `R$ ${desc.toFixed(2)}`, // Desconto
          `R$ ${subtotal.toFixed(2)}`, // Total antes
          `R$ ${totalItem.toFixed(2)}`, // Total após
          ""                   // Pagamento
        ]);
      });
    });

    // Tabela formatada
    doc.autoTable({
      head: cabecalho,
      body: linhas,
      startY: 75,
      styles: {
        fontSize: 9,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      theme: "grid",
    });

    // Total geral no fim
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(
      `TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`,
      pdfWidth - 20,
      doc.lastAutoTable.finalY + 10,
      { align: "right" }
    );

    doc.save("registros_vendas.pdf");

  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    mostrarModal("Erro ao gerar PDF de registros.");
  }
}

document.getElementById("btnExportarPDF")?.addEventListener("click", exportarPDFRegistros);

// === Funções “placeholder” para evitar erros ===

// carrega os clientes disponíveis na aba de Vendas
function carregarClientesVenda() {
  console.log("carregarClientesVenda() chamada");
  // aqui você pode copiar lógica de carregarClientes()
}

function carregarProdutosVenda() {
  console.log("carregarProdutosVenda() chamada");
  // Aqui futuramente vai preencher o <select id="produtoSelect">
  // com os produtos do Firestore
}

window.mostrarSecao = mostrarSecao;
















