# -*- coding: utf-8 -*-

import requests

from firebase_config import FIREBASE_API_KEY


class FirebaseAuth:
    def __init__(self):
        self.url = (
            "https://identitytoolkit.googleapis.com/v1/"
            "accounts:signInWithPassword"
        )

    def login(self, email, senha):
        if (
            not FIREBASE_API_KEY
            or FIREBASE_API_KEY == "COLE_AQUI_SUA_API_KEY_WEB"
        ):
            return {
                "sucesso": False,
                "mensagem": "Configure a API Key do Firebase."
            }

        dados = {
            "email": email,
            "password": senha,
            "returnSecureToken": True
        }

        try:
            resposta = requests.post(
                self.url,
                params={"key": FIREBASE_API_KEY},
                json=dados,
                timeout=15
            )

            resultado = resposta.json()

            if resposta.status_code == 200:
                return {
                    "sucesso": True,
                    "email": resultado.get("email", email),
                    "uid": resultado.get("localId"),
                    "id_token": resultado.get("idToken"),
                    "refresh_token": resultado.get("refreshToken"),
                    "expires_in": resultado.get("expiresIn")
                }

            codigo = resultado.get(
                "error", {}
            ).get("message", "")

            if codigo in (
                "EMAIL_NOT_FOUND",
                "INVALID_PASSWORD",
                "INVALID_LOGIN_CREDENTIALS"
            ):
                mensagem = "E-mail ou senha inválidos."
            elif codigo == "USER_DISABLED":
                mensagem = "Este usuário está desativado."
            elif codigo == "TOO_MANY_ATTEMPTS_TRY_LATER":
                mensagem = "Muitas tentativas. Tente novamente mais tarde."
            else:
                mensagem = (
                    "Não foi possível autenticar. "
                    "Verifique as configurações do Firebase."
                )

            return {
                "sucesso": False,
                "mensagem": mensagem
            }

        except requests.exceptions.RequestException:
            return {
                "sucesso": False,
                "mensagem": (
                    "Falha de conexão. "
                    "Verifique sua internet."
                )
            }
