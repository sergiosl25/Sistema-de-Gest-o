# -*- coding: utf-8 -*-
from collections import defaultdict
from datetime import datetime, timezone, timedelta
import calendar
import flet as ft
from firebase_financeiro import FirebaseFinanceiro

AZUL = '#2563EB'
VERDE = '#15803D'
VERMELHO = '#B91C1C'


class TelaFinanceiro:
    """Relatórios de caixa (sem inclusão, alteração ou exclusão)."""

    def __init__(self, page, sessao):
        self.page = page
        self.api = FirebaseFinanceiro(sessao)
        hoje = datetime.now(timezone.utc)
        self.registros = []
        self.periodo = ft.Dropdown(
            label='Período', width=205, value='mes',
            options=[ft.dropdown.Option('hoje', 'Hoje (UTC)'),
                     ft.dropdown.Option('mes', 'Mês selecionado'),
                     ft.dropdown.Option('ano', 'Ano selecionado'),
                     ft.dropdown.Option('todos', 'Todo o histórico'),
                     ft.dropdown.Option('personalizado', 'Personalizado')],
            on_change=self.atualizar)
        self.mes = ft.Dropdown(
            label='Mês', width=165, value=str(hoje.month),
            options=[ft.dropdown.Option(str(i), calendar.month_name[i]) for i in range(1, 13)],
            on_change=self.atualizar)
        self.ano = ft.TextField(label='Ano', value=str(hoje.year), width=105,
                                on_change=self.atualizar)
        self.inicio = ft.TextField(label='Início (AAAA-MM-DD)', width=195,
                                   on_change=self.atualizar)
        self.fim = ft.TextField(label='Fim (AAAA-MM-DD)', width=195,
                                on_change=self.atualizar)
        self.mensagem = ft.Text('')
        self.indicadores = ft.Row(wrap=True, spacing=12)
        self.grafico = ft.Column(spacing=6)
        self.formas = ft.Column(spacing=5)
        self.categorias = ft.Column(spacing=5)
        self.tabela = ft.DataTable(
            columns=[ft.DataColumn(ft.Text(x)) for x in
                     ('Data UTC', 'Tipo', 'Origem', 'Descrição', 'Forma', 'Valor')], rows=[])
        self.conteudo = ft.Column([
            ft.Text('Financeiro', size=25, weight=ft.FontWeight.BOLD),
            ft.Text('Consultas e relatórios • dados de caixaMovimentos • datas em UTC'),
            ft.Row([self.periodo, self.mes, self.ano, self.inicio, self.fim,
                    ft.ElevatedButton('Atualizar dados', on_click=self.carregar)], wrap=True),
            self.mensagem,
            self.indicadores,
            ft.Divider(),
            ft.Text('Entradas e saídas por mês', size=19, weight=ft.FontWeight.BOLD),
            self.grafico,
            ft.Divider(),
            ft.Text('Recebimentos por forma de pagamento', size=19, weight=ft.FontWeight.BOLD),
            self.formas,
            ft.Divider(),
            ft.Text('Despesas por categoria', size=19, weight=ft.FontWeight.BOLD),
            self.categorias,
            ft.Divider(),
            ft.Text('Movimentações do período', size=19, weight=ft.FontWeight.BOLD),
            ft.Row([self.tabela], scroll=ft.ScrollMode.AUTO),
            ft.Text('Observação: vendas anteriores à integração do Caixa não são importadas. '
                    'Valores de cartão de crédito são considerados integralmente na data da venda.')
        ], spacing=12, scroll=ft.ScrollMode.AUTO, expand=True)

    def construir(self):
        return self.conteudo

    @staticmethod
    def moeda(centavos):
        return 'R$ {:,.2f}'.format(centavos / 100).replace(',', 'X').replace('.', ',').replace('X', '.')

    @staticmethod
    def data_registro(registro):
        valor = str(registro.get('criadoEm') or '')
        try:
            data = datetime.fromisoformat(valor.replace('Z', '+00:00'))
            if data.tzinfo is None:
                data = data.replace(tzinfo=timezone.utc)
            return data.astimezone(timezone.utc)
        except (TypeError, ValueError):
            return None

    def intervalo(self):
        modo = self.periodo.value
        agora = datetime.now(timezone.utc)
        if modo == 'todos':
            return None, None
        if modo == 'hoje':
            inicio = agora.replace(hour=0, minute=0, second=0, microsecond=0)
            return inicio, inicio + timedelta(days=1)
        if modo == 'personalizado':
            try:
                a = datetime.strptime(self.inicio.value.strip(), '%Y-%m-%d').replace(tzinfo=timezone.utc)
                b = datetime.strptime(self.fim.value.strip(), '%Y-%m-%d').replace(tzinfo=timezone.utc)
            except (ValueError, AttributeError):
                raise ValueError('Informe início e fim no formato AAAA-MM-DD.')
            if b < a:
                raise ValueError('A data final deve ser igual ou posterior à inicial.')
            return a, b + timedelta(days=1)
        try:
            ano = int(self.ano.value)
            if ano < 2000 or ano > 9998:
                raise ValueError()
            mes = int(self.mes.value)
            if mes < 1 or mes > 12:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValueError('Informe um ano e mês válidos.')
        if modo == 'ano':
            return datetime(ano, 1, 1, tzinfo=timezone.utc), datetime(ano + 1, 1, 1, tzinfo=timezone.utc)
        a = datetime(ano, mes, 1, tzinfo=timezone.utc)
        b = datetime(ano + 1, 1, 1, tzinfo=timezone.utc) if mes == 12 else datetime(ano, mes + 1, 1, tzinfo=timezone.utc)
        return a, b

    def carregar(self, e=None):
        try:
            self.registros = self.api.listar_movimentacoes()
            self.atualizar()
        except Exception as erro:
            self.mensagem.value = 'Erro ao consultar o Firebase: ' + str(erro)
            self.page.update()

    def _cartao(self, titulo, valor, cor):
        return ft.Container(
            content=ft.Column([ft.Text(titulo, size=13),
                               ft.Text(self.moeda(valor), size=19, weight=ft.FontWeight.BOLD, color=cor)],
                              spacing=4, tight=True),
            bgcolor='#FFFFFF', border=ft.border.all(1, '#CBD5E1'),
            border_radius=10, padding=15, width=215)

    def _barra(self, rotulo, entradas, saidas, escala):
        largura_entrada = max(0, int(300 * entradas / escala))
        largura_saida = max(0, int(300 * saidas / escala))
        return ft.Row([
            ft.Container(ft.Text(rotulo, size=12), width=100),
            ft.Column([
                ft.Row([ft.Container(width=largura_entrada, height=11, bgcolor=VERDE),
                        ft.Text('Entradas ' + self.moeda(entradas), size=11)], spacing=6),
                ft.Row([ft.Container(width=largura_saida, height=11, bgcolor=VERMELHO),
                        ft.Text('Saídas ' + self.moeda(saidas), size=11)], spacing=6),
            ], spacing=4)
        ], wrap=True, vertical_alignment=ft.CrossAxisAlignment.CENTER)

    def atualizar(self, e=None):
        try:
            inicio, fim = self.intervalo()
            filtrados = []
            sem_data = 0
            for r in self.registros:
                data = self.data_registro(r)
                if data is None:
                    sem_data += 1
                    continue
                if (inicio is None or data >= inicio) and (fim is None or data < fim):
                    filtrados.append((data, r))
            entradas = saidas = faturamento = 0
            por_mes = defaultdict(lambda: [0, 0])
            por_forma = defaultdict(int)
            por_categoria = defaultdict(int)
            self.tabela.rows = []
            for data, r in sorted(filtrados, key=lambda item: item[0], reverse=True):
                tipo = str(r.get('tipo') or '')
                centavos = int(r.get('centavos') or 0)
                if centavos < 0:
                    continue
                chave_mes = data.strftime('%Y-%m')
                if tipo == 'Entrada':
                    entradas += centavos
                    por_mes[chave_mes][0] += centavos
                    por_forma[str(r.get('forma') or 'Não informada')] += centavos
                    if r.get('origem') == 'Venda':
                        faturamento += centavos
                elif tipo == 'Saída':
                    saidas += centavos
                    por_mes[chave_mes][1] += centavos
                    por_categoria[str(r.get('categoria') or 'Sem categoria')] += centavos
                else:
                    continue
                self.tabela.rows.append(ft.DataRow(cells=[
                    ft.DataCell(ft.Text(data.strftime('%d/%m/%Y %H:%M'))),
                    ft.DataCell(ft.Text(tipo)),
                    ft.DataCell(ft.Text(str(r.get('origem') or ''))),
                    ft.DataCell(ft.Text(str(r.get('descricao') or ''))),
                    ft.DataCell(ft.Text(str(r.get('forma') or ''))),
                    ft.DataCell(ft.Text(self.moeda(centavos if tipo == 'Entrada' else -centavos))),
                ]))
            self.indicadores.controls = [
                self._cartao('Faturamento de vendas', faturamento, AZUL),
                self._cartao('Total de entradas', entradas, VERDE),
                self._cartao('Total de despesas', saidas, VERMELHO),
                self._cartao('Resultado (entradas − saídas)', entradas - saidas, AZUL),
            ]
            escala = max([max(valores) for valores in por_mes.values()] or [1]) or 1
            self.grafico.controls = [self._barra(mes, *valores, escala)
                                     for mes, valores in sorted(por_mes.items())]
            if not self.grafico.controls:
                self.grafico.controls = [ft.Text('Sem movimentações no período.')]
            self.formas.controls = [ft.Text('{}: {}'.format(k, self.moeda(v)))
                                   for k, v in sorted(por_forma.items(), key=lambda x: -x[1])]
            if not self.formas.controls:
                self.formas.controls = [ft.Text('Nenhum recebimento no período.')]
            self.categorias.controls = [ft.Text('{}: {}'.format(k, self.moeda(v)))
                                       for k, v in sorted(por_categoria.items(), key=lambda x: -x[1])]
            if not self.categorias.controls:
                self.categorias.controls = [ft.Text('Nenhuma despesa no período.')]
            aviso = ' | {} registro(s) sem data válida ignorado(s)'.format(sem_data) if sem_data else ''
            self.mensagem.value = '{} movimentação(ões) no período{}'.format(len(self.tabela.rows), aviso)
        except Exception as erro:
            self.mensagem.value = 'Filtro inválido: ' + str(erro)
        self.page.update()
