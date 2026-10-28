# -*- coding: utf-8 -*-
"""Entrega única por pedido; usa os pedidos já existentes em vendas."""
from datetime import datetime, timezone
import requests
from firebase_vendas import FirebaseVendas

MODALIDADES = ('Retirada na loja', 'Entrega própria', 'Transportadora/Correios')


class FirebaseEntregas(FirebaseVendas):
    def agora(self):
        return datetime.now(timezone.utc).isoformat()

    def obter(self, pedido_id):
        if not pedido_id or '/' in pedido_id:
            raise ValueError('Identificador de pedido inválido.')
        url = self.base_url + '/vendas/' + pedido_id
        resposta = requests.get(url, headers=self.headers(), timeout=25)
        self.verificar_resposta(resposta)
        doc = resposta.json()
        dados = {k: self.decodificar(v) for k, v in doc.get('fields', {}).items()}
        dados['id'] = pedido_id
        return dados, doc['updateTime']

    def atualizar_entrega(self, pedido_id, acao, modalidade=None, dados=None):
        """Ações: preparar, despachar, confirmar. Grava com precondição de versão."""
        pedido, versao = self.obter(pedido_id)
        if pedido.get('tipoRegistro') != 'pedido_personalizado':
            raise ValueError('Este registro não é um pedido personalizado.')
        if pedido.get('pagamento') != 'Pago':
            raise ValueError('Pedido ainda não consta como pago.')
        itens = pedido.get('itens') or []
        if not itens or not isinstance(itens, list):
            raise ValueError('Pedido sem itens válidos.')
        entrega = dict(pedido.get('entrega') or {})
        historico = list(pedido.get('historicoEntrega') or [])
        dados = {k: str(v or '').strip() for k, v in (dados or {}).items()}
        agora = self.agora()
        estado = entrega.get('status', 'Não iniciada')
        if acao == 'preparar':
            if estado != 'Não iniciada':
                raise ValueError('A entrega deste pedido já foi iniciada.')
            if any(i.get('statusProducao') != 'Finalizado' for i in itens):
                raise ValueError('Finalize TODOS os produtos antes de preparar a entrega.')
            if modalidade not in MODALIDADES:
                raise ValueError('Selecione uma modalidade de entrega.')
            if modalidade == 'Entrega própria' and not dados.get('endereco'):
                raise ValueError('Informe o endereço de entrega.')
            if modalidade == 'Transportadora/Correios' and not dados.get('transportadora'):
                raise ValueError('Informe a transportadora ou Correios.')
            entrega = {'modalidade': modalidade, 'status': 'Pronto para entrega',
                       'preparadoEm': agora, 'informacoes': dados}
            status_pedido = 'Pronto para entrega'
            descricao = 'Pedido preparado para ' + modalidade
        elif acao == 'despachar':
            if estado != 'Pronto para entrega':
                raise ValueError('Prepare a entrega antes de despachar.')
            if entrega.get('modalidade') == 'Retirada na loja':
                raise ValueError('Retirada na loja não precisa de despacho.')
            informacoes = dict(entrega.get('informacoes') or {})
            informacoes.update({k: v for k, v in dados.items() if v})
            if entrega['modalidade'] == 'Transportadora/Correios' and not informacoes.get('rastreio'):
                raise ValueError('Informe o código de rastreamento antes de enviar.')
            entrega['informacoes'] = informacoes
            entrega['status'] = ('Enviado' if entrega['modalidade'] == 'Transportadora/Correios'
                                 else 'Saiu para entrega')
            entrega['despachadoEm'] = agora
            status_pedido = entrega['status']
            descricao = 'Pedido ' + status_pedido.lower()
        elif acao == 'confirmar':
            if estado not in ('Pronto para entrega', 'Saiu para entrega', 'Enviado'):
                raise ValueError('A entrega não está pronta para confirmação.')
            if entrega.get('modalidade') != 'Retirada na loja' and estado == 'Pronto para entrega':
                raise ValueError('Registre a saída ou o envio antes de confirmar o recebimento.')
            if not dados.get('recebedor'):
                raise ValueError('Informe o nome de quem recebeu ou retirou.')
            entrega['status'] = 'Entregue'
            entrega['entregueEm'] = agora
            entrega['recebedor'] = dados['recebedor']
            entrega['observacaoRecebimento'] = dados.get('observacao', '')
            status_pedido = 'Concluído'
            descricao = 'Entrega confirmada por ' + dados['recebedor']
            itens = [dict(i, statusProducao='Entregue') for i in itens]
        else:
            raise ValueError('Ação de entrega desconhecida.')

        historico.append({'data': agora, 'acao': acao, 'descricao': descricao})
        campos = {'entrega': entrega, 'statusEntrega': status_pedido,
                  'historicoEntrega': historico, 'itens': itens}
        parametros = [('currentDocument.updateTime', versao)]
        for campo in campos:
            parametros.append(('updateMask.fieldPaths', campo))
        resposta = requests.patch(
            self.base_url + '/vendas/' + pedido_id,
            headers=self.headers(), params=parametros,
            json={'fields': {k: self.codificar(v) for k, v in campos.items()}},
            timeout=25)
        self.verificar_resposta(resposta)
        return resposta.json()
