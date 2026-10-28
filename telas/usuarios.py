# -*- coding: utf-8 -*-
import flet as ft
from firebase_usuarios import FirebaseUsuarios, MODULOS

class TelaUsuarios:
    def __init__(self, page, sessao):
        self.page = page
        self.api = FirebaseUsuarios(sessao)
        self.uid_atual = sessao.get("uid")
        self.usuarios = []
        self.msg = ft.Text("")
        self.uid = ft.TextField(label="UID do Firebase Authentication", width=430)
        self.nome = ft.TextField(label="Nome", width=300)
        self.email = ft.TextField(label="E-mail", width=300)
        self.perfil = ft.Dropdown(label="Perfil", width=220, value="Funcionário", options=[ft.dropdown.Option(p) for p in ("Administrador", "Gerente", "Funcionário")])
        self.ativo = ft.Checkbox(label="Usuário ativo", value=True)
        self.checks = {m: ft.Checkbox(label=m, value=False) for m in MODULOS if m != "Usuários"}
        self.lista = ft.Column(spacing=8)
        self.dialogo_edicao = ft.AlertDialog(
            modal=True,
            title=ft.Text("Cadastrar usuário"),
            content=ft.Container(
                width=680,
                height=470,
                content=ft.Column([
                    self.uid, self.nome, self.email,
                    ft.Row([self.perfil, self.ativo], wrap=True),
                    ft.Text("Módulos autorizados", weight=ft.FontWeight.BOLD),
                    ft.Column(list(self.checks.values()), spacing=2),
                ], scroll=ft.ScrollMode.AUTO, spacing=12),
            ),
            actions=[
                ft.TextButton("Cancelar", on_click=self.fechar_edicao),
                ft.ElevatedButton("Salvar perfil", on_click=self.salvar),
            ],
        )
        self.page.overlay.append(self.dialogo_edicao)
        self.conteudo = ft.Column([
            ft.Text("Usuários e permissões", size=23, weight=ft.FontWeight.BOLD),
            ft.Text("Crie o login no Firebase Authentication e informe o UID no cadastro."),
            ft.Row([
                ft.ElevatedButton("Novo usuário", on_click=self.novo_usuario),
                ft.OutlinedButton("Atualizar", on_click=self.carregar),
            ], wrap=True),
            self.msg, ft.Divider(),
            ft.Text("Usuários cadastrados", size=18, weight=ft.FontWeight.BOLD),
            self.lista,
        ], spacing=12, tight=True)

    def fechar_edicao(self, e=None):
        self.dialogo_edicao.open = False
        self.page.update()

    def novo_usuario(self, e=None):
        self.limpar()
        self.uid.read_only = False
        self.dialogo_edicao.title.value = "Cadastrar usuário"
        self.dialogo_edicao.open = True
        self.page.update()

    def construir(self):
        return self.conteudo

    def carregar(self, e=None):
        try:
            perfil = self.api.meu_perfil()
            if perfil.get("perfil") != "Administrador":
                raise PermissionError("Somente administradores podem gerenciar usuários.")
            self.usuarios = self.api.listar_usuarios()
            self.lista.controls = [ft.Row([
                ft.Text("{} — {} — {}".format(u.get("nome", ""), u.get("email", ""), u.get("perfil", "")), width=520),
                ft.Text("Ativo" if u.get("ativo") else "Inativo"),
                ft.TextButton("Editar", on_click=lambda e, registro=u: self.editar(registro))
            ], wrap=True) for u in sorted(self.usuarios, key=lambda x: x.get("nome", ""))]
            self.msg.value = "{} usuário(s).".format(len(self.usuarios))
        except Exception as erro:
            self.msg.value = "Erro: " + str(erro)
        self.page.update()

    def editar(self, u):
        self.uid.value = u.get("id", "")
        self.nome.value = u.get("nome", "")
        self.email.value = u.get("email", "")
        self.perfil.value = u.get("perfil", "Funcionário")
        self.ativo.value = bool(u.get("ativo"))
        for modulo, check in self.checks.items():
            check.value = modulo in u.get("permissoes", [])
        self.uid.read_only = True
        self.dialogo_edicao.title.value = "Editar usuário"
        self.dialogo_edicao.open = True
        self.page.update()

    def limpar(self, e=None):
        self.uid.value = self.nome.value = self.email.value = ""
        self.perfil.value = "Funcionário"
        self.ativo.value = True
        for check in self.checks.values():
            check.value = False
        self.page.update()

    def salvar(self, e):
        try:
            perfil = self.api.meu_perfil()
            if perfil.get("perfil") != "Administrador":
                raise PermissionError("Acesso restrito ao administrador.")
            uid = (self.uid.value or "").strip()
            if not uid or not self.nome.value or not self.email.value:
                raise ValueError("Informe UID, nome e e-mail.")
            if uid == self.uid_atual and (not self.ativo.value or self.perfil.value != "Administrador"):
                raise ValueError("Não é permitido retirar seu próprio acesso de administrador.")
            antigo = next((u for u in self.usuarios if u["id"] == uid), None)
            if antigo and antigo.get("perfil") == "Administrador" and (not self.ativo.value or self.perfil.value != "Administrador"):
                outros = [u for u in self.usuarios if u["id"] != uid and u.get("perfil") == "Administrador" and u.get("ativo")]
                if not outros:
                    raise ValueError("Não é permitido desativar o último administrador.")
            dados = {"nome": self.nome.value.strip(), "email": self.email.value.strip(), "perfil": self.perfil.value,
                     "ativo": bool(self.ativo.value), "permissoes": [m for m,c in self.checks.items() if c.value]}
            self.api.salvar_perfil(uid, dados, existente=bool(antigo))
            self.dialogo_edicao.open = False
            self.carregar()
            self.msg.value = "Perfil salvo com sucesso."
        except Exception as erro:
            self.msg.value = "Não foi possível salvar: " + str(erro)
        self.page.update()
