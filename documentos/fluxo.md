# Fluxo do Sistema Rodovia Lanches

Documento de apresentação que mostra como cada arquivo do **backend** e do **frontend** se encaixa e como uma requisição atravessa o sistema de ponta a ponta.

---

## 1. Visão geral da arquitetura

```
USUÁRIO
  |
  | (1) interage com a tela (clica, digita)
  v
+---------------+                          +----------------+                        +--------------+
|   FRONTEND    |  (2) HTTP (JSON)         |    BACKEND     |  (3) JPA / SQL         |    BANCO     |
|  React + Vite | -----------------------> |  Spring Boot   | ---------------------> |  PostgreSQL  |
|  porta 5173   | <----------------------- |  porta 8080    | <--------------------- |  porta 5432  |
+---------------+  (6) resposta (JSON)     +----------------+  (4) dados / IDs       +--------------+
       |                                           |
       | (7) atualiza tela                         | (5) aplica regras de negócio
       v                                           v    (validação, @Transactional)
   USUÁRIO vê                                decide salvar ou rejeitar
   o resultado

Páginas (Garçom, Cozinha,         Camadas:                          Tabelas:
Balcão, Gerente, Cadastros)       controlador → servico             usuario, produto,
                                  → repositorio → modelo            pedido, item_pedido
```

Três peças se comunicam:

1. **Frontend** — interface no navegador, feita em React. Cada papel da lanchonete (garçom, cozinha, balcão, gerente) tem sua tela.
2. **Backend** — servidor Spring Boot que expõe endpoints REST sob `/api/...` e centraliza as regras de negócio (estoque, status do pedido, validações).
3. **Banco de dados** — PostgreSQL guarda os usuários, produtos, pedidos e itens de pedido. O Hibernate (via Spring Data JPA) faz o mapeamento objeto-relacional.

---

## 2. Backend — `rodovialanches-backend`

### 2.1 Estrutura de pastas

```
src/main/java/com/rodovialanches/
├── RodoviaLanchesAplicacao.java   ← ponto de entrada (main)
├── configuracao/                  ← código de inicialização e CORS
│   ├── ConfiguracaoWeb.java
│   └── CarregadorInicial.java
├── controlador/                   ← endpoints REST (recebem HTTP)
│   ├── PedidoControlador.java
│   ├── ProdutoControlador.java
│   ├── UsuarioControlador.java
│   └── TratadorDeErrosApi.java
├── modelo/                        ← entidades JPA (tabelas)
│   ├── Pedido.java
│   ├── ItemPedido.java
│   ├── StatusPedido.java
│   ├── Produto.java
│   └── Usuario.java
├── repositorio/                   ← acesso ao banco (CRUD automático)
│   ├── PedidoRepositorio.java
│   ├── ItemPedidoRepositorio.java
│   ├── ProdutoRepositorio.java
│   └── UsuarioRepositorio.java
└── servico/                       ← regras de negócio
    └── PedidoServico.java

src/main/resources/
├── application.properties         ← conexão com banco + porta
└── data.sql                       ← script SQL alternativo de seed
```

A divisão segue o padrão **MVC em camadas** do Spring:

- **modelo** descreve "o quê" são os dados.
- **repositorio** descreve "como buscar/salvar" os dados.
- **servico** descreve "o que pode ser feito" com os dados (regras).
- **controlador** descreve "como expor" essas operações via HTTP.

A vantagem é isolamento: se um dia mudarmos o banco, só o repositório e algumas anotações no modelo mudam; serviço e controlador continuam iguais.

---

### 2.2 Modelos (entidades JPA)

Cada classe em `modelo/` vira uma tabela no PostgreSQL via `@Entity`. O Spring/Hibernate cria/atualiza o schema com base nessas classes (`spring.jpa.hibernate.ddl-auto=update`).

