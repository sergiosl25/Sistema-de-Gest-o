// script.js
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { jsPDF } from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";

// ==========================
// 🔹 FUNÇÕES GLOBAIS PARA HTML
// ==========================
window.mostrarSecao = function(secao) {
    document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
    const el = document.getElementById(secao);
    if (el) el.style.display = 'block';
}

window.logout = function() {
    // Aqui você pode implementar logout do Firebase Auth
    alert('Logout clicado!');
}

// ==========================
// 🔹 CLIENTES
// ==========================
const tabelaClientes = document.querySelector('#tabelaClientes tbody');
const btnCadastrarCliente = document.getElementById('btnCadastrarCliente');

async function carregarClientes() {
    tabelaClientes.innerHTML = '';
    const snapshot = await getDocs(collection(db, 'clientes'));
    snapshot.forEach(docSnap => {
        const cliente = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.telefone || ''}</td>
            <td>
                <button onclick="editarCliente('${docSnap.id}', '${cliente.nome}', '${cliente.telefone || ''}')">Editar</button>
                <button onclick="excluirCliente('${docSnap.id}')">Excluir</button>
            </td>
            `;
        tabelaClientes.appendChild(tr);
    });
}
window.editarCliente = async function(id, nome, telefone) {
    const novoNome = prompt("Nome:", nome);
    const novoTelefone = prompt("Telefone:", telefone);
    if (novoNome !== null) {
        const docRef = doc(db, "clientes", id);
        await updateDoc(docRef, { nome: novoNome, telefone: novoTelefone });
        carregarClientes();
    }
}
window.excluirCliente = async function(id) {
    if (confirm("Deseja realmente excluir?")) {
        await deleteDoc(doc(db, "clientes", id));
        carregarClientes();
    }
}
btnCadastrarCliente.addEventListener('click', async () => {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    if (!nome) return alert('Nome é obrigatório');
    await addDoc(collection(db, 'clientes'), { nome, telefone });
    document.getElementById('nomeCliente').value = '';
    document.getElementById('telefoneCliente').value = '';
    carregarClientes();
})

// ==========================
// 🔹 ESTOQUE
// ==========================
const tabelaEstoque = document.querySelector('#tabelaEstoque tbody');
const btnCadastrarProduto = document.getElementById('btnCadastrarProduto');

async function carregarEstoque() {
    tabelaEstoque.innerHTML = '';
    const snapshot = await getDocs(collection(db, 'produtos'));
    snapshot.forEach(docSnap => {
        const produto = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.quantidade || 0}</td>
            <td>
                <button onclick="editarProduto('${docSnap.id}', '${produto.nome}', ${produto.quantidade || 0})">Editar</button>
                <button onclick="excluirProduto('${docSnap.id}')">Excluir</button>
            </td>
        `;
        tabelaEstoque.appendChild(tr);
        });
}
window.editarProduto = async function(id, nome, quantidade) {
    const novoNome = prompt("Nome do produto:", nome);
    const novaQtd = parseInt(prompt("Quantidade:", quantidade));
    if (novoNome !== null && !isNaN(novaQtd)) {
        const docRef = doc(db, "produtos", id);
        await updateDoc(docRef, { nome: novoNome, quantidade: novaQtd });
        carregarEstoque();
    }
}
window.excluirProduto = async function(id) {
    if (confirm("Deseja realmente excluir o produto?")) {
        await deleteDoc(doc(db, "produtos", id));
        carregarEstoque();
    }
}
btnCadastrarProduto.addEventListener('click', async () => {
    const nome = document.getElementById('nomeProduto').value.trim();
    const quantidade = parseInt(document.getElementById('quantidadeProduto').value) || 0;
    if (!nome) return alert('Nome é obrigatório');
    await addDoc(collection(db, 'produtos'), { nome, quantidade });
    document.getElementById('nomeProduto').value = '';
    document.getElementById('quantidadeProduto').value = '';
    carregarEstoque();
});

// ================== 🔹 VENDAS ==================
const vendasCol = collection(db, 'vendas');
const tabelaItensVenda = document.querySelector('#tabelaItensVenda tbody');
let itensVendaAtual = [];

document.getElementById('btnAdicionarProdutoVenda').addEventListener('click', () => {
  const produtoId = produtoSelect.value;
  const clienteId = clienteSelect.value;
  const tipoPreco = document.getElementById('tipoPrecoSelect').value;
  const quantidade = parseInt(document.getElementById('quantidadeVenda').value) || 1;
  if (!produtoId || !clienteId || !tipoPreco) return alert('Preencha todos os campos');

  const produto = produtosMap[produtoId];
  let precoUnit = 0;
  switch(tipoPreco){
    case 'preco': precoUnit = produto.preco; break;
    case 'estampaFrente': precoUnit = produto.estampaFrente; break;
    case 'estampaFrenteVerso': precoUnit = produto.estampaFrenteVerso; break;
    case 'branca': precoUnit = produto.branca; break;
    case 'interiorCores': precoUnit = produto.interiorCores; break;
    case 'magicaFosca': precoUnit = produto.magicaFosca; break;
    case 'magicaBrilho': precoUnit = produto.magicaBrilho; break;
    case 'precoVenda': precoUnit = produto.preco; break;
  }

  itensVendaAtual.push({ produtoId, produtoNome: produto.nome, tipoPreco, quantidade, precoUnit, desconto:0 });
  renderizarItensVenda();
});

