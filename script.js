import { app } from "./firebase-config.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const db = getFirestore(app);
const auth = getAuth(app);

// 🔐 Verifica login ao carregar
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("userEmail").textContent = user.email;
    mostrarSecao("clientes");
  }
});

// 🔹 Função de logout
document.getElementById("btnLogout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// 🔹 Controle de seções
window.mostrarSecao = function(secao) {
    document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
    const el = document.getElementById(secao);
    if(el) el.style.display = 'block';
};

let produtosMap = {};
let itensVendaAtual = [];
let itensOrcamentoAtual = [];

const produtoSelect = document.getElementById('produtoSelect');
const clienteSelect = document.getElementById('clienteSelect');
const produtoSelectOrcamento = document.getElementById('produtoSelectOrcamento');

const tabelaClientes = document.querySelector('#tabelaClientes tbody');
const tabelaEstoque = document.querySelector('#tabelaEstoque tbody');
const tabelaItensVenda = document.querySelector('#tabelaItensVenda tbody');
const tabelaOrcamentos = document.querySelector('#tabelaOrcamentos tbody');

const vendasCol = collection(db, 'vendas');
const produtosCol = collection(db, 'produtos');
const clientesCol = collection(db, 'clientes');
const orcamentosCol = collection(db, 'orcamentos')

async function carregarClientes() {
    const snapshot = await getDocs(collection(db, 'clientes'));
    const tbody = document.querySelector('#tabelaClientes tbody');
    const clienteSelect = document.getElementById('clienteSelect');
    tbody.innerHTML = '';
    clienteSelect.innerHTML = '<option value="">Selecione o cliente</option>';

    if (!snapshot) return; // protege caso não haja snapshot

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
        tbody.appendChild(tr);

        clienteSelect.innerHTML += `<option value="${docSnap.id}">${cliente.nome || ''}</option>`;
    });
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
        await carregarClientes();
    }
}

document.getElementById("btnCadastrarCliente").addEventListener("click", async () => {
  const nome = document.getElementById("nomeCliente").value.trim();
  const telefone = document.getElementById("telefoneCliente").value.trim();
  if (!nome) return alert("Nome é obrigatório");
  await addDoc(clientesCol, { nome, telefone });
  document.getElementById("nomeCliente").value = "";
  document.getElementById("telefoneCliente").value = "";
  carregarClientes();
})

// estoque / produtos
async function carregarEstoque() {
    const snapshot = await getDocs(collection(db, 'produtos'));
    const tbody = document.querySelector('#tabelaEstoque tbody');
    const produtoSelect = document.getElementById('produtoSelect');
    const produtoSelectOrcamento = document.getElementById('produtoSelectOrcamento');
    tbody.innerHTML = '';
    produtoSelect.innerHTML = '<option value="">Selecione o produto</option>';
    produtoSelectOrcamento.innerHTML = '<option value="">Selecione o produto</option>';
    produtosMap = {};

    if (!snapshot) return;

    snapshot.forEach(docSnap => {
        const produto = docSnap.data() || {};
        produtosMap[docSnap.id] = produto;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${produto.nome || ''}</td>
            <td>${produto.quantidade || 0}</td>
            <td>
            <button onclick="editarProduto('${docSnap.id}', '${produto.nome || ''}', ${produto.quantidade || 0})">Editar</button>
                <button onclick="excluirProduto('${docSnap.id}')">Excluir</button>
            </td>`;
        tbody.appendChild(tr);

        produtoSelect.innerHTML += `<option value="${docSnap.id}">${produto.nome || ''}</option>`;
        produtoSelectOrcamento.innerHTML += `<option value="${docSnap.id}">${produto.nome || ''}</option>`;
    });
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

document.getElementById("btnCadastrarProduto").addEventListener("click", async () => {
  const nome = document.getElementById("nomeProduto").value.trim();
  const quantidade = parseInt(document.getElementById("quantidadeProduto").value) || 0;
  const preco = parseFloat(document.getElementById("precoProduto").value) || 0;
  if (!nome) return alert("Nome é obrigatório");
  await addDoc(produtosCol, { nome, quantidade, preco });
  document.getElementById("nomeProduto").value = "";
  document.getElementById("quantidadeProduto").value = "";
  document.getElementById("precoProduto").value = "";
  carregarEstoque();
})

// vendas
window.adicionarItemVenda = () => {
  const produtoId = produtoSelectVenda.value;
  const produto = produtosMap[produtoId];
  const quantidade = parseInt(document.getElementById("quantidadeVenda").value);
  if (!produto || quantidade <= 0) return alert("Dados inválidos");
  itensVendaAtual.push({
    produtoId,
    nome: produto.nome,
    quantidade,
    preco: produto.preco
  });
  atualizarTabelaVenda();
}

function atualizarTabelaVenda() {
  tabelaItensVenda.innerHTML = '';
  let total = 0;
  itensVendaAtual.forEach((item, i) => {
    const subtotal = item.quantidade * item.preco;
    total += subtotal;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.quantidade}</td>
      <td>${item.preco.toFixed(2)}</td>
      <td>${subtotal.toFixed(2)}</td>
      <td><button onclick="removerItemVenda(${i})">X</button></td>`;
    tabelaItensVenda.appendChild(tr);
  });
   document.getElementById("totalVenda").textContent = total.toFixed(2);
}

