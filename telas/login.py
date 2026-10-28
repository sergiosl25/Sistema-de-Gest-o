# -*- coding: utf-8 -*-

import flet as ft

from tema import (
    AZUL_ESCURO,
    AZUL_PRINCIPAL,
    FUNDO,
    BRANCO,
    TEXTO,
    TEXTO_SECUNDARIO,
    VERMELHO,
)


class TelaLogin:

    def __init__(self, page, ao_entrar):
        self.page = page
        self.ao_entrar = ao_entrar

        self.usuario = ft.TextField(
            label="E-mail",
            width=320,
            prefix_icon=ft.Icons.EMAIL_OUTLINED,
            border_radius=10,
        )

        self.senha = ft.TextField(
            label="Senha",
            width=320,
            password=True,
            can_reveal_password=True,
            prefix_icon=ft.Icons.LOCK_OUTLINE,
            border_radius=10,
            on_submit=self.entrar,
        )

        self.mensagem = ft.Text(
            "",
            color=VERMELHO,
            size=12,
        )

    def entrar(self, e):

        email = (self.usuario.value or "").strip()
        senha = self.senha.value or ""

        if not email or not senha:
            self.mensagem.value = "Informe o e-mail e a senha."
            self.page.update()
            return

        # ATENÇÃO:
        # Demonstração visual.
        # Ainda não existe autenticação Firebase.
        self.ao_entrar(email)

    def construir(self):

        formulario = ft.Container(
            width=390,
            padding=30,
            bgcolor=BRANCO,
            border_radius=18,
            shadow=ft.BoxShadow(
                blur_radius=25,
                color="#22000000",
                offset=ft.Offset(0, 8),
            ),
            content=ft.Column(
                [
                    ft.Icon(
                        ft.Icons.STORE,
                        size=55,
                        color=AZUL_PRINCIPAL,
                    ),
                    ft.Text(
                        "ALVES PERSONALIZADOS",
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
                    self.usuario,
                    self.senha,
                    self.mensagem,
                    ft.Container(
                        content=ft.ElevatedButton(
                            "ENTRAR",
                            icon=ft.Icons.LOGIN,
                            width=320,
                            height=48,
                            bgcolor=AZUL_PRINCIPAL,
                            color=BRANCO,
                            on_click=self.entrar,
                        ),
                        padding=ft.Padding.only(top=10),
                    ),
                    ft.Text(
                        "Versão inicial — Login demonstrativo",
                        size=11,
                        color=TEXTO_SECUNDARIO,
                    ),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=15,
                tight=True,
            ),
        )

        return ft.Container(
            expand=True,
            bgcolor=FUNDO,
            alignment=ft.Alignment(0, 0),
            content=formulario,
        )
