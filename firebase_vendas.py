# -*- coding: utf-8 -*-

import requests
import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from firebase_config import FIREBASE_PROJECT_ID


class FirebaseVendas:

    def __init__(self, sessao):
        self.sessao = sessao

        self.base_url = (
            "https://firestore.googleapis.com/v1/projects/"
            f"{FIREBASE_PROJECT_ID}/databases/(default)/documents"
        )

    def headers(self):
        token = self.sessao.get("id_token")

        if not token:
            raise Exception("Sessão inválida. Faça login novamente.")

        return {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }

    def verificar_resposta(self, resposta):
        if resposta.ok:
            return

        try:
            erro = resposta.json().get("error", {})
            mensagem = erro.get("message", resposta.text)
        except ValueError:
            mensagem = resposta.text

        if resposta.status_code == 401:
            raise Exception("Sessão expirada. Faça login novamente.")

        if resposta.status_code == 403:
            raise Exception(
                "Sem permissão para acessar esta coleção no Firebase."
            )

        raise Exception(mensagem)

    @staticmethod
    def codificar(valor):
        if valor is None:
            return {"nullValue": None}

        if isinstance(valor, bool):
            return {"booleanValue": valor}

        if isinstance(valor, int):
            return {"integerValue": str(valor)}

        if isinstance(valor, float):
            return {"doubleValue": valor}

        if isinstance(valor, list):
            return {
                "arrayValue": {
                    "values": [
                        FirebaseVendas.codificar(item)
                        for item in valor
                    ]
                }
            }

        if isinstance(valor, dict):
            return {
                "mapValue": {
                    "fields": {
                        chave: FirebaseVendas.codificar(dado)
                        for chave, dado in valor.items()
                    }
                }
            }

        return {"stringValue": str(valor)}

    @staticmethod
    def decodificar(campo):
        if "stringValue" in campo:
            return campo["stringValue"]

        if "integerValue" in campo:
            return int(campo["integerValue"])

        if "doubleValue" in campo:
            return float(campo["doubleValue"])

        if "booleanValue" in campo:
            return campo["booleanValue"]

        if "nullValue" in campo:
            return None

        if "arrayValue" in campo:
            return [
                FirebaseVendas.decodificar(item)
                for item in campo["arrayValue"].get("values", [])
            ]

        if "mapValue" in campo:
            return {
                chave: FirebaseVendas.decodificar(valor)
                for chave, valor in campo["mapValue"].get(
                    "fields", {}
                ).items()
            }

        return None

    def listar_colecao(self, colecao):
        registros = []
        token = None

        while True:
            parametros = {"pageSize": 100}

            if token:
                parametros["pageToken"] = token

            resposta = requests.get(
                self.base_url + "/" + colecao,
                headers=self.headers(),
                params=parametros,
                timeout=25
            )

            self.verificar_resposta(resposta)
            dados = resposta.json()

            for documento in dados.get("documents", []):
                registro = {
                    chave: self.decodificar(valor)
                    for chave, valor in documento.get(
                        "fields", {}
                    ).items()
                }

                registro["id"] = documento["name"].split("/")[-1]
                registros.append(registro)

            token = dados.get("nextPageToken")

            if not token:
                break

        return registros

    def listar_clientes(self):
        return sorted(
            self.listar_colecao("clientes"),
            key=lambda item: str(
                item.get("nome", "")
            ).lower()
        )

    def listar_produtos(self):
        return sorted(
            self.listar_colecao("produtos"),
            key=lambda item: str(
                item.get("nome", "")
            ).lower()
        )

    def listar_pedidos(self):
        registros = self.listar_colecao("vendas")

        pedidos = [
            registro
            for registro in registros
            if registro.get("tipoRegistro") == "pedido_personalizado"
        ]

        return sorted(
            pedidos,
            key=lambda item: item.get("criadoEm", ""),
            reverse=True
        )

    def criar_pedido(self, pedido):
        if not pedido.get("itens"):
            raise ValueError("Adicione pelo menos um produto.")

        if pedido.get("pagamento") != "Pago":
            raise ValueError(
                "Confirme o pagamento integral antes de registrar o pedido."
            )

        pedido = dict(pedido)
        pedido["tipoRegistro"] = "pedido_personalizado"
        pedido["criadoEm"] = datetime.now(
            timezone.utc
        ).isoformat()

        campos = {
            chave: self.codificar(valor)
            for chave, valor in pedido.items()
        }

        resposta = requests.post(
            self.base_url + "/vendas",
            headers=self.headers(),
            json={"fields": campos},
            timeout=25
        )

        self.verificar_resposta(resposta)
        return resposta.json()

    def atualizar_item(self, pedido_id, indice, alteracoes):
        """
        Atualiza um item preservando os outros campos
        do pedido. A atualização da lista inteira pode
        conflitar com edições simultâneas; nesta primeira
        versão, recomenda-se um operador por pedido.
        """

        url = self.base_url + "/vendas/" + pedido_id

        resposta = requests.get(
            url,
            headers=self.headers(),
            timeout=25
        )
        self.verificar_resposta(resposta)

        documento = resposta.json()
        campos = documento.get("fields", {})

        itens = self.decodificar(
            campos.get("itens", {"arrayValue": {}})
        )

        if not isinstance(itens, list):
            raise ValueError("Itens do pedido inválidos.")

        if indice < 0 or indice >= len(itens):
            raise IndexError("Item não encontrado.")

        item = dict(itens[indice])
        item.update(alteracoes)

        if alteracoes.get("statusArte") == "Aprovada":
            item["aprovadaEm"] = datetime.now(
                timezone.utc
            ).isoformat()

        itens[indice] = item

        # Evita substituir um documento alterado
        # por outro operador desde a leitura.
        params = [
            ("updateMask.fieldPaths", "itens"),
            (
                "currentDocument.updateTime",
                documento["updateTime"]
            )
        ]

        resposta = requests.patch(
            url,
            headers=self.headers(),
            params=params,
            json={
                "fields": {
                    "itens": self.codificar(itens)
                }
            },
            timeout=25
        )

        self.verificar_resposta(resposta)
        return resposta.json()


    def criar_pedido_com_caixa(self, pedido, pagamentos, operacao_id):
        """Criação atômica: pedido e lançamentos financeiros em um commit."""
        if not pedido.get("itens") or pedido.get("pagamento") != "Pago":
            raise ValueError("Pedido inválido ou não pago.")
        if not pagamentos:
            raise ValueError("Informe pelo menos um pagamento.")
        total = int((Decimal(str(pedido["total"])) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        soma = sum(int(p["centavos"]) for p in pagamentos)
        if soma != total or any(int(p["centavos"]) <= 0 for p in pagamentos):
            raise ValueError("A soma dos pagamentos deve corresponder ao total do pedido.")
        if not operacao_id or not all(c.isalnum() or c in "-_" for c in operacao_id):
            raise ValueError("Identificador da operação inválido.")
        agora = datetime.now(timezone.utc).isoformat()
        pedido = dict(pedido)
        pedido.update({"tipoRegistro": "pedido_personalizado", "criadoEm": agora,
                       "pagamentos": pagamentos, "caixaIntegrado": True})
        raiz = self.base_url.split("/v1/", 1)[1].rstrip("/") + "/"
        writes = [{"update": {"name": raiz + "vendas/" + operacao_id,
                              "fields": {k: self.codificar(v) for k, v in pedido.items()}},
                   "currentDocument": {"exists": False}}]
        for indice, pagamento in enumerate(pagamentos):
            movimento = {"tipo": "Entrada", "origem": "Venda", "pedidoId": operacao_id,
                         "clienteNome": pedido.get("clienteNome", ""), "forma": pagamento["forma"],
                         "centavos": int(pagamento["centavos"]), "parcelas": int(pagamento.get("parcelas", 1)),
                         "descricao": "Recebimento de pedido", "criadoEm": agora}
            writes.append({"update": {"name": raiz + "caixaMovimentos/" + operacao_id + "_" + str(indice),
                                      "fields": {k: self.codificar(v) for k, v in movimento.items()}},
                           "currentDocument": {"exists": False}})
        resposta = requests.post(self.base_url + ":commit", headers=self.headers(),
                                 json={"writes": writes}, timeout=30)
        self.verificar_resposta(resposta)
        return operacao_id
