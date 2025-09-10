// ----------------------
// Firestore
// ----------------------
import { 
    collection, addDoc, getDocs, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const dbClientes = collection(db, "clientes");
const dbProdutos = collection(db, "produtos");
const dbVendas = collection(db, "vendas");

// ----------------------
// Navegação
// ----------------------
function mostrar(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}
document.getElementById("btnMenuClientes").addEventListener("click", () => mostrar('clientes'));
document.getElementById("btnMenuProdutos").addEventListener("click", () => mostrar('produtos'));
document.getElementById("btnMenuVendas").addEventListener("click", () => mostrar('vendas'));
document.getElementById("btnMenuRegistros").addEventListener("click", () => { 
    mostrar('registrosVendas'); 
    carregarVendas();
});

// ----------------------
// Elementos
// ----------------------
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

const tabelaVendas = document.querySelector("#tabelaVendas tbody");
const quantidadeVenda = document.getElementById("quantidadeVenda");
const formaPagamento = document.getElementById("formaPagamento");
const btnVender = document.getElementById("btnVender");
const totalGeralEl = document.getElementById("totalGeral");

const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");
const totalGeralRegistros = document.getElementById("totalGeralRegistros");

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

const btnExportarRelatorio = document.getElementById("btnExportarRelatorio");

// ----------------------
// Variáveis de edição/exclusão
// ----------------------
let tipoEdicao = null; // 'cliente' ou 'produto'
let itemEdicaoId = null;
let acaoExcluir = null;

// ----------------------
// Funções auxiliares modais
// ----------------------
function abrirModalEditar(tipo, id, dados){
    tipoEdicao = tipo;
    itemEdicaoId = id;
    modalEditar.style.display = "block";

    if(tipo === "cliente"){
        modalEditarTitulo.textContent = "Editar Cliente";
        modalEditarNome.value = dados.nome;
        modalEditarTelefone.value = dados.telefone;
        modalEditarQuantidade.style.display = "none";
        modalEditarCompra.style.display = "none";
        modalEditarVenda.style.display = "none";
        modalEditarTelefone.style.display = "block";
    } else {
        modalEditarTitulo.textContent = "Editar Produto";
        modalEditarNome.value = dados.nome;
        modalEditarQuantidade.value = dados.quantidade;
        modalEditarCompra.value = dados.valorCompra;
        modalEditarVenda.value = dados.valorVenda;
        modalEditarTelefone.style.display = "none";
        modalEditarQuantidade.style.display = "block";
        modalEditarCompra.style.display = "block";
        modalEditarVenda.style.display = "block";
    }
}

function abrirModalExcluir(func){
    acaoExcluir = func;
    modalExcluir.style.display = "block";
}

// ----------------------
// Clientes
// ----------------------
async function carregarClientes(){
    tabelaClientes.innerHTML = "";
    clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";

    const snapshot = await getDocs(dbClientes);
    snapshot.forEach(c => {
        const data = c.data();
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.nome}</td>
            <td>${data.telefone || ""}</td>
            <td>
                <button class="acao-btn" onclick='abrirModalEditar("cliente","${c.id}",${JSON.stringify(data)})'>Editar</button>
                <button class="acao-btn excluir" onclick='abrirModalExcluir(async()=>{ await excluirCliente("${c.id}")})'>Excluir</button>
            </td>
        `;
        tabelaClientes.appendChild(tr);

        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = data.nome;
        clienteSelect.appendChild(option);
    });
}

btnCadastrarCliente.addEventListener("click", async ()=>{
    if(!nomeCliente.value.trim()) return alert("Informe o nome do cliente");
    await addDoc(dbClientes, { nome: nomeCliente.value.trim(), telefone: telefoneCliente.value.trim() });
    nomeCliente.value = telefoneCliente.value = "";
    carregarClientes();
});

async function excluirCliente(id){
    await deleteDoc(doc(db,"clientes",id));
    carregarClientes();
}

btnSalvarEdicao.addEventListener("click", async ()=>{
    if(!modalEditarNome.value.trim()) return alert("Nome obrigatório");
    if(tipoEdicao === "cliente"){
        await updateDoc(doc(db,"clientes",itemEdicaoId),{
            nome: modalEditarNome.value.trim(),
            telefone: modalEditarTelefone.value.trim()
        });
        carregarClientes();
    } else {
        await updateDoc(doc(db,"produtos",itemEdicaoId),{
            nome: modalEditarNome.value.trim(),
            quantidade: parseInt(modalEditarQuantidade.value),
            valorCompra: parseFloat(modalEditarCompra.value),
            valorVenda: parseFloat(modalEditarVenda.value)
        });
        carregarProdutos();
    }
    modalEditar.style.display = "none";
});

btnCancelarEdicao.addEventListener("click", ()=> modalEditar.style.display="none");
btnCancelarExcluir.addEventListener("click", ()=> modalExcluir.style.display="none");
btnConfirmarExcluir.addEventListener("click", async ()=>{
    if(acaoExcluir) await acaoExcluir();
    modalExcluir.style.display = "none";
});

// ----------------------
// Produtos
// ----------------------
async function carregarProdutos(){
    tabelaProdutos.innerHTML = "";
    produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";
    let totalCompra=0, totalVenda=0;

    const snapshot = await getDocs(dbProdutos);
    snapshot.forEach(p=>{
        const data = p.data();
        totalCompra += data.quantidade*data.valorCompra;
        totalVenda += data.quantidade*data.valorVenda;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.nome}</td>
            <td>${data.quantidade}</td>
            <td>R$ ${data.valorCompra.toFixed(2)}</td>
            <td>R$ ${data.valorVenda.toFixed(2)}</td>
            <td>
                <button class="acao-btn" onclick='abrirModalEditar("produto","${p.id}",${JSON.stringify(data)})'>Editar</button>
                <button class="acao-btn excluir" onclick='abrirModalExcluir(async()=>{ await excluirProduto("${p.id}")})'>Excluir</button>
            </td>
        `;
        tabelaProdutos.appendChild(tr);

        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${data.nome} (Estoque: ${data.quantidade})`;
        produtoSelect.appendChild(option);
    });

    totalCompraEl.textContent = "R$ "+totalCompra.toFixed(2);
    totalVendaEl.textContent = "R$ "+totalVenda.toFixed(2);
}

btnCadastrarProduto.addEventListener("click", async ()=>{
    const nome = nomeProduto.value.trim();
    const quantidade = parseInt(quantidadeProduto.value);
    const valorCompra = parseFloat(valorCompraProduto.value);
    const valorVenda = parseFloat(valorVendaProduto.value);
    if(!nome || isNaN(quantidade) || isNaN(valorCompra) || isNaN(valorVenda)) return alert("Preencha todos os campos corretamente");

    await addDoc(dbProdutos,{nome,quantidade,valorCompra,valorVenda});
    nomeProduto.value=quantidadeProduto.value=valorCompraProduto.value=valorVendaProduto.value="";
    carregarProdutos();
});

async function excluirProduto(id){
    await deleteDoc(doc(db,"produtos",id));
    carregarProdutos();
}

// ----------------------
// Vendas
// ----------------------
btnVender.addEventListener("click", async ()=>{
    const clienteId = clienteSelect.value;
    const produtoId = produtoSelect.value;
    const qtd = parseInt(quantidadeVenda.value);
    if(!clienteId || !produtoId || isNaN(qtd)||qtd<=0) return alert("Preencha todos os campos corretamente");

    // Buscar produto
    const produtoSnap = await getDocs(dbProdutos);
    const produtoDoc = produtoSnap.docs.find(p=>p.id===produtoId);
    const produtoData = produtoDoc.data();
    if(produtoData.quantidade<qtd) return alert("Estoque insuficiente");

    // Atualizar estoque
    await updateDoc(doc(db,"produtos",produtoId),{ quantidade: produtoData.quantidade - qtd });

    // Buscar cliente
    const clienteSnap = await getDocs(dbClientes);
    const clienteData = clienteSnap.docs.find(c=>c.id===clienteId).data();

    // Adicionar venda
    await addDoc(dbVendas,{
        data: new Date().toLocaleString(),
        cliente: clienteData.nome,
        produto: produtoData.nome,
        produtoId,
        quantidade: qtd,
        preco: produtoData.valorVenda,
        total: produtoData.valorVenda*qtd,
        pagamento: formaPagamento.value
    });

    quantidadeVenda.value="";
    carregarProdutos();
    carregarVendas();
});

// ----------------------
// Carregar Vendas
// ----------------------
async function carregarVendas(){
    tabelaVendas.innerHTML="";
    tabelaRegistros.innerHTML="";
    let totalGeral=0;

    const snapshot = await getDocs(dbVendas);
    snapshot.forEach(v=>{
        const data = v.data();
        totalGeral += data.total;

        // Vendas
        const trVenda = document.createElement("tr");
        trVenda.innerHTML=`
            <td>${data.data}</td>
            <td>${data.cliente}</td>
            <td>${data.produto}</td>
            <td>${data.quantidade}</td>
            <td>R$ ${data.preco.toFixed(2)}</td>
            <td>R$ ${data.total.toFixed(2)}</td>
            <td>${data.pagamento}</td>
            <td>
                <button class="acao-btn" onclick="gerarRecibo(${JSON.stringify(data)})">Recibo</button>
            </td>
        `;
        tabelaVendas.appendChild(trVenda);

        // Registros
        const trRegistro = trVenda.cloneNode(true);
        const btnExcluir = document.createElement("button");
        btnExcluir.textContent="Excluir";
        btnExcluir.className="acao-btn excluir";
        btnExcluir.onclick=async()=>{
            // Restaurar estoque
            const produtoSnap = await getDocs(dbProdutos);
            const produtoDoc = produtoSnap.docs.find(p=>p.id===data.produtoId);
            await updateDoc(doc(db,"produtos",data.produtoId),{ quantidade: produtoDoc.data().quantidade + data.quantidade });

            // Deletar venda
            await deleteDoc(doc(db,"vendas",v.id));
            carregarVendas();
        }
        trRegistro.appendChild(btnExcluir);
        tabelaRegistros.appendChild(trRegistro);
    });

    totalGeralEl.textContent="R$ "+totalGeral.toFixed(2);
    totalGeralRegistros.textContent="R$ "+totalGeral.toFixed(2);
}

// ----------------------
// Gerar Recibo
// ----------------------
function gerarRecibo(venda){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Recibo de Venda",105,20,{align:"center"});
    doc.text("Alvespersonalizados",105,30,{align:"center"});
    let y=50;
    doc.setFontSize(12);
    doc.text(`Data: ${venda.data}`,10,y); y+=10;
    doc.text(`Cliente: ${venda.cliente}`,10,y); y+=10;
    doc.text(`Produto: ${venda.produto}`,10,y); y+=10;
    doc.text(`Quantidade: ${venda.quantidade}`,10,y); y+=10;
    doc.text(`Preço Unitário: R$ ${venda.preco.toFixed(2)}`,10,y); y+=10;
    doc.text(`Total: R$ ${venda.total.toFixed(2)}`,10,y); y+=10;
    doc.text(`Pagamento: ${venda.pagamento}`,10,y);
    doc.setFontSize(10);
    doc.text("Obrigado pela preferência!",105,280,{align:"center"});
    doc.output("dataurlnewwindow");
}

// ----------------------
// Exportar PDF Relatório
// ----------------------
btnExportarRelatorio.addEventListener("click", async ()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Vendas",10,15);
    let y=25,totalGeral=0;

    const snapshot = await getDocs(dbVendas);
    doc.setFontSize(8);
    doc.text("Data",8,y); doc.text("Cliente",40,y); doc.text("Produto",80,y);
    doc.text("Qtd",120,y); doc.text("Preço",140,y); doc.text("Total",160,y); doc.text("Pagamento",180,y);
    y+=8;

    snapshot.forEach(v=>{
        const data=v.data();
        totalGeral+=data.total;
        doc.text(data.data,10,y);
        doc.text(data.cliente,40,y);
        doc.text(data.produto,80,y);
        doc.text(String(data.quantidade),120,y);
        doc.text("R$ "+data.preco.toFixed(2),140,y);
        doc.text("R$ "+data.total.toFixed(2),160,y);
        doc.text(data.pagamento,180,y);
        y+=8;
        if(y>270){doc.addPage(); y=20;}
    });

    y+=10; doc.setFontSize(14);
    doc.text("Total Geral: R$ "+totalGeral.toFixed(2),10,y);
    doc.save("relatorio_vendas.pdf");
});

// ----------------------
// Inicialização
// ----------------------
carregarClientes();
carregarProdutos();
carregarVendas();
