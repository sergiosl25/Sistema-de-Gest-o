// ==================================================
// Aguarda o DOM estar pronto antes de inicializar
// ==================================================
document.addEventListener("DOMContentLoaded", async () => {

  // Referências de elementos globais
  const views = document.querySelectorAll(".view");
  const userEmail = document.getElementById("userEmail");

  const clienteSelect = document.getElementById("clienteSelect");
  const produtoSelect = document.getElementById("produtoSelect");
  const tipoPrecoSelect = document.getElementById("tipoPrecoSelect");
  const precoVendaInput = document.getElementById("precoVenda");
  const quantidadeVenda = document.getElementById("quantidadeVenda");
  const formaPagamento = document.getElementById("formaPagamento");
  const btnVender = document.getElementById("btnVender");

  const produtoSelectPreco = document.getElementById("produtoSelectPreco");
  const tabelaPrecos = document.getElementById("tabelaPrecos").querySelector("tbody");

  // Firebase
  const db = window.db;
  import { 
    collection, addDoc, deleteDoc, doc, updateDoc, getDocs, onSnapshot 
  } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

  // ==================================================
  // FUNÇÃO PARA TROCAR DE TELA
  // ==================================================
  window.mostrar = (id) => {
    views.forEach(v => v.classList.remove("active"));
    document.getElementById(id).classList.add("active");
  };

  // Exibir a primeira view
  mostrar("clientes");

  // ==================================================
  // CLIENTES - Cadastrar, listar, editar e excluir
  // ==================================================
  const btnCadastrarCliente = document.getElementById("btnCadastrarCliente");
  const nomeCliente = document.getElementById("nomeCliente");
  const telefoneCliente = document.getElementById("telefoneCliente");
  const tabelaClientes = document.querySelector("#tabelaClientes tbody");

  async function carregarClientes() {
    const snap = await getDocs(collection(db, "clientes"));
    tabelaClientes.innerHTML = "";
    clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";

    snap.forEach(docSnap => {
      const c = docSnap.data();
      tabelaClientes.innerHTML += `
        <tr>
          <td>${c.nome}</td>
          <td>${c.telefone || ""}</td>
          <td>
            <button class="acao-btn editar" onclick="editarCliente('${docSnap.id}','${c.nome}','${c.telefone || ""}')">Editar</button>
            <button class="acao-btn excluir" onclick="excluirCliente('${docSnap.id}')">Excluir</button>
          </td>
        </tr>
      `;
      clienteSelect.innerHTML += `<option value="${docSnap.id}">${c.nome}</option>`;
    });
  }

  btnCadastrarCliente.onclick = async () => {
    if (!nomeCliente.value.trim()) return alert("Nome é obrigatório");
    await addDoc(collection(db, "clientes"), {
      nome: nomeCliente.value.trim(),
      telefone: telefoneCliente.value.trim()
    });
    nomeCliente.value = "";
    telefoneCliente.value = "";
    carregarClientes();
  };

  window.excluirCliente = async (id) => {
    await deleteDoc(doc(db, "clientes", id));
    carregarClientes();
  };

  window.editarCliente = (id, nome, telefone) => {
    const novoNome = prompt("Novo nome:", nome);
    const novoTelefone = prompt("Novo telefone:", telefone);
    if (novoNome !== null)
      updateDoc(doc(db, "clientes", id), { nome: novoNome, telefone: novoTelefone });
    carregarClientes();
  };

  carregarClientes();

  // ==================================================
  // ESTOQUE
  // ==================================================
  const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
  const nomeProduto = document.getElementById("nomeProduto");
  const quantidadeProduto = document.getElementById("quantidadeProduto");
  const tabelaEstoque = document.querySelector("#tabelaEstoque tbody");

  async function carregarEstoque() {
    const snap = await getDocs(collection(db, "estoque"));
    tabelaEstoque.innerHTML = "";
    produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";
    produtoSelectPreco.innerHTML = "<option value=''>— Selecione produto —</option>";

    snap.forEach(docSnap => {
      const p = docSnap.data();
      tabelaEstoque.innerHTML += `
        <tr>
          <td>${p.nome}</td>
          <td>${p.quantidade || 0}</td>
          <td>
            <button class="acao-btn editar" onclick="editarProduto('${docSnap.id}','${p.nome}','${p.quantidade}')">Editar</button>
            <button class="acao-btn excluir" onclick="excluirProduto('${docSnap.id}')">Excluir</button>
          </td>
        </tr>
      `;
      produtoSelect.innerHTML += `<option value="${docSnap.id}">${p.nome}</option>`;
      produtoSelectPreco.innerHTML += `<option value="${docSnap.id}">${p.nome}</option>`;
    });
  }

  btnCadastrarProduto.onclick = async () => {
    if (!nomeProduto.value.trim() || !quantidadeProduto.value) return alert("Preencha todos os campos");
    await addDoc(collection(db, "estoque"), {
      nome: nomeProduto.value.trim(),
      quantidade: parseInt(quantidadeProduto.value)
    });
    nomeProduto.value = "";
    quantidadeProduto.value = "";
    carregarEstoque();
  };

  window.excluirProduto = async (id) => {
    await deleteDoc(doc(db, "estoque", id));
    carregarEstoque();
  };

  window.editarProduto = (id, nome, quantidade) => {
    const novoNome = prompt("Novo nome:", nome);
    const novaQtd = prompt("Nova quantidade:", quantidade);
    if (novoNome !== null)
      updateDoc(doc(db, "estoque", id), { nome: novoNome, quantidade: parseInt(novaQtd) });
    carregarEstoque();
  };

  carregarEstoque();

  // ==================================================
  // TABELA DE PREÇOS
  // ==================================================
  const btnNovaLinhaPreco = document.getElementById("btnNovaLinhaPreco");

  async function carregarPrecos() {
    const snap = await getDocs(collection(db, "precos"));
    tabelaPrecos.innerHTML = "";
    snap.forEach(docSnap => {
      const preco = docSnap.data();
      tabelaPrecos.innerHTML += `
        <tr>
          <td>${preco.produto}</td>
          <td>${preco.frente || ""}</td>
          <td>${preco.frenteVerso || ""}</td>
          <td>${preco.branca || ""}</td>
          <td>${preco.interior || ""}</td>
          <td>${preco.magicaFosca || ""}</td>
          <td>${preco.magicaBrilho || ""}</td>
          <td>
            <button class="acao-btn editar" onclick="editarPreco('${docSnap.id}')">Editar</button>
            <button class="acao-btn excluir" onclick="excluirPreco('${docSnap.id}')">Excluir</button>
          </td>
        </tr>
      `;
    });
  }

  btnNovaLinhaPreco.onclick = async () => {
    const produtoId = produtoSelectPreco.value;
    if (!produtoId) return alert("Selecione um produto para adicionar preço.");

    const produtoNome = produtoSelectPreco.options[produtoSelectPreco.selectedIndex].text;
    await addDoc(collection(db, "precos"), {
      produto: produtoNome,
      frente: "",
      frenteVerso: "",
      branca: "",
      interior: "",
      magicaFosca: "",
      magicaBrilho: ""
    });
    carregarPrecos();
  };

  window.excluirPreco = async (id) => {
    await deleteDoc(doc(db, "precos", id));
    carregarPrecos();
  };

  carregarPrecos();

  // ==================================================
  // VENDAS — Selecionar produto e buscar preço
  // ==================================================
  produtoSelect.onchange = async () => {
    tipoPrecoSelect.innerHTML = "<option value=''>Selecione o tipo de preço</option>";
    precoVendaInput.value = "";

    if (!produtoSelect.value) return;
    const nomeProduto = produtoSelect.options[produtoSelect.selectedIndex].text;

    const snap = await getDocs(collection(db, "precos"));
    snap.forEach(docSnap => {
      const p = docSnap.data();
      if (p.produto === nomeProduto) {
        Object.entries(p).forEach(([chave, valor]) => {
          if (chave !== "produto" && valor) {
            tipoPrecoSelect.innerHTML += `<option value="${valor}">${chave}</option>`;
          }
        });
      }
    });
  };

  tipoPrecoSelect.onchange = () => {
    precoVendaInput.value = tipoPrecoSelect.value;
  };

  btnVender.onclick = async () => {
    const clienteId = clienteSelect.value;
    const produtoId = produtoSelect.value;
    const preco = parseFloat(precoVendaInput.value);
    const qtd = parseInt(quantidadeVenda.value);
    const pagamento = formaPagamento.value;

    if (!clienteId || !produtoId || !preco || !qtd)
      return alert("Preencha todos os campos.");

    const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].text;
    const produtoNome = produtoSelect.options[produtoSelect.selectedIndex].text;

    const total = preco * qtd;
    await addDoc(collection(db, "vendas"), {
      data: new Date().toLocaleString(),
      cliente: clienteNome,
      produto: produtoNome,
      quantidade: qtd,
      preco,
      total,
      pagamento
    });

    alert("Venda registrada!");
    quantidadeVenda.value = "";
    precoVendaInput.value = "";
    tipoPrecoSelect.innerHTML = "<option value=''>Selecione o tipo de preço</option>";
  };

});
// ==================================================
// ORÇAMENTOS
// ==================================================
const btnSalvarOrcamento = document.getElementById("btnSalvarOrcamento");
const tabelaOrcamentos = document.querySelector("#tabelaOrcamentos tbody");

