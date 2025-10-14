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

window.mostrar = function (secaoId) {
  document.querySelectorAll(".view").forEach(view => view.style.display = "none");
  document.getElementById(secaoId).style.display = "block";
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
const tipoPrecoSelect = document.getElementById("tipoPrecoSelect");
const precoVenda = document.getElementById("precoVenda");
const produtoSelectPreco = document.getElementById("produtoSelectPreco")

const quantidadeVenda = document.getElementById("quantidadeVenda");
const formaPagamento = document.getElementById("formaPagamento");
const btnVender = document.getElementById("btnVender");

const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");
const totalGeralRegistros = document.getElementById("totalGeralRegistros");

const tabelaOrcamento = document.querySelector("#tabelaOrcamento tbody");
const clienteInputOrcamento = document.getElementById("clienteInputOrcamento");
const produtoSelectOrcamento = document.getElementById("produtoSelectOrcamento");
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

onSnapshot(orcamentosCol, (snapshot) => {
  orcamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // ✅ limpa orçamentos inválidos
  orcamentos = orcamentos.filter(o => o && o.clienteNome && o.produtos && o.produtos.length > 0);

  // renderiza tabela
  renderOrcamentosSalvos();
});


onSnapshot(precosCol, snapshot => {
  precos = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderTabelaPrecos();
});

tipoPrecoSelect.onchange = async () => {
  const produtoId = produtoSelect.value;
  if (!produtoId) return alert("Selecione um produto primeiro.");

  const tipo = tipoPrecoSelect.value;
  if (!tipo) return;

  try {
    const precoRef = collection(db, "precos");
    const q = query(precoRef, where("produtoId", "==", produtoId));
    const snap = await getDocs(q);

    let precoEscolhido = 0;
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data[tipo]) precoEscolhido = data[tipo];
    });

    precoVenda.value = precoEscolhido.toFixed(2);
  } catch (err) {
    console.error("Erro ao buscar preço:", err);
  }
};


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

