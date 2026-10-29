# -*- coding: utf-8 -*-
"""Orçamentos para Flet 0.25.x; PDF/WhatsApp e conversão com pagamento integral."""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import quote
import uuid
import re
import flet as ft
from firebase_orcamentos import FirebaseOrcamentos, centavos

FUSO_BRASIL = timezone(timedelta(hours=-3))


def hoje_brasil():
    return datetime.now(FUSO_BRASIL).date()


def data_br(valor):
    try:
        return date.fromisoformat(str(valor)).strftime('%d/%m/%Y')
    except (ValueError, TypeError):
        return str(valor or '')
        
AZUL = '#2563EB'
FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência bancária', 'Outros']


def moeda(valor):
    return 'R$ {:,.2f}'.format(float(valor)).replace(',', 'X').replace('.', ',').replace('X', '.')


def parse_valor(valor):
    texto = str(valor or '').strip().replace('R$', '').replace(' ', '')
    if ',' in texto:
        texto = texto.replace('.', '').replace(',', '.')
    try:
        num = Decimal(texto)
        if not num.is_finite() or num <= 0 or num.as_tuple().exponent < -2:
            raise ValueError()
        return num
    except (ValueError, InvalidOperation):
        raise ValueError('Informe um valor positivo com até duas casas decimais.')


