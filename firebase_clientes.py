# -*- coding: utf-8 -*-

import requests

from firebase_config import FIREBASE_PROJECT_ID


class FirebaseClientes:

    def __init__(self, sessao):
        self.sessao = sessao

        self.base_url = (
            "https://firestore.googleapis.com/v1/projects/"
            f"{FIREBASE_PROJECT_ID}/databases/(default)/documents/clientes"
        )

    def headers(self):
        return {
            "Authorization": (
                f"Bearer {self.sessao['id_token']}"
            ),
            "Content-Type": "application/json"
        }

    def tratar_erro(self, resposta):
        try:
            erro = resposta.json().get("error", {})
            mensagem = erro.get("message", "")
        except ValueError:
            mensagem = resposta.text

        if resposta.status_code == 401:
            raise Exception(
                "Sessão expirada. Faça login novamente."
            )

        if resposta.status_code == 403:
            raise Exception(
                "Acesso negado pelas regras do Firebase."
            )

        raise Exception(
            mensagem or "Erro ao acessar o Firebase."
        )

    def listar(self):

        clientes = []
        token = None

        while True:

            parametros = {"pageSize": 100}

            if token:
                parametros["pageToken"] = token

            resposta = requests.get(
                self.base_url,
                headers=self.headers(),
                params=parametros,
                timeout=20
            )

            if not resposta.ok:
                self.tratar_erro(resposta)

            dados = resposta.json()

            for documento in dados.get("documents", []):

                campos = documento.get("fields", {})

                clientes.append({
                    "id": documento["name"].split("/")[-1],
                    "nome": campos.get(
                        "nome", {}
                    ).get("stringValue", ""),
                    "telefone": campos.get(
                        "telefone", {}
                    ).get("stringValue", "")
                })

            token = dados.get("nextPageToken")

            if not token:
                break

        return sorted(
            clientes,
            key=lambda c: c["nome"].lower()
        )

    def cadastrar(self, nome, telefone):

        dados = {
            "fields": {
                "nome": {"stringValue": nome},
                "telefone": {"stringValue": telefone}
            }
        }

        resposta = requests.post(
            self.base_url,
            headers=self.headers(),
            json=dados,
            timeout=20
        )

        if not resposta.ok:
            self.tratar_erro(resposta)

        return resposta.json()

    def atualizar(self, cliente_id, nome, telefone):

        dados = {
            "fields": {
                "nome": {"stringValue": nome},
                "telefone": {"stringValue": telefone}
            }
        }

        resposta = requests.patch(
            f"{self.base_url}/{cliente_id}",
            headers=self.headers(),
            params=[
                ("updateMask.fieldPaths", "nome"),
                ("updateMask.fieldPaths", "telefone")
            ],
            json=dados,
            timeout=20
        )

        if not resposta.ok:
            self.tratar_erro(resposta)

        return resposta.json()

    def excluir(self, cliente_id):

        resposta = requests.delete(
            f"{self.base_url}/{cliente_id}",
            headers=self.headers(),
            timeout=20
        )

        if not resposta.ok:
            self.tratar_erro(resposta)

        return True
