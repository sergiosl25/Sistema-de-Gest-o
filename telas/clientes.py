# -*- coding: utf-8 -*-

import flet as ft

from firebase_clientes import FirebaseClientes


AZUL = "#2563EB"
BRANCO = "#FFFFFF"
TEXTO = "#1E293B"
CINZA = "#64748B"
VERMELHO = "#DC2626"


class TelaClientes:

    def __init__(self, page, sessao):

        self.page = page
        self.firebase = FirebaseClientes(sessao)

        self.clientes = []
        self.cliente_editando = None

        self.campo_pesquisa = ft.TextField(
            hint_text="Pesquisar por nome ou telefone",
            prefix_icon=ft.icons.SEARCH,
            expand=True,
            on_change=self.pesquisar
        )

        self.campo_nome = ft.TextField(
            label="Nome do cliente",
            autofocus=True
        )

        self.campo_telefone = ft.TextField(
            label="Telefone"
        )

        self.tabela = ft.DataTable(
            columns=[
                ft.DataColumn(ft.Text("Nome")),
                ft.DataColumn(ft.Text("Telefone")),
                ft.DataColumn(ft.Text("Ações"))
            ],
            rows=[],
            column_spacing=30
        )

        self.mensagem = ft.Text(
            "",
            color=CINZA
        )

        self.dialogo = ft.AlertDialog(
            modal=True,
            title=ft.Text("Cliente"),
            content=ft.Column(
                [
                    self.campo_nome,
                    self.campo_telefone
                ],
                tight=True,
                width=350
            ),
            actions=[
                ft.TextButton(
                    "Cancelar",
                    on_click=self.fechar_dialogo
                ),
                ft.ElevatedButton(
                    "Salvar",
                    bgcolor=AZUL,
                    color=BRANCO,
                    on_click=self.salvar
                )
            ]
        )

        self.dialogo_excluir = ft.AlertDialog(
            modal=True,
            title=ft.Text("Excluir cliente"),
            content=ft.Text(
                "Deseja realmente excluir este cliente?"
            ),
            actions=[
                ft.TextButton(
                    "Cancelar",
                    on_click=self.fechar_exclusao
                ),
                ft.ElevatedButton(
                    "Excluir",
                    bgcolor=VERMELHO,
                    color=BRANCO,
                    on_click=self.confirmar_exclusao
                )
            ]
        )

        self.cliente_excluir = None

        self.page.overlay.append(self.dialogo)
        self.page.overlay.append(self.dialogo_excluir)

        # =================================================
        # LAYOUT DA TELA CLIENTES
        # =================================================

        cabecalho = ft.Row(
            [
                ft.Text(
                    "Cadastro de Clientes",
                    size=22,
                    weight=ft.FontWeight.BOLD,
                    color=TEXTO,
                ),

                ft.ElevatedButton(
                    text="+ NOVO CLIENTE",
                    bgcolor=AZUL,
                    color=BRANCO,
                    elevation=5,
                    on_click=self.novo_cliente,
                ),
            ],
            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            wrap=True,
        )

        area_tabela = ft.Row(
            controls=[self.tabela],
            scroll=ft.ScrollMode.AUTO,
        )

        self.conteudo = ft.Column(
            controls=[
                cabecalho,

                self.campo_pesquisa,

                self.mensagem,

                ft.Container(
                    content=area_tabela,
                    bgcolor=BRANCO,
                    padding=15,
                    border_radius=12,
                ),
            ],
            spacing=12,
            tight=True,
        )
    def construir(self):
        return self.conteudo

    def carregar(self):

        self.mensagem.value = "Carregando clientes..."
        self.page.update()

        try:
            self.clientes = self.firebase.listar()
            self.atualizar_tabela(self.clientes)

            self.mensagem.value = (
                f"{len(self.clientes)} cliente(s) encontrado(s)."
            )

        except Exception as erro:
            self.mensagem.value = str(erro)

        self.page.update()

    def atualizar_tabela(self, clientes):

        self.tabela.rows.clear()

        for cliente in clientes:

            self.tabela.rows.append(
                ft.DataRow(
                    cells=[
                        ft.DataCell(
                            ft.Text(cliente["nome"])
                        ),
                        ft.DataCell(
                            ft.Text(cliente["telefone"])
                        ),
                        ft.DataCell(
                            ft.Row(
                                [
                                    ft.IconButton(
                                        icon=ft.icons.EDIT,
                                        icon_color=AZUL,
                                        tooltip="Editar",
                                        on_click=lambda e, c=cliente:
                                            self.editar(c)
                                    ),
                                    ft.IconButton(
                                        icon=ft.icons.DELETE,
                                        icon_color=VERMELHO,
                                        tooltip="Excluir",
                                        on_click=lambda e, c=cliente:
                                            self.excluir(c)
                                    )
                                ],
                                spacing=0
                            )
                        )
                    ]
                )
            )

    def pesquisar(self, e):

        termo = (
            self.campo_pesquisa.value or ""
        ).strip().lower()

        filtrados = [
            cliente
            for cliente in self.clientes
            if termo in cliente["nome"].lower()
            or termo in cliente["telefone"].lower()
        ]

        self.atualizar_tabela(filtrados)
        self.page.update()

    def novo_cliente(self, e):

        self.cliente_editando = None

        self.campo_nome.value = ""
        self.campo_telefone.value = ""

        self.dialogo.title = ft.Text("Novo cliente")
        self.dialogo.open = True

        self.page.update()

    def editar(self, cliente):

        self.cliente_editando = cliente

        self.campo_nome.value = cliente["nome"]
        self.campo_telefone.value = cliente["telefone"]

        self.dialogo.title = ft.Text("Editar cliente")
        self.dialogo.open = True

        self.page.update()

    def fechar_dialogo(self, e):

        self.dialogo.open = False
        self.page.update()

    def salvar(self, e):

        nome = (
            self.campo_nome.value or ""
        ).strip()

        telefone = (
            self.campo_telefone.value or ""
        ).strip()

        if not nome:
            self.mensagem.value = (
                "Informe o nome do cliente."
            )
            self.page.update()
            return

        try:

            if self.cliente_editando:

                self.firebase.atualizar(
                    self.cliente_editando["id"],
                    nome,
                    telefone
                )

            else:

                self.firebase.cadastrar(
                    nome,
                    telefone
                )

            self.dialogo.open = False

            self.carregar()

        except Exception as erro:

            self.mensagem.value = str(erro)
            self.page.update()

    def excluir(self, cliente):

        self.cliente_excluir = cliente

        self.dialogo_excluir.content = ft.Text(
            f"Deseja excluir o cliente "
            f"{cliente['nome']}?"
        )

        self.dialogo_excluir.open = True
        self.page.update()

    def fechar_exclusao(self, e):

        self.dialogo_excluir.open = False
        self.page.update()

    def confirmar_exclusao(self, e):

        if not self.cliente_excluir:
            return

        try:

            self.firebase.excluir(
                self.cliente_excluir["id"]
            )

            self.dialogo_excluir.open = False
            self.cliente_excluir = None

            self.carregar()

        except Exception as erro:

            self.mensagem.value = str(erro)
            self.page.update()
