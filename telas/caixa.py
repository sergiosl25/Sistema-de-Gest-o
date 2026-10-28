# -*- coding: utf-8 -*-
import uuid
from decimal import Decimal, InvalidOperation
import flet as ft
from firebase_caixa import FirebaseCaixa


class TelaCaixa:
    FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência bancária', 'Outros']

    def __init__(self, page, sessao):
        self.page = page
        self.api = FirebaseCaixa(sessao)
        self.operacao_id = uuid.uuid4().hex
        self.salvando = False
        self.descricao = ft.TextField(label='Descrição da saída', width=320)
        self.valor = ft.TextField(label='Valor (R$)', width=160, hint_text='0,00')
        self.forma = ft.Dropdown(label='Forma', width=230, value='Pix', options=[ft.dropdown.Option(x) for x in self.FORMAS])
        self.msg = ft.Text('')
        self.resumo = ft.Text('', size=17, weight=ft.FontWeight.BOLD)
        self.tabela = ft.DataTable(columns=[ft.DataColumn(ft.Text(x)) for x in ['Data (UTC)', 'Tipo', 'Descrição', 'Forma', 'Valor']], rows=[])
        self.conteudo = ft.Column([
            ft.Text('Caixa', size=24, weight=ft.FontWeight.BOLD),
            ft.Text('Movimentações dos novos pedidos integrados. Vendas antigas não são importadas automaticamente.'),
            ft.ElevatedButton('Atualizar Caixa', on_click=self.carregar),
            self.resumo,
            ft.Divider(), ft.Text('Registrar saída', size=18, weight=ft.FontWeight.BOLD),
            ft.Row([self.descricao, self.valor, self.forma, ft.ElevatedButton('Salvar saída', on_click=self.salvar_saida)], wrap=True),
            self.msg, ft.Divider(), ft.Row([self.tabela], scroll=ft.ScrollMode.AUTO)
        ], spacing=12, tight=True)

    def construir(self):
        return self.conteudo

    @staticmethod
    def moeda(centavos):
        return 'R$ {:,.2f}'.format(centavos / 100).replace(',', 'X').replace('.', ',').replace('X', '.')

    @staticmethod
    def ler_centavos(valor):
        texto = str(valor or '').strip().replace('R$', '').replace(' ', '')
        if ',' in texto:
            texto = texto.replace('.', '').replace(',', '.')
        try:
            numero = Decimal(texto)
            if not numero.is_finite() or numero <= 0 or numero.as_tuple().exponent < -2:
                raise ValueError()
            return int(numero * 100)
        except (InvalidOperation, ValueError):
            raise ValueError('Informe um valor positivo com até duas casas decimais.')

    def carregar(self, e=None):
        try:
            registros = self.api.listar()
            entradas = sum(int(r.get('centavos', 0)) for r in registros if r.get('tipo') == 'Entrada')
            saidas = sum(int(r.get('centavos', 0)) for r in registros if r.get('tipo') == 'Saída')
            self.resumo.value = 'Entradas: {}    Saídas: {}    Saldo: {}'.format(self.moeda(entradas), self.moeda(saidas), self.moeda(entradas - saidas))
            self.tabela.rows = []
            for r in registros:
                valor = int(r.get('centavos', 0))
                if r.get('tipo') == 'Saída':
                    valor = -valor
                self.tabela.rows.append(ft.DataRow(cells=[
                    ft.DataCell(ft.Text(str(r.get('criadoEm', ''))[:19].replace('T', ' '))),
                    ft.DataCell(ft.Text(str(r.get('tipo', '')))),
                    ft.DataCell(ft.Text(str(r.get('descricao', '')))),
                    ft.DataCell(ft.Text(str(r.get('forma', '')))),
                    ft.DataCell(ft.Text(self.moeda(valor)))
                ]))
            self.msg.value = '{} movimentações carregadas.'.format(len(registros))
        except Exception as erro:
            self.msg.value = 'Erro ao carregar Caixa: ' + str(erro)
        self.page.update()

    def salvar_saida(self, e):
        if self.salvando:
            return
        self.salvando = True
        try:
            centavos = self.ler_centavos(self.valor.value)
            self.api.registrar_saida(self.descricao.value or '', centavos, self.forma.value, self.operacao_id)
            self.operacao_id = uuid.uuid4().hex
            self.descricao.value = ''
            self.valor.value = ''
            self.carregar()
        except Exception as erro:
            self.msg.value = 'Erro ao registrar saída: ' + str(erro)
            self.page.update()
        finally:
            self.salvando = False
