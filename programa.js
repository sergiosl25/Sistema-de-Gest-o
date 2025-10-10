import { db, auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  getDocs,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
/* =========================
   Proteção de acesso
   ========================= */
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "login.html";
  else document.getElementById("userEmail").textContent = user.email;
});

// Logout
window.logout = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

// === Controle de Views (Clientes, Estoque, Vendas etc.) ===
window.mostrar = (viewId) => {
  // esconde todas as views
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  
  // mostra a view escolhida
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add("active");
  } else {
    console.warn(`⚠️ View "${viewId}" não encontrada.`);
  }
};


const clientesCol = collection(db, "clientes");
const estoqueCol = collection(db, "estoque"); // antes 'produtos'
const vendasCol = collection(db, "vendas");
const orcamentosCol = collection(db, "orcamentos");
const precosCol = collection(db, "precos")

/* =========================
   Estado local (cache)
   ========================= */
let clientes = [];
let produtos = [];
let vendas = [];
let orcamentos = [];
let precos = [];

let orcamentoAtual = {
  clienteNome: "",
  produtos: [],
  data: null
};

/* =========================
   Helpers / Elementos DOM
   ========================= */
// Navegação
// =======================
// Elementos (mesmos ids do HTML)
const tabelaClientes = document.querySelector("#tabelaClientes tbody");
const nomeCliente = document.getElementById("nomeCliente");
const telefoneCliente = document.getElementById("telefoneCliente");
const btnCadastrarCliente = document.getElementById("btnCadastrarCliente");
const clienteSelect = document.getElementById("clienteSelect");

const tabelaEstoque = document.querySelector("#tabelaEstoque tbody");
const nomeProduto = document.getElementById("nomeProduto");
const quantidadeProduto = document.getElementById("quantidadeProduto");
const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
const produtoSelect = document.getElementById("produtoSelect");
const produtoSelectOrcamento = document.getElementById("produtoSelectOrcamento");
const produtoSelectPreco = document.getElementById("produtoSelectPreco")

const quantidadeVenda = document.getElementById("quantidadeVenda");
const formaPagamento = document.getElementById("formaPagamento");
const btnVender = document.getElementById("btnVender");

const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");
const totalGeralRegistros = document.getElementById("totalGeralRegistros");

const tabelaOrcamento = document.querySelector("#tabelaOrcamento tbody");
const clienteInputOrcamento = document.getElementById("clienteInputOrcamento");
const produtoSelectOrc = document.getElementById("produtoSelectOrcamento");
const quantidadeOrcamento = document.getElementById("quantidadeOrcamento");
const btnAdicionarProduto = document.getElementById("btnAdicionarProduto");
const btnGerarPDF = document.getElementById("btnGerarPDF");
const tabelaOrcamentosSalvos = document.querySelector("#tabelaOrcamentosSalvos tbody");

const tabelaPrecos = document.querySelector("#tabelaPrecos tbody");
const btnNovaLinhaPreco = document.getElementById("btnNovaLinhaPreco");
const modalEditar = document.getElementById("modalEditar");
const modalEditarTitulo = document.getElementById("modalEditarTitulo");
const modalEditarNome = document.getElementById("modalEditarNome");
const modalEditarTelefone = document.getElementById("modalEditarTelefone");
const modalEditarQuantidade = document.getElementById("modalEditarQuantidade");
const modalEditarCompra = document.getElementById("modalEditarCompra");
const modalEditarVenda = document.getElementById("modalEditarVenda");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao")

const modalExcluir = document.getElementById("modalExcluir");
const btnConfirmarExcluir = document.getElementById("btnConfirmarExcluir");
const btnCancelarExcluir = document.getElementById("btnCancelarExcluir");

let itemEdicao = null;
let tipoEdicao = null;
let acaoExcluir = null;

/* =========================
   Helpers
   ========================= */
