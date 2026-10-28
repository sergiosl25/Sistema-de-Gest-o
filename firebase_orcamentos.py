# -*- coding: utf-8 -*-
"""Orçamentos Firestore: conversão atômica e sem cobrança duplicada."""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import uuid
import requests
from firebase_vendas import FirebaseVendas


def centavos(valor):
    return int((Decimal(str(valor)) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


class FirebaseOrcamentos(FirebaseVendas):
    def listar(self):
        return sorted(self.listar_colecao('orcamentos'), key=lambda x: x.get('criadoEm', ''), reverse=True)

    def obter(self, orcamento_id):
        resposta = requests.get(self.base_url + '/orcamentos/' + orcamento_id,
                                headers=self.headers(), timeout=25)
        self.verificar_resposta(resposta)
        documento = resposta.json()
        dados = {k: self.decodificar(v) for k, v in documento.get('fields', {}).items()}
        dados['id'] = orcamento_id
        return dados, documento['updateTime']

    def criar(self, dados, identificador):
        if not dados.get('itens'):
            raise ValueError('Adicione pelo menos um item ao orçamento.')
        if not dados.get('clienteId'):
            raise ValueError('Selecione um cliente.')
        dados = dict(dados)
        dados.update({'status': 'Aguardando resposta', 'criadoEm': datetime.now(timezone.utc).isoformat(),
                      'tipoRegistro': 'orcamento_personalizado'})
        resposta = requests.patch(self.base_url + '/orcamentos/' + identificador,
                                 params={'currentDocument.exists': 'false'}, headers=self.headers(),
                                 json={'fields': {k: self.codificar(v) for k, v in dados.items()}}, timeout=25)
        self.verificar_resposta(resposta)
        return identificador

    def mudar_status(self, identificador, novo):
        if novo not in ('Aprovado', 'Recusado'):
            raise ValueError('Status inválido.')
        dados, atualizado = self.obter(identificador)
        if dados.get('pedidoId') or dados.get('status') == 'Convertido':
            raise ValueError('Orçamento já convertido em pedido.')
        if dados.get('status') == 'Recusado':
            raise ValueError('Orçamento recusado. Crie outro para renegociar.')
        resposta = requests.patch(self.base_url + '/orcamentos/' + identificador,
            params=[('updateMask.fieldPaths', 'status'), ('currentDocument.updateTime', atualizado)],
            headers=self.headers(), json={'fields': {'status': self.codificar(novo)}}, timeout=25)
        self.verificar_resposta(resposta)

    def converter(self, identificador, pagamentos):
        """Commit único: atualiza orçamento, cria pedido e entradas do Caixa.

        O ID do pedido é determinístico: uma nova tentativa não gera outra venda.
        """
        dados, atualizado = self.obter(identificador)
        if dados.get('status') != 'Aprovado' or dados.get('pedidoId'):
            raise ValueError('Somente orçamentos aprovados e ainda não convertidos podem gerar pedidos.')
        from datetime import date
        try:
            if date.fromisoformat(dados['validade']) < date.today():
                raise ValueError('Orçamento vencido. Faça um novo orçamento.')
        except (KeyError, TypeError):
            raise ValueError('Orçamento sem validade válida.')
        total = centavos(dados['total'])
        if not pagamentos or any(int(p['centavos']) <= 0 for p in pagamentos):
            raise ValueError('Informe os pagamentos.')
        if sum(int(p['centavos']) for p in pagamentos) != total:
            raise ValueError('A soma dos pagamentos deve corresponder ao total do orçamento.')
        if any(p.get('forma') not in ('Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito',
                                     'Transferência bancária', 'Outros') for p in pagamentos):
            raise ValueError('Forma de pagamento inválida.')
        pedido_id = 'orc_' + identificador
        agora = datetime.now(timezone.utc).isoformat()
        itens = []
        for original in dados['itens']:
            item = dict(original)
            item.update({'statusArte': 'Aguardando arte', 'statusProducao': 'Aguardando liberação',
                         'aprovadaEm': None})
            itens.append(item)
        pedido = {'tipoRegistro': 'pedido_personalizado', 'orcamentoId': identificador,
                  'clienteId': dados['clienteId'], 'clienteNome': dados.get('clienteNome', ''),
                  'itens': itens, 'total': total / 100, 'pagamento': 'Pago',
                  'pagamentos': pagamentos, 'caixaIntegrado': True,
                  'statusEntrega': 'Pendente', 'criadoEm': agora}
        # Firestore commit usa caminho relativo ao endpoint v1, sem https://...
        raiz = self.base_url.split('/v1/', 1)[1].rstrip('/') + '/'
        def fields(obj):
            return {k: self.codificar(v) for k, v in obj.items()}
        writes = [
            {'update': {'name': raiz + 'orcamentos/' + identificador,
                        'fields': fields({'status': 'Convertido', 'pedidoId': pedido_id,
                                          'convertidoEm': agora})},
             'updateMask': {'fieldPaths': ['status', 'pedidoId', 'convertidoEm']},
             'currentDocument': {'updateTime': atualizado}},
            {'update': {'name': raiz + 'vendas/' + pedido_id, 'fields': fields(pedido)},
             'currentDocument': {'exists': False}},
        ]
        for indice, p in enumerate(pagamentos):
            mov = {'tipo': 'Entrada', 'origem': 'Venda', 'pedidoId': pedido_id,
                   'clienteNome': pedido['clienteNome'], 'forma': p['forma'],
                   'centavos': int(p['centavos']), 'parcelas': int(p.get('parcelas', 1)),
                   'descricao': 'Recebimento de pedido originado de orçamento', 'criadoEm': agora}
            writes.append({'update': {'name': raiz + 'caixaMovimentos/' + pedido_id + '_' + str(indice),
                                       'fields': fields(mov)}, 'currentDocument': {'exists': False}})
        resposta = requests.post(self.base_url + ':commit', headers=self.headers(),
                                 json={'writes': writes}, timeout=30)
        self.verificar_resposta(resposta)
        return pedido_id
