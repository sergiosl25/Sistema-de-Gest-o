// ----------------------
// Variáveis iniciais
// ----------------------
let clientes = JSON.parse(localStorage.getItem("clientes")) || [];
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let vendas = JSON.parse(localStorage.getItem("vendas")) || [];

// ----------------------
// Navegação
// ----------------------
function mostrar(viewId){
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}
mostrar('vendas'); // view inicial

// ----------------------
// Elementos
// ----------------------
// Clientes
const tabelaClientes = document.querySelector("#tabelaClientes tbody");
const nomeCliente = document.getElementById("nomeCliente");
const telefoneCliente = document.getElementById("telefoneCliente");
const btnCadastrarCliente = document.getElementById("btnCadastrarCliente");
const clienteSelect = document.getElementById("clienteSelect");

// Produtos
const tabelaProdutos = document.querySelector("#tabelaProdutos tbody");
const nomeProduto = document.getElementById("nomeProduto");
const quantidadeProduto = document.getElementById("quantidadeProduto");
const valorCompraProduto = document.getElementById("valorCompraProduto");
const valorVendaProduto = document.getElementById("valorVendaProduto");
const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
const produtoSelect = document.getElementById("produtoSelect");
const totalCompraEl = document.getElementById("totalCompra");
const totalVendaEl = document.getElementById("totalVenda");

// Vendas
const tabelaVendas = document.querySelector("#tabelaVendas tbody");
const quantidadeVenda = document.getElementById("quantidadeVenda");
const formaPagamento = document.getElementById("formaPagamento");
const btnVender = document.getElementById("btnVender");
const totalGeralEl = document.getElementById("totalGeral");

// Registros
const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");
const totalGeralRegistros = document.getElementById("totalGeralRegistros");

// ----------------------
// Modal Edição
// ----------------------
const modalEditar = document.getElementById("modalEditar");
const modalEditarTitulo = document.getElementById("modalEditarTitulo");
const modalEditarNome = document.getElementById("modalEditarNome");
const modalEditarTelefone = document.getElementById("modalEditarTelefone");
const modalEditarQuantidade = document.getElementById("modalEditarQuantidade");
const modalEditarCompra = document.getElementById("modalEditarCompra");
const modalEditarVenda = document.getElementById("modalEditarVenda");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

let itemEdicao = null;
let tipoEdicao = null; // 'cliente' ou 'produto'

function abrirModal(tipo, id){
    tipoEdicao = tipo;
    itemEdicao = id;

    if(tipo==='cliente'){
        const c = clientes.find(c=>c.id===id);
        modalEditarTitulo.textContent = "Editar Cliente";
        modalEditarNome.value = c.nome;
        modalEditarTelefone.value = c.telefone;
        modalEditarQuantidade.style.display = 'none';
        modalEditarCompra.style.display = 'none';
        modalEditarVenda.style.display = 'none';
        modalEditarTelefone.style.display = 'block';
    } else {
        const p = produtos.find(p=>p.id===id);
        modalEditarTitulo.textContent = "Editar Produto";
        modalEditarNome.value = p.nome;
        modalEditarQuantidade.value = p.quantidade;
        modalEditarCompra.value = p.valorCompra;
        modalEditarVenda.value = p.valorVenda;
        modalEditarTelefone.style.display = 'none';
        modalEditarQuantidade.style.display = 'block';
        modalEditarCompra.style.display = 'block';
        modalEditarVenda.style.display = 'block';
    }
    modalEditar.style.display = 'block';
}

btnSalvarEdicao.onclick = () => {
    if(tipoEdicao==='cliente'){
        const c = clientes.find(c=>c.id===itemEdicao);
        if(!modalEditarNome.value.trim()) return alert("Nome obrigatório");
        c.nome = modalEditarNome.value.trim();
        c.telefone = modalEditarTelefone.value.trim();
        localStorage.setItem("clientes", JSON.stringify(clientes));
        carregarClientes();
        carregarProdutos();
    } else {
        const p = produtos.find(p=>p.id===itemEdicao);
        if(!modalEditarNome.value.trim()) return alert("Nome obrigatório");
        p.nome = modalEditarNome.value.trim();
        p.quantidade = parseInt(modalEditarQuantidade.value) || p.quantidade;
        p.valorCompra = parseFloat(modalEditarCompra.value) || p.valorCompra;
        p.valorVenda = parseFloat(modalEditarVenda.value) || p.valorVenda;
        localStorage.setItem("produtos", JSON.stringify(produtos));
        carregarProdutos();
    }
    modalEditar.style.display = 'none';
}

