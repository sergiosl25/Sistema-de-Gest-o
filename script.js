// script.js
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ✅ UMD jsPDF compatível com navegador
import * as jsPDF from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const auth = getAuth();

// As variáveis de DOM e coleções serão inicializadas dentro do DOMContentLoaded
let produtosMap = {};
let itensVendaAtual = [];
let itensOrcamentoAtual = [];

// Elementos DOM - serão atribuídos no DOMContentLoaded
let produtoSelect, clienteSelect, produtoSelectOrcamento;
let tabelaClientes, tabelaEstoque, tabelaItensVenda, tabelaOrcamentos, tabelaRegistros, tabelaPrecos;

const vendasCol = collection(db, 'vendas');
const orcamentosCol = collection(db,'orcamentos');
const produtosCol = collection(db, 'produtos');
const clientesCol = collection(db, 'clientes');

// --------------------
// Funções (definidas fora do DOMContentLoaded para organização)
// --------------------
async function carregarClientes() {
    tabelaClientes.innerHTML = '';
    clienteSelect.innerHTML = '<option value="">Selecione...</option>';
    const snapshot = await getDocs(clientesCol);
    snapshot.forEach(docSnap => {
        const cliente = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.telefone || ''}</td>
            <td>
                <button onclick="editarCliente('${docSnap.id}', '${cliente.nome}', '${cliente.telefone || ''}')">Editar</button>
                <button onclick="excluirCliente('${docSnap.id}')">Excluir</button>
            </td>`;
        tabelaClientes.appendChild(tr);
        clienteSelect.innerHTML += `<option value="${docSnap.id}">${cliente.nome}</option>`;
    });
}

window.editarCliente = async (id, nome, telefone) => {
    const novoNome = prompt("Nome:", nome);
    const novoTelefone = prompt("Telefone:", telefone);
    if (novoNome !== null) {
        await updateDoc(doc(db, "clientes", id), { nome: novoNome, telefone: novoTelefone });
        await carregarClientes();
    }
}

window.excluirCliente = async (id) => {
    if (confirm("Deseja realmente excluir?")) {
        await deleteDoc(doc(db, "clientes", id));
        await carregarClientes();
    }
}

// estoque / produtos
async function carregarEstoque() {
    tabelaEstoque.innerHTML = '';
    produtoSelect.innerHTML = '<option value="">Selecione...</option>';
    produtoSelectOrcamento.innerHTML = '<option value="">Selecione...</option>';
    produtosMap = {};
    const snapshot = await getDocs(produtosCol);
    snapshot.forEach(docSnap => {
        const produto = docSnap.data();
        produtosMap[docSnap.id] = produto;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.quantidade || 0}</td>
            <td>
                <button onclick="editarProduto('${docSnap.id}', '${produto.nome}', ${produto.quantidade || 0})">Editar</button>
                <button onclick="excluirProduto('${docSnap.id}')">Excluir</button>
            </td>`;
        tabelaEstoque.appendChild(tr);

        produtoSelect.innerHTML += `<option value="${docSnap.id}">${produto.nome}</option>`;
        produtoSelectOrcamento.innerHTML += `<option value="${docSnap.id}">${produto.nome}</option>`;
    });
}

window.editarProduto = async (id, nome, quantidade) => {
    const novoNome = prompt("Nome do produto:", nome);
    const novaQtd = parseInt(prompt("Quantidade:", quantidade));
    if (novoNome !== null && !isNaN(novaQtd)) {
        await updateDoc(doc(db, "produtos", id), { nome: novoNome, quantidade: novaQtd });
        await carregarEstoque();
    }
}

window.excluirProduto = async (id) => {
    if (confirm("Deseja realmente excluir o produto?")) {
        await deleteDoc(doc(db, "produtos", id));
        await carregarEstoque();
    }
}

// vendas
function renderizarItensVenda() {
    tabelaItensVenda.innerHTML = '';
    itensVendaAtual.forEach((item, index) => {
        const totalAntes = item.precoUnit * item.quantidade;
        const totalApos = totalAntes - (item.desconto || 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.produtoNome}</td>
            <td>${item.quantidade}</td>
            <td>${item.precoUnit.toFixed(2)}</td>
            <td>${(item.desconto || 0).toFixed(2)}</td>
            <td>${totalAntes.toFixed(2)}</td>
            <td>${totalApos.toFixed(2)}</td>
            <td><button onclick="removerItemVenda(${index})">Remover</button></td>`;
        tabelaItensVenda.appendChild(tr);
    });
}

window.removerItemVenda = (index) => {
    itensVendaAtual.splice(index, 1);
    renderizarItensVenda();
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
    tabelaOrcamentos.innerHTML = '';
    const snapshot = await getDocs(orcamentosCol);
    snapshot.forEach(docSnap => {
        const dados = docSnap.data();
        // Caso o documento seja estruturado com itens, você pode adaptar aqui.
        // Exemplo simples: mostrar cliente e total se tiver
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(dados?.data?.toDate?.() || Date.now()).toLocaleDateString()}</td>
            <td>${dados.clienteNome || '-'}</td>
            <td colspan="4">Itens: ${dados.itens ? dados.itens.length : 0}</td>
        `;
        tabelaOrcamentos.appendChild(tr);
    });
}

