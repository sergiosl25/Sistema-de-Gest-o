import { app } from "./firebase-config.js";
import { 
  getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp 
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
let descontoTotalVenda = 0;
let itensOrcamentoAtual = [];
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
  }
}

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => mostrarSecao(btn.dataset.target));
});

// ==========================
// 🔹 Clientes
// ==========================
async function carregarClientes() {
    const snapshot = await getDocs(clientesCol);
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
document.getElementById("btnAdicionarProduto")?.addEventListener("click", () => {
  const clienteNome = document.getElementById("clienteInputOrcamento").value.trim();
  const produtoId = document.getElementById("produtoSelectOrcamento").value;
  const quantidade = parseInt(document.getElementById("quantidadeOrcamento").value);
  const produto = produtosMap[produtoId];
  if (!clienteNome || !produto || !quantidade) return mostrarModal("Preencha todos os campos!");

  itensOrcamentoAtual.push({
    clienteNome,
    produtoNome: produto.nome,
    quantidade,
    preco: produto.preco
  });
  renderizarOrcamentos();
});

async function carregarEstoque() {
    const snapshot = await getDocs(produtosCol);
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
// CARREGAR PRODUTOS DO FIREBASE
// ===============================
async function carregarProdutos() {
  try {
    const produtosSnapshot = await getDocs(collection(db, "produtos"));
    produtosMap = {}; // reinicia o mapa
    const produtoSelect = document.getElementById("produtoSelect"); 
    produtoSelect.innerHTML = '<option value="">Selecione</option>';

    produtosSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      produtosMap[docSnap.id] = data;

      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = data.nome;
      produtoSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
});

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

// ==========================
// 🔹 Vendas
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const btnAdicionarItemVenda = document.getElementById("btnAdicionarItemVenda");
  btnAdicionarItemVenda.addEventListener("click", adicionarItemVenda);
});

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

  // Adiciona ao array de itens da venda
  itensVendaAtual.push({
  produtoId,
  nome: produtoNome,
  quantidade,
  valorUnitario: preco,  // usar sempre valorUnitario
  tipoPreco
});

renderizarItensVenda();
}

