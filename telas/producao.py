# -*- coding: utf-8 -*-

import flet as ft

from firebase_vendas import FirebaseVendas


AZUL = "#2563EB"
VERDE = "#16A34A"
AMARELO = "#F59E0B"
VERMELHO = "#DC2626"
BRANCO = "#FFFFFF"
TEXTO = "#1E293B"


class TelaProducao:

    def __init__(self, page, sessao):

        self.page = page
        self.api = FirebaseVendas(sessao)

        self.pedidos = []
        self.registros = []

        self.mensagem = ft.Text("", color=TEXTO)

        self.filtro = ft.Dropdown(
            label="Filtrar produção",
            width=260,
            value="Todos",
            options=[
                ft.dropdown.Option("Todos"),
                ft.dropdown.Option("Aguardando liberação"),
                ft.dropdown.Option("Em produção"),
                ft.dropdown.Option("Finalizado")
            ],
            on_change=self.aplicar_filtro
        )

        self.tabela = ft.DataTable(
            columns=[
                ft.DataColumn(ft.Text("Cliente")),
                ft.DataColumn(ft.Text("Produto")),
                ft.DataColumn(ft.Text("Qtd.")),
                ft.DataColumn(ft.Text("Arte")),
                ft.DataColumn(ft.Text("Produção")),
                ft.DataColumn(ft.Text("Ações"))
            ],
            rows=[],
            column_spacing=22
        )

        self.dialogo = ft.AlertDialog(
            modal=True,
            title=ft.Text("Detalhes da produção"),
            content=ft.Text(""),
            actions=[
                ft.TextButton(
                    "Fechar",
                    on_click=self.fechar_dialogo
                )
            ]
        )

        self.page.overlay.append(self.dialogo)

        self.conteudo = ft.Column(
            controls=[
                ft.Row(
                    controls=[
                        ft.Text(
                            "Controle de Produção",
                            size=24,
                            weight=ft.FontWeight.BOLD,
                            color=TEXTO
                        ),
                        ft.ElevatedButton(
                            "ATUALIZAR",
                            icon=ft.icons.REFRESH,
                            bgcolor=AZUL,
                            color=BRANCO,
                            on_click=self.carregar
                        )
                    ],
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                    wrap=True
                ),

                ft.Text(
                    "Acompanhe as artes e a produção dos pedidos pagos."
                ),

                self.filtro,

                self.mensagem,

                ft.Container(
                    bgcolor=BRANCO,
                    padding=15,
                    border_radius=12,
                    content=ft.Row(
                        controls=[self.tabela],
                        scroll=ft.ScrollMode.AUTO
                    )
                )
            ],
            spacing=15,
            tight=True
        )

    def construir(self):
        return self.conteudo

    # ==========================================
    # CARREGAR PEDIDOS
    # ==========================================

    def carregar(self, e=None):

        self.mensagem.value = "Carregando produção..."
        self.page.update()

        try:

            self.pedidos = self.api.listar_pedidos()

            self.registros = []

            for pedido in self.pedidos:

                for indice, item in enumerate(
                    pedido.get("itens", [])
                ):

                    self.registros.append({
                        "pedido": pedido,
                        "indice": indice,
                        "item": item
                    })

            self.aplicar_filtro()

        except Exception as erro:

            self.mensagem.value = (
                "Erro ao carregar produção: " + str(erro)
            )

            self.page.update()

    # ==========================================
    # FILTROS
    # ==========================================

    def aplicar_filtro(self, e=None):

        filtro = self.filtro.value

        registros = self.registros

        if filtro != "Todos":

            registros = [
                registro
                for registro in registros
                if registro["item"].get(
                    "statusProducao",
                    "Aguardando liberação"
                ) == filtro
            ]

        self.desenhar_tabela(registros)

    # ==========================================
    # TABELA
    # ==========================================

    def desenhar_tabela(self, registros):

        self.tabela.rows = []

        for registro in registros:

            pedido = registro["pedido"]
            item = registro["item"]

            arte = item.get(
                "statusArte", "Aguardando arte"
            )

            producao = item.get(
                "statusProducao",
                "Aguardando liberação"
            )

            cor = (
                VERDE if producao == "Finalizado"
                else AMARELO
                if producao == "Em produção"
                else VERMELHO
            )

            self.tabela.rows.append(
                ft.DataRow(
                    cells=[
                        ft.DataCell(
                            ft.Text(
                                str(pedido.get(
                                    "clienteNome", ""
                                ))
                            )
                        ),

                        ft.DataCell(
                            ft.Text(
                                str(item.get(
                                    "produtoNome", ""
                                ))
                            )
                        ),

                        ft.DataCell(
                            ft.Text(
                                str(item.get(
                                    "quantidade", 0
                                ))
                            )
                        ),

                        ft.DataCell(
                            ft.Text(arte)
                        ),

                        ft.DataCell(
                            ft.Text(
                                producao,
                                color=cor,
                                weight=ft.FontWeight.BOLD
                            )
                        ),

                        ft.DataCell(
                            ft.ElevatedButton(
                                "GERENCIAR",
                                bgcolor=AZUL,
                                color=BRANCO,
                                on_click=lambda e, r=registro:
                                    self.abrir_detalhes(r)
                            )
                        )
                    ]
                )
            )

        self.mensagem.value = (
            "{} item(ns) encontrado(s).".format(
                len(registros)
            )
        )

        self.page.update()

    # ==========================================
    # DETALHES DO ITEM
    # ==========================================

    def abrir_detalhes(self, registro):

        pedido = registro["pedido"]
        item = registro["item"]

        status_arte = item.get(
            "statusArte", "Aguardando arte"
        )

        status_producao = item.get(
            "statusProducao",
            "Aguardando liberação"
        )

        controles = [
            ft.Text(
                "Cliente: " + str(
                    pedido.get("clienteNome", "")
                ),
                weight=ft.FontWeight.BOLD
            ),

            ft.Text(
                "Produto: " + str(
                    item.get("produtoNome", "")
                )
            ),

            ft.Text(
                "Quantidade: " + str(
                    item.get("quantidade", 0)
                )
            ),

            ft.Text(
                "Personalização: " + str(
                    item.get("personalizacao", "")
                )
            ),

            ft.Text(
                "Origem da arte: " + str(
                    item.get("origemArte", "")
                )
            ),

            ft.Text(
                "Instruções: " + str(
                    item.get("observacoes", "")
                )
            ),

            ft.Divider(),

            ft.Text(
                "Status da arte: " + status_arte
            ),

            ft.Text(
                "Status da produção: " + status_producao
            ),

            ft.Divider()
        ]

        # --------------------------------------
        # APROVAÇÃO DA ARTE
        # --------------------------------------

        if status_arte != "Aprovada":

            controles.append(
                ft.ElevatedButton(
                    "AGUARDANDO APROVAÇÃO",
                    bgcolor=AMARELO,
                    color=BRANCO,
                    on_click=lambda e:
                        self.atualizar_status(
                            registro,
                            {
                                "statusArte":
                                    "Aguardando aprovação"
                            }
                        )
                )
            )

            controles.append(
                ft.ElevatedButton(
                    "APROVAR ARTE",
                    bgcolor=VERDE,
                    color=BRANCO,
                    on_click=lambda e:
                        self.atualizar_status(
                            registro,
                            {
                                "statusArte": "Aprovada"
                            }
                        )
                )
            )

        # --------------------------------------
        # INICIAR PRODUÇÃO
        # --------------------------------------

        if status_producao == "Aguardando liberação":

            controles.append(
                ft.ElevatedButton(
                    "INICIAR PRODUÇÃO",
                    bgcolor=AZUL,
                    color=BRANCO,
                    on_click=lambda e:
                        self.iniciar_producao(registro)
                )
            )

        # --------------------------------------
        # FINALIZAR PRODUÇÃO
        # --------------------------------------

        if status_producao == "Em produção":

            controles.append(
                ft.ElevatedButton(
                    "FINALIZAR PRODUÇÃO",
                    bgcolor=VERDE,
                    color=BRANCO,
                    on_click=lambda e:
                        self.finalizar_producao(registro)
                )
            )

        self.dialogo.content = ft.Container(
            width=500,
            content=ft.Column(
                controls=controles,
                spacing=12,
                tight=True,
                scroll=ft.ScrollMode.AUTO
            )
        )

        self.dialogo.open = True
        self.page.update()

    # ==========================================
    # ATUALIZAR STATUS
    # ==========================================

    def atualizar_status(self, registro, alteracoes):

        pedido = registro["pedido"]
        indice = registro["indice"]

        try:

            self.api.atualizar_item(
                pedido["id"],
                indice,
                alteracoes
            )

            self.dialogo.open = False

            self.carregar()

        except Exception as erro:

            self.mensagem.value = (
                "Erro ao atualizar: " + str(erro)
            )

            self.page.update()

    # ==========================================
    # INICIAR PRODUÇÃO
    # ==========================================

    def iniciar_producao(self, registro):

        pedido = registro["pedido"]
        item = registro["item"]

        if pedido.get("pagamento") != "Pago":

            self.mensagem.value = (
                "Produção bloqueada: pagamento não confirmado."
            )

            self.page.update()
            return

        if item.get("statusArte") != "Aprovada":

            self.mensagem.value = (
                "Produção bloqueada: aprove a arte primeiro."
            )

            self.page.update()
            return

        self.atualizar_status(
            registro,
            {"statusProducao": "Em produção"}
        )

    # ==========================================
    # FINALIZAR PRODUÇÃO
    # ==========================================

    def finalizar_producao(self, registro):

        item = registro["item"]

        if item.get("statusProducao") != "Em produção":

            self.mensagem.value = (
                "Inicie a produção antes de finalizar."
            )

            self.page.update()
            return

        self.atualizar_status(
            registro,
            {"statusProducao": "Finalizado"}
        )

    # ==========================================
    # FECHAR DETALHES
    # ==========================================

    def fechar_dialogo(self, e):

        self.dialogo.open = False
        self.page.update()
