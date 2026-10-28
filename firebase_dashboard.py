# -*- coding: utf-8 -*-
from firebase_vendas import FirebaseVendas

class FirebaseDashboard(FirebaseVendas):
    """Consultas de leitura; nao altera documentos do Firestore."""
    def consultar(self):
        return {
            'pedidos': self.listar_pedidos(),
            'clientes': self.listar_colecao('clientes'),
            'movimentos': self.listar_colecao('caixaMovimentos'),
        }