btnCancelarEdicao.onclick = () => modalEditar.style.display = 'none';

// ----------------------
// Modal Exclusão
// ----------------------
const modalExcluir = document.getElementById("modalExcluir");
const btnConfirmarExcluir = document.getElementById("btnConfirmarExcluir");
const btnCancelarExcluir = document.getElementById("btnCancelarExcluir");
let acaoExcluir = null;

function abrirModalExclusao(func){
    acaoExcluir = func;
    modalExcluir.style.display = 'block';
}

btnConfirmarExcluir.onclick = () => {
    if(acaoExcluir) acaoExcluir();
    modalExcluir.style.display = 'none';
}

btnCancelarExcluir.onclick = () => modalExcluir.style.display = 'none';

// ----------------------
// Clientes
// ----------------------
btnCadastrarCliente.onclick = () => {
    if(!nomeCliente.value.trim()) return alert("Informe o nome do cliente");

    let cliente = {
        id: crypto.randomUUID(),
        nome: nomeCliente.value.trim(),
        telefone: telefoneCliente.value.trim()
    };
    clientes.push(cliente);
    localStorage.setItem("clientes", JSON.stringify(clientes));
    carregarClientes();
    nomeCliente.value = telefoneCliente.value = "";
};

function carregarClientes(){
    tabelaClientes.innerHTML = "";
    clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";

    clientes.forEach((c,index)=>{
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${c.nome}</td>
            <td>${c.telefone}</td>
            <td>
                <button class="acao-btn" onclick="abrirModal('cliente','${c.id}')">Editar</button>
                <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirCliente('${c.id}'))">Excluir</button>
            </td>
        `;
        tabelaClientes.appendChild(tr);

        let option = document.createElement("option");
        option.value = index;
        option.textContent = c.nome;
        clienteSelect.appendChild(option);
    });
}

function excluirCliente(id){
    clientes = clientes.filter(c=>c.id!==id);
    localStorage.setItem("clientes", JSON.stringify(clientes));
    carregarClientes();
}

// ----------------------
// Produtos
// ----------------------
btnCadastrarProduto.onclick = () => {
    const nome = nomeProduto.value.trim();
    const quantidade = parseInt(quantidadeProduto.value);
    const valorCompra = parseFloat(valorCompraProduto.value);
    const valorVenda = parseFloat(valorVendaProduto.value);

    if(!nome || isNaN(quantidade) || isNaN(valorCompra) || isNaN(valorVenda)) return alert("Preencha todos os campos corretamente");

    let produto = {
        id: crypto.randomUUID(),
        nome,
        quantidade,
        valorCompra,
        valorVenda
    };

    produtos.push(produto);
    localStorage.setItem("produtos", JSON.stringify(produtos));
    carregarProdutos();
    nomeProduto.value = quantidadeProduto.value = valorCompraProduto.value = valorVendaProduto.value = "";
};

function carregarProdutos(){
    tabelaProdutos.innerHTML = "";
    produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";

    let totalCompra = 0;
    let totalVenda = 0;

    produtos.forEach((p,index)=>{
        totalCompra += p.quantidade*p.valorCompra;
        totalVenda += p.quantidade*p.valorVenda;

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.nome}</td>
            <td>${p.quantidade}</td>
            <td>R$ ${p.valorCompra.toFixed(2)}</td>
            <td>R$ ${p.valorVenda.toFixed(2)}</td>
            <td>
                <button class="acao-btn" onclick="abrirModal('produto','${p.id}')">Editar</button>
                <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirProduto('${p.id}'))">Excluir</button>
            </td>
        `;
        tabelaProdutos.appendChild(tr);

        let option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.nome} (Estoque: ${p.quantidade})`;
        produtoSelect.appendChild(option);
    });

    totalCompraEl.textContent = "R$ "+totalCompra.toFixed(2);
    totalVendaEl.textContent = "R$ "+totalVenda.toFixed(2);
}

function excluirProduto(id){
    produtos = produtos.filter(p=>p.id!==id);
    localStorage.setItem("produtos", JSON.stringify(produtos));
    carregarProdutos();
}

// ----------------------
// Vendas
// ----------------------
btnVender.onclick = () => {
    const clienteIndex = clienteSelect.value;
    const produtoId = produtoSelect.value;
    const qtd = parseInt(quantidadeVenda.value);

    if(clienteIndex==="" || !produtoId || qtd<=0) return alert("Preencha todos os campos corretamente");

    const produto = produtos.find(p=>p.id===produtoId);
    if(!produto || produto.quantidade<qtd) return alert("Estoque insuficiente");

    produto.quantidade -= qtd;

    let venda = {
        data: new Date().toLocaleString(),
        cliente: clientes[clienteIndex].nome,
        produtoId: produto.id,
        nome: produto.nome,
        qtd,
        preco: produto.valorVenda,
        total: produto.valorVenda*qtd,
        pagamento: formaPagamento.value
    };

    vendas.push(venda);
    localStorage.setItem("produtos", JSON.stringify(produtos));
    localStorage.setItem("vendas", JSON.stringify(vendas));

    quantidadeVenda.value = "";
    carregarProdutos();
    montarTabelaVendas();
    montarRegistrosVendas();
};

function montarTabelaVendas(){
    tabelaVendas.innerHTML = "";
    let totalGeral = 0;
    vendas.forEach(v=>{
        totalGeral += v.total;
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${v.data}</td>
            <td>${v.cliente}</td>
            <td>${v.nome}</td>
            <td>${v.qtd}</td>
            <td>R$ ${v.preco.toFixed(2)}</td>
            <td>R$ ${v.total.toFixed(2)}</td>
            <td>${v.pagamento}</td>
        `;
        tabelaVendas.appendChild(tr);
    });
    totalGeralEl.textContent = "R$ "+totalGeral.toFixed(2);
}

