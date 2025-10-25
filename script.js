// script.js
import { db } from './firebase-config.js';
import { 
  collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import jsPDF from 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
import 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js';

// ================== 🔹 UTILIDADES ==================
function mostrarSecao(secaoId) {
  document.querySelectorAll('.secao').forEach(secao => secao.style.display = 'none');
  const secao = document.getElementById(secaoId);
  if (secao) secao.style.display = 'block';
}

// ================== 🔹 CLIENTES ==================
const clientesCol = collection(db, 'clientes');
const tabelaClientes = document.querySelector('#tabelaClientes tbody');
const clienteSelect = document.getElementById('clienteSelect');
const btnCadastrarCliente = document.getElementById('btnCadastrarCliente');

btnCadastrarCliente.addEventListener('click', async () => {
  const nome = document.getElementById('nomeCliente').value.trim();
  const telefone = document.getElementById('telefoneCliente').value.trim();
  if (!nome) return alert('Nome é obrigatório');
  await addDoc(clientesCol, { nome, telefone });
  document.getElementById('nomeCliente').value = '';
  document.getElementById('telefoneCliente').value = '';
});

onSnapshot(clientesCol, snapshot => {
  tabelaClientes.innerHTML = '';
  clienteSelect.innerHTML = '<option value="">Selecione o cliente</option>';
  snapshot.forEach(docu => {
    const cliente = docu.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cliente.nome}</td>
      <td>${cliente.telefone}</td>
      <td>
        <button onclick="editarCliente('${docu.id}', '${cliente.nome}', '${cliente.telefone}')">Editar</button>
        <button onclick="excluirCliente('${docu.id}')">Excluir</button>
      </td>
    `;
    tabelaClientes.appendChild(tr);
    clienteSelect.innerHTML += `<option value="${docu.id}">${cliente.nome}</option>`;
  });
});

window.editarCliente = async (id, nome, telefone) => {
  const modal = document.getElementById('modalEditar');
  modal.style.display = 'block';
  document.getElementById('modalEditarTitulo').innerText = 'Editar Cliente';
  document.getElementById('modalEditarNome').value = nome;
  document.getElementById('modalEditarTelefone').value = telefone;
  document.getElementById('modalEditarQuantidade').style.display = 'none';
  document.getElementById('modalEditarPreco').style.display = 'none';

  document.getElementById('btnSalvarEdicao').onclick = async () => {
    const novoNome = document.getElementById('modalEditarNome').value.trim();
    const novoTelefone = document.getElementById('modalEditarTelefone').value.trim();
    if (!novoNome) return alert('Nome é obrigatório');
    await updateDoc(doc(clientesCol, id), { nome: novoNome, telefone: novoTelefone });
    modal.style.display = 'none';
  };
};

window.excluirCliente = (id) => {
  const modal = document.getElementById('modalExcluir');
  modal.style.display = 'block';
  document.getElementById('btnConfirmarExcluir').onclick = async () => {
    await deleteDoc(doc(clientesCol, id));
    modal.style.display = 'none';
  };
  document.getElementById('btnCancelarExcluir').onclick = () => modal.style.display = 'none';
};

// ================== 🔹 PRODUTOS / ESTOQUE ==================
const produtosCol = collection(db, 'produtos');
const tabelaEstoque = document.querySelector('#tabelaEstoque tbody');
const produtoSelect = document.getElementById('produtoSelect');
const produtoSelectOrcamento = document.getElementById('produtoSelectOrcamento');
const produtoSelectPreco = document.getElementById('produtoSelectPreco');
const btnCadastrarProduto = document.getElementById('btnCadastrarProduto');

btnCadastrarProduto.addEventListener('click', async () => {
  const nome = document.getElementById('nomeProduto').value.trim();
  const quantidade = parseInt(document.getElementById('quantidadeProduto').value) || 0;
  if (!nome) return alert('Nome do produto é obrigatório');
  await addDoc(produtosCol, { 
    nome, quantidade, preco: 0, estampaFrente: 0, estampaFrenteVerso:0, branca:0, interiorCores:0, magicaFosca:0, magicaBrilho:0 
  });
  document.getElementById('nomeProduto').value = '';
  document.getElementById('quantidadeProduto').value = '';
});

let produtosMap = {}; // Mapa para acesso rápido
onSnapshot(produtosCol, snapshot => {
  tabelaEstoque.innerHTML = '';
  produtoSelect.innerHTML = '<option value="">Selecione o produto</option>';
  produtoSelectOrcamento.innerHTML = '';
  produtoSelectPreco.innerHTML = '';
  produtosMap = {};

  snapshot.forEach(docu => {
    const produto = docu.data();
    produtosMap[docu.id] = { ...produto, id: docu.id };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>
        <button onclick="editarProduto('${docu.id}')">Editar</button>
        <button onclick="excluirProduto('${docu.id}')">Excluir</button>
      </td>
    `;
    tabelaEstoque.appendChild(tr);

    produtoSelect.innerHTML += `<option value="${docu.id}">${produto.nome}</option>`;
    produtoSelectOrcamento.innerHTML += `<option value="${docu.id}">${produto.nome}</option>`;
    produtoSelectPreco.innerHTML += `<option value="${docu.id}">${produto.nome}</option>`;
  });
});

window.editarProduto = async (id) => {
  const produto = produtosMap[id];
  const modal = document.getElementById('modalEditar');
  modal.style.display = 'block';
  document.getElementById('modalEditarTitulo').innerText = 'Editar Produto';
  document.getElementById('modalEditarNome').value = produto.nome;
  document.getElementById('modalEditarQuantidade').value = produto.quantidade;
  document.getElementById('modalEditarPreco').value = produto.preco;

  document.getElementById('modalEditarTelefone').style.display = 'none';
  document.getElementById('modalEditarQuantidade').style.display = 'block';
  document.getElementById('modalEditarPreco').style.display = 'block';

  document.getElementById('btnSalvarEdicao').onclick = async () => {
    const novoNome = document.getElementById('modalEditarNome').value.trim();
    const novaQtd = parseInt(document.getElementById('modalEditarQuantidade').value) || 0;
    const novoPreco = parseFloat(document.getElementById('modalEditarPreco').value) || 0;
    if (!novoNome) return alert('Nome obrigatório');
    await updateDoc(doc(produtosCol, id), { nome: novoNome, quantidade: novaQtd, preco: novoPreco });
    modal.style.display = 'none';
    document.getElementById('modalEditarTelefone').style.display = 'block';
  };
};

window.excluirProduto = (id) => {
  const modal = document.getElementById('modalExcluir');
  modal.style.display = 'block';
  document.getElementById('btnConfirmarExcluir').onclick = async () => {
    await deleteDoc(doc(produtosCol, id));
    modal.style.display = 'none';
  };
  document.getElementById('btnCancelarExcluir').onclick = () => modal.style.display = 'none';
};

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

// ================== 🔹 LOGOUT ==================
window.logout = ()=>alert('Implementar logout se usar Firebase Auth');

// ================== 🔹 INICIALIZAÇÃO ==================
mostrarSecao('clientes');
