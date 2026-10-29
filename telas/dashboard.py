# -*- coding: utf-8 -*-
import asyncio
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import flet as ft
from firebase_dashboard import FirebaseDashboard
FUSO_BRASIL = timezone(timedelta(hours=-3))
AZUL = '#2563EB'
FUNDO = '#FFFFFF'
TEXTO = '#1E293B'

def dinheiro(centavos):
    return 'R$ {:,.2f}'.format(centavos / 100).replace(',', 'X').replace('.', ',').replace('X', '.')

def data_utc(valor):
    try:
        if not valor:
            return None

        data = datetime.fromisoformat(
            str(valor).replace("Z", "+00:00")
        )

        if data.tzinfo is None:
            data = data.replace(tzinfo=ZoneInfo("UTC"))

        return data.astimezone(
            ZoneInfo("America/Sao_Paulo")
        )

    except (ValueError, TypeError):
        return None

def formatar_data_br(valor):
    data = data_utc(valor)

    if data is None:
        return ""

    return data.strftime("%d/%m/%Y %H:%M:%S")

class TelaDashboard:
    def __init__(self, page, sessao):
        self.page = page
        self.api = FirebaseDashboard(sessao)
        self.ativo = True
        self.carregando = False
        self.msg = ft.Text('Carregue os indicadores.', size=12, color='#64748B')
        self.indicadores = ft.ResponsiveRow(spacing=12, run_spacing=12)
        self.grafico = ft.Column(spacing=9)
        self.ranking = ft.Column(spacing=8)
        self.situacoes = ft.Column(spacing=8)
        self.conteudo = ft.Column([
            ft.Row([ft.Text('Visão geral da loja', size=23, weight=ft.FontWeight.BOLD),
                    ft.ElevatedButton('Atualizar agora', icon=ft.icons.REFRESH, on_click=self.carregar)], wrap=True),
           ft.Text('Indicadores e recebimentos no horário de Brasília • atualização automática a cada 60 segundos', size=12, color='#64748B'),
            self.msg, self.indicadores,
            ft.ResponsiveRow([
                ft.Container(col={'xs':12,'lg':7}, padding=18, bgcolor=FUNDO, border_radius=12,
                             content=ft.Column([ft.Text('Recebimentos de vendas — últimos 6 meses', size=17, weight=ft.FontWeight.BOLD), self.grafico])),
                ft.Container(col={'xs':12,'lg':5}, padding=18, bgcolor=FUNDO, border_radius=12,
                             content=ft.Column([ft.Text('Produtos mais vendidos — top 5', size=17, weight=ft.FontWeight.BOLD), self.ranking])),
            ], spacing=12, run_spacing=12),
            ft.Container(bgcolor=FUNDO, border_radius=12, padding=18,
                         content=ft.Column([ft.Text('Situação da produção e das entregas', size=17, weight=ft.FontWeight.BOLD), self.situacoes])),
        ], spacing=16, tight=True)

    def construir(self): return self.conteudo

    def cartao(self, titulo, valor, icone, cor):
        return ft.Container(col={'xs':12,'sm':6,'lg':3}, bgcolor=FUNDO, border_radius=12, padding=16,
            content=ft.Column([ft.Icon(icone, color=cor, size=29), ft.Text(titulo, size=13, color='#64748B'),
                               ft.Text(str(valor), size=23, weight=ft.FontWeight.BOLD, color=TEXTO)], spacing=8))

    def carregar(self, e=None):
        if self.carregando: return
        self.carregando = True
        self.msg.value = 'Atualizando dados...'
        self.page.update()
        try:
            dados = self.api.consultar()
            pedidos = dados['pedidos']; movimentos = dados['movimentos']
            agora = datetime.now(FUSO_BRASIL)
            mes_atual = (agora.year, agora.month)
            entradas_vendas = [m for m in movimentos if m.get('tipo') == 'Entrada' and m.get('origem') == 'Venda']
            total_mes = sum(int(m.get('centavos') or 0) for m in entradas_vendas if (lambda d: d and (d.year,d.month)==mes_atual)(data_utc(m.get('criadoEm'))))
            pedidos_mes = sum(1 for p in pedidos if (lambda d: d and (d.year,d.month)==mes_atual)(data_utc(p.get('criadoEm'))))
            producao = sum(1 for p in pedidos for item in p.get('itens', []) if item.get('statusProducao') == 'Em produção')
            entregas = sum(1 for p in pedidos if p.get('statusEntrega') not in ('Concluído', 'Entregue'))
            self.indicadores.controls = [
                self.cartao('Faturamento do mês', dinheiro(total_mes), ft.icons.ATTACH_MONEY, '#16A34A'),
                self.cartao('Pedidos do mês', pedidos_mes, ft.icons.SHOPPING_BAG, AZUL),
                self.cartao('Itens em produção', producao, ft.icons.BUILD, '#D97706'),
                self.cartao('Entregas pendentes', entregas, ft.icons.LOCAL_SHIPPING, '#DC2626'),
                self.cartao('Clientes cadastrados', len(dados['clientes']), ft.icons.PEOPLE, AZUL),
            ]
            meses = []
            for delta in range(5,-1,-1):
                ano = agora.year; mes = agora.month - delta
                while mes <= 0: mes += 12; ano -= 1
                meses.append((ano,mes))
            totais = defaultdict(int)
            for m in entradas_vendas:
                d = data_utc(m.get('criadoEm'))
                if d: totais[(d.year,d.month)] += int(m.get('centavos') or 0)
            maximo = max([totais[x] for x in meses] + [1])
            self.grafico.controls = []
            for ano,mes in meses:
                valor = totais[(ano,mes)]
                self.grafico.controls.append(ft.Row([
                    ft.Text(f'{mes:02d}/{ano}', width=75, size=12),
                    ft.Container(expand=True, bgcolor='#E2E8F0', border_radius=5, height=18,
                        content=ft.Row([ft.Container(width=max(1,round(260*valor/maximo)), bgcolor=AZUL, height=18, border_radius=5)], spacing=0)),
                    ft.Text(dinheiro(valor), width=112, size=11, text_align=ft.TextAlign.RIGHT)
                ], spacing=10))
            ranking = Counter()
            for p in pedidos:
                for item in p.get('itens', []):
                    ranking[str(item.get('produtoNome') or 'Sem nome')] += int(item.get('quantidade') or 0)
            self.ranking.controls = [ft.Text(f'{i}. {nome} — {qtd} un.', size=13) for i,(nome,qtd) in enumerate(ranking.most_common(5),1)] or [ft.Text('Sem produtos vendidos.')]
            estados = Counter(str(item.get('statusProducao') or 'Sem status') for p in pedidos for item in p.get('itens', []))
            self.situacoes.controls = [ft.Text(f'{nome}: {qtd}', size=13) for nome,qtd in sorted(estados.items())] or [ft.Text('Nenhum item registrado.')]
            self.msg.value = ('Atualizado em ' + agora.strftime('%d/%m/%Y às %H:%M:%S') + ' (Horário de Brasília)')
        except Exception as erro:
            self.msg.value = 'Não foi possível atualizar o Dashboard: ' + str(erro)
        finally:
            self.carregando = False
            self.page.update()

    def iniciar_atualizacao(self):
        self.page.run_task(self._atualizar_periodicamente)

    async def _atualizar_periodicamente(self):
        while self.ativo:
            await asyncio.sleep(60)
            if not self.ativo: break
            # Somente atualiza se os controles desta tela continuam na pagina.
            try:
                if self.conteudo.page is None:
                    self.ativo = False
                    break
                self.carregar()
            except Exception:
                self.ativo = False
                break
