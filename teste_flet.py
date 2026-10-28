import flet as ft


def main(page: ft.Page):
    page.title = "Alvespersonalizados"

    page.add(
        ft.Text(
            "FLET FUNCIONANDO!",
            size=30,
            color="blue"
        ),
        ft.ElevatedButton(
            text="TESTAR BOTÃO",
            on_click=lambda e: print("Botão funcionando!")
        )
    )


if __name__ == "__main__":
    print("Iniciando Flet no navegador...")

    ft.app(
        target=main,
        view=ft.AppView.WEB_BROWSER,
        port=8550
    )
