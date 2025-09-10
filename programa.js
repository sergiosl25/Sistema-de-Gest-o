document.addEventListener("DOMContentLoaded", () => {
  // ----------------------
  // Inicializar Firebase
  // ----------------------
  const firebaseConfig = {
    apiKey: "AIzaSyAKbGyqNjLGBPmPHaxCGvnDQV4tjQWXFr8",
    authDomain: "personalizados-2eb5f.firebaseapp.com",
    projectId: "personalizados-2eb5f",
    storageBucket: "personalizados-2eb5f.firebasestorage.app",
    messagingSenderId: "498226923096",
    appId: "1:498226923096:web:98df6f34a7fd8630a5ec2d"
  };
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // ----------------------
  // Navegação
  // ----------------------
  function mostrar(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
  }

  document.getElementById("btnMenuClientes").addEventListener("click", () => mostrar("clientes"));
  document.getElementById("btnMenuProdutos").addEventListener("click", () => mostrar("produtos"));
  document.getElementById("btnMenuVendas").addEventListener("click", () => mostrar("vendas"));
  document.getElementById("btnMenuRegistros").addEventListener("click", () => {
    mostrar("registrosVendas");
    carregarRegistros();
  });

  mostrar("vendas"); // View inicial

  // ----------------------
  // Elementos
  // ----------------------
  const tabelaClientes = document.querySelector("#tabelaClientes tbody");
  const tabelaProdutos = document.querySelector("#tabelaProdutos tbody");
  const tabelaVendas = document.querySelector("#tabelaVendas tbody");
  const tabelaRegistros = document.querySelector("#tabelaRegistros tbody");

  const nomeCliente = document.getElementById("nomeCliente");
  const telefoneCliente = document.getElementById("telefoneCliente");
  const btnCadastrarCliente = document.getElementById("btnCadastrarCliente");
  const clienteSelect = document.getElementById("clienteSelect");

  const nomeProduto = document.getElementById("nomeProduto");
  const quantidadeProduto = document.getElementById("quantidadeProduto");
  const valorCompraProduto = document.getElementById("valorCompraProduto");
  const valorVendaProduto = document.getElementById("valorVendaProduto");
  const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
  const produtoSelect = document.getElementById("produtoSelect");

  const quantidadeVenda = document.getElementById("quantidadeVenda");
  const formaPagamento = document.getElementById("formaPagamento");
  const btnVender = document.getElementById("btnVender");

  const totalCompraEl = document.getElementById("totalCompra");
  const totalVendaEl = document.getElementById("totalVenda");
  const totalGeralEl = document.getElementById("totalGeral");
  const totalGeralRegistros = document.getElementById("totalGeralRegistros");
  const btnExportarRelatorio = document.getElementById("btnExportarRelatorio");

  const modalEditar = document.getElementById("modalEditar");
  const modalExcluir = document.getElementById("modalExcluir");

  let itemEdicao = null;
  let tipoEdicao = null;

  function gerarID() {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
  }

  // ----------------------
  // Clientes
  // ----------------------
  btnCadastrarCliente.addEventListener("click", async () => {
    if (!nomeCliente.value.trim()) return alert("Informe o nome do cliente");

    const cliente = {
      id: gerarID(),
      nome: nomeCliente.value.trim(),
      telefone: telefoneCliente.value.trim()
    };

    await db.collection("clientes").doc(cliente.id).set(cliente);
    nomeCliente.value = telefoneCliente.value = "";
    carregarClientes();
  });

  async function carregarClientes() {
    tabelaClientes.innerHTML = "";
    clienteSelect.innerHTML = "<option value=''>Selecione o cliente</option>";

    const snapshot = await db.collection("clientes").get();
    snapshot.forEach(doc => {
      const c = doc.data();

      // Tabela
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.nome}</td>
        <td>${c.telefone}</td>
        <td></td>
      `;
      tabelaClientes.appendChild(tr);

      // Select
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = c.nome;
      clienteSelect.appendChild(option);
    });
  }

  // ----------------------
  // Produtos
  // ----------------------
  btnCadastrarProduto.addEventListener("click", async () => {
    if (!nomeProduto.value.trim() || !quantidadeProduto.value || !valorCompraProduto.value || !valorVendaProduto.value)
      return alert("Preencha todos os campos");

    const produto = {
      id: gerarID(),
      nome: nomeProduto.value.trim(),
      quantidade: parseInt(quantidadeProduto.value),
      valorCompra: parseFloat(valorCompraProduto.value),
      valorVenda: parseFloat(valorVendaProduto.value)
    };

    await db.collection("produtos").doc(produto.id).set(produto);
    nomeProduto.value = quantidadeProduto.value = valorCompraProduto.value = valorVendaProduto.value = "";
    carregarProdutos();
  });

  async function carregarProdutos() {
    tabelaProdutos.innerHTML = "";
    produtoSelect.innerHTML = "<option value=''>Selecione o produto</option>";
    let totalCompra = 0, totalVenda = 0;

    const snapshot = await db.collection("produtos").get();
    snapshot.forEach(doc => {
      const p = doc.data();
      totalCompra += p.quantidade * p.valorCompra;
      totalVenda += p.quantidade * p.valorVenda;

      // Tabela
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.quantidade}</td>
        <td>R$ ${p.valorCompra.toFixed(2)}</td>
        <td>R$ ${p.valorVenda.toFixed(2)}</td>
        <td></td>
      `;
      tabelaProdutos.appendChild(tr);

      // Select
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = `${p.nome} (Estoque: ${p.quantidade})`;
      produtoSelect.appendChild(option);
    });

    totalCompraEl.textContent = "R$ " + totalCompra.toFixed(2);
    totalVendaEl.textContent = "R$ " + totalVenda.toFixed(2);
  }

  // ----------------------
  // Vendas
  // ----------------------
  btnVender.addEventListener("click", async () => {
    const clienteId = clienteSelect.value;
    const produtoId = produtoSelect.value;
    const qtd = parseInt(quantidadeVenda.value);

    if (!clienteId || !produtoId || qtd <= 0) return alert("Preencha todos os campos corretamente");

    const produtoDoc = await db.collection("produtos").doc(produtoId).get();
    const produto = produtoDoc.data();

    if (!produto || produto.quantidade < qtd) return alert("Estoque insuficiente");

    // Atualizar estoque
    await db.collection("produtos").doc(produtoId).update({
      quantidade: produto.quantidade - qtd
    });

    // Criar venda
    const venda = {
      id: gerarID(),
      data: new Date().toLocaleString(),
      clienteId,
      cliente: clienteSelect.options[clienteSelect.selectedIndex].text,
      produtoId,
      produto: produto.nome,
      quantidade: qtd,
      preco: produto.valorVenda,
      total: produto.valorVenda * qtd,
      pagamento: formaPagamento.value
    };

    await db.collection("vendas").doc(venda.id).set(venda);

    quantidadeVenda.value = "";
    carregarProdutos();
    carregarVendas();
    carregarRegistros();
  });

  async function carregarVendas() {
    tabelaVendas.innerHTML = "";
    let totalGeral = 0;

    const snapshot = await db.collection("vendas").get();
    snapshot.forEach(doc => {
      const v = doc.data();
      totalGeral += v.total;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.data}</td>
        <td>${v.cliente}</td>
        <td>${v.produto}</td>
        <td>${v.quantidade}</td>
        <td>R$ ${v.preco.toFixed(2)}</td>
        <td>R$ ${v.total.toFixed(2)}</td>
        <td>${v.pagamento}</td>
        <td>
          <button class="acao-btn" onclick='gerarRecibo(${JSON.stringify(v)})'>Recibo</button>
        </td>
      `;
      tabelaVendas.appendChild(tr);
    });

    totalGeralEl.textContent = "R$ " + totalGeral.toFixed(2);
  }

  async function carregarRegistros() {
    tabelaRegistros.innerHTML = "";
    let totalGeral = 0;

    const snapshot = await db.collection("vendas").get();
    snapshot.forEach(doc => {
      const v = doc.data();
      totalGeral += v.total;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.data}</td>
        <td>${v.cliente}</td>
        <td>${v.produto}</td>
        <td>${v.quantidade}</td>
        <td>R$ ${v.preco.toFixed(2)}</td>
        <td>R$ ${v.total.toFixed(2)}</td>
        <td>${v.pagamento}</td>
        <td>
          <button class="acao-btn" onclick='gerarRecibo(${JSON.stringify(v)})'>Recibo</button>
        </td>
      `;
      tabelaRegistros.appendChild(tr);
    });

    totalGeralRegistros.textContent = "R$ " + totalGeral.toFixed(2);
  }

  // ----------------------
  // PDF Recibo
  // ----------------------
  window.gerarRecibo = (venda) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Recibo de Venda", 105, 20, { align: "center" });
    doc.text("Alvespersonalizados", 105, 30, { align: "center" });

    let y = 50;
    doc.setFontSize(12);
    doc.text(`Data: ${venda.data}`, 10, y); y+=10;
    doc.text(`Cliente: ${venda.cliente}`, 10, y); y+=10;
    doc.text(`Produto: ${venda.produto}`, 10, y); y+=10;
    doc.text(`Quantidade: ${venda.quantidade}`, 10, y); y+=10;
    doc.text(`Preço Unitário: R$ ${venda.preco.toFixed(2)}`, 10, y); y+=10;
    doc.text(`Total: R$ ${venda.total.toFixed(2)}`, 10, y); y+=10;
    doc.text(`Forma de Pagamento: ${venda.pagamento}`, 10, y);

    doc.setFontSize(10);
    doc.text("Obrigado pela preferência!", 105, 280, { align: "center" });

    doc.save(`recibo_${venda.cliente}.pdf`);
  };

  // ----------------------
  // PDF Relatório
  // ----------------------
  btnExportarRelatorio.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Relatório de Vendas", 10, 15);
    let y = 25;
    let totalGeral = 0;

    const snapshot = await db.collection("vendas").get();
    doc.setFontSize(8);
    doc.text("Data", 10, y);
    doc.text("Cliente", 50, y);
    doc.text("Produto", 90, y);
    doc.text("Qtd", 120, y);
    doc.text("Preço", 140, y);
    doc.text("Total", 160, y);
    doc.text("Pagamento", 180, y);
    y += 8;

    snapshot.forEach(docSnap => {
      const v = docSnap.data();
      totalGeral += v.total;
      doc.text(v.data, 10, y);
      doc.text(v.cliente, 50, y);
      doc.text(v.produto, 90, y);
      doc.text(v.quantidade.toString(), 120, y);
      doc.text(v.preco.toFixed(2), 140, y);
      doc.text(v.total.toFixed(2), 160, y);
      doc.text(v.pagamento, 180, y);
      y += 8;
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
    });

    doc.text("Total Geral: R$ " + totalGeral.toFixed(2), 10, y + 10);
    doc.save("relatorio_vendas.pdf");
  });

  // ----------------------
  // Inicializar
  // ----------------------
  carregarClientes();
  carregarProdutos();
  carregarVendas();
  carregarRegistros();
});
