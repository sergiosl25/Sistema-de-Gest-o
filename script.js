import { app } from "./firebase-config.js";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp 
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

const modalDesconto = document.getElementById('modalDesconto');
const tituloModalDesconto = document.getElementById('tituloModalDesconto');
const valorDescontoInput = document.getElementById('valorDesconto');
const tipoDescontoSelect = document.getElementById('tipoDesconto');
const btnAplicarDesconto = document.getElementById('btnAplicarDesconto');
const btnCancelarDesconto = document.getElementById('btnCancelarDesconto');

// Coleções
const clientesCol = collection(db, 'clientes');
const produtosCol = collection(db, 'produtos');
const vendasCol = collection(db, 'vendas');
const orcamentosCol = collection(db, 'orcamentos');

let descontoIndex = null;  // índice do item ou null para desconto geral
let descontoTipo = 'item'; // 'item' ou 'venda'
let itensVendaAtual = [];
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
    alert("Login ou senha inválidos!");
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
    case "clientes": carregarClientes(); break;
    case "estoque": carregarEstoque(); break;
    case "vendas": carregarClientesVenda(); carregarProdutosVenda(); break;
    case "orcamentos": carregarProdutosOrcamento(); carregarOrcamentos(); break;
    case "registrosVendas": carregarTabelaVendas(); break;
    case "precos": carregarTabelaPrecos(); break;
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
    const novoNome = prompt("Novo nome:", nome);
    const novoTel = prompt("Novo telefone:", telefone);
    if (novoNome) {
        await updateDoc(doc(db, "clientes", id), { nome: novoNome, telefone: novoTel });
        carregarClientes();
    }
}

window.excluirCliente = async (id) => {
    if (confirm("Deseja realmente excluir?")) {
        await deleteDoc(doc(db, "clientes", id));
        carregarClientes();
    }
}

document.getElementById("btnCadastrarCliente")?.addEventListener("click", async () => {
    const nome = document.getElementById("nomeCliente").value.trim();
    const telefone = document.getElementById("telefoneCliente").value.trim();
    if (!nome) return alert("Nome é obrigatório");
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
  if (!clienteNome || !produto || !quantidade) return alert("Preencha todos os campos!");

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
    branca: produto.branca || 0,
    interiorCores: produto.interiorCores || 0,
    magicaFosca: produto.magicaFosca || 0,
    magicaBrilho: produto.magicaBrilho || 0
  };

  document.getElementById("precoSelecionado").value = precos[tipo] || 0;
}

produtoSelect.addEventListener("change", atualizarPrecoProduto);
tipoPrecoSelect.addEventListener("change", atualizarPrecoProduto);



window.editarProduto = async (id, nome, qtd, preco) => {
    const novoNome = prompt("Nome:", nome);
    const novaQtd = parseInt(prompt("Quantidade:", qtd));
    const novoPreco = parseFloat(prompt("Preço:", preco));
    if (novoNome) {
        await updateDoc(doc(db, "produtos", id), { nome: novoNome, quantidade: novaQtd, preco: novoPreco });
        carregarEstoque();
    }
}

window.excluirProduto = async (id) => {
    if (confirm("Excluir produto?")) {
        await deleteDoc(doc(db, "produtos", id));
        carregarEstoque();
    }
}

document.getElementById("btnCadastrarProduto")?.addEventListener("click", async () => {
    const nome = document.getElementById("nomeProduto").value.trim();
    const quantidade = parseInt(document.getElementById("quantidadeProduto").value) || 0;
    if (!nome) return alert("Nome é obrigatório");
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
    alert("Preencha todos os campos corretamente!");
    return;
  }

  const produtoNome = produtoSelect.options[produtoSelect.selectedIndex].text;

  // Adiciona ao array de itens da venda
  itensVendaAtual.push({
    produtoId,
    produtoNome,
    quantidade,
    preco
  });

  atualizarTabelaItensVenda();
}

document.getElementById("btnFinalizarVenda")?.addEventListener("click", async () => {
    const clienteId = clienteSelect.value;
    if (!clienteId || itensVendaAtual.length === 0) return alert("Dados incompletos");

    // 🔹 Calcula total da venda
    const total = itensVendaAtual.reduce((s, i) => s + (i.quantidade * i.preco - (i.desconto || 0)), 0);

    // 🔹 Salva no Firebase
    await addDoc(vendasCol, {
        clienteId,
        itens: itensVendaAtual,
        total,
        data: serverTimestamp()
    });

    // 🔹 Exibe confirmação
    alert(`Venda registrada! Total: R$ ${total.toFixed(2)}`);

    // 🔹 Limpa a venda
    itensVendaAtual = [];
    atualizarTabelaVendas();
});

