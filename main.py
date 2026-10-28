# -*- coding: utf-8 -*-

import os
import flet as ft
from auth import FirebaseAuth
from telas.clientes import TelaClientes
from telas.produtos import TelaProdutos
from telas.vendas import TelaVendas
from telas.producao import TelaProducao
from telas.entregas import TelaEntregas
from telas.caixa import TelaCaixa
from telas.financeiro import TelaFinanceiro
from telas.dashboard import TelaDashboard
from telas.relatorios import TelaRelatorios
from telas.orcamentos import TelaOrcamentos
from telas.usuarios import TelaUsuarios
from firebase_usuarios import FirebaseUsuarios, MODULOS


# =====================================================
# CORES DO SISTEMA
# =====================================================

AZUL_ESCURO = "#0F172A"
AZUL_PRINCIPAL = "#2563EB"
AZUL_CLARO = "#DBEAFE"

FUNDO = "#F1F5F9"
BRANCO = "#FFFFFF"

TEXTO = "#1E293B"
TEXTO_SECUNDARIO = "#64748B"

VERDE = "#16A34A"
AMARELO = "#F59E0B"
VERMELHO = "#DC2626"


# =====================================================
# SISTEMA ALVES PERSONALIZADOS
# =====================================================

class AlvesPersonalizados:

    def __init__(self, page):

        self.page = page

        self.page.title = "Alvespersonalizados"
        self.page.bgcolor = FUNDO
        self.page.padding = 0
        self.page.spacing = 0
        self.page.theme_mode = ft.ThemeMode.LIGHT

        self.usuario_atual = None
        self.firebase_auth = FirebaseAuth()
        self.sessao_usuario = None
        self.perfil = None
        self.modulo_atual = "Dashboard"
        self.perfil = None

        self.campo_email = None
        self.campo_senha = None
        self.mensagem_login = None

        self.area_conteudo = None
        self.texto_titulo = None

        self.abrir_login()

    # =================================================
    # TELA DE LOGIN
    # =================================================

    def abrir_login(self):

        self.page.clean()

        self.campo_email = ft.TextField(
            label="E-mail",
            prefix_icon=ft.icons.EMAIL_OUTLINED,
            border_radius=10,
            width=320,
            autofocus=True,
        )

        self.campo_senha = ft.TextField(
            label="Senha",
            password=True,
            can_reveal_password=True,
            prefix_icon=ft.icons.LOCK_OUTLINE,
            border_radius=10,
            width=320,
            on_submit=self.entrar,
        )

        self.mensagem_login = ft.Text(
            "",
            color=VERMELHO,
            size=12,
        )

        formulario = ft.Container(
            width=390,
            padding=30,
            bgcolor=BRANCO,
            border_radius=18,
            shadow=ft.BoxShadow(
                blur_radius=25,
                spread_radius=1,
                color="#22000000",
                offset=ft.Offset(0, 8),
            ),
            content=ft.Column(
                [
                    ft.Icon(
                        ft.icons.STORE,
                        size=55,
                        color=AZUL_PRINCIPAL,
                    ),

                    ft.Text(
                        "ALVESPERSONALIZADOS",
                        size=23,
                        weight=ft.FontWeight.BOLD,
                        color=AZUL_ESCURO,
                        text_align=ft.TextAlign.CENTER,
                    ),

                    ft.Text(
                        "Sistema de Gestão",
                        size=14,
                        color=TEXTO_SECUNDARIO,
                    ),

                    ft.Divider(height=20),

                    self.campo_email,
                    self.campo_senha,
                    self.mensagem_login,

                    ft.ElevatedButton(
                        text="ENTRAR",
                        icon=ft.icons.LOGIN,
                        width=320,
                        height=48,
                        bgcolor=AZUL_PRINCIPAL,
                        color=BRANCO,
                        elevation=6,
                        on_click=self.entrar,
                    ),

                    ft.Text(
                        "Versão de demonstração",
                        size=11,
                        color=TEXTO_SECUNDARIO,
                    ),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=15,
                tight=True,
            ),
        )

        tela = ft.Container(
            expand=True,
            bgcolor=FUNDO,
            alignment=ft.alignment.center,
            content=formulario,
        )

        self.page.add(tela)

    # =================================================
    # LOGIN REAL COM FIREBASE
    # =================================================

    def entrar(self, e):

        email = (self.campo_email.value or "").strip()
        senha = self.campo_senha.value or ""

        if not email or not senha:
            self.mensagem_login.value = (
                "Informe o e-mail e a senha."
            )
            self.page.update()
            return

        self.mensagem_login.value = "Autenticando..."
        self.page.update()

        resultado = self.firebase_auth.login(
            email,
            senha
        )

        # Limpa a senha após a tentativa
        self.campo_senha.value = ""

        if not resultado["sucesso"]:

            self.mensagem_login.value = resultado["mensagem"]
            self.page.update()
            return

        self.sessao_usuario = {
            "uid": resultado["uid"],
            "email": resultado["email"],
            "id_token": resultado["id_token"],
            "refresh_token": resultado["refresh_token"],
            "expires_in": resultado["expires_in"]
        }

        try:
            self.perfil = FirebaseUsuarios(self.sessao_usuario).meu_perfil()
            if not self.perfil.get("ativo", False):
                raise PermissionError("Usuário desativado.")
        except Exception as erro:
            self.sessao_usuario = None
            self.perfil = None
            self.mensagem_login.value = "Acesso não autorizado: " + str(erro)
            self.page.update()
            return
        self.usuario_atual = resultado["email"]

        print("Login realizado com sucesso.")

        self.abrir_sistema()

    # =================================================
    # BOTÃO DO MENU
    # =================================================

    def botao_menu(self, texto, icone):

        selecionado = self.modulo_atual == texto

        return ft.Container(
            border_radius=10,
            bgcolor=(
                AZUL_PRINCIPAL
                if selecionado
                else AZUL_ESCURO
            ),
            content=ft.TextButton(
                text=texto,
                icon=icone,
                width=195,
                style=ft.ButtonStyle(
                    color=BRANCO,
                    padding=15,
                ),
                on_click=lambda e, nome=texto: (
                    self.abrir_modulo(nome)
                ),
            ),
        )

    # =================================================
    # MENU LATERAL
    # =================================================

    def criar_menu(self):

        botoes = [
            ("Dashboard", ft.icons.DASHBOARD),
            ("Clientes", ft.icons.PEOPLE),
            ("Produtos", ft.icons.INVENTORY_2),
            ("Orçamentos", ft.icons.DESCRIPTION),
            ("Pedidos e Vendas", ft.icons.SHOPPING_BAG),
            ("Produção", ft.icons.BUILD),
            ("Entregas", ft.icons.LOCAL_SHIPPING),
            ("Caixa", ft.icons.ACCOUNT_BALANCE_WALLET),
            ("Financeiro", ft.icons.ATTACH_MONEY),
            ("Relatórios", ft.icons.ANALYTICS),
            ("Usuários", ft.icons.ADMIN_PANEL_SETTINGS),
        ]

        itens = [
            ft.Text(
                "ALVES",
                size=26,
                weight=ft.FontWeight.BOLD,
                color=BRANCO,
            ),

            ft.Text(
                "PERSONALIZADOS",
                size=12,
                color="#CBD5E1",
            ),

            ft.Divider(color="#334155"),
        ]

        for nome, icone in botoes:
            if not self.pode_acessar(nome):
                continue

            itens.append(
                self.botao_menu(nome, icone)
            )

        itens.extend(
            [
                ft.Divider(color="#334155"),

                ft.TextButton(
                    text="Sair",
                    icon=ft.icons.LOGOUT,
                    style=ft.ButtonStyle(
                        color=BRANCO,
                    ),
                    on_click=self.sair,
                ),
            ]
        )

        return ft.Container(
            width=225,
            bgcolor=AZUL_ESCURO,
            padding=15,
            content=ft.Column(
                itens,
                scroll=ft.ScrollMode.AUTO,
                spacing=8,
            ),
        )

    # =================================================
    # ABRIR SISTEMA
    # =================================================

    def abrir_sistema(self):

        self.page.clean()

        self.texto_titulo = ft.Text(
            "Dashboard",
            size=26,
            weight=ft.FontWeight.BOLD,
            color=TEXTO,
        )

        self.area_conteudo = ft.Column(
            spacing=10,
            scroll=ft.ScrollMode.AUTO,
        )

        barra_superior = ft.Container(
            bgcolor=BRANCO,
            padding=20,
            border=ft.border.only(
                bottom=ft.BorderSide(
                    1,
                    "#E2E8F0",
                )
            ),
            content=ft.Row(
                [
                    self.texto_titulo,

                    ft.Container(expand=True),

                    ft.Icon(
                        ft.icons.ACCOUNT_CIRCLE,
                        color=AZUL_PRINCIPAL,
                        size=30,
                    ),

                    ft.Text(
                        self.usuario_atual,
                        color=TEXTO,
                        size=12,
                    ),
                ],
            ),
        )

        painel = ft.Column(
            [
                barra_superior,

                ft.Container(
                    content=self.area_conteudo,
                    padding=20,
                    expand=True,
                    alignment=ft.alignment.top_left,
                ),
            ],
            expand=True,
            spacing=0,
        )

        layout = ft.Row(
            [
                self.criar_menu(),
                ft.Container(
                    content=painel,
                    expand=True,
                ),
            ],
            expand=True,
            spacing=0,
        )

        self.page.add(layout)

        if not self.pode_acessar(self.modulo_atual):
            self.modulo_atual = next((m for m in MODULOS if self.pode_acessar(m)), "Dashboard")
        self.abrir_modulo(self.modulo_atual)

    # =================================================
    # CARTÕES DO DASHBOARD
    # =================================================

    def criar_card(
        self,
        titulo,
        valor,
        icone,
        cor,
    ):

        return ft.Container(
            col={
                "xs": 12,
                "sm": 6,
                "lg": 3,
            },

            bgcolor=BRANCO,
            padding=22,
            border_radius=16,

            shadow=ft.BoxShadow(
                blur_radius=15,
                spread_radius=1,
                color="#22000000",
                offset=ft.Offset(0, 6),
            ),

            content=ft.Column(
                [
                    ft.Icon(
                        icone,
                        size=34,
                        color=cor,
                    ),

                    ft.Text(
                        titulo,
                        size=14,
                        color=TEXTO_SECUNDARIO,
                    ),

                    ft.Text(
                        valor,
                        size=28,
                        weight=ft.FontWeight.BOLD,
                        color=TEXTO,
                    ),
                ],
                spacing=12,
            ),
        )

    # =================================================
    # DASHBOARD
    # =================================================

    def criar_dashboard(self):

        return ft.Column(
            [
                ft.Text(
                    "Visão geral da loja",
                    size=20,
                    weight=ft.FontWeight.BOLD,
                    color=TEXTO,
                ),

                ft.Text(
                    "Acompanhe os principais indicadores.",
                    color=TEXTO_SECUNDARIO,
                ),

                ft.Container(height=15),

                ft.ResponsiveRow(
                    [
                        self.criar_card(
                            "Vendas do mês",
                            "—",
                            ft.icons.SHOPPING_CART,
                            AZUL_PRINCIPAL,
                        ),

                        self.criar_card(
                            "Em produção",
                            "—",
                            ft.icons.BUILD,
                            AMARELO,
                        ),

                        self.criar_card(
                            "Faturamento",
                            "—",
                            ft.icons.ATTACH_MONEY,
                            VERDE,
                        ),

                        self.criar_card(
                            "Clientes",
                            "—",
                            ft.icons.PEOPLE,
                            AZUL_PRINCIPAL,
                        ),
                    ],
                    spacing=15,
                    run_spacing=15,
                ),

                ft.Container(height=25),

                ft.Container(
                    bgcolor=BRANCO,
                    padding=25,
                    border_radius=15,

                    shadow=ft.BoxShadow(
                        blur_radius=12,
                        color="#18000000",
                        offset=ft.Offset(0, 5),
                    ),

                    content=ft.Column(
                        [
                            ft.Text(
                                "Bem-vindo ao Alvespersonalizados!",
                                size=19,
                                weight=ft.FontWeight.BOLD,
                                color=TEXTO,
                            ),

                            ft.Text(
                                "O sistema está sendo preparado "
                                "para integração com o Firebase.",
                                color=TEXTO_SECUNDARIO,
                            ),
                        ],
                    ),
                ),
            ],
        )

    # =================================================
    # TELAS DOS MÓDULOS
    # =================================================

    def criar_tela_modulo(self, nome):

        return ft.Container(
            bgcolor=BRANCO,
            padding=30,
            border_radius=15,

            shadow=ft.BoxShadow(
                blur_radius=12,
                color="#18000000",
                offset=ft.Offset(0, 5),
            ),

            content=ft.Column(
                [
                    ft.Icon(
                        ft.icons.CONSTRUCTION,
                        size=50,
                        color=AZUL_PRINCIPAL,
                    ),

                    ft.Text(
                        nome,
                        size=24,
                        weight=ft.FontWeight.BOLD,
                        color=TEXTO,
                    ),

                    ft.Text(
                        "Este módulo será implementado "
                        "nas próximas etapas.",
                        color=TEXTO_SECUNDARIO,
                    ),
                ],
                horizontal_alignment=(
                    ft.CrossAxisAlignment.CENTER
                ),
                spacing=15,
            ),
        )

    # =================================================
    # NAVEGAÇÃO ENTRE MÓDULOS
    # =================================================

    def pode_acessar(self, nome):
        if not self.perfil or not self.perfil.get("ativo"):
            return False
        return self.perfil.get("perfil") == "Administrador" or nome in self.perfil.get("permissoes", [])

    def abrir_modulo(self, nome):
        if not self.pode_acessar(nome):
            self.modulo_atual = nome
            self.texto_titulo.value = "Acesso negado"
            self.area_conteudo.controls.clear()
            self.area_conteudo.controls.append(ft.Text("Você não possui permissão para acessar este módulo."))
            self.page.update()
            return

        if nome != "Dashboard" and hasattr(self, "tela_dashboard"):
            self.tela_dashboard.ativo = False

        self.modulo_atual = nome

        self.texto_titulo.value = nome

        self.area_conteudo.controls.clear()

        if nome == "Dashboard":
            if not self.sessao_usuario:
                self.area_conteudo.controls.append(ft.Text("Faça login novamente."))
            else:
                self.tela_dashboard = TelaDashboard(self.page, self.sessao_usuario)
                self.area_conteudo.controls.append(self.tela_dashboard.construir())
                self.page.update()
                self.tela_dashboard.carregar()
                self.tela_dashboard.iniciar_atualizacao()
                return

        elif nome == "Usuários":
            self.tela_usuarios = TelaUsuarios(self.page, self.sessao_usuario)
            self.area_conteudo.controls.append(self.tela_usuarios.construir())
            self.page.update()
            self.tela_usuarios.carregar()
            return

        elif nome == "Clientes":

            if not self.sessao_usuario:

                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )

            else:

                self.tela_clientes = TelaClientes(
                    self.page,
                    self.sessao_usuario
                )

                self.area_conteudo.controls.append(
                    self.tela_clientes.construir()
                )

                self.page.update()
                self.tela_clientes.carregar()
                return

        elif nome == "Produtos":

            if not self.sessao_usuario:

                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )

            else:

                self.tela_produtos = TelaProdutos(
                    self.page,
                    self.sessao_usuario
                )

                self.area_conteudo.controls.append(
                    self.tela_produtos.construir()
                )

                self.page.update()
                self.tela_produtos.carregar()
                return
            
        elif nome == "Orçamentos":
            if not self.sessao_usuario:
                self.area_conteudo.controls.append(ft.Text("Faça login novamente."))
            else:
                self.tela_orcamentos = TelaOrcamentos(self.page, self.sessao_usuario)
                self.area_conteudo.controls.append(self.tela_orcamentos.construir())
                self.page.update()
                self.tela_orcamentos.carregar()
                return

        elif nome == "Pedidos e Vendas":
    
            if not self.sessao_usuario:

                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )

            else:

                self.tela_vendas = TelaVendas(
                    self.page,
                    self.sessao_usuario
                )

                self.area_conteudo.controls.append(
                    self.tela_vendas.construir()
                )

                self.page.update()

                self.tela_vendas.carregar()

                return
            
        elif nome == "Produção":
    
            if not self.sessao_usuario:

                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )

            else:

                self.tela_producao = TelaProducao(
                    self.page,
                    self.sessao_usuario
                )

                self.area_conteudo.controls.append(
                    self.tela_producao.construir()
                )

                self.page.update()

                self.tela_producao.carregar()

                return
            
        elif nome == "Entregas":
    
            if not self.sessao_usuario:
                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )

            else:
                self.tela_entregas = TelaEntregas(
                    self.page,
                    self.sessao_usuario
                )

                self.area_conteudo.controls.append(
                    self.tela_entregas.construir()
                )

                self.page.update()
                self.tela_entregas.carregar()
                return
        
        elif nome == "Caixa":
    
            if not self.sessao_usuario:
                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )

            else:
                self.tela_caixa = TelaCaixa(
                    self.page,
                    self.sessao_usuario
                )

                self.area_conteudo.controls.append(
                    self.tela_caixa.construir()
                )

                self.page.update()
                self.tela_caixa.carregar()
                return
        
        elif nome == "Financeiro":
    
            if not self.sessao_usuario:
                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )

            else:
                self.tela_financeiro = TelaFinanceiro(
                    self.page,
                    self.sessao_usuario
                )

                self.area_conteudo.controls.append(
                    self.tela_financeiro.construir()
                )

                self.page.update()
                self.tela_financeiro.carregar()
                return
                  
        elif nome == "Relatórios":

            if not self.sessao_usuario:
                self.area_conteudo.controls.append(
                    ft.Text("Faça login novamente.")
                )
            else:
                self.tela_relatorios = TelaRelatorios(
                    self.page, self.sessao_usuario
                )
                self.area_conteudo.controls.append(
                    self.tela_relatorios.construir()
                )
                self.page.update()
                self.tela_relatorios.carregar()
                return

        else:

            self.area_conteudo.controls.append(
                self.criar_tela_modulo(nome)
            )

        self.page.update()
    # =================================================
    # ENCERRAR SESSÃO
    # =================================================

    def sair(self, e=None):

        self.usuario_atual = None
        self.sessao_usuario = None
        self.modulo_atual = "Dashboard"

        self.abrir_login()


# =====================================================
# INICIALIZAÇÃO
# =====================================================

def main(page: ft.Page):

    AlvesPersonalizados(page)


if __name__ == "__main__":

    print("Iniciando Alvespersonalizados...")

    # Em hospedagem (ex.: Render), PORT e HOST são definidos pelo ambiente.
    # No Windows, mantém a porta 8551 utilizada durante o desenvolvimento.
    porta = int(os.environ.get("PORT", "8551"))
    host = os.environ.get("HOST", "127.0.0.1")

    ft.app(
        target=main,
        view=ft.AppView.WEB_BROWSER,
        host=host,
        port=porta,
    )