async function carregarOrcamentos() {
  const snap = await getDocs(collection(db, "orcamentos"));
  tabelaOrcamentos.innerHTML = "";

  snap.forEach(docSnap => {
    const o = docSnap.data();
    tabelaOrcamentos.innerHTML += `
      <tr>
        <td>${o.data}</td>
        <td>${o.cliente}</td>
        <td>${o.produto}</td>
        <td>${o.tipo}</td>
        <td>${o.quantidade}</td>
        <td>R$ ${o.preco}</td>
        <td>R$ ${o.total}</td>
        <td>
          <button class="acao-btn editar" onclick="reimprimirOrcamento('${docSnap.id}')">Reimprimir</button>
          <button class="acao-btn excluir" onclick="excluirOrcamento('${docSnap.id}')">Excluir</button>
        </td>
      </tr>
    `;
  });
}

btnSalvarOrcamento.onclick = async () => {
  const clienteId = clienteSelect.value;
  const produtoId = produtoSelect.value;
  const tipoPreco = tipoPrecoSelect.options[tipoPrecoSelect.selectedIndex]?.text;
  const preco = parseFloat(precoVendaInput.value);
  const qtd = parseInt(quantidadeVenda.value);

  if (!clienteId || !produtoId || !preco || !qtd)
    return alert("Preencha todos os campos do orçamento.");

  const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].text;
  const produtoNome = produtoSelect.options[produtoSelect.selectedIndex].text;
  const total = preco * qtd;

  await addDoc(collection(db, "orcamentos"), {
    data: new Date().toLocaleString(),
    cliente: clienteNome,
    produto: produtoNome,
    tipo: tipoPreco,
    quantidade: qtd,
    preco,
    total
  });

  alert("Orçamento salvo!");
  carregarOrcamentos();
};