async function carregarTabelaVendas() {
    const snapshot = await getDocs(vendasCol);
    const tabelaRegistros = document.querySelector('#tabelaRegistros tbody');
    tabelaRegistros.innerHTML = '';

    if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const venda = docSnap.data() || {};
            (venda.itens || []).forEach(item => {
                const subtotal = item.quantidade * item.preco;
                const total = subtotal - (item.desconto || 0);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${venda.data?.seconds ? new Date(venda.data.seconds * 1000).toLocaleDateString() : ''}</td>
                    <td>${venda.clienteNome || venda.clienteId || ''}</td>
                    <td>${item.nome || ''}</td>
                    <td>${item.quantidade || 0}</td>
                    <td>${item.preco?.toFixed(2) || '0.00'}</td>
                    <td>${item.desconto?.toFixed(2) || '0.00'}</td>
                    <td>${subtotal.toFixed(2)}</td>
                    <td>${total.toFixed(2)}</td>`;
                tabelaRegistros.appendChild(tr);
            });
        });
    }
}

// ===============================
// ATUALIZAR TABELA DE ITENS
// ===============================
function atualizarTabelaVendas() {
  tabelaItensVenda.innerHTML = '';
  let totalVenda = 0;

  itensVendaAtual.forEach((item, i) => {
    const subtotal = item.preco * item.quantidade;
    const total = subtotal - (item.desconto || 0);
    totalVenda += total;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.tipoPreco}</td>
      <td>${item.quantidade}</td>
      <td>${item.preco.toFixed(2)}</td>
      <td>${item.desconto.toFixed(2)}</td>
      <td>${subtotal.toFixed(2)}</td>
      <td>${total.toFixed(2)}</td>
      <td>
        <button onclick="removerItemVenda(${i})">🗑️</button>
        <button onclick="abrirModalDesconto(${i}, 'item')">💲 Desconto</button>
      </td>
    `;
    tabelaItensVenda.appendChild(tr);
  });

  document.getElementById('totalVenda').textContent = totalVenda.toFixed(2);
}

function renderizarItensVenda() {
  const tabela = document.getElementById("tabelaItensVenda").querySelector("tbody");
  tabela.innerHTML = ""; // limpa a tabela antes de renderizar

  let totalVenda = 0;

  itensVendaAtual.forEach((item, index) => {
    const subtotal = item.quantidade * item.preco;
    totalVenda += subtotal;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${item.preco.toFixed(2)}</td>
      <td>R$ ${item.desconto ? item.desconto.toFixed(2) : "0.00"}</td>
      <td>R$ ${subtotal.toFixed(2)}</td>
      <td>R$ ${(subtotal - (item.desconto || 0)).toFixed(2)}</td>
      <td>
        <button onclick="removerItemVenda(${index})">Remover</button>
      </td>
    `;

    tabela.appendChild(tr);
  });

  document.getElementById("totalVenda").textContent = totalVenda.toFixed(2);
}
document.addEventListener("DOMContentLoaded", () => {
  renderizarItensVenda();
});

function atualizarTabelaItensVenda() {
  const tbody = document.querySelector("#tabelaItensVenda tbody");
  tbody.innerHTML = "";

  let totalVenda = 0;

  itensVendaAtual.forEach((item, index) => {
    const subtotal = item.quantidade * item.preco;
    totalVenda += subtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produtoNome}</td>
      <td>${item.quantidade}</td>
      <td>${item.preco.toFixed(2)}</td>
      <td>0.00</td>
      <td>${subtotal.toFixed(2)}</td>
      <td>${subtotal.toFixed(2)}</td>
      <td><button onclick="removerItemVenda(${index})">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("totalVenda").innerText = totalVenda.toFixed(2);
}

function removerItemVenda(index) {
  // Remove o item do array de vendas
  itensVendaAtual.splice(index, 1);

  // Atualiza a tabela após a remoção
  renderizarItensVenda();
}

// ===============================
// FINALIZAR VENDA
// ===============================
document.getElementById("btnFinalizarVenda")?.addEventListener("click", async () => {
  const clienteId = clienteSelect.value;
  if (!clienteId || itensVendaAtual.length === 0)
    return alert("Selecione o cliente e adicione itens.");

  const total = itensVendaAtual.reduce((s, i) => s + (i.quantidade * i.preco - (i.desconto || 0)), 0);

  await addDoc(collection(db, "vendas"), {
    clienteId,
    itens: itensVendaAtual,
    total,
    data: serverTimestamp()
  });

  alert(`Venda registrada! Total: R$ ${total.toFixed(2)}`);
  itensVendaAtual = [];
  atualizarTabelaVendas();
})

// ===============================
// CARREGAR REGISTROS DE VENDAS
// ===============================
async function carregarRegistrosVendas() {
  console.log("carregarRegistrosVendas() iniciada");

  const tabela = document.querySelector("#tabelaRegistros tbody");
  const totalGeralSpan = document.getElementById("totalGeralRegistros");
  tabela.innerHTML = "";

  const vendasSnapshot = await getDocs(collection(db, "vendas"));
  let totalGeral = 0;

  vendasSnapshot.forEach(docSnap => {
    const venda = docSnap.data();
    const dataVenda = venda.data?.seconds ? new Date(venda.data.seconds * 1000).toLocaleString() : "";
    const cliente = venda.clienteNome || "";
    const formaPagamento = venda.formaPagamento || "";

    (venda.itens || []).forEach(item => {
      const subtotal = item.quantidade * item.preco;
      const total = subtotal - (item.desconto || 0);
      totalGeral += total;

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${dataVenda}</td>
        <td>${cliente}</td>
        <td>${item.nome}</td>
        <td>${item.quantidade}</td>
        <td>${item.tipoPreco}</td>        
        <td>R$ ${item.preco.toFixed(2)}</td>
        <td>R$ ${(item.desconto || 0).toFixed(2)}</td>
        <td>R$ ${total.toFixed(2)}</td>
        <td>${formaPagamento}</td>
        <td>
          <button onclick="excluirRegistro('${docSnap.id}')">Excluir</button>
          <button onclick="gerarPDF('${docSnap.id}')">Gerar PDF</button>
        </td>
      `;
      tabela.appendChild(linha);
    });
  });

  totalGeralSpan.textContent = `R$ ${totalGeral.toFixed(2)}`;
}
document.addEventListener("DOMContentLoaded", () => {
  carregarRegistrosVendas();
});