function renderizarItensVenda() {
  tabelaItensVenda.innerHTML = '';
  itensVendaAtual.forEach((item, index) => {
    const totalAntes = item.precoUnit * item.quantidade;
    const totalApos = totalAntes - item.desconto;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.produtoNome}</td>
      <td>${item.quantidade}</td>
      <td>${item.precoUnit.toFixed(2)}</td>
      <td>${item.desconto.toFixed(2)}</td>
      <td>${totalAntes.toFixed(2)}</td>
      <td>${totalApos.toFixed(2)}</td>
      <td>${totalApos.toFixed(2)}</td>
      <td><button onclick="removerItemVenda(${index})">Remover</button></td>
    `;
    tabelaItensVenda.appendChild(tr);
  });
}

window.removerItemVenda = (index) => {
  itensVendaAtual.splice(index, 1);
  renderizarItensVenda();
};

// ================== 🔹 DESCONTO ==================
document.getElementById('btnDesconto').addEventListener('click', () => {
  if(itensVendaAtual.length===0) return alert('Adicione produtos primeiro');
  const modal = document.getElementById('modalDesconto');
  modal.style.display = 'block';
  document.getElementById('tituloModalDesconto').innerText = 'Desconto no item';
  document.getElementById('btnAplicarDesconto').onclick = () => {
    const tipo = document.getElementById('tipoDesconto').value;
    const valor = parseFloat(document.getElementById('valorDesconto').value) || 0;
    itensVendaAtual[0].desconto = tipo==='percentual' ? itensVendaAtual[0].precoUnit*itensVendaAtual[0].quantidade*valor/100 : valor;
    renderizarItensVenda();
    modal.style.display='none';
  };
});

document.getElementById('btnDescontoVenda').addEventListener('click', () => {
  if(itensVendaAtual.length===0) return alert('Adicione produtos primeiro');
  const modal = document.getElementById('modalDesconto');
  modal.style.display = 'block';
  document.getElementById('tituloModalDesconto').innerText = 'Desconto na venda';
  document.getElementById('btnAplicarDesconto').onclick = () => {
    const tipo = document.getElementById('tipoDesconto').value;
    const valor = parseFloat(document.getElementById('valorDesconto').value) || 0;
    itensVendaAtual.forEach(item=>{
      item.desconto = tipo==='percentual' ? (item.precoUnit*item.quantidade*valor/100) : (valor/itemsVendaAtual.length);
    });
    renderizarItensVenda();
    modal.style.display='none';
  };
});

// ================== 🔹 FINALIZAR VENDA ==================
document.getElementById('btnVender').addEventListener('click', async () => {
  if(itensVendaAtual.length===0) return alert('Adicione ao menos um item');
  const clienteId = clienteSelect.value;
  await addDoc(vendasCol, { clienteId, itens: itensVendaAtual, data: serverTimestamp() });
  itensVendaAtual = [];
  renderizarItensVenda();
  alert('Venda registrada com sucesso!');
});

// ================== 🔹 ORÇAMENTOS ==================
const orcamentosCol = collection(db,'orcamentos');
const tabelaOrcamentos = document.querySelector('#tabelaOrcamentos tbody');
let itensOrcamentoAtual = [];

document.getElementById('btnAdicionarProduto').addEventListener('click', () => {
  const produtoId = produtoSelectOrcamento.value;
  const clienteNome = document.getElementById('clienteInputOrcamento').value.trim();
  const quantidade = parseInt(document.getElementById('quantidadeOrcamento').value) || 1;
  if(!produtoId || !clienteNome) return alert('Preencha todos os campos');
  const produto = produtosMap[produtoId];
  itensOrcamentoAtual.push({ produtoId, produtoNome: produto.nome, clienteNome, quantidade, precoUnit: produto.preco });
  renderizarOrcamentos();
});

function renderizarOrcamentos() {
  tabelaOrcamentos.innerHTML = '';
  itensOrcamentoAtual.forEach((item,index)=>{
    const total = item.quantidade*item.precoUnit;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date().toLocaleDateString()}</td>
      <td>${item.clienteNome}</td>
      <td>${item.produtoNome}</td>
      <td>${item.quantidade}</td>
      <td>${item.precoUnit.toFixed(2)}</td>
      <td>${total.toFixed(2)}</td>
      <td><button onclick="removerItemOrcamento(${index})">Remover</button></td>
    `;
    tabelaOrcamentos.appendChild(tr);
  });
}

window.removerItemOrcamento = (index)=>{
  itensOrcamentoAtual.splice(index,1);
  renderizarOrcamentos();
};

document.getElementById('btnGerarPDF').addEventListener('click',()=>{
  const doc = new jsPDF.jsPDF();
  const rows = itensOrcamentoAtual.map(item=>[
    item.clienteNome, item.produtoNome, item.quantidade, item.precoUnit.toFixed(2), (item.quantidade*item.precoUnit).toFixed(2)
  ]);
  doc.autoTable({ head:[['Cliente','Produto','Qtd','Preço Unitário','Total']], body: rows });
  doc.save('orcamento.pdf');
});

// ================== 🔹 MODAIS ==================
document.getElementById('btnCancelarEdicao').onclick = ()=>document.getElementById('modalEditar').style.display='none';
document.getElementById('btnCancelarDesconto').onclick = ()=>document.getElementById('modalDesconto').style.display='none';

// ==========================
// 🔹 EXPORTAR PDF REGISTROS
// ==========================
window.exportarPDF = function() {
    const docPDF = new jsPDF();
    docPDF.text("Registros de Vendas", 14, 16);
    docPDF.autoTable({ html: '#tabelaRegistros', startY: 20 });
    docPDF.save('registros_vendas.pdf');
}

// ================== 🔹 LOGOUT ==================
window.logout = ()=>alert('Implementar logout se usar Firebase Auth');

// ==========================
// 🔹 INICIALIZAÇÃO
// ==========================
window.addEventListener('DOMContentLoaded', () => {
    mostrarSecao('clientes');
    carregarClientes();
    carregarEstoque();
});
