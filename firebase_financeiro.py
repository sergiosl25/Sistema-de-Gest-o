# -*- coding: utf-8 -*-
from firebase_caixa import FirebaseCaixa


class FirebaseFinanceiro(FirebaseCaixa):
    """Acesso somente de leitura às movimentações do Caixa."""

    def listar_movimentacoes(self):
        return self.listar()