window.removerItemVenda = (i) => {
  itensVendaAtual.splice(i, 1);
  atualizarTabelaVenda();
}

document.getElementById("btnFinalizarVenda").addEventListener("click", async () => {
  const clienteId = clienteSelectVenda.value;
  if (!clienteId || itensVendaAtual.length === 0) return alert("Dados incompletos");
  const desconto = parseFloat(document.getElementById("descontoVenda").value) || 0;

  let total = itensVendaAtual.reduce((s, i) => s + i.quantidade * i.preco, 0);
  const totalFinal = total - desconto;

  await addDoc(vendasCol, {
    clienteId,
    itens: itensVendaAtual,
    desconto,
    total: totalFinal,
    data: serverTimestamp()
  });

  alert(`Venda registrada! Total: R$ ${totalFinal.toFixed(2)}`);
  gerarReciboPDF(clienteId, itensVendaAtual, total, desconto, totalFinal);

  itensVendaAtual = [];
  atualizarTabelaVenda();
  carregarVendas();
})

async function carregarVendas() {
  tabelaVendas.innerHTML = '';
  const snapshot = await getDocs(vendasCol);
  snapshot.forEach(docSnap => {
    const v = docSnap.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(v.data?.seconds * 1000).toLocaleDateString()}</td>
      <td>${v.total?.toFixed(2) || '0.00'}</td>
      <td>${v.desconto?.toFixed(2) || '0.00'}</td>`;
    tabelaVendas.appendChild(tr);
  });
}

async function carregarRegistroVendas() {
    const snapshot = await getDocs(collection(db, 'vendas'));
    const tbody = document.querySelector('#tabelaRegistros tbody');
    tbody.innerHTML = '';

    if (!snapshot) return;

    snapshot.forEach(docSnap => {
        const venda = docSnap.data() || {};
        const itens = venda.itens || [];
        itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${venda.data?.seconds ? new Date(venda.data.seconds*1000).toLocaleDateString() : ''}</td>
                <td>${venda.clienteId || ''}</td>
                <td>${item.produtoNome || ''}</td>
                <td>${item.quantidade || 0}</td>
                <td>${item.precoUnit?.toFixed(2) || '0.00'}</td>
                <td>${item.desconto?.toFixed(2) || '0.00'}</td>
                <td>${(item.precoUnit*item.quantidade)?.toFixed(2) || '0.00'}</td>
                <td>${((item.precoUnit*item.quantidade)-item.desconto)?.toFixed(2) || '0.00'}</td>`;
            tbody.appendChild(tr);
        });
    });
}

// ==========================
// 🔹 PDF DE VENDA
// ==========================
function gerarReciboPDF(clienteId, itens, total, desconto, totalFinal) {
  const clienteNome = clienteSelectVenda.options[clienteSelectVenda.selectedIndex].text;
  const doc = new jsPDF.jsPDF();
  doc.text(`Recibo de Venda - ${new Date().toLocaleDateString()}`, 14, 10);
  doc.text(`Cliente: ${clienteNome}`, 14, 20);
  const rows = itens.map(i => [i.nome, i.quantidade, i.preco.toFixed(2), (i.quantidade * i.preco).toFixed(2)]);
  doc.autoTable({ head: [['Produto', 'Qtd', 'Preço', 'Subtotal']], body: rows, startY: 30 });
  doc.text(`Total: R$ ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
  doc.text(`Desconto: R$ ${desconto.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 20);
  doc.text(`Total Final: R$ ${totalFinal.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 30);
  doc.save("recibo_venda.pdf");
}


// desconto
function abrirModalDesconto(index = null, tipo = 'item') {
    if (itensVendaAtual.length === 0) return alert('Adicione produtos primeiro');
    const modal = document.getElementById('modalDesconto');
    document.getElementById('tituloModalDesconto').innerText = tipo === 'item' ? 'Desconto no item' : 'Desconto na venda';
    modal.style.display = 'block';

    document.getElementById('btnAplicarDesconto').onclick = () => {
        const tipoDesconto = document.getElementById('tipoDesconto').value;
        const valor = parseFloat(document.getElementById('valorDesconto').value) || 0;
        if (tipo === 'item' && index !== null) {
            itensVendaAtual[index].desconto = tipoDesconto === 'percentual'
                ? itensVendaAtual[index].precoUnit * itensVendaAtual[index].quantidade * valor / 100
                : valor;
        } else {
            itensVendaAtual.forEach(item => {
                item.desconto = tipoDesconto === 'percentual'
                    ? item.precoUnit * item.quantidade * valor / 100
                    : valor / itensVendaAtual.length;
            });
        }
        renderizarItensVenda();
        modal.style.display = 'none';
    };
}

// finalizar venda
async function finalizarVenda() {
    if (itensVendaAtual.length === 0) return alert('Adicione ao menos um item');
    const clienteId = clienteSelect.value;
    if (!clienteId) return alert('Selecione um cliente');
    await addDoc(vendasCol, { clienteId, itens: itensVendaAtual, data: serverTimestamp() });
    itensVendaAtual = [];
    renderizarItensVenda();
    alert('Venda registrada com sucesso!');
}

// orçamentos
function renderizarOrcamentos() {
    tabelaOrcamentos.innerHTML = '';
    itensOrcamentoAtual.forEach((item, index) => {
        const total = item.quantidade * item.precoUnit;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date().toLocaleDateString()}</td>
            <td>${item.clienteNome}</td>
            <td>${item.produtoNome}</td>
            <td>${item.quantidade}</td>
            <td>${item.precoUnit.toFixed(2)}</td>
            <td>${total.toFixed(2)}</td>
            <td><button onclick="removerItemOrcamento(${index})">Remover</button></td>`;
        tabelaOrcamentos.appendChild(tr);
    });
}