btnFinalizarVenda.addEventListener("click", async () => {
  try {
    if (btnFinalizarVenda.disabled) return;
    btnFinalizarVenda.disabled = true;

    const tipoPagamentoSelect = document.getElementById("tipoPagamento");
    const clienteSelect = document.getElementById("clienteSelect");

    if (!clienteSelect || !tipoPagamentoSelect) {
      mostrarModal("Selecione cliente e tipo de pagamento.");
      return;
    }
    if (itensVendaAtual.length === 0) {
      mostrarModal("Nenhum item adicionado à venda.");
      return;
    }

    const tipoPagamento = tipoPagamentoSelect.value;
    const clienteId = clienteSelect.value;
    const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].text;

    let somaSubtotais = itensVendaAtual.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);

    const itensParaSalvar = itensVendaAtual.map(item => {
      const subtotal = item.quantidade * item.valorUnitario;
      const descontoProporcional = descontoTotalVenda ? (subtotal / somaSubtotais) * descontoTotalVenda : 0;
      const totalItem = subtotal - ((item.desconto || 0) + descontoProporcional);

      return {
        produtoId: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        subtotal,
        desconto: (item.desconto || 0) + descontoProporcional,
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
    console.log("Venda registrada com ID:", docRef.id);

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

    gerarPdfVendaPremium({ id: docRef.id, clienteNome, tipoPagamento, itens: itensParaSalvar, total: totalParaSalvar, data: new Date() });

    mostrarModal(`✅ Venda registrada! Total: R$ ${totalParaSalvar.toFixed(2)}`);
    await carregarTabelaRegistrosVendas();
    limparTelaVenda();

  } catch (error) {
    console.error("Erro ao registrar venda:", error);
    mostrarModal("Erro ao registrar venda: " + error.message);
  } finally {
    btnFinalizarVenda.disabled = false;
  }
});

// Limpar tela de venda após finalizar
function limparTelaVenda() {
    // Limpa array e total
    itensVendaAtual = [];
    totalVenda = 0;

    // Limpa tabela de itens da venda
    const corpoTabelaItensVenda = document.querySelector("#tabelaItensVenda tbody");
    if (corpoTabelaItensVenda) corpoTabelaItensVenda.innerHTML = "";

    // Reseta total exibido
    const totalSpan = document.getElementById("totalVenda");
    if (totalSpan) totalSpan.textContent = "0.00";

    // Reseta selects
    const clienteSelect = document.getElementById("clienteSelect");
    const tipoPagamentoSelect = document.getElementById("tipoPagamento");

    if (clienteSelect) clienteSelect.selectedIndex = 0;
    if (tipoPagamentoSelect) tipoPagamentoSelect.selectedIndex = 0;
}

async function gerarPdfVendaPremium(venda) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pdfWidth = doc.internal.pageSize.getWidth();

        // ---------------- Logo ----------------
        const logo = document.getElementById("logo");
        if (logo) {
            const imgProps = doc.getImageProperties(logo);
            const logoWidth = 40;
            const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
            const xPos = (pdfWidth - logoWidth) / 2;
            doc.addImage(logo, "PNG", xPos, 10, logoWidth, logoHeight);
        }

        // ---------------- Cabeçalho ----------------
        doc.setFontSize(16);
        doc.setFont(undefined, "bold");
        doc.text("RECIBO DE VENDA", pdfWidth / 2, 55, { align: "center" });

        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(`Recibo: ${venda.id || "-"}`, pdfWidth - 14, 60, { align: "right" });

        const dataVenda = venda.data instanceof Date
            ? venda.data
            : new Date();

        doc.setFontSize(12);
        doc.text(`Cliente: ${venda.clienteNome}`, 14, 70);
        doc.text(`Pagamento: ${venda.tipoPagamento}`, 14, 77);
        doc.text(`Data: ${dataVenda.toLocaleDateString()} ${dataVenda.toLocaleTimeString()}`, pdfWidth - 14, 70, { align: "right" });

        // ---------------- Tabela ----------------
        const startY = 90;
        const rowHeight = 8;
        const colX = [14, 90, 130, 170];

        doc.setFont(undefined, "bold");
        ["Produto", "Qtde", "Valor Unitário", "Subtotal"].forEach((text, i) => {
            doc.text(text, colX[i], startY);
        });
        doc.line(14, startY + 2, pdfWidth - 14, startY + 2);

        let currentY = startY + rowHeight;
        doc.setFont(undefined, "normal");

        (venda.itens || []).forEach((item, index) => {
            const nome = item.nome || "-";
            const qtd = Number(item.quantidade || 0);
            const valorUnitario = Number(item.valorUnitario || item.preco || 0);
            const subtotal = qtd * valorUnitario;

            // Linha alternada de fundo
            if (index % 2 === 0) {
                doc.setFillColor(245);
                doc.rect(14, currentY - 6, pdfWidth - 28, rowHeight, "F");
            }

            doc.text(nome, colX[0], currentY);
            doc.text(String(qtd), colX[1], currentY);
            doc.text(`R$ ${valorUnitario.toFixed(2)}`, colX[2], currentY);
            doc.text(`R$ ${subtotal.toFixed(2)}`, colX[3], currentY);

            currentY += rowHeight;
        });

        // Linha separadora
        doc.line(14, currentY, pdfWidth - 14, currentY);

        // ---------------- Total ----------------
        doc.setFont(undefined, "bold");
        doc.setFontSize(14);
        doc.text(`TOTAL: R$ ${venda.total.toFixed(2)}`, 14, currentY + 10);

        // ---------------- Mensagem final ----------------
        doc.setFontSize(12);
        doc.setFont(undefined, "normal");
        doc.text("Obrigado pela preferência!", pdfWidth / 2, currentY + 25, { align: "center" });

        doc.save(`venda_${venda.clienteNome}.pdf`);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        mostrarModal("Erro ao gerar PDF!");
    }
}

