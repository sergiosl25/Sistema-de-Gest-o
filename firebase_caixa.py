# -*- coding: utf-8 -*-
from datetime import datetime, timezone
import uuid
import requests
from firebase_vendas import FirebaseVendas


class FirebaseCaixa(FirebaseVendas):
    def listar(self):
        return sorted(self.listar_colecao('caixaMovimentos'), key=lambda x: x.get('criadoEm', ''), reverse=True)

    def registrar_saida(self, descricao, centavos, forma, operacao_id):
        if not descricao.strip() or int(centavos) <= 0:
            raise ValueError('Informe a descrição e o valor da saída.')
        if forma not in ('Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência bancária', 'Outros'):
            raise ValueError('Forma inválida.')
        movimento = {
            'tipo': 'Saída', 'origem': 'Manual', 'descricao': descricao.strip(),
            'centavos': int(centavos), 'forma': forma,
            'criadoEm': datetime.now(timezone.utc).isoformat(),
        }
        resposta = requests.patch(
            self.base_url + '/caixaMovimentos/' + operacao_id,
            headers=self.headers(), params={'currentDocument.exists': 'false'},
            json={'fields': {k: self.codificar(v) for k, v in movimento.items()}}, timeout=25)
        self.verificar_resposta(resposta)
        return resposta.json()
