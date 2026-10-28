# -*- coding: utf-8 -*-
import math
import uuid
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import flet as ft
from firebase_vendas import FirebaseVendas

AZUL = '#2563EB'

class TelaVendas:
    def __init__(self, page, sessao):
        self.page = page
        self.api = FirebaseVendas(sessao)
        self.clientes = []
        self.produtos = []
        self.itens = []
        self.pedidos = []
        self.operacao_id = uuid.uuid4().hex
        self.salvando = False
        self.pagamentos = []
        self.forma_pagamento = ft.Dropdown(label="Forma de pagamento", width=240, value="Pix", options=[ft.dropdown.Option(x) for x in ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência bancária", "Outros"]])
        self.valor_pagamento = ft.TextField(label="Valor recebido (R$)", width=180, hint_text="0,00")
        self.parcelas = ft.TextField(label="Parcelas (crédito)", width=140, value="1")
        self.lista_pagamentos = ft.Column(spacing=4, tight=True)
        self.cliente = ft.Dropdown(label='Cliente', width=350)
        self.produto = ft.Dropdown(label='Produto', width=350, on_change=self.mudar_produto)
        self.tipo = ft.Dropdown(label='Personalização', width=300, on_change=self.atualizar_preco)
        self.qtd = ft.TextField(label='Quantidade', value='1', width=120)
        self.origem = ft.Dropdown(label='Origem da arte', width=250, value='Cliente', options=[ft.dropdown.Option('Cliente', 'Enviada pelo cliente'), ft.dropdown.Option('Loja', 'Criada pela loja')])
        self.observacoes = ft.TextField(label='Instruções da arte', multiline=True, min_lines=2, max_lines=3, width=500)
        self.preco = ft.Text('Preço unitário: R$ 0,00')
        self.total = ft.Text('Total: R$ 0,00', size=18, weight=ft.FontWeight.BOLD)
        self.msg = ft.Text('')
        self.itens_tabela = ft.DataTable(columns=[ft.DataColumn(ft.Text(s)) for s in ['Produto', 'Personalização', 'Qtd.', 'Unitário', 'Total', 'Ação']], rows=[])
        self.pedidos_tabela = ft.DataTable(columns=[ft.DataColumn(ft.Text(s)) for s in ['Cliente', 'Data', 'Total', 'Itens', 'Ação']], rows=[])
        self.dialogo = ft.AlertDialog(modal=True, title=ft.Text('Itens do pedido'), content=ft.Container(width=650, content=ft.Column(scroll=ft.ScrollMode.AUTO, tight=True)), actions=[ft.TextButton('Fechar', on_click=self.fechar_dialogo)])
        self.page.overlay.append(self.dialogo)
        self.conteudo = ft.Column([
            ft.Text('Pedidos e Vendas', size=24, weight=ft.FontWeight.BOLD),
            ft.Text('Novo pedido — pagamento integral antes da produção'),
            ft.Row([self.cliente], wrap=True),
            ft.Divider(),
            ft.Row([self.produto, self.tipo, self.qtd], wrap=True),
            ft.Row([self.origem], wrap=True),
            self.observacoes,
            self.preco,
            ft.ElevatedButton('Adicionar item', on_click=self.adicionar, bgcolor=AZUL, color='white'),
            ft.Row([self.itens_tabela], scroll=ft.ScrollMode.AUTO),
            self.total,
            ft.Text("Pagamentos do pedido", size=18, weight=ft.FontWeight.BOLD),
            ft.Row([self.forma_pagamento, self.valor_pagamento, self.parcelas, ft.ElevatedButton("Adicionar pagamento", on_click=self.adicionar_pagamento)], wrap=True),
            self.lista_pagamentos,
            ft.ElevatedButton('Confirmar pagamento e salvar pedido', on_click=self.salvar, bgcolor='#16A34A', color='white'),
            self.msg,
            ft.Divider(),
            ft.Text('Pedidos cadastrados', size=20, weight=ft.FontWeight.BOLD),
            ft.ElevatedButton('Atualizar pedidos', on_click=self.carregar_pedidos),
            ft.Row([self.pedidos_tabela], scroll=ft.ScrollMode.AUTO)
        ], spacing=12, tight=True)

    def construir(self):
        return self.conteudo

    @staticmethod
    def valor(valor):
        try:
            if isinstance(valor, str):
                valor = valor.strip().replace('R$', '').strip()
                if ',' in valor:
                    valor = valor.replace('.', '').replace(',', '.')
            resultado = float(valor)
            if not math.isfinite(resultado) or resultado < 0:
                raise ValueError()
            return round(resultado, 2)
        except (ValueError, TypeError, OverflowError):
            raise ValueError('Preço inválido no cadastro do produto.')

    @staticmethod
    def moeda(valor):
        return 'R$ {:,.2f}'.format(valor).replace(',', 'X').replace('.', ',').replace('X', '.')

    def carregar(self):
        try:
            self.msg.value = 'Carregando clientes e produtos...'
            self.page.update()
            self.clientes = self.api.listar_clientes()
            self.produtos = self.api.listar_produtos()
            self.cliente.options = [ft.dropdown.Option(str(c['id']), str(c.get('nome') or 'Sem nome')) for c in self.clientes]
            self.produto.options = [ft.dropdown.Option(str(p['id']), str(p.get('nome') or 'Sem nome')) for p in self.produtos]
            self.msg.value = '{} clientes e {} produtos carregados.'.format(len(self.clientes), len(self.produtos))
            self.carregar_pedidos()
        except Exception as erro:
            self.msg.value = 'Erro: ' + str(erro)
            self.page.update()

    def selecionado(self):
        return next((p for p in self.produtos if str(p['id']) == self.produto.value), None)

    def mudar_produto(self, e):
        p = self.selecionado()
        if not p:
            return
        opcoes = []
        if p.get('preco') is not None:
            opcoes.append(ft.dropdown.Option('preco', 'Preço único'))
        if p.get('preco1') is not None:
            opcoes.append(ft.dropdown.Option('preco1', 'Somente frente'))
        if p.get('preco2') is not None:
            opcoes.append(ft.dropdown.Option('preco2', 'Frente e verso'))
        self.tipo.options = opcoes
        self.tipo.value = ('preco1' if p.get('tipoPreco') == 'personalizado' and p.get('preco1') is not None else ('preco' if p.get('tipoPreco') == 'unico' and p.get('preco') is not None else (opcoes[0].key if opcoes else None)))
        self.atualizar_preco(None)

    def atualizar_preco(self, e):
        p = self.selecionado()
        try:
            valor = self.valor(p.get(self.tipo.value)) if p and self.tipo.value else 0
            self.preco.value = 'Preço unitário: ' + self.moeda(valor)
        except ValueError:
            self.preco.value = 'Preço inválido: revise o cadastro do produto.'
        self.page.update()

    def adicionar(self, e):
        try:
            p = self.selecionado()
            if not p or self.tipo.value not in ('preco', 'preco1', 'preco2'):
                raise ValueError('Selecione um produto e sua personalização.')
            quantidade = int((self.qtd.value or '').strip())
            if quantidade <= 0:
                raise ValueError('Informe uma quantidade inteira maior que zero.')
            preco = self.valor(p.get(self.tipo.value))
            tipos = {'preco': 'Preço único', 'preco1': 'Somente frente', 'preco2': 'Frente e verso'}
            self.itens.append({
                'produtoId': p['id'], 'produtoNome': p.get('nome', ''),
                'personalizacao': tipos[self.tipo.value], 'campoPreco': self.tipo.value,
                'quantidade': quantidade, 'precoUnitario': preco,
                'subtotal': round(quantidade * preco, 2),
                'origemArte': self.origem.value,
                'observacoes': self.observacoes.value or '',
                'statusArte': 'Aguardando arte',
                'statusProducao': 'Aguardando liberação',
                'aprovadaEm': None
            })
            self.observacoes.value = ''
            self.msg.value = 'Item adicionado.'
            self.desenhar_itens()
        except (ValueError, TypeError) as erro:
            self.msg.value = str(erro)
            self.page.update()

    def remover(self, indice):
        del self.itens[indice]
        self.desenhar_itens()

    def desenhar_itens(self):
        self.itens_tabela.rows = []
        for i, item in enumerate(self.itens):
            self.itens_tabela.rows.append(ft.DataRow(cells=[
                ft.DataCell(ft.Text(item['produtoNome'])),
                ft.DataCell(ft.Text(item['personalizacao'])),
                ft.DataCell(ft.Text(str(item['quantidade']))),
                ft.DataCell(ft.Text(self.moeda(item['precoUnitario']))),
                ft.DataCell(ft.Text(self.moeda(item['subtotal']))),
                ft.DataCell(ft.IconButton(icon=ft.icons.DELETE, on_click=lambda e, j=i: self.remover(j)))
            ]))
        self.total.value = 'Total: ' + self.moeda(round(sum(i['subtotal'] for i in self.itens), 2))
        self.page.update()

    @staticmethod
    def centavos(valor):
        texto = str(valor or "").strip().replace("R$", "").replace(" ", "")
        if "," in texto:
            texto = texto.replace(".", "").replace(",", ".")
        try:
            numero = Decimal(texto)
            if not numero.is_finite() or numero <= 0 or numero.as_tuple().exponent < -2:
                raise ValueError()
            return int((numero * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        except (InvalidOperation, ValueError):
            raise ValueError("Informe um valor positivo com até duas casas decimais.")

    def adicionar_pagamento(self, e):
        try:
            forma = self.forma_pagamento.value
            valor = self.centavos(self.valor_pagamento.value)
            parcelas = int(self.parcelas.value or "1") if forma == "Cartão de crédito" else 1
            if parcelas < 1 or parcelas > 36:
                raise ValueError("Informe de 1 a 36 parcelas.")
            self.pagamentos.append({"forma": forma, "centavos": valor, "parcelas": parcelas})
            self.valor_pagamento.value = ""
            self.desenhar_pagamentos()
        except (ValueError, TypeError) as erro:
            self.msg.value = str(erro)
            self.page.update()

    def remover_pagamento(self, indice):
        del self.pagamentos[indice]
        self.desenhar_pagamentos()

    def desenhar_pagamentos(self):
        self.lista_pagamentos.controls = [
            ft.Row([ft.Text("{}: {}{}".format(p["forma"], self.moeda(p["centavos"] / 100),
                      " ({}x)".format(p["parcelas"]) if p["forma"] == "Cartão de crédito" else "")),
                    ft.IconButton(icon=ft.icons.DELETE, on_click=lambda e, j=i: self.remover_pagamento(j))])
            for i, p in enumerate(self.pagamentos)
        ]
        self.lista_pagamentos.controls.append(ft.Text("Total recebido: " + self.moeda(sum(p["centavos"] for p in self.pagamentos) / 100)))
        self.page.update()

    def salvar(self, e):
        if self.salvando:
            return
        self.salvando = True
        try:
            c = next((c for c in self.clientes if str(c['id']) == self.cliente.value), None)
            if not c:
                raise ValueError('Selecione um cliente.')
            if not self.itens:
                raise ValueError('Adicione pelo menos um produto.')
            total_centavos = sum(int((Decimal(str(i['subtotal'])) * 100).quantize(Decimal('1'))) for i in self.itens)
            if sum(p['centavos'] for p in self.pagamentos) != total_centavos:
                raise ValueError('A soma dos pagamentos deve ser igual ao total do pedido.')
            pedido = {'clienteId': c['id'], 'clienteNome': c.get('nome', ''),
                      'itens': self.itens, 'total': total_centavos / 100,
                      'pagamento': 'Pago', 'statusEntrega': 'Pendente'}
            self.api.criar_pedido_com_caixa(pedido, self.pagamentos, self.operacao_id)
            self.itens = []
            self.pagamentos = []
            self.operacao_id = uuid.uuid4().hex
            self.desenhar_itens()
            self.desenhar_pagamentos()
            self.msg.value = 'Pedido e pagamentos registrados no Caixa com sucesso!'
            self.carregar_pedidos()
        except Exception as erro:
            self.msg.value = 'Não foi possível salvar: ' + str(erro)
            self.page.update()
        finally:
            self.salvando = False

    def carregar_pedidos(self, e=None):
        try:
            self.pedidos = self.api.listar_pedidos()
            self.pedidos_tabela.rows = []
            for p in self.pedidos:
                self.pedidos_tabela.rows.append(ft.DataRow(cells=[
                    ft.DataCell(ft.Text(str(p.get('clienteNome', '')))),
                    ft.DataCell(ft.Text(str(p.get('criadoEm', ''))[:16].replace('T', ' '))),
                    ft.DataCell(ft.Text(self.moeda(float(p.get('total', 0))))),
                    ft.DataCell(ft.Text(str(len(p.get('itens', []))))),
                    ft.DataCell(ft.TextButton('Detalhes / Produção', on_click=lambda e, pedido=p: self.abrir_detalhes(pedido)))
                ]))
            self.page.update()
        except Exception as erro:
            self.msg.value = 'Erro ao listar pedidos: ' + str(erro)
            self.page.update()

    def abrir_detalhes(self, pedido):
        controles = [ft.Text('Cliente: ' + str(pedido.get('clienteNome', '')))]
        for i, item in enumerate(pedido.get('itens', [])):
            controles.extend([
                ft.Divider(),
                ft.Text('{} — {} x {}'.format(item.get('produtoNome', ''), item.get('quantidade', 0), item.get('personalizacao', '')), weight=ft.FontWeight.BOLD),
                ft.Text('Arte: {} | Produção: {}'.format(item.get('statusArte', ''), item.get('statusProducao', ''))),
                ft.Text('Origem: {} | Instruções: {}'.format(item.get('origemArte', ''), item.get('observacoes', ''))),
                ft.Row([
                    ft.TextButton('Aguardando aprovação', on_click=lambda e, j=i, p=pedido: self.alterar_status(p, j, {'statusArte': 'Aguardando aprovação'})),
                    ft.TextButton('Aprovar arte', on_click=lambda e, j=i, p=pedido: self.alterar_status(p, j, {'statusArte': 'Aprovada'})),
                    ft.TextButton('Iniciar produção', on_click=lambda e, j=i, p=pedido: self.iniciar_producao(p, j)),
                    ft.TextButton('Finalizar', on_click=lambda e, j=i, p=pedido: self.finalizar_producao(p, j)),
                ], wrap=True)
            ])
        self.dialogo.content = ft.Container(width=650, content=ft.Column(controles, tight=True, scroll=ft.ScrollMode.AUTO))
        self.dialogo.open = True
        self.page.update()

    def alterar_status(self, pedido, indice, alteracoes):
        try:
            self.api.atualizar_item(pedido['id'], indice, alteracoes)
            self.carregar_pedidos()
            atualizado = next(p for p in self.pedidos if p['id'] == pedido['id'])
            self.abrir_detalhes(atualizado)
        except Exception as erro:
            self.msg.value = 'Erro ao atualizar item: ' + str(erro)
            self.page.update()

    def iniciar_producao(self, pedido, indice):
        item = pedido['itens'][indice]
        if pedido.get('pagamento') != 'Pago' or item.get('statusArte') != 'Aprovada':
            self.msg.value = 'Produção bloqueada: pagamento e aprovação da arte são obrigatórios.'
            self.page.update()
            return
        self.alterar_status(pedido, indice, {'statusProducao': 'Em produção'})

    def finalizar_producao(self, pedido, indice):
        item = pedido['itens'][indice]
        if item.get('statusProducao') != 'Em produção':
            self.msg.value = 'Inicie a produção antes de finalizar.'
            self.page.update()
            return
        self.alterar_status(pedido, indice, {'statusProducao': 'Finalizado'})

    def fechar_dialogo(self, e):
        self.dialogo.open = False
        self.page.update()