window.gerarPdfVenda = async function (idVenda) {
  try {
    const vendaRef = doc(db, "vendas", idVenda);
    const vendaSnap = await getDoc(vendaRef);

    if (!vendaSnap.exists()) {
      mostrarModal("Venda não encontrada!");
      return;
    }

    const venda = vendaSnap.data();

    // Converte timestamp em Date
    const dataVenda = venda.data?.seconds
      ? new Date(venda.data.seconds * 1000)
      : new Date();

    // Chama o gerador de PDF já existente
    await gerarPdfVendaPremium({
      id: idVenda,
      clienteNome: venda.clienteNome || "Cliente",
      tipoPagamento: venda.tipoPagamento || "-",
      itens: venda.itens || [],
      total: venda.totalComDesconto || venda.total || 0,
      data: dataVenda
    });

  } catch (error) {
    console.error("Erro ao gerar PDF da venda:", error);
    mostrarModal("Erro ao gerar PDF. Verifique o console.");
  }
};

// --- Função para aplicar desconto em um item da venda ---
btnDescontoItem.addEventListener("click", async () => {
  if (itensVendaAtual.length === 0) {
    mostrarModal("Nenhum item na venda para aplicar desconto.");
    return;
  }

  const listaProdutos = itensVendaAtual
    .map((item, index) => `${index + 1} - ${item.nome}`)
    .join("\n");

  const indiceStr = await mostrarPrompt(`Escolha o número do item para aplicar desconto:\n${listaProdutos}`);
  const indice = parseInt(indiceStr) - 1;

  if (isNaN(indice) || indice < 0 || indice >= itensVendaAtual.length) {
    mostrarModal("Item inválido!");
    return;
  }

  const item = itensVendaAtual[indice];
  const descontoStr = await mostrarPrompt(`Digite o valor do desconto para ${item.nome}:`, "0");
  const desconto = parseFloat(descontoStr);

  if (isNaN(desconto) || desconto < 0) {
    mostrarModal("Desconto inválido!");
    return;
  }

  item.desconto = desconto;
  atualizarTabelaItensVenda();
});


// --- Função para aplicar desconto total na venda ---
btnDescontoVenda.addEventListener("click", async () => {
  if (itensVendaAtual.length === 0) {
    mostrarModal("Nenhum item na venda para aplicar desconto.");
    return;
  }

  const totalAtual = itensVendaAtual.reduce((soma, item) => {
    const subtotal = (item.quantidade * item.preco) - (item.desconto || 0);
    return soma + subtotal;
  }, 0);

  const descontoGeralstr = await mostrarPrompt(`Total atual: R$ ${totalAtual.toFixed(2)}\nDigite o valor do desconto geral:`);
  const descontoGeral = parseFloat(descontoGeralstr)

  if (isNaN(descontoGeral) || descontoGeral < 0 || descontoGeral > totalAtual) {
    mostrarModal("Valor de desconto inválido!");
    return;
  }

  // Guarda o desconto geral na venda
  descontoTotalVenda = descontoGeral;
  atualizarTabelaItensVenda();

});