// ==========================
// 🔹 Orçamentos
// ==========================
function renderizarOrcamentos() {
    tabelaOrcamentos.innerHTML = '';
    itensOrcamentoAtual.forEach((item, index) => {
        const total = item.quantidade * item.preco;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date().toLocaleDateString()}</td>
            <td>${item.clienteNome}</td>
            <td>${item.produtoNome}</td>
            <td>${item.quantidade}</td>
            <td>${item.preco.toFixed(2)}</td>
            <td>${total.toFixed(2)}</td>
            <td><button onclick="removerItemOrcamento(${index})">Remover</button></td>`;
        tabelaOrcamentos.appendChild(tr);
    });
}

window.removerItemOrcamento = (index) => {
    itensOrcamentoAtual.splice(index, 1);
    renderizarOrcamentos();
};

async function carregarOrcamentos() {
    const snapshot = await getDocs(orcamentosCol);
    tabelaOrcamentos.innerHTML = '';
    if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const orcamento = docSnap.data() || {};
            (orcamento.itens || []).forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${orcamento.data?.seconds ? new Date(orcamento.data.seconds*1000).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                    <td>${item.clienteNome || ''}</td>
                    <td>${item.produtoNome || ''}</td>
                    <td>${item.quantidade || 0}</td>
                    <td>${item.preco.toFixed(2)}</td>
                    <td>${(item.quantidade*item.preco).toFixed(2)}</td>`;
                tabelaOrcamentos.appendChild(tr);
            });
        });
    }
}

async function carregarProdutosOrcamento() {
  console.log("carregarProdutosOrcamento() iniciada");

  const select = document.getElementById("produtoSelectOrcamento");
  select.innerHTML = "<option value=''>Selecione o produto</option>";

  const produtosSnapshot = await getDocs(collection(db, "produtos"));
  produtosSnapshot.forEach(docSnap => {
    const produto = docSnap.data();
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = produto.nome;
    select.appendChild(option);
  });
}

