import { app } from "./firebase-config.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    const telaLogin = document.getElementById("tela-login");
    const header = document.querySelector("header");

    if (user) {
        // ✅ Usuário logado
        telaLogin.style.display = "none";
        header.style.display = "flex"; // ou "block", dependendo do seu CSS
        document.getElementById("userEmail").textContent = user.email;
        mostrarSecao("clientes");
    } else {
        // ❌ Usuário não logado
        telaLogin.style.display = "block";
        header.style.display = "none";
    }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    mostrarSecao(target);
  });
});

function mostrarSecao(secaoId) {
  document.querySelectorAll(".secao").forEach(secao => {
    secao.style.display = "none";
  });
  document.getElementById(secaoId).style.display = "block";

  // Atualiza dados conforme a seção
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
      carregarProdutosOrcamento();
      carregarOrcamentos();
      break;
    case "registrosVendas":
      carregarRegistrosVendas();
      break;
    case "precos":
      carregarTabelaPrecos();
      break;
  }
}

const clienteSelect = document.getElementById('clienteSelect');
const nomeClienteInput = document.getElementById('nomeCliente');
const telefoneClienteInput = document.getElementById('telefoneCliente');
const produtoSelect = document.getElementById('produtoSelect');
const produtoSelectOrcamento = document.getElementById('produtoSelectOrcamento');

const tabelaClientes = document.querySelector('#tabelaClientes tbody');
const tabelaEstoque = document.querySelector('#tabelaEstoque tbody');
const tabelaItensVenda = document.querySelector('#tabelaItensVenda tbody');
const tabelaOrcamentos = document.querySelector('#tabelaOrcamentos tbody');
const tabelaVendas = document.querySelector('#tabelaVendas tbody');

const clientesCol = collection(db, 'clientes');
const produtosCol = collection(db, 'produtos');
const vendasCol = collection(db, 'vendas');
const orcamentosCol = collection(db, 'orcamentos');

// ==========================
// 🔹 Variáveis Globais
// ==========================
let produtosMap = {};
let itensVendaAtual = [];
let itensOrcamentoAtual = [];


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
window.adicionarItemVenda = () => {
    const produtoId = produtoSelect.value;
    const produto = produtosMap[produtoId];
    const quantidade = parseInt(document.getElementById("quantidadeVenda").value);
    if (!produto || quantidade <= 0) return alert("Dados inválidos");
    itensVendaAtual.push({
        produtoId,
        nome: produto.nome,
        quantidade,
        preco: produto.preco,
        desconto: 0
    });
    atualizarTabelaVendas();
}

