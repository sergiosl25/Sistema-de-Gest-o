# -*- coding: utf-8 -*-
"""Perfis no Firestore. A autorização real depende das regras do Firestore."""
import requests
from firebase_vendas import FirebaseVendas

MODULOS = ["Dashboard", "Clientes", "Produtos", "Orçamentos", "Pedidos e Vendas", "Produção", "Entregas", "Caixa", "Financeiro", "Relatórios", "Usuários"]

class FirebaseUsuarios(FirebaseVendas):
    def meu_perfil(self):
        uid = self.sessao.get("uid")
        if not uid:
            raise PermissionError("Sessão sem identificador de usuário.")
        resposta = requests.get(self.base_url + "/usuarios/" + uid, headers=self.headers(), timeout=25)
        if resposta.status_code == 404:
            raise PermissionError("Perfil não cadastrado no Firestore. Configure o administrador inicial.")
        self.verificar_resposta(resposta)
        dados = {k: self.decodificar(v) for k, v in resposta.json().get("fields", {}).items()}
        dados["id"] = uid
        return dados

    def listar_usuarios(self):
        return self.listar_colecao("usuarios")

    def salvar_perfil(self, uid, dados, existente=False):
        if not uid or "/" in uid:
            raise ValueError("Informe o UID válido do Firebase Authentication.")
        if dados.get("perfil") not in ("Administrador", "Gerente", "Funcionário"):
            raise ValueError("Perfil inválido.")
        dados = dict(dados)
        dados["permissoes"] = [m for m in dados.get("permissoes", []) if m in MODULOS and m != "Usuários"]
        if dados["perfil"] != "Administrador":
            dados["permissoes"] = [m for m in dados["permissoes"] if m != "Usuários"]
        resposta = requests.patch(
            self.base_url + "/usuarios/" + uid,
            headers=self.headers(),
            params={"currentDocument.exists": str(bool(existente)).lower()},
            json={"fields": {k: self.codificar(v) for k,v in dados.items()}},
            timeout=25,
        )
        self.verificar_resposta(resposta)
        return resposta.json()