// ==========================
// 🔹 CARREGAR TABELA DE PREÇOS
// ==========================
async function carregarTabelaPrecos() {
  console.log("carregarTabelaPrecos() iniciada");

  const tabela = document.querySelector("#tabelaPrecos tbody");
  tabela.innerHTML = "";

  const produtosSnapshot = await getDocs(collection(db, "produtos"));
  
  produtosSnapshot.forEach(docSnap => {
    const produto = docSnap.data();
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${produto.nome || ""}</td>
      <td><input type="number" value="${produto.preco || 0}" step="0.01"></td>
      <td><input type="number" value="${produto.estampaFrente || 0}" step="0.01"></td>
      <td><input type="number" value="${produto.estampaFrenteVerso || 0}" step="0.01"></td>
      <td><input type="number" value="${produto.branca || 0}" step="0.01"></td>
      <td><input type="number" value="${produto.interiorCores || 0}" step="0.01"></td>
      <td><input type="number" value="${produto.magicaFosca || 0}" step="0.01"></td>
      <td><input type="number" value="${produto.magicaBrilho || 0}" step="0.01"></td>
    `;

    tabela.appendChild(linha);

    // Observa mudanças e salva automaticamente no Firestore
    linha.querySelectorAll("input").forEach((input, index) => {
      input.addEventListener("change", async () => {
        const campos = [
          "preco",
          "estampaFrente",
          "estampaFrenteVerso",
          "branca",
          "interiorCores",
          "magicaFosca",
          "magicaBrilho"
        ];
        const campo = campos[index];
        const novoValor = parseFloat(input.value) || 0;

        try {
          await updateDoc(doc(db, "produtos", docSnap.id), { [campo]: novoValor });
          console.log(`✅ ${campo} atualizado para R$ ${novoValor.toFixed(2)} (${produto.nome})`);
        } catch (erro) {
          console.error("❌ Erro ao atualizar preço:", erro);
          alert("Erro ao salvar o novo valor. Verifique sua conexão.");
        }
      });
    });
  });
}

// gerar PDF de orçamentos (exemplo)
function gerarPdfOrcamento() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`Orçamento - ${new Date().toLocaleDateString()}`, 14, 10);
    const rows = itensOrcamentoAtual.map(item => [
        item.clienteNome, item.produtoNome, item.quantidade, item.preco.toFixed(2), (item.quantidade * item.preco).toFixed(2)
    ]);
    doc.autoTable({ head: [['Cliente', 'Produto', 'Qtd', 'Preço Unitário', 'Total']], body: rows, startY: 20 });
    doc.save('orcamento.pdf');
}

document.getElementById("btnGerarPDF")?.addEventListener("click", () => {
    gerarPdfOrcamento();
})

// exportar registros vendas
function exportarPDFRegistros() {
    if (!window.jspdf) {
        alert("Biblioteca jsPDF não carregada!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Registros de Vendas", 14, 16);

    if (typeof doc.autoTable === "function") {
        doc.autoTable({
            html: '#tabelaRegistros',
            startY: 20
        });
    } else {
        alert("AutoTable não disponível!");
    }

    doc.save("registros.pdf");
}

document.getElementById("btnExportarPDF")?.addEventListener("click", () => {
    exportarPDFRegistros();
});

// ===== CONTROLE DE SEÇÕES =====
document.addEventListener("DOMContentLoaded", () => {
  const menuBtns = document.querySelectorAll('header nav button');
  const secoes = document.querySelectorAll('.secao');

  menuBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.target;

      // Esconder todas as seções
      secoes.forEach(secao => secao.style.display = 'none');

      // Mostrar a seção clicada
      const secaoAlvo = document.getElementById(target);
      if (secaoAlvo) secaoAlvo.style.display = 'block';

      // 🔄 Recarregar dados da seção selecionada
      switch (target) {
        case 'clientes': await carregarClientes(); break;
        case 'estoque': await carregarEstoque(); break;
        case 'orcamentos': await carregarOrcamentos(); break;
        case 'registrosVendas': await carregarTabelaVendas(); break;
      }
    });
  });
});

// ===============================
// MODAL DE DESCONTO
// ===============================
function abrirModalDesconto(index = null, tipo = 'item') {
  const modal = document.getElementById("modalDesconto");
  const campoValor = document.getElementById("valorDesconto");
  modal.style.display = "block";

  // salva índice atual
  modal.dataset.index = index;
  modal.dataset.tipo = tipo;
  campoValor.value = "";
}
// Ao confirmar o desconto
document.getElementById("btnAplicarDesconto").addEventListener("click", () => {
  const modal = document.getElementById("modalDesconto");
  const index = parseInt(modal.dataset.index);
  const tipo = modal.dataset.tipo;
  const valor = parseFloat(document.getElementById("valorDesconto").value) || 0;

  if (tipo === 'item' && itensVendaAtual[index]) {
    itensVendaAtual[index].desconto = valor;
  }

  modal.style.display = "none";
  atualizarTabelaVendas();
})

// Cancelar desconto
btnCancelarDesconto.addEventListener('click', fecharModalDesconto);

// Fechar modal
function fecharModalDesconto() {
  modalDesconto.style.display = 'none';
  valorDescontoInput.value = '';
}
  
// Fechar clicando fora do conteúdo
window.addEventListener('click', (e) => {
  if (e.target === modalDesconto) fecharModalDesconto();
});

window.abrirModalDesconto = abrirModalDesconto;


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



