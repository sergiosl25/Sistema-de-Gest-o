# -*- coding: utf-8 -*-
"""Tela de entregas para Flet 0.25.2."""
import flet as ft
from firebase_entregas import FirebaseEntregas, MODALIDADES

AZUL = '#2563EB'
VERDE = '#16A34A'


class TelaEntregas:
    def __init__(self, page, sessao):
        self.page = page
        self.api = FirebaseEntregas(sessao)
        self.pedidos = []
        self.msg = ft.Text('')
        self.filtro = ft.Dropdown(
            label='Situação', width=240, value='Todos',
            options=[ft.dropdown.Option(s) for s in
                     ('Todos', 'Em produção', 'Pronto para entrega',
                      'Saiu para entrega', 'Enviado', 'Entregue')],
            on_change=self.desenhar)
        self.tabela = ft.DataTable(columns=[ft.DataColumn(ft.Text(x)) for x in
            ('Cliente', 'Produtos', 'Situação', 'Modalidade', 'Ação')], rows=[])
        self.modalidade = ft.Dropdown(label='Modalidade de entrega', width=350,
            options=[ft.dropdown.Option(s) for s in MODALIDADES],
            on_change=self.mudar_modalidade)
        self.endereco = ft.TextField(label='Endereço de entrega', width=480)
        self.responsavel = ft.TextField(label='Responsável pela entrega própria', width=350)
        self.transportadora = ft.TextField(label='Transportadora / Correios', width=350)
        self.rastreio = ft.TextField(label='Código de rastreamento', width=350)
        self.recebedor = ft.TextField(label='Nome de quem recebeu / retirou', width=350)
        self.observacao = ft.TextField(label='Observações do recebimento', width=480)
        self.aviso = ft.Text('', color='#DC2626')
        self.campos_modalidade = ft.Column([], tight=True)
        self.dialogo = ft.AlertDialog(modal=True, title=ft.Text('Entrega'),
            content=ft.Container(width=520, content=ft.Column([], tight=True,
                scroll=ft.ScrollMode.AUTO)),
            actions=[ft.TextButton('Fechar', on_click=self.fechar)])
        self.page.overlay.append(self.dialogo)
        self.conteudo = ft.Column([
            ft.Row([ft.Text('Entregas', size=24, weight=ft.FontWeight.BOLD),
                    ft.ElevatedButton('Atualizar', icon=ft.icons.REFRESH,
                                      on_click=self.carregar)], wrap=True),
            ft.Text('Entrega única: todos os itens precisam estar finalizados.'),
            self.filtro, self.msg,
            ft.Row([self.tabela], scroll=ft.ScrollMode.AUTO)
        ], spacing=14, tight=True)

    def construir(self):
        return self.conteudo

    @staticmethod
    def pronto(pedido):
        itens = pedido.get('itens') or []
        return bool(itens) and all(
            item.get('statusProducao') == 'Finalizado' for item in itens)

    @staticmethod
    def situacao(pedido):
        entrega = pedido.get('entrega') or {}
        estado = entrega.get('status', 'Não iniciada')
        if estado == 'Não iniciada':
            return 'Pronto para entrega' if TelaEntregas.pronto(pedido) else 'Em produção'
        return estado

    def carregar(self, e=None):
        try:
            self.msg.value = 'Carregando pedidos...'
            self.page.update()
            self.pedidos = self.api.listar_pedidos()
            self.desenhar()
        except Exception as erro:
            self.msg.value = 'Erro: ' + str(erro)
            self.page.update()

    def desenhar(self, e=None):
        self.tabela.rows = []
        exibidos = 0
        for pedido in self.pedidos:
            estado = self.situacao(pedido)
            if self.filtro.value != 'Todos' and estado != self.filtro.value:
                continue
            exibidos += 1
            entrega = pedido.get('entrega') or {}
            self.tabela.rows.append(ft.DataRow(cells=[
                ft.DataCell(ft.Text(str(pedido.get('clienteNome', '')))),
                ft.DataCell(ft.Text(str(len(pedido.get('itens') or [])))),
                ft.DataCell(ft.Text(estado)),
                ft.DataCell(ft.Text(entrega.get('modalidade', 'Não definida'))),
                ft.DataCell(ft.TextButton('Gerenciar',
                    on_click=lambda e, p=pedido: self.abrir(p)))
            ]))
        self.msg.value = '{} pedido(s) exibido(s).'.format(exibidos)
        self.page.update()

    def mudar_modalidade(self, e=None):
        m = self.modalidade.value
        if m == 'Entrega própria':
            self.campos_modalidade.controls = [self.endereco, self.responsavel]
        elif m == 'Transportadora/Correios':
            self.campos_modalidade.controls = [self.transportadora]
        else:
            self.campos_modalidade.controls = []
        self.page.update()

    def abrir(self, pedido):
        self.pedido_atual = pedido['id']
        self.aviso.value = ''
        entrega = pedido.get('entrega') or {}
        estado = entrega.get('status', 'Não iniciada')
        modalidade = entrega.get('modalidade', '')
        infos = entrega.get('informacoes') or {}
        self.modalidade.value = modalidade or None
        self.endereco.value = infos.get('endereco', '')
        self.responsavel.value = infos.get('responsavel', '')
        self.transportadora.value = infos.get('transportadora', '')
        self.rastreio.value = infos.get('rastreio', '')
        self.recebedor.value = ''
        self.observacao.value = ''
        self.mudar_modalidade()
        linhas = [
            ft.Text('Cliente: ' + str(pedido.get('clienteNome', '')),
                    weight=ft.FontWeight.BOLD),
            ft.Text('Pagamento: ' + str(pedido.get('pagamento', ''))),
            ft.Text('Situação: ' + self.situacao(pedido)),
            ft.Divider(),
            ft.Text('Itens do pedido:', weight=ft.FontWeight.BOLD)
        ]
        for item in pedido.get('itens') or []:
            linhas.append(ft.Text('{} × {} — {}'.format(
                item.get('quantidade', 0), item.get('produtoNome', ''),
                item.get('statusProducao', ''))))
        linhas.extend([ft.Divider(), self.aviso])
        if estado == 'Não iniciada':
            if self.pronto(pedido) and pedido.get('pagamento') == 'Pago':
                linhas.extend([self.modalidade, self.campos_modalidade,
                    ft.ElevatedButton('Preparar entrega', bgcolor=AZUL, color='white',
                        on_click=lambda e: self.executar('preparar'))])
            else:
                linhas.append(ft.Text('Bloqueado: finalize todos os itens e confirme o pagamento.'))
        elif estado == 'Pronto para entrega':
            linhas.append(ft.Text('Modalidade: ' + modalidade))
            if modalidade != 'Retirada na loja':
                if modalidade == 'Transportadora/Correios':
                    linhas.append(self.rastreio)
                linhas.append(ft.ElevatedButton('Registrar saída / envio',
                    on_click=lambda e: self.executar('despachar')))
            else:
                linhas.extend([self.recebedor, self.observacao,
                    ft.ElevatedButton('Confirmar retirada', bgcolor=VERDE,
                        color='white', on_click=lambda e: self.executar('confirmar'))])
        elif estado in ('Saiu para entrega', 'Enviado'):
            if modalidade == 'Transportadora/Correios':
                linhas.append(ft.Text('Rastreio: ' + str(infos.get('rastreio', ''))))
            linhas.extend([self.recebedor, self.observacao,
                ft.ElevatedButton('Confirmar recebimento', bgcolor=VERDE,
                    color='white', on_click=lambda e: self.executar('confirmar'))])
        else:
            linhas.append(ft.Text('Pedido entregue em ' + str(entrega.get('entregueEm', ''))))
            linhas.append(ft.Text('Recebido por: ' + str(entrega.get('recebedor', ''))))
        self.dialogo.content = ft.Container(width=520, content=ft.Column(
            linhas, tight=True, scroll=ft.ScrollMode.AUTO))
        self.dialogo.open = True
        self.page.update()

    def executar(self, acao):
        dados = {
            'endereco': self.endereco.value,
            'responsavel': self.responsavel.value,
            'transportadora': self.transportadora.value,
            'rastreio': self.rastreio.value,
            'recebedor': self.recebedor.value,
            'observacao': self.observacao.value,
        }
        try:
            self.api.atualizar_entrega(self.pedido_atual, acao,
                                      modalidade=self.modalidade.value, dados=dados)
            self.dialogo.open = False
            self.carregar()
        except Exception as erro:
            self.aviso.value = str(erro)
            self.page.update()

    def fechar(self, e=None):
        self.dialogo.open = False
        self.page.update()