| Arquivo | Tabela | Função |
|---|---|---|
| `Usuario.java` | `usuario` | Representa qualquer pessoa do sistema: garçom, cozinha, balcão, gerente ou cliente. O campo `papel` diz qual função ele exerce. |
| `Produto.java` | `produto` | Item do cardápio com `nome`, `preco` e `quantidade` (estoque). |
| `Pedido.java` | `pedido` | Um pedido contém: o `garcom` que registrou, o `cliente`, o `numeroMesa`, lista de `itens`, `status` e `criadoEm`. |
| `ItemPedido.java` | `item_pedido` | Uma linha do pedido: associa um `produto` a uma `quantidade` dentro do `pedido`. |
| `StatusPedido.java` | — (enum) | Estados possíveis: `NOVO → AGUARDANDO_PREPARO → EM_PREPARO → PRONTO_PARA_PAGAMENTO → PAGO` (ou `CANCELADO`). |

**Por que entidades separadas?** Porque a relação **Pedido ↔ Produto** é N-para-N (um pedido tem vários produtos, um produto está em vários pedidos). A entidade `ItemPedido` é a tabela intermediária que carrega o atributo extra (a quantidade pedida).

---

### 2.3 Repositórios

São **interfaces** que estendem `JpaRepository`. O Spring gera a implementação automaticamente — não precisa escrever SQL para o CRUD básico.

| Arquivo | Métodos extras |
|---|---|
| `UsuarioRepositorio` | `existsByNomeIgnoreCaseAndTelefoneAndPapel(...)` — usado para impedir cadastro de cliente duplicado. |
| `ProdutoRepositorio` | Só os métodos padrão (findAll, save, delete...). |
| `ItemPedidoRepositorio` | `existsByProduto_Id(...)` — usado para impedir excluir produto que já foi vendido. |
| `PedidoRepositorio` | `findByStatus`, `existsByGarcom_Id`, `existsByCliente_Id`, `findByGarcom_Id` — usados pelas telas Cozinha/Balcão e pelo "Limpar pedidos do garçom". |

**Por que interfaces e não classes?** O Spring Data JPA lê o nome do método (`findByStatus`, `existsByGarcom_Id`) e gera automaticamente a consulta SQL correspondente. Reduz código repetitivo.

---

### 2.4 Serviço

`PedidoServico.java` é o único serviço do projeto porque é onde concentram as regras de negócio mais complexas (validações + efeitos colaterais).

**Por que separar `controlador` de `servico`?**
- O controlador deve ser fino: só recebe HTTP, chama o serviço e devolve resposta.
- O serviço encapsula a lógica reutilizável. Se amanhã criarmos um endpoint novo ou um teste automatizado, o serviço pode ser chamado direto sem precisar simular HTTP.

**Principais regras em `PedidoServico.criarPedido`:**
1. O garçom existe e está no banco.
2. O cliente existe e tem `papel == "CLIENTE"` (não permite mandar a conta para um cozinheiro, por exemplo).
3. O número de mesa está entre 1 e 8.
4. Cada produto pedido existe e tem estoque suficiente.
5. Debita o estoque do produto na hora.
6. Marca o pedido como `AGUARDANDO_PREPARO`.

Tudo isso é `@Transactional` — se algo falhar no meio, o estoque não é debitado pela metade.

---

### 2.5 Controladores

São as classes anotadas com `@RestController`. Cada uma expõe um conjunto de endpoints REST.

| Arquivo | Base URL | O que faz |
|---|---|---|
| `UsuarioControlador` | `/api/usuarios` | CRUD de usuários (cadastra garçons em `/garcons`, clientes em `/clientes`). |
| `ProdutoControlador` | `/api/produtos` | CRUD de produtos + endpoints `/quantidade` e `/estoque` para gerenciar estoque. |
| `PedidoControlador` | `/api/pedidos` | CRUD de pedidos + `/status/{status}` (filtro) e `/por-garcom/{id}` (limpar pedidos). |
| `TratadorDeErrosApi` | — | Intercepta `IllegalArgumentException` e devolve HTTP 400 com mensagem amigável (em vez de stack trace). |

#### Endpoints completos

