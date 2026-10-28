# -*- coding: utf-8 -*-
"""Consulta somente leitura das coleções usadas nos relatórios."""
from firebase_financeiro import FirebaseFinanceiro

class FirebaseRelatorios(FirebaseFinanceiro):
    def carregar_dados(self):
        # Não altera nenhuma coleção do Firestore.
        return {
            'pedidos': self.listar_pedidos(),
            'movimentos': self.listar_movimentacoes(),
            'clientes': self.listar_clientes(),
            'produtos': self.listar_produtos(),
        }
