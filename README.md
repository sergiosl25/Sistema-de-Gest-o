# Alves Personalizados — protótipo de interface

Este pacote é uma **prévia visual**, não a migração concluída. Não conecta ao Firebase, não faz login e não grava dados.

## Executar no Windows

1. Instale Python 3.11 ou 3.12.
2. Abra o PowerShell dentro da pasta extraída.
3. Execute:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

## Próximos passos

- Verificar todos os campos das coleções Firestore, inclusive os não visíveis nas capturas.
- Criar autenticação Firebase segura e permissões verificadas no servidor.
- Mapear e comparar registros SQLite e Firestore, com backup e prévia de conflitos.
- Migrar módulos gradualmente, com testes de ponta a ponta.
- Preparar hospedagem Python para acesso por navegador no computador e celular.

**Não inclua credenciais de conta de serviço em repositórios públicos.**