function sanitizeFileName(name){ return name ? name.replace(/[\/\\?%*:|"<>]/g,"_") : "cliente"; }
function money(val){ return Number(val||0).toFixed(2); }

/* =========================
   Real-time listeners (Firestore)
   =========================
   usamos onSnapshot para ter sincronização entre dispositivos
   ========================= */
onSnapshot(clientesCol, snapshot => {
  clientes = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderClientes();
});

onSnapshot(estoqueCol, snapshot => {
  produtos = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderEstoque();
  renderProdutoSelectOrcamento();
  renderProdutoSelectPreco();
});

onSnapshot(vendasCol, snapshot => {
  vendas = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderVendas();
});

onSnapshot(orcamentosCol, snapshot => {
  orcamentos = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderOrcamentosSalvos();
})

onSnapshot(precosCol, snapshot => {
  precos = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderTabelaPrecos();
});

/* =========================
   CLIENTES
   ========================= */
btnCadastrarCliente.onclick = async () => {
    const nome = nomeCliente.value.trim();
    if(!nome) return alert("Informe o nome do cliente");
    const telefone = telefoneCliente.value.trim();
    try{
    await addDoc(clientesCol, {nome, telefone});
    nomeCliente.value = telefoneCliente.value = "";
    // onSnapshot vai recarregar UI automaticamente
  } catch (err){ console.error(err); alert("Erro ao salvar cliente: " +err.message);}
};

function renderClientes(){
  tabelaClientes.innerHTML = "";
  clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";
  clientes.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.nome}</td>
      <td>${c.telefone || ""}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('cliente','${c.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirCliente('${c.id}'))">Excluir</button>
      </td>`;
    tabelaClientes.appendChild(tr);

    const opt = document.createElement("option");
    opt.value = c.id; opt.textContent = c.nome;
    clienteSelect.appendChild(opt);
  });
}

async function excluirCliente(id){
  try { 
    await deleteDoc(doc(db, "clientes", id));
    renderClientes(); 
  } 
  catch(err){ console.error(err); alert("Erro ao excluir cliente: " + err.message); }
}

/* =========================
   PRODUTOS
   ========================= */
btnCadastrarProduto.onclick = async () => {
    const nome = nomeProduto.value.trim();
    const quantidade = parseInt(quantidadeProduto.value) || 0;
     if(!nome) return alert("Informe nome do produto");
     try {
    const ref = await addDoc(estoqueCol, { nome, quantidade });
      await addDoc(precosCol, {
        produtoId: ref.id,
        produtoNome: nome,
        estampaFrente: 0,
        estampaFrenteVerso: 0,
        branca: 0,
        interiorCores: 0,
        magicaFosca: 0,
        magicaBrilho: 0
      });
    nomeProduto.value = quantidadeProduto.value = "";
  }catch(err){ console.error(err); alert("Erro ao cadastrar produto: "+err.message); }
};

function renderEstoque(){
  tabelaEstoque.innerHTML = "";
  produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";
   produtos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.nome}</td><td>${p.quantidade || 0}</td>
      <td>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirProduto('${p.id}'))">Excluir</button>
      </td>`;
    tabelaEstoque.appendChild(tr);

    const opt = document.createElement("option"); opt.value = p.id; opt.textContent = p.nome;
    produtoSelect.appendChild(opt);
  });
}

async function excluirProduto(id){
  try {
     const q = query(precosCol, where("produtoId","==",id));
    const snaps = await getDocs(q);
    for(const s of snaps.docs) await deleteDoc(doc(db, "precos", s.id));
    await deleteDoc(doc(db, "estoque", id));
    renderEstoque();
    renderProdutoSelectOrcamento();
    renderProdutoSelectPreco();
  } catch(err){ console.error(err); alert("Erro ao excluir produto: "+err.message); }
}

/* =========================
   VENDAS (com transação para atualizar estoque)
   ========================= */
btnVender.onclick = async () => {
    const clienteId = clienteSelect.value;
    const produtoId = produtoSelect.value;
    const qtd = parseInt(quantidadeVenda.value);
    if(!clienteId || !produtoId || !qtd || qtd <= 0) return alert("Preencha todos os campos corretamente");
    try{
    const produtoRef = doc(db, "estoque", produtoId);
    const clienteSnap = await getDoc(doc(db,"clientes",clienteId));
    const clienteNome = clienteSnap.exists()?clienteSnap.data().nome:"Cliente";

     await runTransaction(db,async tx=>{
      const produtoSnap = await tx.get(produtoRef);
      if(!produtoSnap.exists()) throw "Produto não encontrado";
      const estoqueAtual = produtoSnap.data().quantidade||0;
      if(estoqueAtual<qtd) throw "Estoque insuficiente";
      tx.update(produtoRef,{quantidade:estoqueAtual-qtd});
      tx.set(doc(vendasCol),{
        data:new Date().toLocaleString(),
        clienteId,cliente:clienteNome,
        produtoId, produto: produtoSnap.data().nome,
        quantidade:qtd, preco:0, total:0,
        pagamento:formaPagamento.value||"Não informado"
      });
    });
    quantidadeVenda.value="";
  }catch(err){ console.error(err); alert("Erro ao registrar venda: "+err);}
}

function renderVendas(){
  tabelaRegistros.innerHTML = "";
  let total = 0;
  vendas.forEach(v => {
    total += Number(v.total || 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${v.data}</td><td>${v.cliente}</td><td>${v.produto}</td><td>${v.quantidade}</td>
     <td>R$ ${money(v.preco)}</td><td>R$ ${money(v.total)}</td><td>${v.pagamento}</td>
      <td>
        <button class="acao-btn pdf" onclick="gerarRecibo('${v.id}')">Recibo</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirVenda('${v.id}'))">Excluir</button>
      </td>`;
    tabelaRegistros.appendChild(tr);
  });
  totalGeralRegistros.textContent = money(total);
}

async function excluirVenda(id){
  try{
    const vendaRef = doc(db,"vendas",id);
    const vendaSnap = await getDoc(vendaRef);
    if(!vendaSnap.exists()) return;
    const venda = vendaSnap.data();
    await runTransaction(db,async tx=>{
      const produtoRef = doc(db,"estoque",venda.produtoId);
      const produtoSnap = await tx.get(produtoRef);
      if(produtoSnap.exists()){
        const atual = produtoSnap.data().quantidade||0;
        tx.update(produtoRef,{quantidade:atual+(venda.quantidade||0)});
      }
      tx.delete(vendaRef);
    });
  }catch(err){ console.error(err); alert("Erro ao excluir venda: "+err);}
}


function gerarRecibo(vendaId) {
  const venda = vendas.find(v => v.id === vendaId);
  if (!venda) return alert("Venda não encontrada");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const imgLogo = new Image();
  imgLogo.src = "logo.png"; // ajuste o caminho se necessário

  imgLogo.onload = function () {
    // Adiciona a logo centralizada no topo
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 40;
    const logoHeight = 40;
    const logoX = (pageWidth - logoWidth) / 2; // centraliza

    doc.addImage(imgLogo, "PNG", logoX, 5, logoWidth, logoHeight);

    // Título
    doc.setFontSize(16);
    doc.text("Recibo de Venda", pageWidth / 2, 40, { align: "center" });

    // Subtítulo
    doc.setFontSize(12);
    doc.text("Alvespersonalizados", pageWidth / 2, 48, { align: "center" });

    // Dados da venda
    let y = 65;
    doc.setFontSize(12);
    doc.text(`Data: ${venda.data}`, 10, y); y += 10;
    doc.text(`Cliente: ${venda.cliente}`, 10, y); y += 10;
    doc.text(`Produto: ${venda.produto}`, 10, y); y += 10;
    doc.text(`Quantidade: ${venda.quantidade}`, 10, y); y += 10;
    doc.text(`Preço Unitário: R$ ${Number(venda.preco).toFixed(2)}`, 10, y); y += 10;
    doc.text(`Total: R$ ${Number(venda.total).toFixed(2)}`, 10, y); y += 10;
    doc.text(`Forma de Pagamento: ${venda.pagamento}`, 10, y); y += 10;

    // Rodapé
    doc.setFontSize(10);
    doc.text("Obrigado pela preferência!", pageWidth / 2, 280, { align: "center" });

    // Exibe o PDF
    doc.output("dataurlnewwindow");
  };

  // Se a logo falhar em carregar, ainda gera o PDF
  imgLogo.onerror = function () {
    console.warn("Logo não encontrada, gerando sem imagem.");
    doc.text("Recibo de Venda", 105, 20, { align: "center" });
    doc.output("dataurlnewwindow");
  };
}

/* =========================
   ORÇAMENTOS
   ========================= */
function renderProdutoSelectOrcamento(){
  produtoSelectOrcamento.innerHTML="<option value=''>Selecione o produto</option>";
  produtos.forEach(p=>{
    const opt = document.createElement("option"); opt.value=p.id; opt.textContent=p.nome;
    produtoSelectOrcamento.appendChild(opt);
  });
}

btnAdicionarProduto.onclick = () => {
 const produto = produtos.find(p=>p.id===produtoId);
if(!produto) return alert("Produto não encontrado");

// ✅ buscar preço atual do produto
let precoAtual = 0;
const precoDoc = precos.find(pr => pr.produtoId === produtoId);
if(precoDoc) precoAtual = precoDoc.estampaFrente || 0;

// atualizar orcamentoAtual
orcamentoAtual.produtos.push({
  produtoId,
  nome: produto.nome,
  quantidade: qtd,
  preco: precoAtual,
  total: precoAtual * qtd
});
}

function renderTabelaOrcamentoAtual(){
  tabelaOrcamento.innerHTML="";
  let total=0;
  orcamentoAtual.produtos.forEach((p,i)=>{
    total+=Number(p.total||0);
    const tr = document.createElement("tr");
    tr.innerHTML=`<td>${orcamentoAtual.data||"-"}</td><td>${orcamentoAtual.clienteNome||"-"}</td>
      <td>${p.nome}</td><td>${p.quantidade}</td>
      <td>R$ ${money(p.preco)}</td><td>R$ ${money(p.total)}</td>
      <td><button class="acao-btn excluir" onclick="removerProduto(${i})">Remover</button></td>`;
    tabelaOrcamento.appendChild(tr);
  });
}

function removerProduto(index){
  orcamentoAtual.produtos.splice(index,1);
  renderTabelaOrcamentoAtual();
}

btnGerarPDF.onclick = async () => {
  if (!orcamentoAtual.clienteNome || orcamentoAtual.produtos.length === 0) {
    return alert("Informe o nome do cliente e adicione produtos");
  }

  if (!orcamentoAtual.data) orcamentoAtual.data = new Date().toLocaleString();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const imgLogo = new Image();
  imgLogo.src = "logo.png"; // ajuste o caminho se necessário

  imgLogo.onload = function () {
    // Centraliza a logo no topo
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 40;
    const logoHeight = 40;
    const logoX = (pageWidth - logoWidth) / 2;

    doc.addImage(imgLogo, "PNG", logoX, 5, logoWidth, logoHeight);

    // Cabeçalho
    doc.setFontSize(16);
    doc.text("Orçamento", pageWidth / 2, 40, { align: "center" });

    // Dados principais
    let y = 55;
    doc.setFontSize(12);
    doc.text(`Data: ${orcamentoAtual.data}`, 10, y); y += 10;
    doc.text(`Cliente: ${orcamentoAtual.clienteNome}`, 10, y); y += 10;

    // Títulos das colunas
    doc.setFontSize(12);
    doc.text("Produto", 10, y);
    doc.text("Qtd", 90, y);
    doc.text("Preço Unit.", 120, y);
    doc.text("Total", 170, y);
    y += 8;
    doc.setLineWidth(0.3);
    doc.line(10, y, 200, y);
    y += 8;

    // Itens do orçamento
    let totalGeral = 0;
    orcamentoAtual.produtos.forEach(p => {
      doc.text(p.nome, 10, y);
      doc.text(String(p.quantidade), 90, y);
      doc.text("R$ " + p.preco.toFixed(2), 120, y);
      doc.text("R$ " + p.total.toFixed(2), 170, y);
      totalGeral += p.total;
      y += 10;

      // Nova página se ultrapassar o limite
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });

    // Total geral
    y += 5;
    doc.setLineWidth(0.3);
    doc.line(10, y, 200, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, 10, y);

    // Rodapé
    doc.setFontSize(10);
    doc.text("Obrigado pela preferência!", pageWidth / 2, 280, { align: "center" });

    // Salvar PDF
    doc.save(`orcamento_${sanitizeFileName(orcamentoAtual.clienteNome)}.pdf`);
  };

  // Caso a logo falhe ao carregar
  imgLogo.onerror = function () {
    console.warn("Logo não encontrada, gerando PDF sem imagem.");
    doc.text("Orçamento", 105, 20, { align: "center" });
    doc.save(`orcamento_${sanitizeFileName(orcamentoAtual.clienteNome)}.pdf`);
  };
};

btnNovaLinhaPreco.onclick = async () => {
  const prodId = produtoSelectPreco.value;
  const prod = produtos.find(p=>p.id===prodId);
  try{
    await addDoc(precosCol,{
      produtoId: prodId||null,
      produtoNome: prod?prod.nome:"Produto não informado",
      estampaFrente:0, estampaFrenteVerso:0, branca:0,
      interiorCores:0, magicaFosca:0, magicaBrilho:0
    });
  }catch(err){ console.error(err); alert("Erro ao adicionar linha de preço: "+err);}
}

function renderProdutoSelectPreco(){
  produtoSelectPreco.innerHTML="<option value=''>— Selecione produto —</option>";
  produtos.forEach(p=>{
    const opt=document.createElement("option"); opt.value=p.id; opt.textContent=p.nome;
    produtoSelectPreco.appendChild(opt);
  });
}

function renderTabelaPrecos(){
  function renderTabelaPrecos() {
  const tabelaBody = document.querySelector("#tabelaPrecos tbody");
  if (!tabelaBody) {
    console.warn("⚠️ Tabela de preços não encontrada no DOM ainda.");
    return;
  }
  }
  tabelaPrecos.innerHTML="";
  precos.forEach(p=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${p.produtoNome||""}</td>
      <td contenteditable data-field="estampaFrente">${p.estampaFrente||0}</td>
      <td contenteditable data-field="estampaFrenteVerso">${p.estampaFrenteVerso||0}</td>
      <td contenteditable data-field="branca">${p.branca||0}</td>
      <td contenteditable data-field="interiorCores">${p.interiorCores||0}</td>
      <td contenteditable data-field="magicaFosca">${p.magicaFosca||0}</td>
      <td contenteditable data-field="magicaBrilho">${p.magicaBrilho||0}</td>
      <td>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirPreco('${p.id}'))">Excluir</button>
      </td>`;
       tr.querySelectorAll("[contenteditable]").forEach(td=>{
      td.onblur = async ()=>{
        const num = parseFloat(td.textContent)||0;
        const field = td.dataset.field;
        await updateDoc(doc(db,"precos",p.id),{[field]:num});
      }
    });
    tabelaPrecos.appendChild(tr);
  });
}

async function excluirPreco(id){
  try{ await deleteDoc(doc(db,"precos",id)); }
  catch(err){ console.error(err); alert("Erro ao excluir preço: "+err);}
}

  // salvar no Firestore
  try {
    const copia = JSON.parse(JSON.stringify(orcamentoAtual));
    await addDoc(orcamentosCol, copia);
    // limpar
    orcamentoAtual = { clienteNome: "", produtos: [], data: null };
    renderTabelaOrcamentoAtual();
    clienteInputOrcamento.value = "";
    produtoSelectOrcamento.value = "";
    quantidadeOrcamento.value = "";
    // onSnapshot atualiza lista de orçamentos
  } catch(err){
    console.error(err);
    alert("Erro ao salvar orçamento: " + err.message);
  }

  window.abrirModal = (tipo,id)=>{
  tipoEdicao = tipo;
  itemEdicao = id;
  modalEditar.style.display="block";
  if(tipo==="cliente"){
    const c = clientes.find(x=>x.id===id);
    modalEditarTitulo.textContent="Editar Cliente";
    modalEditarNome.value=c.nome;
    modalEditarTelefone.value=c.telefone||"";
  }else if(tipo==="produto"){
    const p = produtos.find(x=>x.id===id);
    modalEditarTitulo.textContent="Editar Produto";
    modalEditarNome.value=p.nome;
    modalEditarQuantidade.value=p.quantidade||0;
  }
}

btnSalvarEdicao.onclick=async()=>{
  if(!itemEdicao) return;
  try{
    if(tipoEdicao==="cliente"){
      await updateDoc(doc(db,"clientes",itemEdicao),{
        nome:modalEditarNome.value.trim(),
        telefone:modalEditarTelefone.value.trim()
      });
    }else if(tipoEdicao==="produto"){
      await updateDoc(doc(db,"estoque",itemEdicao),{
        nome:modalEditarNome.value.trim(),
        quantidade:parseInt(modalEditarQuantidade.value)||0
      });
      // sincroniza nome no precos
      const q = query(precosCol,where("produtoId","==",itemEdicao));
      const snaps = await getDocs(q);
      for(const s of snaps.docs){
        await updateDoc(doc(db,"precos",s.id),{produtoNome:modalEditarNome.value.trim()});
      }
    }
    modalEditar.style.display="none";
  }catch(err){ console.error(err); alert("Erro ao salvar edição: "+err);}
}

btnCancelarEdicao.onclick=()=>{ modalEditar.style.display="none"; }

window.abrirModalExclusao=(acao)=>{
  acaoExcluir=acao;
  modalExcluir.style.display="block";
}
btnConfirmarExcluir.onclick=()=>{ if(acaoExcluir) acaoExcluir(); modalExcluir.style.display="none"; }
btnCancelarExcluir.onclick=()=>{ modalExcluir.style.display="none"; }

function renderOrcamentosSalvos(){
  tabelaOrcamentosSalvos.innerHTML="";
  orcamentos.forEach(o=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${o.data}</td><td>${o.clienteNome}</td>
      <td>${o.produtos.map(p=>p.nome).join(", ")}</td>
      <td><button class="acao-btn pdf" onclick="gerarOrcamentoPDF('${o.id}')">PDF</button></td>`;
    tabelaOrcamentosSalvos.appendChild(tr);
  });
}

function reimprimirOrcamento(orcId) {
  const orc = orcamentos.find(o => o.id === orcId);
  if (!orc) return alert("Orçamento não encontrado");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const imgLogo = new Image();
  imgLogo.src = "logo.png"; // ajuste o caminho se necessário

  imgLogo.onload = function () {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 40;
    const logoHeight = 40;
    const logoX = (pageWidth - logoWidth) / 2;

    // Logo centralizada
    doc.addImage(imgLogo, "PNG", logoX, 5, logoWidth, logoHeight);

    // Título
    doc.setFontSize(16);
    doc.text("Orçamento", pageWidth / 2, 40, { align: "center" });

    // Cabeçalho
    let y = 55;
    doc.setFontSize(12);
    doc.text(`Data: ${orc.data}`, 10, y); y += 10;
    doc.text(`Cliente: ${orc.clienteNome || "Cliente não informado"}`, 10, y); y += 10;

    // Títulos das colunas
    doc.setFontSize(12);
    doc.text("Produto", 10, y);
    doc.text("Qtd", 90, y);
    doc.text("Preço Unit.", 120, y);
    doc.text("Total", 170, y);
    y += 8;
    doc.setLineWidth(0.3);
    doc.line(10, y, 200, y);
    y += 8;

    // Itens do orçamento
    let totalGeral = 0;
    orc.produtos.forEach(p => {
      doc.text(p.nome, 10, y);
      doc.text(String(p.quantidade), 90, y);
      doc.text("R$ " + p.preco.toFixed(2), 120, y);
      doc.text("R$ " + p.total.toFixed(2), 170, y);
      totalGeral += p.total;
      y += 10;

      if (y > 260) { // quebra de página
        doc.addPage();
        y = 20;
      }
    });

    // Total e rodapé
    y += 5;
    doc.line(10, y, 200, y);
    y += 10;
    doc.text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, 10, y);
    doc.setFontSize(10);
    doc.text("Obrigado pela preferência!", pageWidth / 2, 280, { align: "center" });

    // Salvar PDF
    doc.save(`orcamento_${sanitizeFileName(orc.clienteNome || "cliente_desconhecido")}.pdf`);
  };

  imgLogo.onerror = function () {
    console.warn("Logo não encontrada — gerando PDF sem imagem.");
    doc.text("Orçamento", 105, 20, { align: "center" });
    doc.save(`orcamento_${sanitizeFileName(orc.clienteNome || "cliente_desconhecido")}.pdf`);
  };
}

window.gerarRecibo = async (id)=>{ console.log("PDF venda:",id); }
window.gerarOrcamentoPDF = async (id)=>{ console.log("PDF orcamento:",id);}