// ===============================
// ATUALIZAR TABELA DE ITENS
// ===============================
function renderizarItensVenda() {
  const tbody = document.querySelector("#tabelaItensVenda tbody");
  if (!tbody) return;

  tbody.innerHTML = ""; // limpa a tabela antes de renderizar
  let totalVenda = 0;

  itensVendaAtual.forEach((item, index) => {
    const subtotal = item.quantidade * item.valorUnitario;
    const total = subtotal - (item.desconto || 0);
    totalVenda += total;

    const tr = document.createElement("tr");    
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${item.valorUnitario?.toFixed(2) || "0.00"}</td>
      <td>R$ ${(item.desconto || 0).toFixed(2)}</td>
      <td>R$ ${subtotal.toFixed(2)}</td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>
       <button onclick="removerItemVenda(${index})">Remover</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
  
  if (descontoTotalVenda > 0) totalVenda -= descontoTotalVenda;

  document.getElementById("totalVenda").textContent = totalVenda.toFixed(2);
}

function atualizarTabelaItensVenda() {
  const tbody = document.querySelector("#tabelaItensVenda tbody");
  if (!tbody) {
    console.error("Tabela de itens não encontrada!");
    return;
  }
  tbody.innerHTML = "";

  // Calcula o subtotal de todos os itens para distribuir o desconto proporcionalmente
  let somaSubtotais = 0;
  itensVendaAtual.forEach(item => {
    somaSubtotais += (item.quantidade || 0) * (item.valorUnitario || 0);
  });

  let totalVenda = 0;

  itensVendaAtual.forEach(item => {
    const quantidade = item.quantidade || 0;
    const valorUnitario = item.valorUnitario || 0;
    const descontoItem = item.desconto || 0;

    const subtotal = quantidade * valorUnitario;

    // Calcula desconto proporcional do desconto total da venda
    const descontoProporcional = descontoTotalVenda 
        ? (subtotal / somaSubtotais) * descontoTotalVenda
        : 0;

    const totalItem = subtotal - descontoItem - descontoProporcional;

    totalVenda += totalItem;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.nome}</td>
      <td>${quantidade}</td>
      <td>R$ ${valorUnitario.toFixed(2)}</td>
      <td>R$ ${(descontoItem + descontoProporcional).toFixed(2)}</td>
      <td>R$ ${subtotal.toFixed(2)}</td>
      <td>R$ ${totalItem.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("totalVenda").textContent = totalVenda.toFixed(2);

  window.totalVenda = totalVenda;
}

function removerItemVenda(index) {
  itensVendaAtual.splice(index, 1);
  renderizarItensVenda();
}

window.removerItemVenda = removerItemVenda;

// ===============================
// CARREGAR REGISTROS DE VENDAS
// ===============================
async function carregarTabelaRegistrosVendas() {
  const tabela = document.getElementById("tabelaRegistrosVendas")?.querySelector("tbody");
  const totalGeralSpan = document.getElementById("totalGeralRegistros");
  if (!tabela || !totalGeralSpan) {
    console.warn("Tabela ou total geral não encontrados!");
    return;
  }

  tabela.innerHTML = "";
  let totalGeral = 0;

  const vendasSnapshot = await getDocs(collection(db, "vendas"));
  console.log("📦 Total de vendas encontradas:", vendasSnapshot.size);

  vendasSnapshot.forEach((docSnap) => {
    const venda = docSnap.data();
    const id = docSnap.id;
    console.log("🧾 Venda:", id, venda);

    // --- Corrige data ---
    let dataFormatada = "-";
    if (venda.data) {
      if (venda.data.seconds) {
        dataFormatada = new Date(venda.data.seconds * 1000).toLocaleDateString("pt-BR");
      } else {
        dataFormatada = new Date(venda.data).toLocaleDateString("pt-BR");
      }
    }

    (venda.itens || []).forEach((item) => {
      const produtoNome = item.nome || "-";
      const quantidade = item.quantidade || 0;
      const valorUnitario = item.valorUnitario || 0;
      const desconto = item.desconto || 0;
      const subtotal = quantidade * valorUnitario;
      const total = item.totalItem || (subtotal - desconto);

      totalGeral += total;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${venda.clienteNome || "Cliente"}</td>
        <td>${produtoNome}</td>
        <td>${quantidade}</td>
        <td>R$ ${valorUnitario.toFixed(2)}</td>
        <td>R$ ${desconto.toFixed(2)}</td>
        <td>R$ ${subtotal.toFixed(2)}</td>
        <td>R$ ${total.toFixed(2)}</td>
        <td>${venda.tipoPagamento || "-"}</td>
        <td>
          <button class="btnExcluir" onclick="abrirModalExcluir('${id}')">🗑️</button>
          <button class="btnPDF" onclick="gerarPdfVenda('${id}')">📄</button>
        </td>
      `;
      tabela.appendChild(row);
    });
  });

  totalGeralSpan.textContent = `R$ ${totalGeral.toFixed(2)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  carregarTabelaRegistrosVendas();
});

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

    const fecharModal = () => { modal.style.display = "none"; };

    btnSim.onclick = () => { fecharModal(); resolve(true); };
    btnNao.onclick = () => { fecharModal(); resolve(false); };

    window.onclick = (event) => { if (event.target == modal) fecharModal(); resolve(false); };
  });
}

// ==========================
// 🔹 Orçamentos
// ==========================
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

  if (!clienteNome) {
    mostrarModal("Informe o nome do cliente!");
    return;
  }
  if (!produtoId) {
    mostrarModal("Selecione um produto!");
    return;
  }
  if (!tipoPreco) {
    mostrarModal("Selecione o tipo de preço!");
    return;
  }
  if (precoUnitario <= 0) {
    mostrarModal("Preço inválido!");
    return;
  }

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
    let total = preco * qtd;

    if (item.tipoDescontoItem === "percent") {
      total *= (1 - desconto / 100);
    } else if (item.tipoDescontoItem === "valor") {
      total -= desconto;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date().toLocaleDateString()}</td>
      <td>${item.clienteNome}</td>
      <td>${item.produtoNome}</td>
      <td>${item.quantidade}</td>
      <td>${preco.toFixed(2)}</td>
      <td>${item.tipoDescontoItem === "percent" ? desconto + "%" : "R$ " + desconto.toFixed(2)}</td>
      <td>${total.toFixed(2)}</td>      
      <td><button class="btn-remover" onclick="removerItemOrcamento(${index})">Remover</button></td>
    `;
    tabela.appendChild(tr);
  });
}

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
window.gerarPdfOrcamento = function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Logo (opcional)
  const img = document.getElementById("logoOrcamento");
  if (img) {
    try {
      doc.addImage(img, 'PNG', 14, 10, 40, 20);
    } catch (e) {
      console.warn("Erro ao adicionar imagem no PDF:", e);
    }
  }

  doc.setFontSize(16);
  doc.text("ORÇAMENTO", 105, 20, { align: "center" });

  const tipoDescontoTotal = document.getElementById("tipoDescontoTotal").value;
  const descontoTotalValor = Number(document.getElementById("descontoTotalOrcamento").value || 0);

  // Protege os valores numéricos
  const rows = itensOrcamentoAtual.map(item => {
    const preco = Number(item.preco) || 0;
    const qtd = Number(item.quantidade) || 0;
    const desconto = Number(item.descontoValor);
    let total = preco * qtd;

    if (item.tipoDescontoItem === "percent") {
      total *= (1 - desconto / 100);
    } else if (item.tipoDescontoItem === "valor") {
      total -= desconto;
    }

    return [
      item.clienteNome,
      item.produtoNome,
      qtd,
      preco.toFixed(2),
      item.tipoDescontoItem === "percent" ? `${desconto}%` : `R$ ${desconto.toFixed(2)}`,
      total.toFixed(2)
    ];
  });

  // Tabela
  doc.autoTable({
    head: [['Cliente', 'Produto', 'Qtd', 'Preço Unitário', 'Desconto', 'Total']],
    body: rows,
    startY: 30
  });

  // Subtotal
  let subtotal = itensOrcamentoAtual.reduce((acc, item) => {
    const preco = Number(item.preco);
    const qtd = Number(item.quantidade);
    const desconto = Number(item.descontoValor);
    let total = preco * qtd;

    if (item.tipoDescontoItem === "percent") {
      total *= (1 - desconto / 100);
    } else if (item.tipoDescontoItem === "valor") {
      total -= desconto;
    }

    return acc + total;
  }, 0);

  // Desconto total
  let totalFinal = subtotal;
  if (tipoDescontoTotal === "percent") {
    totalFinal = subtotal * (1 - descontoTotalValor / 100);
  } else if (tipoDescontoTotal === "valor") {
    totalFinal = subtotal - descontoTotalValor;
  }

  let y = doc.lastAutoTable.finalY + 10;
  doc.text(`Subtotal: R$ ${subtotal.toFixed(2)}`, 14, y);
  y += 8;
  doc.text(
    `Desconto total (${tipoDescontoTotal === "percent" ? descontoTotalValor + "%" : "R$ " + descontoTotalValor.toFixed(2)})`,
    14, y
  );
  y += 8;
  doc.setFontSize(14);
  doc.text(`TOTAL FINAL: R$ ${totalFinal.toFixed(2)}`, 14, y);
  doc.save('orcamento.pdf')
}

document.getElementById("produtoSelectOrcamento").addEventListener("change", atualizarPrecoOrcamento);
document.getElementById("tipoPrecoSelectOrcamento").addEventListener("change", atualizarPrecoOrcamento);
document.getElementById("btnAdicionarProduto").addEventListener("click", adicionarProdutoOrcamento);
document.getElementById("btnGerarPDF").addEventListener("click", gerarPdfOrcamento);

// ==========================
// 🔹 CARREGAR TABELA DE PREÇOS
// ==========================
async function carregarTabelaPrecos() {
  console.log("carregarTabelaPrecos() iniciada");

  const tabela = document.querySelector("#tabelaPrecos tbody");
  tabela.innerHTML = "";

  try {
    const produtosSnapshot = await getDocs(collection(db, "produtos"));
    console.log("Qtd de produtos:", produtosSnapshot.size);

    produtosSnapshot.forEach(docSnap => {
      const produto = docSnap.data();
      console.log("Processando:", docSnap.id, produto);

      // evita erro caso o produto esteja vazio
      if (!produto || !produto.nome) {
        console.warn("Produto ignorado (sem nome ou dados):", docSnap.id);
        return;
      }

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${produto.nome || ""}</td>
        <td><input type="number" value="${produto.preco || 0}" step="0.01"></td>
        <td><input type="number" value="${produto.estampaFrente || 0}" step="0.01"></td>
        <td><input type="number" value="${produto.estampaFrenteVerso || 0}" step="0.01"></td>
      `;

      tabela.appendChild(linha);
      console.log("Linha adicionada:", produto.nome);

      // Escuta mudanças e salva automaticamente
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

    doc.setFontSize(16);
    doc.text("REGISTROS DE VENDAS", pdfWidth / 2, 15, { align: "center" });

    let totalGeral = 0;
    const linhas = [];

    // Monta todas as linhas da tabela
    vendasSnapshot.forEach((vendaDoc) => {
      const venda = vendaDoc.data();
      const data = venda.data?.seconds
        ? new Date(venda.data.seconds * 1000)
        : new Date();

      const dataTexto = data.toLocaleDateString("pt-BR");
      const cliente = venda.clienteNome || "Cliente";
      const pagamento = venda.tipoPagamento || "-";

      (venda.itens || []).forEach((item) => {
        const quantidade = item.quantidade || 0;
        const valorUnitario = item.valorUnitario || 0;
        const desconto = item.desconto || 0;
        const totalItem = item.totalItem || (quantidade * valorUnitario - desconto);

        totalGeral += totalItem;

        linhas.push([
          dataTexto,
          cliente,
          pagamento,
          item.nome || "-",
          quantidade,
          `R$ ${valorUnitario.toFixed(2)}`,
          `R$ ${desconto.toFixed(2)}`,
          `R$ ${totalItem.toFixed(2)}`
        ]);
      });
    });

    // Cabeçalho da tabela
    const cabecalho = [
      [
        "Data",
        "Cliente",
        "Pagamento",
        "Produto",
        "Qtde",
        "Unitário",
        "Desconto",
        "Total"
      ]
    ];

    // Gera tabela formatada
    doc.autoTable({
      head: cabecalho,
      body: linhas,
      startY: 25,
      styles: {
        fontSize: 9,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        fillColor: [41, 128, 185], // azul elegante
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      theme: "grid",
    });

    // Soma total geral
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(
      `TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`,
      pdfWidth - 20,
      doc.lastAutoTable.finalY + 10,
      { align: "right" }
    );

    // Salva o PDF
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