function renderEstoque() {
  tabelaEstoque.innerHTML = "";
  produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";

  produtos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.quantidade || 0}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModal('produto', '${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(() => excluirProduto('${p.id}'))">Excluir</button>
      </td>
    `;
    tabelaEstoque.appendChild(tr);

    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nome;
    produtoSelect.appendChild(opt);
  });
}

// ==========================
// Carregar tipos de preço ao selecionar produto
// ==========================
produtoSelect.onchange = async () => {
  const produtoId = produtoSelect.value;
  tipoPrecoSelect.innerHTML = "<option value=''>Selecione o tipo de preço</option>";
  precoVenda.value = "";

  if (!produtoId) return;

  const produtoSnap = await getDoc(doc(db, "estoque", produtoId));
  if (!produtoSnap.exists()) return;

  const produtoNome = produtoSnap.data().nome;

  const precosRef = collection(db, "precos");
  const precoSnap = await getDocs(query(precosRef, where("produto", "==", produtoNome)));

  precoSnap.forEach(p => {
    const data = p.data();
    for (const key in data) {
      if (typeof data[key] === "number" && data[key] > 0) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = `${key.replace(/([A-Z])/g, " $1")} (R$ ${data[key].toFixed(2)})`;
        opt.dataset.valor = data[key];
        tipoPrecoSelect.appendChild(opt);
      }
    }
  });
};

// ==========================
// Atualiza campo de preço quando escolhe tipo
// ==========================
tipoPrecoSelect.onchange = () => {
  const opt = tipoPrecoSelect.selectedOptions[0];
  if (opt && opt.dataset.valor) {
    precoVenda.value = opt.dataset.valor;
  } else {
    precoVenda.value = "";
  }
};

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

  if (!clienteId || !produtoId || !qtd || qtd <= 0)
    return alert("Preencha todos os campos corretamente");

  try {
    const produtoRef = doc(db, "estoque", produtoId);
    const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
    const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : "Cliente";

    const produtoSnap = await getDoc(produtoRef);
    if (!produtoSnap.exists()) throw "Produto não encontrado";

    const produtoNome = produtoSnap.data().nome;

    // 🔍 Buscar o preço do produto na tabela de preços (usando o nome)
    const precosRef = collection(db, "precos");
    const precoSnap = await getDocs(query(precosRef, where("produto", "==", produtoNome)));

    let preco = 0;
    precoSnap.forEach(p => {
      preco = p.data().precoVenda || p.data().preco || 0;
    });

    // Se não encontrou preço, avisa e interrompe
    if (preco <= 0) {
      alert("Preço do produto não encontrado na tabela de preços!");
      return;
    }

    const precoUnitario = parseFloat(precoVenda.value) || 0;
    const total = preco * qtd;

    // 🔄 Transação: atualizar estoque e registrar venda
    await runTransaction(db, async tx => {
      const produtoSnapTx = await tx.get(produtoRef);
      if (!produtoSnapTx.exists()) throw "Produto não encontrado";

      const estoqueAtual = produtoSnapTx.data().quantidade || 0;
      if (estoqueAtual < qtd) throw "Estoque insuficiente";

      tx.update(produtoRef, { quantidade: estoqueAtual - qtd });

      tx.set(doc(vendasCol), {
       data: new Date().toLocaleString(),
       clienteId,
       cliente: clienteNome,
       produtoId,
       produto: produtoSnap.data().nome,
       quantidade: qtd,
       preco: precoUnitario,
       total: total,
       pagamento: formaPagamento.value || "Não informado"
      });
    });

    quantidadeVenda.value = "";
    alert("Venda registrada com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar venda: " + err);
  }
};

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
  const clienteNome = document.getElementById("clienteInputOrcamento").value.trim();
  const produtoId = document.getElementById("produtoSelectOrcamento").value; 
  const qtd = parseInt(document.getElementById("quantidadeOrcamento").value) || 0;

  if (!clienteNome) return alert("Informe o nome do cliente antes de adicionar o produto.");
  if (!produtoId || qtd <= 0) return alert("Selecione um produto e informe a quantidade.");

  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return alert("Produto não encontrado.");

  // ✅ Garante que orcamentoAtual exista com dados válidos
  if (!orcamentoAtual || !Array.isArray(orcamentoAtual.produtos)) {
    orcamentoAtual = {
      clienteNome: clienteNome,
      data: new Date().toLocaleDateString("pt-BR"),
      produtos: []
    };
  }

  // Atualiza cliente e data caso mude
  orcamentoAtual.clienteNome = clienteNome;
  orcamentoAtual.data = new Date().toLocaleDateString("pt-BR");

  // ✅ Buscar preço atual do produto
  let precoAtual = 0;
  const precoDoc = precos.find(pr => pr.produtoId === produtoId);
  if (precoDoc) precoAtual = precoDoc.estampaFrente || 0;

  // Adiciona produto ao orçamento atual
  orcamentoAtual.produtos.push({
    produtoId,
    nome: produto.nome,
    quantidade: qtd,
    preco: precoAtual,
    total: precoAtual * qtd
  });

  // Atualiza tabela
  renderTabelaOrcamentoAtual();

  // Limpa campos
  document.getElementById("produtoSelectOrcamento").value = "";
  document.getElementById("quantidadeOrcamento").value = "";
};

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
  // Validação
  if (!orcamentoAtual.clienteNome || orcamentoAtual.produtos.length === 0) {
    return alert("Informe o nome do cliente e adicione produtos");
  }

  // Garante data válida
  if (!orcamentoAtual.data) orcamentoAtual.data = new Date().toLocaleDateString("pt-BR");

  try {
    // 1️⃣ Salvar orçamento no Firestore
    const copia = JSON.parse(JSON.stringify(orcamentoAtual));
    await addDoc(orcamentosCol, copia);

    // 2️⃣ Limpar orçamento atual
    orcamentoAtual = { clienteNome: "", produtos: [], data: null };
    renderTabelaOrcamentoAtual();
    clienteInputOrcamento.value = "";
    produtoSelectOrcamento.value = "";
    quantidadeOrcamento.value = "";

    // 3️⃣ Gerar PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const imgLogo = new Image();
    imgLogo.src = "logo.png";

    imgLogo.onload = function () {
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoWidth = 40;
      const logoHeight = 40;
      const logoX = (pageWidth - logoWidth) / 2;

      doc.addImage(imgLogo, "PNG", logoX, 5, logoWidth, logoHeight);
      doc.setFontSize(16);
      doc.text("Orçamento", pageWidth / 2, 40, { align: "center" });

      let y = 55;
      doc.setFontSize(12);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 10, y); y += 10;
      doc.text(`Cliente: ${clienteInputOrcamento.value}`, 10, y); y += 10;

      doc.text("Produto", 10, y);
      doc.text("Qtd", 90, y);
      doc.text("Preço Unit.", 120, y);
      doc.text("Total", 170, y);
      y += 8;
      doc.setLineWidth(0.3);
      doc.line(10, y, 200, y);
      y += 8;

      let totalGeral = 0;
      copia.produtos.forEach(p => {
        doc.text(p.nome, 10, y);
        doc.text(String(p.quantidade), 90, y);
        doc.text("R$ " + p.preco.toFixed(2), 120, y);
        doc.text("R$ " + p.total.toFixed(2), 170, y);
        totalGeral += p.total;
        y += 10;
        if (y > 260) { doc.addPage(); y = 20; }
      });

      y += 5;
      doc.line(10, y, 200, y);
      y += 10;
      doc.setFontSize(12);
      doc.text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, 10, y);
      doc.setFontSize(10);
      doc.text("Obrigado pela preferência!", pageWidth / 2, 280, { align: "center" });

      doc.save(`orcamento_${sanitizeFileName(copia.clienteNome)}.pdf`);
    };

    imgLogo.onerror = function () {
      console.warn("Logo não encontrada — gerando PDF sem imagem.");
      doc.text("Orçamento", 105, 20, { align: "center" });
      doc.save(`orcamento_${sanitizeFileName(copia.clienteNome)}.pdf`);
    };

  } catch (err) {
    console.error(err);
    alert("Erro ao salvar orçamento: " + err.message);
  }
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
function renderTabelaPrecos() {
  const tabelaBody = document.querySelector("#tabelaPrecos tbody");
  if (!tabelaBody) return;

  tabelaBody.innerHTML = "";

  if (!precos || precos.length === 0) {
    // Exibe linha de aviso caso não haja preços
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" style="text-align:center">Nenhum preço cadastrado</td>`;
    tabelaBody.appendChild(tr);
    return;
  }

  precos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.produtoNome || ""}</td>
      <td contenteditable data-field="estampaFrente">${p.estampaFrente || 0}</td>
      <td contenteditable data-field="estampaFrenteVerso">${p.estampaFrenteVerso || 0}</td>
      <td contenteditable data-field="branca">${p.branca || 0}</td>
      <td contenteditable data-field="interiorCores">${p.interiorCores || 0}</td>
      <td contenteditable data-field="magicaFosca">${p.magicaFosca || 0}</td>
      <td contenteditable data-field="magicaBrilho">${p.magicaBrilho || 0}</td>
      <td>
        <button class="acao-btn editar" onclick="abrirModalPreco('${p.id}')">Editar</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirPreco('${p.id}'))">Excluir</button>
      </td>`;

    tabelaBody.appendChild(tr);

    // Atualiza valores no Firestore ao sair do campo
    tr.querySelectorAll("[contenteditable]").forEach(td => {
      td.onblur = async () => {
        const num = parseFloat(td.textContent) || 0;
        const field = td.dataset.field;
        try {
          await updateDoc(doc(db, "precos", p.id), { [field]: num });
        } catch (err) {
          console.error("Erro ao atualizar preço:", err);
        }
      };
    });
  });
}

function abrirModalPreco(id) {
  const preco = precos.find(p => p.id === id);
  if (!preco) return alert("Preço não encontrado");

  itemEdicao = id;
  tipoEdicao = "preco";

  modalEditar.style.display = "block";
  modalEditarTitulo.textContent = `Editar Preço: ${preco.produtoNome || ""}`;

  // Preenche os campos do modal corretamente
  modalEditarNome.value = preco.produtoNome || "";
  modalEditarQuantidade.value = preco.estampaFrente || 0;
  modalEditarCompra.value = preco.estampaFrenteVerso || 0;
  modalEditarVenda.value = preco.branca || 0;
  modalEditarTelefone.value = preco.interiorCores || 0;
  modalEditarQuantidade.value = preco.magicaFosca || 0; 
  modalEditarCompra.value = preco.magicaBrilho || 0; 
}

async function excluirPreco(id){
  try{ await deleteDoc(doc(db,"precos",id)); }
  catch(err){ console.error(err); alert("Erro ao excluir preço: "+err);}
}

  // salvar no Firestore
async function salvarOrcamento() {
  try {
    if (!orcamentoAtual || !orcamentoAtual.clienteNome || orcamentoAtual.produtos.length === 0) {
      return alert("Informe o nome do cliente e adicione ao menos um produto antes de salvar.");
    }

    if (!orcamentoAtual.data)
      orcamentoAtual.data = new Date().toLocaleDateString("pt-BR");

    const copia = JSON.parse(JSON.stringify(orcamentoAtual));
    await addDoc(orcamentosCol, copia);

    // limpar orçamento atual
    orcamentoAtual = { clienteNome: "", produtos: [], data: null };
    renderTabelaOrcamentoAtual();
    clienteInputOrcamento.value = "";
    produtoSelectOrcamento.value = "";
    quantidadeOrcamento.value = "";
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar orçamento: " + err.message);
  }
}

window.abrirModal = function(tipo, id) {
  itemEdicao = id;
  tipoEdicao = tipo;

  modalEditar.style.display = "block";

  // Limpa valores
  modalEditarTitulo.textContent = "";
  modalEditarNome.value = "";
  modalEditarTelefone.value = "";
  modalEditarQuantidade.value = "";
  modalEditarPreco.value = "";

  // Esconde todos os campos no início
  modalEditarTelefone.parentElement.style.display = "none";
  modalEditarQuantidade.parentElement.style.display = "none";
  modalEditarPreco.parentElement.style.display = "none";

  if (tipo === "cliente") {
    modalEditarTitulo.textContent = "Editar Cliente";
    modalEditarTelefone.parentElement.style.display = "block";

    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    modalEditarNome.value = cliente.nome || "";
    modalEditarTelefone.value = cliente.telefone || "";
  }

  else if (tipo === "produto") {
    modalEditarTitulo.textContent = "Editar Produto";
    modalEditarQuantidade.parentElement.style.display = "block";

    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    modalEditarNome.value = produto.nome || "";
    modalEditarQuantidade.value = produto.quantidade || 0;
  }

  else if (tipo === "preco") {
    modalEditarTitulo.textContent = "Editar Preço";
    modalEditarPreco.parentElement.style.display = "block";

    const preco = precos.find(p => p.id === id);
    if (!preco) return;
    modalEditarNome.value = preco.produtoNome || "";
    modalEditarPreco.value = preco.valor || 0; // <- campo único de preço
  }
};

btnSalvarEdicao.onclick = async () => {
  if(!itemEdicao) return;
  try {
    if(tipoEdicao==="cliente"){
      await updateDoc(doc(db,"clientes",itemEdicao),{
        nome: modalEditarNome.value.trim(),
        telefone: modalEditarTelefone.value.trim()
      });
    } 
    else if(tipoEdicao==="produto"){
      await updateDoc(doc(db,"estoque",itemEdicao),{
        nome: modalEditarNome.value.trim(),
        quantidade: parseInt(modalEditarQuantidade.value) || 0
      });
      // sincroniza nome no precos
      const q = query(precosCol, where("produtoId","==",itemEdicao));
      const snaps = await getDocs(q);
      for(const s of snaps.docs){
        await updateDoc(doc(db,"precos",s.id), { produtoNome: modalEditarNome.value.trim() });
      }
    } else if (tipoEdicao === "preco") {
       await updateDoc(doc(db, "precos", itemEdicao), {
        produtoNome: modalEditarNome.value.trim(),
        valor: parseFloat(modalEditarPreco.value) || 0
      });

  renderTabelaPrecos();
}

    modalEditar.style.display = "none";
  } catch(err) {
    console.error(err);
    alert("Erro ao salvar edição: " + err);
  }
};

btnCancelarEdicao.onclick = () => {
  modalEditar.style.display = "none";
};

window.abrirModalExclusao=(acao)=>{
  acaoExcluir=acao;
  modalExcluir.style.display="block";
}
btnConfirmarExcluir.onclick=()=>{ if(acaoExcluir) acaoExcluir(); modalExcluir.style.display="none"; }
btnCancelarExcluir.onclick=()=>{ modalExcluir.style.display="none"; }

function renderOrcamentosSalvos() {
  tabelaOrcamentosSalvos.innerHTML = "";
  orcamentos.forEach(o => {
    const tr = document.createElement("tr");

    // Junta os valores dos produtos em cada coluna
    const produtos = o.produtos.map(p => p.nome).join(", ");
    const quantidades = o.produtos.map(p => p.quantidade).join(", ");
    const precosUnit = o.produtos.map(p => "R$ " + p.preco.toFixed(2)).join(", ");
    const precosTotal = o.produtos.map(p => "R$ " + p.total.toFixed(2)).join(", ");

    tr.innerHTML = `
      <td>${o.data}</td>
      <td>${o.clienteNome}</td>
      <td>${produtos}</td>
      <td>${quantidades}</td>
      <td>${precosUnit}</td>
      <td>${precosTotal}</td>
      <td>
        <button class="acao-btn pdf" onclick="reimprimirOrcamento('${o.id}')">PDF</button>
        <button class="acao-btn excluir" onclick="abrirModalExclusao(()=>excluirOrcamento('${o.id}'))">Excluir</button>
      </td>
    `;
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

window.gerarRecibo = async (id) => {
  console.log(`✅ Recibo de venda gerado com sucesso! ID: ${id}`);
};

window.gerarOrcamentoPDF = async (id) => {
  console.log(`✅ PDF de orçamento criado com sucesso! ID: ${id}`);
};

async function excluirOrcamento(id) {
  try {
    await deleteDoc(doc(db, "orcamentos", id));
    // Atualiza a tabela após exclusão
    renderOrcamentosSalvos();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir orçamento: " + err.message);
  }
}

// Torna acessível no HTML
window.excluirOrcamento = excluirOrcamento;

window.abrirModalExclusao = function (callback) {
  const modal = document.getElementById("modalExcluir");
  modal.style.display = "block";

  const confirmar = document.getElementById("btnConfirmarExcluir");
  const cancelar = document.getElementById("btnCancelarExcluir");

  confirmar.onclick = () => {
    callback();
    modal.style.display = "none";
  };

  cancelar.onclick = () => {
    modal.style.display = "none";
  };
};

// Torna funções acessíveis no escopo global (para uso no HTML onclick)
window.mostrar = mostrar
window.excluirCliente = excluirCliente;
window.excluirProduto = excluirProduto;
window.excluirVenda = excluirVenda;
window.excluirPreco = excluirPreco;
window.removerProduto = removerProduto;
window.reimprimirOrcamento = reimprimirOrcamento;
window.gerarRecibo = gerarRecibo;
window.salvarOrcamento = salvarOrcamento;
window.abrirModalPreco = abrirModalPreco;