window.excluirOrcamento = async (id) => {
  if (confirm("Deseja realmente excluir este orçamento?")) {
    await deleteDoc(doc(db, "orcamentos", id));
    carregarOrcamentos();
  }
};

window.reimprimirOrcamento = async (id) => {
  const ref = doc(db, "orcamentos", id);
  const snap = await getDocs(collection(db, "orcamentos"));
  const dados = (await getDocs(collection(db, "orcamentos"))).docs.find(d => d.id === id)?.data();
  if (!dados) return alert("Orçamento não encontrado.");

  // Geração de PDF simples (printável)
  const janela = window.open("", "_blank");
  janela.document.write(`
    <html>
      <head><title>Orçamento - ${dados.cliente}</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h2>Orçamento</h2>
        <p><strong>Data:</strong> ${dados.data}</p>
        <p><strong>Cliente:</strong> ${dados.cliente}</p>
        <p><strong>Produto:</strong> ${dados.produto}</p>
        <p><strong>Tipo:</strong> ${dados.tipo}</p>
        <p><strong>Quantidade:</strong> ${dados.quantidade}</p>
        <p><strong>Preço Unitário:</strong> R$ ${dados.preco.toFixed(2)}</p>
        <p><strong>Total:</strong> R$ ${dados.total.toFixed(2)}</p>
        <hr>
        <p style="text-align:center;">Sistema de Gestão © ${new Date().getFullYear()}</p>
        <script>window.print();</script>
      </body>
    </html>
  `);
  janela.document.close();
};

carregarOrcamentos();

// ==================================================
// REGISTROS DE VENDAS (Histórico)
// ==================================================
const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");
const totalVendasEl = document.getElementById("totalVendas");

async function carregarRegistros() {
  const snap = await getDocs(collection(db, "vendas"));
  tabelaRegistros.innerHTML = "";
  let totalGeral = 0;

  snap.forEach(docSnap => {
    const v = docSnap.data();
    totalGeral += v.total;
    tabelaRegistros.innerHTML += `
      <tr>
        <td>${v.data}</td>
        <td>${v.cliente}</td>
        <td>${v.produto}</td>
        <td>${v.quantidade}</td>
        <td>R$ ${v.preco}</td>
        <td>R$ ${v.total}</td>
        <td>${v.pagamento}</td>
      </tr>
    `;
  });

  totalVendasEl.textContent = `Total vendido: R$ ${totalGeral.toFixed(2)}`;
}

carregarRegistros();