// ----------------------
// Registros de Vendas
// ----------------------
function montarRegistrosVendas(){
    tabelaRegistros.innerHTML = "";
    let totalGeral = 0;
    vendas.forEach((v,index)=>{
        totalGeral += v.total;
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${v.data}</td>
            <td>${v.cliente}</td>
            <td>${v.nome}</td>
            <td>${v.qtd}</td>
            <td>R$ ${v.preco.toFixed(2)}</td>
            <td>R$ ${v.total.toFixed(2)}</td>
            <td>${v.pagamento}</td>
            <td>
                <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirVenda(${index}))">Excluir</button>
            </td>
        `;
        tabelaRegistros.appendChild(tr);
    });
    totalGeralRegistros.textContent = "R$ "+totalGeral.toFixed(2);
}

function excluirVenda(index){
    let venda = vendas[index];
    let produto = produtos.find(p=>p.id===venda.produtoId);
    if(produto) produto.quantidade += venda.qtd;

    vendas.splice(index,1);
    localStorage.setItem("vendas", JSON.stringify(vendas));
    localStorage.setItem("produtos", JSON.stringify(produtos));

    montarRegistrosVendas();
    montarTabelaVendas();
    carregarProdutos();
}

// Atualiza registros ao clicar na aba
document.querySelector("button[onclick=\"mostrar('registrosVendas')\"]")
    .addEventListener('click', montarRegistrosVendas);

// ----------------------
// Exportar PDF
// ----------------------
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
        doc.text(v.nome,80,y);
        doc.text(String(v.qtd),120,y);
        doc.text("R$ "+v.preco.toFixed(2),140,y);
        doc.text("R$ "+v.total.toFixed(2),160,y);
        doc.text(v.pagamento,180,y);
        y+=8;
        if(y>270){doc.addPage();y=20;}
    });

    y+=10;
    doc.setFontSize(14);
    doc.text("Total Geral: R$ "+totalGeral.toFixed(2),10,y);
    doc.save("relatorio_vendas.pdf");
}

// ----------------------
// Inicialização
// ----------------------
carregarClientes();
carregarProdutos();
montarTabelaVendas();
montarRegistrosVendas();