| Método | URL | Quem chama |
|---|---|---|
| `GET`    | `/api/usuarios`                            | Garçom (selects), Cadastros (listas) |
| `POST`   | `/api/usuarios/garcons`                    | Cadastro de Garçom |
| `POST`   | `/api/usuarios/clientes`                   | Cadastro de Cliente / Garçom (cadastro rápido) |
| `PUT`    | `/api/usuarios/{id}`                       | Cadastros (edição) |
| `DELETE` | `/api/usuarios/{id}`                       | Cadastros (remoção) |
| `GET`    | `/api/produtos`                            | Garçom (lista), Gerente (lista) |
| `POST`   | `/api/produtos`                            | Gerente (cadastrar) |
| `PUT`    | `/api/produtos/{id}`                       | Gerente (editar nome/preço) |
| `PUT`    | `/api/produtos/{id}/quantidade?quantidade=N` | Gerente (definir estoque absoluto) |
| `PUT`    | `/api/produtos/{id}/estoque?delta=N`       | (interno) ajuste por delta |
| `DELETE` | `/api/produtos/{id}`                       | Gerente |
| `POST`   | `/api/pedidos`                             | Garçom (enviar pedido) |
| `GET`    | `/api/pedidos`                             | Cozinha, Balcão, Gerente |
| `GET`    | `/api/pedidos/status/{status}`             | (filtro alternativo) |
| `PUT`    | `/api/pedidos/{id}/status?status=...`      | Cozinha ("Marcar Pronto"), Balcão ("Marcar Pago") |
| `DELETE` | `/api/pedidos/{id}`                        | Gerente |
| `DELETE` | `/api/pedidos/por-garcom/{garcomId}`       | Garçom (botão "Limpar pedidos do garçom") |

---

### 2.6 Configuração

| Arquivo | Função |
|---|---|
| `ConfiguracaoWeb.java` | Habilita **CORS** para `http://localhost:5173`. Sem isso, o navegador bloqueia as chamadas do frontend para o backend (política de mesma origem). |
| `CarregadorInicial.java` | Implementa `CommandLineRunner` — roda **uma vez ao subir a aplicação**. Insere usuários e produtos iniciais se o banco estiver vazio (Garcom1, Cozinha1, Balcao1, Gerente1, Cliente1 + cardápio). |
| `application.properties` | Conexão com PostgreSQL (host, db, user/pass), `ddl-auto=update`, porta 8080. |

---

### 2.7 Aplicação principal

`RodoviaLanchesAplicacao.java` tem só o `main()` e a anotação `@SpringBootApplication`. O Spring Boot:
- Inicia o Tomcat embarcado na porta 8080.
- Procura por todas as classes `@Component`/`@Service`/`@RestController`/`@Repository` no pacote e registra automaticamente.
- Conecta ao banco usando as propriedades do `application.properties`.

---

## 3. Frontend — `rodovialanches-frontend`

### 3.1 Estrutura

```
src/
├── main.jsx                 ← ponto de entrada (monta o React no <div id="root">)
├── App.jsx                  ← componente raiz, controla qual página exibir
├── api.js                   ← funções que falam com o backend (fetch + JSON)
├── estilos.css              ← estilos globais
└── paginas/
    ├── Garcom.jsx
    ├── Cozinha.jsx
    ├── Balcao.jsx
    ├── Gerente.jsx
    ├── CadastroGarcons.jsx
    └── CadastroClientes.jsx
```

### 3.2 Função de cada arquivo

| Arquivo | O que faz |
|---|---|
| `main.jsx` | Renderiza o `<App />` dentro do `<div id="root">` do `index.html`. |
| `App.jsx` | Mantém o estado da página ativa (`pagina`). Mostra o menu de navegação e renderiza o componente correto. **Não usa router** porque o projeto é pequeno — basta `useState`. |
| `api.js` | Centraliza todas as chamadas HTTP (`fetch`). Cada função devolve `{ ok, ...dados }` ou `{ ok: false, message }`. As páginas chamam essas funções em vez de fazer `fetch` na mão. **Isso é a "camada de serviço" do frontend.** |
| `estilos.css` | Classes utilitárias: `.app-shell`, `.page-card`, `.stats-card`, `.action-button`, `.table-box`, etc. |
| `paginas/Garcom.jsx` | Tela do garçom: monta o pedido, escolhe mesa, vê pedidos prontos, cadastra cliente rápido. |
| `paginas/Cozinha.jsx` | Lista pedidos `AGUARDANDO_PREPARO`/`EM_PREPARO` e tem botão "Marcar Pronto". |
| `paginas/Balcao.jsx` | Lista pedidos `PRONTO_PARA_PAGAMENTO`, mostra total e tem botão "Marcar Pago". |
| `paginas/Gerente.jsx` | Painel administrativo: estatísticas, filtro por data, todos os pedidos, CRUD de produtos. |
| `paginas/CadastroGarcons.jsx` | CRUD de garçons (CREATE/READ/UPDATE/DELETE). |
| `paginas/CadastroClientes.jsx` | CRUD de clientes. |

