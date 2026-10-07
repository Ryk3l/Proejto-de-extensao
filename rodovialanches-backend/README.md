# Rodovia Lanches - Backend

Backend Spring Boot para o trabalho da faculdade.

Pré-requisitos:
- Java 17
- Maven (`mvnd` recomendado)
- PostgreSQL

Crie o banco PostgreSQL `rodovialanches` e ajuste credenciais se necessário:

```bash
psql -U postgres -c "CREATE DATABASE rodovialanches;"
```

Rodar a aplicação:

```bash
cd rodovialanches-backend
mvnd spring-boot:run
```

Endpoints básicos:
- `POST /api/pedidos` — criar pedido (enviar JSON do `Pedido` com `itens`)
- `GET /api/pedidos` — listar pedidos
- `GET /api/pedidos/status/{status}` — filtrar por status
- `PUT /api/pedidos/{id}/status?status=PRONTO_PARA_PAGAMENTO` — atualizar status
- `DELETE /api/pedidos/por-garcom/{garcomId}` — remover todos os pedidos de um garçom

O backend controla estoque de produtos: quando um pedido é criado, a quantidade no produto é reduzida automaticamente. Se não houver estoque, a API retorna erro 400.

O backend permite chamadas do frontend `http://localhost:5173` via CORS.

Veja `../explicacao.md` para um guia didático do projeto e `../fluxo.md` para o passo a passo de apresentação.
