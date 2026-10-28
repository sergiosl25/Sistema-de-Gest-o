# -*- coding: utf-8 -*-

import requests
import math

from firebase_config import FIREBASE_PROJECT_ID


class FirebaseProdutos:

    def __init__(self, sessao):
        self.sessao = sessao

        self.base_url = (
            "https://firestore.googleapis.com/v1/projects/"
            f"{FIREBASE_PROJECT_ID}/databases/(default)/documents/produtos"
        )

    def headers(self):
        token = self.sessao.get("id_token")

        if not token:
            raise Exception("Sessão inválida. Faça login novamente.")

        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def tratar_erro(self, resposta):
        try:
            mensagem = resposta.json().get(
                "error", {}
            ).get("message", "")
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

    @staticmethod
    def ler_numero(campo):

        if not isinstance(campo, dict):
            return 0.0

        valor = campo.get(
            "doubleValue",
            campo.get(
                "integerValue",
                campo.get("stringValue", 0)
            )
        )

        if valor is None:
            return 0.0

        try:
            if isinstance(valor, str):

                valor = valor.strip()

                if not valor:
                    return 0.0

                if "," in valor:
                    valor = valor.replace(".", "").replace(",", ".")

            numero = float(valor)

            # Evita erros com NaN e infinito
            if not math.isfinite(numero):
                return 0.0

            return numero

        except (ValueError, TypeError, OverflowError):
            return 0.0

    @staticmethod
    def numero_firestore(valor):
        return {"doubleValue": float(valor)}

    # ==========================================
    # LISTAR PRODUTOS
    # ==========================================

    def listar(self):

        produtos = []
        token = None

        print("Consultando produtos no Firebase...")

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

            documentos = dados.get("documents", [])

            print(
                "Documentos recebidos:",
                len(documentos)
            )

            for documento in documentos:

                campos = documento.get("fields", {})

                # ----------------------------------
                # IDENTIFICAÇÃO
                # ----------------------------------

                produto_id = documento["name"].split("/")[-1]

                nome = campos.get(
                    "nome", {}
                ).get("stringValue", "")

                # ----------------------------------
                # LEITURA SEGURA DE NÚMEROS
                # ----------------------------------

                def numero(campo):
                    return self.ler_numero(
                        campos.get(campo, {})
                    )

                preco = numero("preco")
                preco1 = numero("preco1")
                preco2 = numero("preco2")

                # ----------------------------------
                # QUANTIDADE
                # ----------------------------------

                quantidade_campo = campos.get(
                    "quantidade", {}
                )

                quantidade_original = quantidade_campo.get(
                    "integerValue",
                    quantidade_campo.get(
                        "doubleValue",
                        quantidade_campo.get(
                            "stringValue", None
                        )
                    )
                )

                quantidade_numero = numero("quantidade")

                quantidade = int(quantidade_numero)

                # Identifica valores inválidos sem
                # modificar os dados no Firebase.

                quantidade_invalida = False

                try:
                    if quantidade_original is None:
                        quantidade_invalida = True
                    else:
                        import math

                        valor_teste = float(
                            quantidade_original
                        )

                        if not math.isfinite(valor_teste):
                            quantidade_invalida = True

                except (ValueError, TypeError, OverflowError):
                    quantidade_invalida = True

                if quantidade_invalida:

                    print(
                        "ATENÇÃO: Estoque a verificar:",
                        nome,
                        "| Valor original:",
                        quantidade_original
                    )

                # ----------------------------------
                # TIPO DE PREÇO
                # ----------------------------------

                tipo = campos.get(
                    "tipoPreco", {}
                ).get("stringValue", "")

                if tipo not in ("unico", "personalizado"):

                    if preco1 > 0 or preco2 > 0:
                        tipo = "personalizado"
                    else:
                        tipo = "unico"

                # ----------------------------------
                # ADICIONAR PRODUTO
                # ----------------------------------

                produtos.append({
                    "id": produto_id,
                    "nome": nome,
                    "quantidade": quantidade,
                    "quantidade_invalida": quantidade_invalida,
                    "preco": preco,
                    "preco1": preco1,
                    "preco2": preco2,
                    "tipoPreco": tipo
                })

            token = dados.get("nextPageToken")

            if not token:
                break

        produtos.sort(
            key=lambda produto: produto["nome"].lower()
        )

        print(
            "Total de produtos carregados:",
            len(produtos)
        )

        return produtos

    def montar_campos(self, produto):
        return {
            "nome": {
                "stringValue": produto["nome"]
            },
            "quantidade": {
                "integerValue": str(produto["quantidade"])
            },
            "preco": self.numero_firestore(
                produto["preco"]
            ),
            "preco1": self.numero_firestore(
                produto["preco1"]
            ),
            "preco2": self.numero_firestore(
                produto["preco2"]
            ),
            "tipoPreco": {
                "stringValue": produto["tipoPreco"]
            }
        }

    def cadastrar(self, produto):
        dados = {
            "fields": self.montar_campos(produto)
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

    def atualizar(self, produto_id, produto):
        campos = self.montar_campos(produto)

        mascara = [
            ("updateMask.fieldPaths", campo)
            for campo in campos
        ]

        resposta = requests.patch(
            f"{self.base_url}/{produto_id}",
            headers=self.headers(),
            params=mascara,
            json={"fields": campos},
            timeout=20
        )

        if not resposta.ok:
            self.tratar_erro(resposta)

        return resposta.json()

    def excluir(self, produto_id):
        resposta = requests.delete(
            f"{self.base_url}/{produto_id}",
            headers=self.headers(),
            timeout=20
        )

        if not resposta.ok:
            self.tratar_erro(resposta)

        return True