### 3.3 Sincronização em tempo real

As páginas Cozinha, Balcão e Gerente fazem **polling** a cada 3 segundos:

```js
React.useEffect(()=>{
  carregar()
  const t = setInterval(carregar, 3000)
  return () => clearInterval(t)
}, [])
```

Isso evita a complexidade de WebSocket; para a escala da lanchonete (poucos pedidos por minuto) é o suficiente.

---

## 4. Fluxo end-to-end de um pedido

Acompanhe o caminho de um único pedido pelo sistema:

```
GARÇOM                          BACKEND                      COZINHA            BALCÃO            GERENTE
  │                                │                            │                  │                  │
  │ 1. monta pedido na tela        │                            │                  │                  │
  │    seleciona garçom,           │                            │                  │                  │
  │    cliente e mesa              │                            │                  │                  │
  │                                │                            │                  │                  │
  │ 2. clica "Enviar Pedido"       │                            │                  │                  │
  │ ─────POST /api/pedidos───────> │                            │                  │                  │
  │                                │ 3. PedidoControlador.criar │                  │                  │
  │                                │    chama PedidoServico     │                  │                  │
  │                                │    valida + debita estoque │                  │                  │
  │                                │    salva no banco          │                  │                  │
  │                                │    status=AGUARDANDO_PREPARO                 │                  │
  │ <─────── 200 OK + pedido ───── │                            │                  │                  │
  │                                │                            │                  │                  │
  │                                │ <───GET /api/pedidos──── 4.│ (polling 3s)     │                  │
  │                                │ ─────lista de pedidos────> │                  │                  │
  │                                │                            │ pedido aparece   │                  │
  │                                │                            │ na fila          │                  │
  │                                │                            │                  │                  │
  │                                │ <─PUT /pedidos/{id}/status?status=PRONTO_PARA_PAGAMENTO─┐        │
  │                                │ ───── 200 OK ──────────────────────────────────────────┘        │
  │                                │                            │ 5. cozinha clica  │                  │
  │                                │                            │ "Marcar Pronto"   │                  │
  │                                │                            │                  │                  │
  │                                │ <──GET /api/pedidos──── 6.│                  │ (polling 3s)     │
  │                                │ ─────lista atualizada────> │                  │                  │
  │                                │                            │                  │ pedido aparece   │
  │                                │                            │                  │ no caixa         │
  │                                │                            │                  │                  │
  │                                │ <─PUT /pedidos/{id}/status?status=PAGO────────┘                  │
  │                                │ ───── 200 OK ─────────────────────────────────────>              │
  │                                │                            │                  │ 7. caixa clica   │
  │                                │                            │                  │ "Marcar Pago"    │
  │                                │                            │                  │                  │
  │                                │ <─GET /api/pedidos────────────────────────────────────────── 8.  │
  │                                │ ──────────── lista geral, filtros, totais ────────────────────>  │
  │                                │                            │                  │                  │ aparece no
  │                                │                            │                  │                  │ painel
```

**Passo a passo:**

1. **Garçom** abre a página Garçom, escolhe garçom, cliente e mesa, adiciona produtos do cardápio.
2. Clica em "Enviar Pedido" → o frontend chama `criarPedido(pedido)` em `api.js`, que faz `POST /api/pedidos`.
3. O backend (`PedidoControlador → PedidoServico`) valida tudo, debita estoque, salva o pedido com status `AGUARDANDO_PREPARO`.
4. A página **Cozinha** está fazendo polling a cada 3s via `GET /api/pedidos` (filtrado no frontend pelos status `AGUARDANDO_PREPARO`/`EM_PREPARO`). O pedido aparece automaticamente.
5. Quando a comida fica pronta, o cozinheiro clica "Marcar Pronto" → `PUT /api/pedidos/{id}/status?status=PRONTO_PARA_PAGAMENTO`.
6. A página **Balcão** (também polling) recebe o pedido na fila de pagamento.
7. O caixa clica "Marcar Pago" → `PUT /api/pedidos/{id}/status?status=PAGO`.
8. A página **Gerente** mostra estatísticas, total de pedidos, filtros por data — todo o histórico fica acessível.