window.removerItemOrcamento = (index) => {
    itensOrcamentoAtual.splice(index, 1);
    renderizarOrcamentos();
};

// carregar orçamentos (da coleção 'orcamentos')
async function carregarOrcamentos() {
    const snapshot = await getDocs(collection(db, 'orcamentos'));
    const tbody = document.querySelector('#tabelaOrcamentos tbody');
    tbody.innerHTML = '';

    if (!snapshot) return;

    snapshot.forEach(docSnap => {
        const orcamento = docSnap.data() || {};
        const itens = orcamento.itens || [];
        itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${orcamento.data?.seconds ? new Date(orcamento.data.seconds*1000).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                <td>${item.clienteNome || ''}</td>
                <td>${item.produtoNome || ''}</td>
                <td>${item.quantidade || 0}</td>
                <td>${item.precoUnit?.toFixed(2) || '0.00'}</td>
                <td>${(item.quantidade*item.precoUnit)?.toFixed(2) || '0.00'}</td>`;
            tbody.appendChild(tr);
            });
    });
}

// ==========================
// 🔹 CARREGAR TABELA DE PREÇOS
// ==========================
async function carregarPrecos() {
    const snapshot = await getDocs(collection(db, 'produtos'));
    const tbody = document.querySelector('#tabelaPrecos tbody');
    const produtoSelectPreco = document.getElementById('produtoSelectPreco');

    tbody.innerHTML = '';
    produtoSelectPreco.innerHTML = '<option value="">Selecione o produto</option>';

    if (!snapshot) return;

    snapshot.forEach(docSnap => {
        const produto = docSnap.data() || {};

        // Cria linha da tabela de preços
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${produto.nome || ''}</td>
            <td>${produto.preco?.toFixed(2) || '0.00'}</td>
            <td>${produto.estampaFrente?.toFixed(2) || '0.00'}</td>
            <td>${produto.estampaFrenteVerso?.toFixed(2) || '0.00'}</td>
            <td>${produto.branca?.toFixed(2) || '0.00'}</td>
            <td>${produto.interiorCores?.toFixed(2) || '0.00'}</td>
            <td>${produto.magicaFosca?.toFixed(2) || '0.00'}</td>
            <td>${produto.magicaBrilho?.toFixed(2) || '0.00'}</td>
            <td>
                <button onclick="editarProduto('${docSnap.id}', '${produto.nome || ''}', ${produto.quantidade || 0})">Editar</button>
                <button onclick="excluirProduto('${docSnap.id}')">Excluir</button>
            </td>`;
        tbody.appendChild(tr);

        // Preenche o select de produtos
        produtoSelectPreco.innerHTML += `<option value="${docSnap.id}">${produto.nome || ''}</option>`;
    });
}

// gerar PDF de orçamentos (exemplo)
function gerarPdfOrcamento() {
    const doc = new jsPDF.jsPDF();
    doc.text(`Orçamento - ${new Date().toLocaleDateString()}`, 14, 10);
    const rows = itensOrcamentoAtual.map(item => [
        item.clienteNome, item.produtoNome, item.quantidade, item.precoUnit.toFixed(2), (item.quantidade * item.precoUnit).toFixed(2)
    ]);
    doc.autoTable({ head: [['Cliente', 'Produto', 'Qtd', 'Preço Unitário', 'Total']], body: rows, startY: 20 });
    doc.save('orcamento.pdf');
}

// exportar registros vendas
function exportarPDFRegistros() {
    const docPDF = new jsPDF.jsPDF();
    docPDF.text("Registros de Vendas", 14, 16);
    docPDF.autoTable({ html: '#tabelaRegistros', startY: 20 });
    docPDF.save('registros_vendas.pdf');
}

 // ==========================
// 🔹 INICIALIZAÇÃO
// ==========================
window.addEventListener('DOMContentLoaded', () => {
    mostrarSecao('clientes');
    carregarClientes();
    carregarEstoque();
    carregarOrcamentos();
    carregarRegistroVendas();
    carregarPrecos(); // <- tabela de preços
});
