# -*- coding: utf-8 -*-

import flet as ft

from firebase_produtos import FirebaseProdutos


AZUL = "#2563EB"
BRANCO = "#FFFFFF"
TEXTO = "#1E293B"
CINZA = "#64748B"
VERDE = "#16A34A"
VERMELHO = "#DC2626"


class TelaProdutos:

    def __init__(self, page, sessao):

        self.page = page
        self.firebase = FirebaseProdutos(sessao)

        self.produtos = []
        self.produto_editando = None
        self.produto_excluir = None

        # ==========================================
        # PESQUISA
        # ==========================================

        self.campo_pesquisa = ft.TextField(
            hint_text="Pesquisar produto pelo nome",
            prefix_icon=ft.icons.SEARCH,
            expand=True,
            on_change=self.pesquisar
        )

        self.mensagem = ft.Text(
            "",
            color=CINZA,
            size=13
        )

        # ==========================================
        # FORMULÁRIO
        # ==========================================

        self.campo_nome = ft.TextField(
            label="Nome do produto",
            width=350
        )

        self.campo_quantidade = ft.TextField(
            label="Quantidade em estoque",
            value="0",
            width=350,
            keyboard_type=ft.KeyboardType.NUMBER
        )

        self.campo_tipo = ft.Dropdown(
            label="Tipo de preço",
            width=350,
            value="unico",
            options=[
                ft.dropdown.Option(
                    "unico",
                    "Preço único"
                ),
                ft.dropdown.Option(
                    "personalizado",
                    "Com personalização"
                )
            ],
            on_change=self.alterar_tipo_preco
        )

        self.campo_preco = ft.TextField(
            label="Preço único (R$)",
            value="0,00",
            width=350
        )

        self.campo_preco1 = ft.TextField(
            label="Personalização somente frente (R$)",
            value="0,00",
            width=350,
            visible=False
        )

        self.campo_preco2 = ft.TextField(
            label="Personalização frente e verso (R$)",
            value="0,00",
            width=350,
            visible=False
        )

        self.mensagem_formulario = ft.Text(
            "",
            color=VERMELHO,
            size=12
        )

        self.dialogo = ft.AlertDialog(
            modal=True,
            title=ft.Text("Cadastro de Produto"),
            content=ft.Container(
                width=370,
                content=ft.Column(
                    [
                        self.campo_nome,
                        self.campo_quantidade,
                        self.campo_tipo,
                        self.campo_preco,
                        self.campo_preco1,
                        self.campo_preco2,
                        self.mensagem_formulario
                    ],
                    tight=True,
                    scroll=ft.ScrollMode.AUTO,
                    spacing=12
                )
            ),
            actions=[
                ft.TextButton(
                    "Cancelar",
                    on_click=self.fechar_dialogo
                ),
                ft.ElevatedButton(
                    "SALVAR",
                    bgcolor=AZUL,
                    color=BRANCO,
                    elevation=5,
                    on_click=self.salvar
                )
            ]
        )

        # ==========================================
        # CONFIRMAÇÃO DE EXCLUSÃO
        # ==========================================

        self.dialogo_excluir = ft.AlertDialog(
            modal=True,
            title=ft.Text("Excluir produto"),
            content=ft.Text(
                "Deseja realmente excluir este produto?"
            ),
            actions=[
                ft.TextButton(
                    "Cancelar",
                    on_click=self.fechar_exclusao
                ),
                ft.ElevatedButton(
                    "EXCLUIR",
                    bgcolor=VERMELHO,
                    color=BRANCO,
                    on_click=self.confirmar_exclusao
                )
            ]
        )

        self.page.overlay.append(self.dialogo)
        self.page.overlay.append(self.dialogo_excluir)

        # ==========================================
        # TABELA
        # ==========================================

        self.tabela = ft.DataTable(
            columns=[
                ft.DataColumn(ft.Text("Produto")),
                ft.DataColumn(ft.Text("Tipo")),
                ft.DataColumn(ft.Text("Preço único")),
                ft.DataColumn(ft.Text("Frente")),
                ft.DataColumn(ft.Text("Frente e verso")),
                ft.DataColumn(ft.Text("Estoque")),
                ft.DataColumn(ft.Text("Ações"))
            ],
            rows=[],
            column_spacing=25
        )

        cabecalho = ft.Row(
            [
                ft.Text(
                    "Cadastro de Produtos",
                    size=22,
                    weight=ft.FontWeight.BOLD,
                    color=TEXTO
                ),
                ft.ElevatedButton(
                    "+ NOVO PRODUTO",
                    bgcolor=AZUL,
                    color=BRANCO,
                    elevation=5,
                    on_click=self.novo_produto
                )
            ],
            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            wrap=True
        )

        self.conteudo = ft.Column(
            [
                cabecalho,
                self.campo_pesquisa,
                self.mensagem,
                ft.Container(
                    bgcolor=BRANCO,
                    padding=15,
                    border_radius=12,
                    content=ft.Row(
                        [self.tabela],
                        scroll=ft.ScrollMode.AUTO
                    )
                )
            ],
            spacing=12,
            tight=True
        )

    # ==============================================
    # CONSTRUIR
    # ==============================================

    def construir(self):
        return self.conteudo

    # ==============================================
    # FORMATAÇÃO
    # ==============================================

    @staticmethod
    def moeda(valor):
        texto = "{:,.2f}".format(float(valor))

        texto = texto.replace(",", "X")
        texto = texto.replace(".", ",")
        texto = texto.replace("X", ".")

        return "R$ " + texto

    @staticmethod
    def texto_valor(valor):
        return "{:.2f}".format(float(valor)).replace(".", ",")

    @staticmethod
    def converter_valor(texto):

        texto = (texto or "").strip()

        if not texto:
            return 0.0

        # Aceita 12,50 e 12.50.
        # Para milhares, use 1.234,50.
        if "," in texto:
            texto = texto.replace(".", "").replace(",", ".")

        valor = float(texto)

        if valor < 0:
            raise ValueError("O preço não pode ser negativo.")

        return round(valor, 2)

    # ==============================================
    # CARREGAR PRODUTOS
    # ==============================================

    def carregar(self):

        self.mensagem.value = "Carregando produtos..."
        self.page.update()

        try:
            self.produtos = self.firebase.listar()

            self.pesquisar(None)

            self.mensagem.value = (
                "{} produto(s) encontrado(s).".format(
                    len(self.produtos)
                )
            )

        except Exception as erro:

            import traceback

            print("ERRO AO CARREGAR PRODUTOS:")
            traceback.print_exc()

            self.mensagem.value = (
                "Erro ao carregar produtos: " + str(erro)
            )

        self.page.update()

    # ==============================================
    # TABELA
    # ==============================================

    def atualizar_tabela(self, produtos):

        self.tabela.rows.clear()

        for produto in produtos:

            tipo = (
                "Preço único"
                if produto["tipoPreco"] == "unico"
                else "Personalizado"
            )

            estoque = produto["quantidade"]

            cor_estoque = (
                VERMELHO if estoque <= 0 else VERDE
            )

            self.tabela.rows.append(
                ft.DataRow(
                    cells=[
                        ft.DataCell(
                            ft.Text(produto["nome"])
                        ),
                        ft.DataCell(
                            ft.Text(tipo)
                        ),
                        ft.DataCell(
                            ft.Text(
                                self.moeda(produto["preco"])
                            )
                        ),
                        ft.DataCell(
                            ft.Text(
                                self.moeda(produto["preco1"])
                            )
                        ),
                        ft.DataCell(
                            ft.Text(
                                self.moeda(produto["preco2"])
                            )
                        ),
                        ft.DataCell(
                            ft.Text(
                                str(estoque),
                                color=cor_estoque,
                                weight=ft.FontWeight.BOLD
                            )
                        ),
                        ft.DataCell(
                            ft.Row(
                                [
                                    ft.IconButton(
                                        icon=ft.icons.EDIT,
                                        icon_color=AZUL,
                                        tooltip="Editar produto",
                                        on_click=lambda e, p=produto:
                                            self.editar(p)
                                    ),
                                    ft.IconButton(
                                        icon=ft.icons.DELETE,
                                        icon_color=VERMELHO,
                                        tooltip="Excluir produto",
                                        on_click=lambda e, p=produto:
                                            self.excluir(p)
                                    )
                                ],
                                spacing=0
                            )
                        )
                    ]
                )
            )

    # ==============================================
    # PESQUISAR
    # ==============================================

    def pesquisar(self, e):

        termo = (
            self.campo_pesquisa.value or ""
        ).strip().lower()

        filtrados = [
            produto
            for produto in self.produtos
            if termo in produto["nome"].lower()
        ]

        self.atualizar_tabela(filtrados)
        self.page.update()

    # ==============================================
    # TIPO DE PREÇO
    # ==============================================

    def alterar_tipo_preco(self, e=None):

        personalizado = (
            self.campo_tipo.value == "personalizado"
        )

        self.campo_preco.visible = not personalizado

        self.campo_preco1.visible = personalizado
        self.campo_preco2.visible = personalizado

        self.page.update()

    # ==============================================
    # NOVO PRODUTO
    # ==============================================

    def novo_produto(self, e):

        self.produto_editando = None

        self.campo_nome.value = ""
        self.campo_quantidade.value = "0"

        self.campo_tipo.value = "unico"

        self.campo_preco.value = "0,00"
        self.campo_preco1.value = "0,00"
        self.campo_preco2.value = "0,00"

        self.mensagem_formulario.value = ""

        self.dialogo.title = ft.Text("Novo Produto")

        self.alterar_tipo_preco()

        self.dialogo.open = True
        self.page.update()

    # ==============================================
    # EDITAR PRODUTO
    # ==============================================

    def editar(self, produto):

        self.produto_editando = produto

        self.campo_nome.value = produto["nome"]

        self.campo_quantidade.value = str(
            produto["quantidade"]
        )

        self.campo_tipo.value = produto["tipoPreco"]

        self.campo_preco.value = self.texto_valor(
            produto["preco"]
        )

        self.campo_preco1.value = self.texto_valor(
            produto["preco1"]
        )

        self.campo_preco2.value = self.texto_valor(
            produto["preco2"]
        )

        self.mensagem_formulario.value = ""

        self.dialogo.title = ft.Text("Editar Produto")

        self.alterar_tipo_preco()

        self.dialogo.open = True
        self.page.update()

    # ==============================================
    # FECHAR FORMULÁRIO
    # ==============================================

    def fechar_dialogo(self, e):

        self.dialogo.open = False
        self.page.update()

    # ==============================================
    # SALVAR PRODUTO
    # ==============================================

    def salvar(self, e):

        nome = (
            self.campo_nome.value or ""
        ).strip()

        if not nome:
            self.mensagem_formulario.value = (
                "Informe o nome do produto."
            )
            self.page.update()
            return

        try:
            quantidade = int(
                (self.campo_quantidade.value or "").strip()
            )

            if quantidade < 0:
                raise ValueError(
                    "A quantidade não pode ser negativa."
                )

            tipo = self.campo_tipo.value

            if tipo not in ("unico", "personalizado"):
                raise ValueError(
                    "Selecione um tipo de preço válido."
                )

            # Mantém os valores dos campos que não
            # estão visíveis, evitando zerar preços
            # já existentes no Firebase.

            if self.produto_editando:
                preco = self.produto_editando["preco"]
                preco1 = self.produto_editando["preco1"]
                preco2 = self.produto_editando["preco2"]
            else:
                preco = 0.0
                preco1 = 0.0
                preco2 = 0.0

            if tipo == "unico":
                preco = self.converter_valor(
                    self.campo_preco.value
                )
            else:
                preco1 = self.converter_valor(
                    self.campo_preco1.value
                )

                preco2 = self.converter_valor(
                    self.campo_preco2.value
                )

            dados = {
                "nome": nome,
                "quantidade": quantidade,
                "tipoPreco": tipo,
                "preco": preco,
                "preco1": preco1,
                "preco2": preco2
            }

            if self.produto_editando:

                self.firebase.atualizar(
                    self.produto_editando["id"],
                    dados
                )

            else:

                self.firebase.cadastrar(dados)

            self.dialogo.open = False

            self.carregar()

        except ValueError as erro:

            self.mensagem_formulario.value = (
                str(erro)
                if str(erro) != "invalid literal for int() with base 10"
                else "Informe uma quantidade válida."
            )

            self.page.update()

        except Exception as erro:

            self.mensagem_formulario.value = str(erro)
            self.page.update()

    # ==============================================
    # EXCLUIR PRODUTO
    # ==============================================

    def excluir(self, produto):

        self.produto_excluir = produto

        self.dialogo_excluir.content = ft.Text(
            "Deseja realmente excluir o produto '{}'?"
            .format(produto["nome"])
        )

        self.dialogo_excluir.open = True
        self.page.update()

    def fechar_exclusao(self, e):

        self.dialogo_excluir.open = False
        self.page.update()

    def confirmar_exclusao(self, e):

        if not self.produto_excluir:
            return

        try:

            self.firebase.excluir(
                self.produto_excluir["id"]
            )

            self.dialogo_excluir.open = False
            self.produto_excluir = None

            self.carregar()

        except Exception as erro:

            self.mensagem.value = str(erro)
            self.page.update()