---

## 5. Fluxo de dados pelas camadas (zoom no backend)

Quando chega `POST /api/pedidos`:

```
HTTP request
   │
   ▼
┌──────────────────────────┐
│  PedidoControlador       │  @RestController @RequestMapping("/api/pedidos")
│  método criar()          │  Recebe JSON, transforma em objeto Pedido.
└─────────────┬────────────┘
              │ chama
              ▼
┌──────────────────────────┐
│  PedidoServico           │  @Service
│  método criarPedido()    │  Valida garçom/cliente/mesa/estoque.
│                          │  Debita estoque dos produtos.
│                          │  @Transactional — tudo ou nada.
└─────────────┬────────────┘
              │ chama
              ▼
┌──────────────────────────┐
│  UsuarioRepositorio      │  Spring Data JPA
│  ProdutoRepositorio      │  Métodos CRUD gerados automaticamente.
│  PedidoRepositorio       │
└─────────────┬────────────┘
              │ traduz para
              ▼
┌──────────────────────────┐
│  Hibernate (JPA)         │  Lê as anotações @Entity / @Table / @Column
│                          │  e gera SQL (INSERT/UPDATE/SELECT).
└─────────────┬────────────┘
              │ JDBC
              ▼
┌──────────────────────────┐
│  PostgreSQL              │  Tabelas: usuario, produto, pedido, item_pedido
└──────────────────────────┘
```

A resposta volta pelo caminho inverso: Hibernate monta os objetos a partir das linhas, o repositório devolve, o serviço processa, o controlador serializa para JSON e o Spring envia a resposta HTTP.

---

## 6. Como rodar

### Pré-requisitos
- Java 17+
- Node.js 18+
- PostgreSQL rodando local com banco `rodovialanches` (usuário/senha `postgres/postgres`)

> ⚠️ **Importante:** como renomeamos tabelas e colunas para português, é preciso **dropar o banco antigo** antes do primeiro run. No psql:
> ```sql
> DROP DATABASE rodovialanches;
> CREATE DATABASE rodovialanches;
> ```
> O Spring vai recriar todas as tabelas (`usuario`, `produto`, `pedido`, `item_pedido`) e o `CarregadorInicial` popula os dados padrão.

### Backend
```bash
cd rodovialanches-backend
mvnd spring-boot:run
```
Sobe em `http://localhost:8080`.

> Usamos **mvnd** (Maven Daemon) em vez do `mvn` puro: ele mantém um processo Java rodando em background entre builds, então a partir da segunda execução o startup fica bem mais rápido. Comandos equivalentes: `mvnd compile`, `mvnd clean package`, `mvnd test`.

### Frontend
```bash
cd rodovialanches-frontend
npm install   # primeira vez
npm run dev
```
Sobe em `http://localhost:5173`.

---

## 7. Mapa rápido para a apresentação

Se você precisar abrir os arquivos durante a apresentação, esta é a ordem natural para contar a história:

1. **Visão geral**: `fluxo.md` (este arquivo).
2. **Modelo**: `modelo/Pedido.java` — explica entidades, relacionamentos (`@ManyToOne`, `@OneToMany`).
3. **Repositório**: `repositorio/PedidoRepositorio.java` — mostra como o Spring gera SQL pelo nome do método.
4. **Serviço**: `servico/PedidoServico.java` — onde estão as regras (validação + debitar estoque + `@Transactional`).
5. **Controlador**: `controlador/PedidoControlador.java` — endpoints REST e mapeamento HTTP→Java.
6. **Configuração**: `configuracao/CarregadorInicial.java` e `ConfiguracaoWeb.java`.
7. **Frontend — orquestração**: `App.jsx` (navegação) e `api.js` (cliente HTTP).
8. **Frontend — telas**: `paginas/Garcom.jsx` (fluxo principal), depois `Cozinha.jsx` → `Balcao.jsx` → `Gerente.jsx`.

A regra de ouro: começar **de dentro para fora** (modelo → serviço → controlador → frontend) facilita o entendimento, porque cada camada só depende das anteriores.