class TelaOrcamentos:
    def __init__(self, page, sessao):
        self.page = page
        self.api = FirebaseOrcamentos(sessao)
        self.clientes, self.produtos, self.itens, self.orcamentos = [], [], [], []
        self.identificador = uuid.uuid4().hex
        self.salvando = False
        self.atual = None
        self.pagamentos = []
        self.msg = ft.Text('')
        self.cliente = ft.Dropdown(label='Cliente', width=350)
        self.produto = ft.Dropdown(label='Produto', width=350, on_change=self.mudar_produto)
        self.tipo = ft.Dropdown(label='Personalização', width=260, on_change=self.mudar_produto_preco)
        self.qtd = ft.TextField(label='Quantidade', value='1', width=110)
        self.origem = ft.Dropdown(label='Origem da arte', width=220, value='Cliente', options=[ft.dropdown.Option('Cliente'), ft.dropdown.Option('Loja')])
        self.obs_item = ft.TextField(label='Instruções da arte', width=520, multiline=True, min_lines=2, max_lines=3)
        self.preco = ft.Text('Preço unitário: R$ 0,00')
        self.validade = ft.TextField(label='Validade (DD/MM/AAAA)', width=220, value=(hoje_brasil() + timedelta(days=15)).strftime('%d/%m/%Y'))
        self.observacoes = ft.TextField(label='Observações e condições', width=540, multiline=True, min_lines=2, max_lines=3)
        self.tabela_itens = ft.DataTable(columns=[ft.DataColumn(ft.Text(x)) for x in ('Produto', 'Personalização', 'Qtd.', 'Total', 'Ação')], rows=[])
        self.total = ft.Text('Total: R$ 0,00', size=18, weight=ft.FontWeight.BOLD)
        self.tabela = ft.DataTable(columns=[ft.DataColumn(ft.Text(x)) for x in ('Cliente', 'Validade', 'Total', 'Status', 'Ações')], rows=[])
        self.forma = ft.Dropdown(label='Forma de pagamento', value='Pix', width=240, options=[ft.dropdown.Option(x) for x in FORMAS])
        self.valor = ft.TextField(label='Valor (R$)', width=170)
        self.parcelas = ft.TextField(label='Parcelas (crédito)', value='1', width=150)
        self.lista_pagamentos = ft.Column(tight=True, spacing=4)
        self.modal = ft.AlertDialog(modal=True, title=ft.Text('Orçamento'), content=ft.Container(width=660), actions=[ft.TextButton('Fechar', on_click=self.fechar)])
        self.page.overlay.append(self.modal)
        self.conteudo = ft.Column([
            ft.Text('Orçamentos', size=24, weight=ft.FontWeight.BOLD),
            ft.Text('Prepare uma proposta; o pagamento será exigido apenas ao converter em pedido.'),
            self.cliente, ft.Divider(), ft.Row([self.produto, self.tipo, self.qtd], wrap=True),
            self.origem, self.obs_item, self.preco,
            ft.ElevatedButton('Adicionar produto', on_click=self.adicionar, bgcolor=AZUL, color='white'),
            ft.Row([self.tabela_itens], scroll=ft.ScrollMode.AUTO), self.total,
            self.validade, self.observacoes,
            ft.ElevatedButton('Salvar orçamento', on_click=self.salvar, bgcolor='#16A34A', color='white'),
            self.msg, ft.Divider(), ft.Text('Orçamentos cadastrados', size=19, weight=ft.FontWeight.BOLD),
            ft.ElevatedButton('Atualizar lista', on_click=self.listar),
            ft.Row([self.tabela], scroll=ft.ScrollMode.AUTO),
        ], spacing=12, tight=True)

    def construir(self):
        return self.conteudo

    def carregar(self):
        try:
            self.clientes = self.api.listar_clientes()
            self.produtos = self.api.listar_produtos()
            self.cliente.options = [ft.dropdown.Option(str(c['id']), str(c.get('nome', 'Sem nome'))) for c in self.clientes]
            self.produto.options = [ft.dropdown.Option(str(p['id']), str(p.get('nome', 'Sem nome'))) for p in self.produtos]
            self.listar()
        except Exception as exc:
            self.msg.value = 'Erro ao carregar: ' + str(exc)
            self.page.update()

    def selecionado(self):
        return next((p for p in self.produtos if str(p['id']) == self.produto.value), None)

    def mudar_produto(self, e):
        p = self.selecionado()
        if p:
            opcoes = [('preco', 'Preço único'), ('preco1', 'Somente frente'), ('preco2', 'Frente e verso')]
            if p.get('tipoPreco') == 'personalizado':
                opcoes = opcoes[1:]
            else:
                opcoes = opcoes[:1]
            self.tipo.options = [ft.dropdown.Option(k, v) for k, v in opcoes if p.get(k) is not None]
            self.tipo.value = self.tipo.options[0].key if self.tipo.options else None
        self.mudar_produto_preco(None)

    def mudar_produto_preco(self, e):
        p = self.selecionado()
        try:
            self.preco.value = 'Preço unitário: ' + moeda(p.get(self.tipo.value, 0)) if p and self.tipo.value else 'Preço unitário: R$ 0,00'
        except Exception:
            self.preco.value = 'Preço inválido'
        self.page.update()

    def adicionar(self, e):
        try:
            p = self.selecionado()
            if not p or self.tipo.value not in ('preco', 'preco1', 'preco2'):
                raise ValueError('Selecione produto e personalização.')
            qtd = int(self.qtd.value)
            if qtd <= 0:
                raise ValueError('Quantidade deve ser positiva.')
            preco = Decimal(str(p[self.tipo.value]))
            if not preco.is_finite() or preco < 0:
                raise ValueError('Preço inválido no produto.')
            subtotal = (preco * qtd).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
            nomes = {'preco': 'Preço único', 'preco1': 'Somente frente', 'preco2': 'Frente e verso'}
            self.itens.append({'produtoId': p['id'], 'produtoNome': p.get('nome', ''),
                'personalizacao': nomes[self.tipo.value], 'campoPreco': self.tipo.value,
                'quantidade': qtd, 'precoUnitario': float(preco), 'subtotal': float(subtotal),
                'origemArte': self.origem.value, 'observacoes': self.obs_item.value or ''})
            self.obs_item.value = ''
            self.desenhar_itens()
        except Exception as exc:
            self.msg.value = str(exc)
            self.page.update()

    def remover(self, indice):
        del self.itens[indice]
        self.desenhar_itens()

    def desenhar_itens(self):
        self.tabela_itens.rows = [ft.DataRow(cells=[
            ft.DataCell(ft.Text(str(i['produtoNome']))), ft.DataCell(ft.Text(i['personalizacao'])),
            ft.DataCell(ft.Text(str(i['quantidade']))), ft.DataCell(ft.Text(moeda(i['subtotal']))),
            ft.DataCell(ft.IconButton(icon=ft.icons.DELETE, on_click=lambda e, j=j: self.remover(j)))
        ]) for j, i in enumerate(self.itens)]
        self.total.value = 'Total: ' + moeda(sum(centavos(i['subtotal']) for i in self.itens) / 100)
        self.page.update()

    def salvar(self, e):
        if self.salvando:
            return
        self.salvando = True
        try:
            cliente = next((c for c in self.clientes if str(c['id']) == self.cliente.value), None)
            if not cliente or not self.itens:
                raise ValueError('Selecione cliente e adicione produtos.')
            validade = date.fromisoformat(self.validade.value.strip())
            validade = datetime.strptime(
                self.validade.value.strip(),
                '%d/%m/%Y'
            ).date()
            
            if validade < hoje_brasil():
                raise ValueError('A validade não pode estar no passado.')
            dados = {'clienteId': cliente['id'], 'clienteNome': cliente.get('nome', ''),
                     'clienteTelefone': str(cliente.get('telefone') or cliente.get('celular') or cliente.get('whatsapp') or ''),
                     'itens': list(self.itens), 'total': sum(centavos(i['subtotal']) for i in self.itens) / 100,
                     'validade': validade.isoformat(), 'observacoes': self.observacoes.value or ''}
            self.api.criar(dados, self.identificador)
            self.identificador = uuid.uuid4().hex
            self.itens = []
            self.desenhar_itens()
            self.msg.value = 'Orçamento salvo com sucesso.'
            self.listar()
        except Exception as exc:
            self.msg.value = 'Não foi possível salvar: ' + str(exc)
            self.page.update()
        finally:
            self.salvando = False

    def listar(self, e=None):
        try:
            self.orcamentos = self.api.listar()
            self.tabela.rows = [ft.DataRow(cells=[
                ft.DataCell(ft.Text(str(o.get('clienteNome', '')))),
                ft.DataCell(ft.Text(data_br(o.get('validade', '')))),
                ft.DataCell(ft.Text(moeda(o.get('total', 0)))),
                ft.DataCell(ft.Text(self.status_exibido(o))),
                ft.DataCell(ft.TextButton('Abrir', on_click=lambda e, x=o: self.abrir(x)))
            ]) for o in self.orcamentos]
            self.page.update()
        except Exception as exc:
            self.msg.value = 'Erro ao listar: ' + str(exc)
            self.page.update()

    @staticmethod
    def status_exibido(o):
        if o.get('status') in ('Convertido', 'Recusado'):
            return o['status']
        try:
            if date.fromisoformat(o['validade']) < hoje_brasil():
                return 'Vencido'
        except (ValueError, KeyError, TypeError):
            pass
        return o.get('status', 'Aguardando resposta')

    def fechar(self, e=None):
        self.modal.open = False
        self.page.update()

    def abrir(self, o):
        self.atual = o
        controles = [ft.Text('Cliente: ' + str(o.get('clienteNome', ''))),
                     ft.Text('Validade: ' + data_br(o.get('validade', ''))),
                     ft.Text('Status: ' + self.status_exibido(o)),
                     ft.Text('Total: ' + moeda(o.get('total', 0)), weight=ft.FontWeight.BOLD)]
        for item in o.get('itens', []):
            controles.append(ft.Text('{} — {} x {} — {}'.format(item.get('produtoNome'), item.get('quantidade'),
                                      item.get('personalizacao'), moeda(item.get('subtotal', 0)))))
        controles.extend([ft.Text('Observações: ' + str(o.get('observacoes') or '-')),
            ft.Row([ft.TextButton('Gerar PDF', on_click=lambda e: self.pdf(o)),
                    ft.TextButton('WhatsApp', on_click=lambda e: self.whatsapp(o))], wrap=True)])
        if self.status_exibido(o) == 'Aguardando resposta':
            controles.append(ft.Row([ft.ElevatedButton('Aprovar', on_click=lambda e: self.status(o, 'Aprovado')),
                                     ft.TextButton('Recusar', on_click=lambda e: self.status(o, 'Recusado'))]))
        if self.status_exibido(o) == 'Aprovado':
            controles.append(ft.ElevatedButton('Converter em pedido (pagamento integral)',
                                              on_click=lambda e: self.abrir_pagamento(o), bgcolor='#16A34A', color='white'))
        if o.get('pedidoId'):
            controles.append(ft.Text('Pedido gerado: ' + str(o['pedidoId'])))
        self.modal.title = ft.Text('Orçamento ' + o['id'][:8].upper())
        self.modal.content = ft.Container(width=650, content=ft.Column(controles, tight=True, scroll=ft.ScrollMode.AUTO))
        self.modal.open = True
        self.page.update()

    def status(self, o, novo):
        try:
            self.api.mudar_status(o['id'], novo)
            self.listar()
            atualizado = next(x for x in self.orcamentos if x['id'] == o['id'])
            self.abrir(atualizado)
        except Exception as exc:
            self.msg.value = str(exc)
            self.page.update()

    def whatsapp(self, o):
        telefone = re.sub(r'\D', '', str(o.get('clienteTelefone', '')))
        if not telefone:
            self.msg.value = 'Cliente sem telefone cadastrado. Atualize o cadastro antes de enviar.'
            self.page.update()
            return
        if len(telefone) in (10, 11):
            telefone = '55' + telefone
        mensagem = ('Olá, {}! Segue o orçamento {} da Alves Personalizados.\n'
                    'Valor total: {}\nValidade: {}\n'
                    'Se estiver de acordo, responda confirmando a aprovação.\n'
                    'O PDF deve ser anexado manualmente nesta conversa.').format(
                        o.get('clienteNome', ''), o['id'][:8].upper(), moeda(o['total']), data_br(o.get('validade', '')))
        self.page.launch_url('https://wa.me/{}?text={}'.format(telefone, quote(mensagem)))

    def pdf(self, o):
        try:
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfbase import pdfdoc
            import hashlib
            from xml.sax.saxutils import escape
            # Compatibilidade com versões de OpenSSL que rejeitam usedforsecurity.
            original = pdfdoc.md5
            pdfdoc.md5 = lambda *args, **kwargs: hashlib.md5(*args)
            try:
                buffer = BytesIO()
                doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=35, rightMargin=35)
                estilos = getSampleStyleSheet()
                linhas = [Paragraph('ALVES PERSONALIZADOS — ORÇAMENTO', estilos['Title']), Spacer(1, 16),
                          Paragraph('Orçamento: ' + escape(o['id'][:8].upper()), estilos['Normal']),
                          Paragraph('Cliente: ' + escape(str(o.get('clienteNome', ''))), estilos['Normal']),
                          Paragraph('Validade: ' + escape(data_br(o.get('validade', ''))), estilos['Normal']), Spacer(1, 12)]
                tabela = [['Produto', 'Personalização', 'Qtd.', 'Valor']]
                for item in o.get('itens', []):
                    tabela.append([Paragraph(escape(str(item.get('produtoNome', ''))), estilos['Normal']),
                                   Paragraph(escape(str(item.get('personalizacao', ''))), estilos['Normal']),
                                   str(item.get('quantidade', 0)), moeda(item.get('subtotal', 0))])
                tab = Table(tabela, colWidths=[180, 155, 40, 110], repeatRows=1)
                tab.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(AZUL)),
                                         ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                                         ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                         ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
                linhas += [tab, Spacer(1, 12), Paragraph('TOTAL: ' + moeda(o['total']), estilos['Heading2']),
                          Paragraph('Condições: ' + escape(str(o.get('observacoes') or '-')), estilos['Normal']),
                          Spacer(1, 15), Paragraph('Proposta sujeita à aprovação e pagamento integral antes da produção.', estilos['Normal'])]
                doc.build(linhas)
            finally:
                pdfdoc.md5 = original
            conteudo = buffer.getvalue()
            nome = 'orcamento_{}.pdf'.format(o['id'][:8])
            class Download(BaseHTTPRequestHandler):
                def do_GET(self):
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/pdf')
                    self.send_header('Content-Disposition', 'attachment; filename="{}"'.format(nome))
                    self.send_header('Content-Length', str(len(conteudo)))
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    self.wfile.write(conteudo)
                def log_message(self, *args):
                    pass
            servidor = ThreadingHTTPServer(('127.0.0.1', 0), Download)
            Thread(target=servidor.serve_forever, daemon=True).start()
            self.page.launch_url('http://127.0.0.1:{}/download'.format(servidor.server_address[1]))
            self.msg.value = 'Download do PDF solicitado.'
        except Exception as exc:
            self.msg.value = 'Erro ao gerar PDF: ' + str(exc)
        self.page.update()

    def abrir_pagamento(self, o):
        self.atual = o
        self.pagamentos = []
        self.valor.value = ''
        self.lista_pagamentos.controls = []
        self.modal.title = ft.Text('Pagamento — ' + moeda(o['total']))
        self.modal.content = ft.Container(width=650, content=ft.Column([
            ft.Text('O pedido será criado somente após o pagamento integral.'),
            ft.Row([self.forma, self.valor, self.parcelas], wrap=True),
            ft.ElevatedButton('Adicionar pagamento', on_click=self.adicionar_pagamento),
            self.lista_pagamentos,
            ft.ElevatedButton('Confirmar pagamento e converter', on_click=self.converter,
                              bgcolor='#16A34A', color='white')
        ], tight=True, scroll=ft.ScrollMode.AUTO))
        self.page.update()

    def adicionar_pagamento(self, e):
        try:
            valor = int((parse_valor(self.valor.value) * 100).quantize(Decimal('1')))
            parcelas = int(self.parcelas.value or '1') if self.forma.value == 'Cartão de crédito' else 1
            if not 1 <= parcelas <= 36:
                raise ValueError('Informe entre 1 e 36 parcelas.')
            self.pagamentos.append({'forma': self.forma.value, 'centavos': valor, 'parcelas': parcelas})
            self.valor.value = ''
            self.desenhar_pagamentos()
        except Exception as exc:
            self.msg.value = str(exc)
            self.page.update()

    def desenhar_pagamentos(self):
        self.lista_pagamentos.controls = [ft.Row([
            ft.Text('{}: {}'.format(p['forma'], moeda(p['centavos'] / 100))),
            ft.IconButton(icon=ft.icons.DELETE, on_click=lambda e, j=j: self.remover_pagamento(j))])
            for j, p in enumerate(self.pagamentos)]
        self.lista_pagamentos.controls.append(ft.Text('Total recebido: ' + moeda(sum(p['centavos'] for p in self.pagamentos) / 100)))
        self.page.update()

    def remover_pagamento(self, indice):
        del self.pagamentos[indice]
        self.desenhar_pagamentos()

    def converter(self, e):
        if self.salvando:
            return
        self.salvando = True
        try:
            pedido_id = self.api.converter(self.atual['id'], self.pagamentos)
            self.msg.value = 'Pedido {} criado e pagamentos registrados no Caixa.'.format(pedido_id)
            self.modal.open = False
            self.listar()
        except Exception as exc:
            self.msg.value = 'Não foi possível converter: ' + str(exc)
            self.page.update()
        finally:
            self.salvando = False