function atualizarTabelaVendas() {
    const tbody = document.querySelector('#tabelaItensVenda tbody');
    tbody.innerHTML = '';
    let totalVenda = 0;

    itensVendaAtual.forEach((item, i) => {
        const subtotal = item.preco * item.quantidade;
        const total = subtotal - (item.desconto || 0);
        totalVenda += total;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>${item.preco.toFixed(2)}</td>
            <td>${item.desconto?.toFixed(2) || '0.00'}</td>
            <td>${subtotal.toFixed(2)}</td>
            <td>${total.toFixed(2)}</td>
            <td>
                <button onclick="removerItemVenda(${i})">X</button>
                <button onclick="abrirModalDesconto(${i}, 'item')">Desconto</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('totalVenda').textContent = totalVenda.toFixed(2);
}

function renderizarItensVenda() {
    atualizarTabelaVendas();
}

function removerItemVenda(i) {
    itensVendaAtual.splice(i, 1);
    atualizarTabelaVendas();
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

async function carregarRegistrosVendas() {
  console.log("carregarRegistrosVendas() iniciada");

  const tabela = document.querySelector("#tabelaRegistros tbody");
  const totalGeralSpan = document.getElementById("totalGeralRegistros");
  tabela.innerHTML = "";

  const vendasSnapshot = await getDocs(collection(db, "vendas"));
  let totalGeral = 0;

  vendasSnapshot.forEach(docSnap => {
    const venda = docSnap.data();
    const data = venda.data || "";
    const cliente = venda.clienteNome || "";
    const produto = venda.produto || "";
    const qtd = venda.quantidade || 0;
    const precoUnit = venda.precoUnitario || 0;
    const desconto = venda.desconto || 0;
    const totalAntes = venda.totalAntes || (precoUnit * qtd);
    const totalApos = venda.totalApos || totalAntes;
    const pagamento = venda.formaPagamento || "";

    totalGeral += totalApos;

    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${data}</td>
      <td>${cliente}</td>
      <td>${produto}</td>
      <td>${qtd}</td>
      <td>R$ ${precoUnit.toFixed(2)}</td>
      <td>${desconto ? desconto + "%" : "-"}</td>
      <td>R$ ${totalAntes.toFixed(2)}</td>
      <td>R$ ${totalApos.toFixed(2)}</td>
      <td>${pagamento}</td>
      <td><button onclick="excluirRegistro('${docSnap.id}')">Excluir</button></td>
    `;
    tabela.appendChild(linha);
  });

  totalGeralSpan.textContent = `R$ ${totalGeral.toFixed(2)}`;
}

// desconto
function abrirModalDesconto(index = null, tipo = 'item') {
    if (itensVendaAtual.length === 0) return alert('Adicione produtos primeiro');
    const modal = document.getElementById('modalDesconto');
    const titulo = document.getElementById('tituloModalDesconto');
    titulo.innerText = tipo === 'item' ? 'Desconto no item' : 'Desconto na venda';
    modal.style.display = 'block';

    document.getElementById('btnAplicarDesconto').onclick = () => {
        const tipoDesconto = document.getElementById('tipoDesconto').value;
        const valor = parseFloat(document.getElementById('valorDesconto').value) || 0;

        if (tipo === 'item' && index !== null) {
            const item = itensVendaAtual[index];
            item.desconto = tipoDesconto === 'percentual' 
                ? item.preco * item.quantidade * (valor / 100)
                : valor;
        } else {
            const totalItens = itensVendaAtual.reduce((sum, i) => sum + (i.preco * i.quantidade), 0);
            itensVendaAtual.forEach(item => {
                item.desconto = tipoDesconto === 'percentual'
                    ? item.preco * item.quantidade * (valor / 100)
                    : (valor / totalItens) * (item.preco * item.quantidade);
            });
        }

        atualizarTabelaVendas();
        modal.style.display = 'none';
        document.getElementById('valorDesconto').value = '';
    };
    document.getElementById('btnCancelarDesconto').onclick = () => {
        modal.style.display = 'none';
        document.getElementById('valorDesconto').value = '';
    };
}

document.getElementById("btnDescontoItem")?.addEventListener("click", () => {
    abrirModalDesconto('item');
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
      <td>R$ ${(produto.preco || 0).toFixed(2)}</td>
      <td>R$ ${(produto.estampaFrente || 0).toFixed(2)}</td>
      <td>R$ ${(produto.estampaFrenteVerso || 0).toFixed(2)}</td>
      <td>R$ ${(produto.branca || 0).toFixed(2)}</td>
      <td>R$ ${(produto.interiorCores || 0).toFixed(2)}</td>
      <td>R$ ${(produto.magicaFosca || 0).toFixed(2)}</td>
      <td>R$ ${(produto.magicaBrilho || 0).toFixed(2)}</td>
      <td><button onclick="editarPreco('${docSnap.id}')">Editar</button></td>
    `;
    tabela.appendChild(linha);
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
        case 'precos': await carregarPrecos(); break;
      }
    });
  });
});

// ===== MODAL DE DESCONTO =====
const modalDesconto = document.getElementById('modalDesconto');
const btnAplicarDesconto = document.getElementById('btnAplicarDesconto');
const btnCancelarDesconto = document.getElementById('btnCancelarDesconto');

// Função para abrir modal
function abrirModal() {
  modalDesconto.style.display = 'flex';
}

// Função para fechar modal
function fecharModal() {
  modalDesconto.style.display = 'none';
}

// Botões do modal
btnCancelarDesconto.addEventListener('click', fecharModal);

// Fechar modal clicando fora do conteúdo
window.addEventListener('click', (e) => {
  if (e.target === modalDesconto) {
    fecharModal();
  }
});

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

// ==========================
// 🔹 Inicialização
// ==========================
window.onload = async () => {
    await carregarClientes();
    await carregarEstoque();
    await carregarOrcamentos();
    await carregarTabelaVendas();
    await carregarPrecos();
};

window.mostrarSecao = mostrarSecao;