// carregar registro de vendas
async function carregarRegistroVendas() {
    tabelaRegistros.innerHTML = '';
    const snapshot = await getDocs(vendasCol);
    snapshot.forEach(docSnap => {
        const venda = docSnap.data();
        const tr = document.createElement('tr');
        const clienteId = venda.clienteId || '';
        const dataStr = venda.data && venda.data.toDate ? venda.data.toDate().toLocaleString() : '-';
        tr.innerHTML = `
            <td>${docSnap.id}</td>
            <td>${clienteId}</td>
            <td>${(venda.itens || []).length}</td>
            <td>${dataStr}</td>
        `;
        tabelaRegistros.appendChild(tr);
    });
}

// carregar tabela de preços (exemplo)
async function carregarPrecos() {
    tabelaPrecos.innerHTML = '';
    const snapshot = await getDocs(produtosCol);
    snapshot.forEach(docSnap => {
        const p = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.nome}</td>
            <td>${(p.preco || 0).toFixed(2)}</td>
            <td>${(p.estampaFrente || '-')}</td>
        `;
        tabelaPrecos.appendChild(tr);
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

// --------------------
// Inicialização: DOMContentLoaded
// --------------------
window.addEventListener('DOMContentLoaded', () => {
    // atribuir elementos DOM (certifica que existem)
    produtoSelect = document.getElementById('produtoSelect');
    clienteSelect = document.getElementById('clienteSelect');
    produtoSelectOrcamento = document.getElementById('produtoSelectOrcamento');

    tabelaClientes = document.querySelector('#tabelaClientes tbody');
    tabelaEstoque = document.querySelector('#tabelaEstoque tbody');
    tabelaItensVenda = document.querySelector('#tabelaItensVenda tbody');
    tabelaOrcamentos = document.querySelector('#tabelaOrcamentos tbody');
    tabelaRegistros = document.querySelector('#tabelaRegistros tbody');
    tabelaPrecos = document.querySelector('#tabelaPrecos tbody');

    // listeners que usam elementos do DOM
    document.getElementById('btnCadastrarCliente')?.addEventListener('click', async () => {
        const nome = document.getElementById('nomeCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();
        if (!nome) return alert('Nome é obrigatório');
        await addDoc(collection(db, 'clientes'), { nome, telefone });
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        carregarClientes();
    });

    document.getElementById('btnCadastrarProduto')?.addEventListener('click', async () => {
        const nome = document.getElementById('nomeProduto').value.trim();
        const quantidade = parseInt(document.getElementById('quantidadeProduto').value) || 0;
        if (!nome) return alert('Nome é obrigatório');
        await addDoc(collection(db, 'produtos'), { nome, quantidade });
        document.getElementById('nomeProduto').value = '';
        document.getElementById('quantidadeProduto').value = '';
        carregarEstoque();
    });

    document.getElementById('btnAdicionarProdutoVenda')?.addEventListener('click', () => {
        const produtoId = produtoSelect.value;
        const clienteId = clienteSelect.value;
        const tipoPreco = document.getElementById('tipoPrecoSelect').value;
        const quantidade = parseInt(document.getElementById('quantidadeVenda').value) || 1;
        if (!produtoId || !clienteId || !tipoPreco) return alert('Preencha todos os campos');

        const produto = produtosMap[produtoId];
        let precoUnit = produto[tipoPreco] || produto.preco || 0;

        itensVendaAtual.push({ produtoId, produtoNome: produto.nome, tipoPreco, quantidade, precoUnit, desconto: 0 });
        renderizarItensVenda();
    });

    document.getElementById('btnDesconto')?.addEventListener('click', () => abrirModalDesconto(0,'item'));
    document.getElementById('btnDescontoVenda')?.addEventListener('click', () => abrirModalDesconto(null,'venda'));
    document.getElementById('btnVender')?.addEventListener('click', finalizarVenda);
    document.getElementById('btnAdicionarProduto')?.addEventListener('click', () => {
        const produtoId = produtoSelectOrcamento.value;
        const clienteNome = document.getElementById('clienteInputOrcamento').value.trim();
        const quantidade = parseInt(document.getElementById('quantidadeOrcamento').value) || 1;
        if (!produtoId || !clienteNome) return alert('Preencha todos os campos');
        const produto = produtosMap[produtoId];
        itensOrcamentoAtual.push({ produtoId, produtoNome: produto.nome, clienteNome, quantidade, precoUnit: produto.preco || 0 });
        renderizarOrcamentos();
    });
    document.getElementById('btnGerarPDF')?.addEventListener('click', gerarPdfOrcamento);
    document.getElementById('btnExportarRegistros')?.addEventListener('click', exportarPDFRegistros);

    // Auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário logado, inicializa app
            document.getElementById('tela-login')?.classList.add('hidden');
            document.getElementById('app')?.classList.remove('hidden');
            carregarClientes();
            carregarEstoque();
            carregarOrcamentos();
            carregarRegistroVendas();
            carregarPrecos();
            mostrarSecao('clientes');
        } else {
            // Usuário não logado: mostrar tela de login (assuma que exista)
            document.getElementById('tela-login')?.classList.remove('hidden');
            document.getElementById('app')?.classList.add('hidden');
            console.warn('Nenhum usuário autenticado.');
        }
    });

    // Logout (usa signOut)
    window.logout = async () => {
        try {
            await signOut(auth);
            alert('Logout realizado!');
            window.location.reload();
        } catch (err) {
            console.error('Erro ao deslogar:', err);
            alert('Erro ao deslogar: ' + err.message);
        }
    };

    // mostrar seção inicial
    mostrarSecao('clientes');
});
