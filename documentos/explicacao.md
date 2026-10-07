# Explicação do Projeto Rodovia Lanches

Guia introdutório pensado para quem está chegando agora no projeto (ou está começando em desenvolvimento web). A ideia é que, ao final, você entenda **o que cada arquivo faz, por que existe, e como tudo se conecta**.

Vamos do mais abstrato (conceitos) para o mais concreto (código).

---

## Parte 1 — Conceitos que você precisa saber primeiro

Antes de mergulhar no código, vale entender o vocabulário que vamos usar o tempo todo.

### 1.1 Cliente e servidor

Quando você abre um site no navegador, duas máquinas conversam:

- **Cliente** — quem pede. No nosso caso é o **navegador** rodando o React.
- **Servidor** — quem responde. No nosso caso é o **Spring Boot** rodando em Java.

Eles conversam por **HTTP** (o mesmo protocolo de qualquer site). O cliente faz uma "requisição" e o servidor manda uma "resposta".

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
```

A numeração mostra a **ordem temporal**: o usuário começa em (1), o pedido viaja até o banco em (2→4), a resposta volta em (4→7).

### 1.2 Frontend, Backend e Banco

- **Frontend** — tudo que aparece no navegador. HTML, CSS, JavaScript. No nosso caso: React.
- **Backend** — o servidor que processa a lógica e fala com o banco. No nosso caso: Spring Boot (Java).
- **Banco de Dados** — onde os dados ficam guardados em disco, mesmo quando o servidor é desligado. No nosso caso: PostgreSQL.

São **três programas separados**, rodando em portas diferentes:

| Programa | Tecnologia | Porta |
|---|---|---|
| Frontend | React (servido pelo Vite, que roda em Node.js) | 5173 |
| Backend | Spring Boot (Java) | 8080 |
| Banco | PostgreSQL | 5432 |

> **Atenção a uma confusão comum:** React, Vite e Node.js **não são a mesma coisa** — cada um tem um papel:
>
> - **Node.js** é o **ambiente que executa JavaScript fora do navegador**. É como a "JVM do JavaScript". Você instala no seu computador.
> - **Vite** é uma **ferramenta de desenvolvimento** escrita em JavaScript, que **roda em cima do Node.js**. Quando você faz `npm run dev`, é o Vite que sobe o servidor na porta 5173, converte seus arquivos `.jsx` em `.js` que o navegador entende, e recarrega a página automaticamente quando você salva.
> - **React** é a **biblioteca de interface** — só código JavaScript que você importa e usa para descrever os componentes da tela.
>
> Fazendo a analogia com Java:
>
> | Frontend (JavaScript) | Equivalente em Java |
> |---|---|
> | **Node.js** | A JVM (ambiente de execução) |
> | **npm** | O Maven (gerenciador de dependências) |
> | **Vite** | O `mvnd spring-boot:run` (servidor de dev + build) |
> | **React** | Spring Boot (a biblioteca/framework em si) |
>
> No produto final (`npm run build`), o Vite gera arquivos `.html`/`.js`/`.css` estáticos. **Node.js e Vite não vão para o navegador** — só o JavaScript do React vai.

### 1.3 REST e API

**API** = "Application Programming Interface". É um jeito de um programa conversar com outro. Quando o React quer dados do banco, ele **não fala direto com o PostgreSQL** — ele pede pro backend através de uma API.

**REST** é um estilo de API que usa HTTP de forma padronizada. As operações básicas são:

| Verbo HTTP | O que significa | Exemplo no nosso projeto |
|---|---|---|
| `GET` | Buscar dados | `GET /api/pedidos` → lista todos os pedidos |
| `POST` | Criar algo novo | `POST /api/pedidos` → cria um pedido novo |
| `PUT` | Atualizar algo existente | `PUT /api/pedidos/5/status` → muda o status do pedido 5 |
| `DELETE` | Apagar algo | `DELETE /api/pedidos/5` → exclui o pedido 5 |

O dado trocado é geralmente **JSON** (texto estruturado em chaves e valores):

```json
{
  "id": 1,
  "nome": "X-Salada",
  "preco": 12.50,
  "quantidade": 20
}
```

### 1.4 MVC e Camadas

**MVC** (Model-View-Controller) é um padrão de organização do código. A ideia é separar responsabilidades para o código não virar uma bagunça.

No backend usamos uma variação chamada **arquitetura em camadas**:

```
┌──────────────────────┐
│   Controlador        │  ← recebe HTTP, devolve HTTP
├──────────────────────┤
│   Serviço            │  ← regras de negócio
├──────────────────────┤
│   Repositório        │  ← acesso ao banco
├──────────────────────┤
│   Modelo (Entidade)  │  ← estrutura dos dados
└──────────────────────┘
         │
         ▼
   Banco de Dados
```

**Por que separar?** Imagine que amanhã trocamos PostgreSQL por MySQL. Só o **repositório** muda — o resto continua igual. Cada camada só conhece a camada de baixo, nunca a de cima. Isso se chama **baixo acoplamento**.

### 1.5 ORM e JPA

O banco fala em **SQL** (`SELECT * FROM produto WHERE id = 1`), mas Java fala em **objetos** (`Produto p = produtoRepositorio.findById(1)`).

**ORM** (Object-Relational Mapping) é a tradução automática entre os dois mundos. Quando salvamos um objeto `Produto` em Java, o ORM gera o `INSERT INTO produto VALUES (...)` correspondente.

- **JPA** é a especificação Java padrão para ORM.
- **Hibernate** é a implementação mais usada (e a que o Spring Boot usa por padrão).
- **Spring Data JPA** é uma camada que torna o uso ainda mais fácil — basta declarar uma interface e os métodos CRUD já vêm prontos.

### 1.6 Spring e Spring Boot

**Spring** é o framework Java mais popular para aplicações web. **Spring Boot** é uma versão "com pilha incluída": vem configurado, com servidor web embarcado, conexão de banco pronta, etc. Você só programa a lógica.

Os conceitos centrais do Spring que usamos:

| Conceito | O que é |
|---|---|
| **Bean** | Um objeto gerenciado pelo Spring (criado, configurado e injetado automaticamente). |
| **Injeção de Dependência** | O Spring passa os objetos que sua classe precisa via construtor, em vez de você criar com `new`. |
| **Anotação** | Marcação no código (começam com `@`) que diz ao Spring "trate essa classe assim". Ex: `@RestController`, `@Service`, `@Component`. |
| **Container** | É o "gerente" do Spring que controla todos os beans da aplicação. |

### 1.7 React e componentes

**React** é uma biblioteca JavaScript para construir interfaces. A ideia central:

- A tela é composta de **componentes** (pedaços reutilizáveis).
- Cada componente tem **estado** (dados) e devolve **JSX** (HTML em JavaScript).
- Quando o estado muda, o componente re-renderiza automaticamente.

Exemplo simplificado:

```jsx
function Botao() {
  const [cliques, setCliques] = useState(0)
  return <button onClick={() => setCliques(cliques + 1)}>Cliquei {cliques}x</button>
}
```

`useState` é um **hook** — função especial do React que gerencia o estado.

### 1.8 Vite e npm

- **npm** é o gerenciador de pacotes do Node.js. Baixa bibliotecas (`npm install`) e roda scripts (`npm run dev`).
- **Vite** é uma ferramenta que serve seu código React em desenvolvimento e compila para produção. Substitui ferramentas mais antigas como Webpack.

---

## Parte 2 — Como o projeto está organizado

Agora que você tem os conceitos, vamos olhar a pasta do projeto.

```
faculdade-extensao/
├── rodovialanches-backend/      ← projeto Java/Spring Boot
├── rodovialanches-frontend/     ← projeto React/Vite
├── fluxo.md                     ← visão técnica para apresentação
├── explicacao.md                ← este arquivo
├── APRENDENDO.md                ← anotações de estudo
└── DOCUMENTACAO.md              ← documentação geral
```

São **dois projetos independentes** numa única pasta-mãe. Cada um pode ser aberto separadamente, tem seu próprio sistema de build, suas próprias dependências.

### 2.1 Estrutura do backend

```
rodovialanches-backend/
├── pom.xml                                    ← descreve dependências Maven
├── src/main/
│   ├── java/com/rodovialanches/
│   │   ├── RodoviaLanchesAplicacao.java       ← ponto de entrada (main)
│   │   ├── configuracao/                      ← inicialização e CORS
│   │   │   ├── CarregadorInicial.java
│   │   │   └── ConfiguracaoWeb.java
│   │   ├── controlador/                       ← endpoints REST
│   │   │   ├── PedidoControlador.java
│   │   │   ├── ProdutoControlador.java
│   │   │   ├── UsuarioControlador.java
│   │   │   └── TratadorDeErrosApi.java
│   │   ├── modelo/                            ← entidades (tabelas do banco)
│   │   │   ├── Pedido.java
│   │   │   ├── ItemPedido.java
│   │   │   ├── StatusPedido.java
│   │   │   ├── Produto.java
│   │   │   └── Usuario.java
│   │   ├── repositorio/                       ← acesso ao banco
│   │   │   ├── PedidoRepositorio.java
│   │   │   ├── ItemPedidoRepositorio.java
│   │   │   ├── ProdutoRepositorio.java
│   │   │   └── UsuarioRepositorio.java
│   │   └── servico/                           ← regras de negócio
│   │       └── PedidoServico.java
│   └── resources/
│       ├── application.properties             ← configurações (banco, porta)
│       └── data.sql                           ← dados iniciais (alternativa)
```

#### Por que essa divisão?

Cada pasta representa **uma camada** da arquitetura:

| Pasta | Responsabilidade | Anotação típica |
|---|---|---|
| `modelo/` | Definir os dados (tabelas) | `@Entity` |
| `repositorio/` | Buscar e salvar dados no banco | `JpaRepository` |
| `servico/` | Aplicar regras de negócio | `@Service` |
| `controlador/` | Expor a API via HTTP | `@RestController` |
| `configuracao/` | Setup global | `@Component`, `@Configuration` |

A regra: cada camada **só conhece a camada de baixo**. O controlador chama o serviço; o serviço chama o repositório; o repositório fala com o banco. **Nunca o contrário.**

### 2.2 Estrutura do frontend

```
rodovialanches-frontend/
├── package.json                     ← descreve dependências npm
├── index.html                       ← arquivo HTML inicial
├── src/
│   ├── main.jsx                     ← ponto de entrada
│   ├── App.jsx                      ← componente raiz (navegação)
│   ├── api.js                       ← funções que falam com o backend
│   ├── estilos.css                  ← estilos globais
│   └── paginas/                     ← uma página para cada papel
│       ├── Garcom.jsx
│       ├── Cozinha.jsx
│       ├── Balcao.jsx
│       ├── Gerente.jsx
│       ├── CadastroGarcons.jsx
│       └── CadastroClientes.jsx
```

#### Por que essa divisão?

- **`main.jsx`** monta o React dentro do HTML.
- **`App.jsx`** é o componente raiz. Decide qual página mostrar (Garçom, Cozinha, etc.).
- **`api.js`** é a **camada de comunicação com o backend**. Toda chamada HTTP passa por aqui — as páginas não usam `fetch` diretamente. Isso é o equivalente a uma "camada de serviço" no frontend.
- **`paginas/`** cada arquivo é uma tela diferente do app, baseada em qual papel da lanchonete está usando.

**Por que separar `api.js` das páginas?** Se um dia mudarmos o endpoint do backend, só `api.js` muda — todas as 6 páginas continuam iguais. É o mesmo princípio de separação de responsabilidades do backend.

---

## Parte 3 — Como cada parte do backend funciona

Vamos abrir uma camada de cada vez, indo do banco até o HTTP.

### 3.1 Modelo (`modelo/`)

São **classes Java que viram tabelas no banco**. A anotação `@Entity` é a mágica.

```java
@Entity
@Table(name = "produto")
public class Produto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private Double preco;

    @Column(nullable = false)
    private Integer quantidade = 0;

    // getters e setters...
}
```

O que cada parte faz:

- `@Entity` → "essa classe vira uma tabela".
- `@Table(name = "produto")` → nome da tabela no banco.
- `@Id` → essa coluna é a chave primária.
- `@GeneratedValue(IDENTITY)` → o banco escolhe o ID automaticamente (autoincremento).
- `@Column(nullable = false)` → essa coluna não pode ser NULL.

Quando a aplicação sobe, o Hibernate compara essas classes com as tabelas reais do banco. Se algo muda, ele atualiza o schema (porque temos `ddl-auto=update`).

#### Relacionamentos

Um pedido tem vários itens. Vamos olhar:

```java
// Em Pedido.java:
@OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
private List<ItemPedido> itens = new ArrayList<>();

// Em ItemPedido.java:
@ManyToOne
@JoinColumn(name = "pedido_id")
private Pedido pedido;
```

- `@OneToMany` → "um pedido tem muitos itens".
- `@ManyToOne` → "muitos itens pertencem a um pedido".
- `mappedBy = "pedido"` → o relacionamento é controlado pelo campo `pedido` no `ItemPedido`.
- `cascade = ALL` → operações no pedido (salvar/deletar) propagam para os itens.
- `orphanRemoval = true` → se você remove um item da lista, ele é apagado do banco também.
- `@JoinColumn(name = "pedido_id")` → no banco, a coluna `pedido_id` da tabela `item_pedido` referencia a tabela `pedido`.

### 3.2 Repositório (`repositorio/`)

Aqui está a parte mais surpreendente do Spring. Você só declara uma **interface vazia**:

```java
public interface ProdutoRepositorio extends JpaRepository<Produto, Long> {
}
```

E o Spring **gera automaticamente** os métodos:

```java
produtoRepositorio.findAll();           // SELECT * FROM produto
produtoRepositorio.findById(1L);        // SELECT * FROM produto WHERE id = 1
produtoRepositorio.save(produto);       // INSERT ou UPDATE
produtoRepositorio.deleteById(1L);      // DELETE FROM produto WHERE id = 1
produtoRepositorio.count();             // SELECT COUNT(*) FROM produto
```

#### Consultas personalizadas pelo nome do método

Se você declarar:

```java
boolean existsByGarcom_Id(Long garcomId);
```

O Spring lê o nome do método e gera:

```sql
SELECT COUNT(*) > 0 FROM pedido WHERE garcom_id = ?
```

A regra é: `findBy`, `existsBy`, `deleteBy` + nome do campo (em CamelCase). O underscore (`_`) navega entre objetos relacionados (`Garcom_Id` = "o id do campo garcom").

### 3.3 Serviço (`servico/`)

O serviço é onde moram as **regras de negócio complexas**. No nosso projeto, só `PedidoServico` é grande o suficiente para merecer um serviço — usuários e produtos são CRUD simples e ficam direto no controlador.

```java
@Service
public class PedidoServico {
    private final PedidoRepositorio pedidoRepositorio;
    // ... outros repositórios

    public PedidoServico(PedidoRepositorio pedidoRepositorio, ...) {
        this.pedidoRepositorio = pedidoRepositorio;
    }

    @Transactional
    public Pedido criarPedido(Pedido pedido) {
        // valida garçom, cliente, mesa, estoque
        // debita o estoque dos produtos
        // salva o pedido
        return pedidoRepositorio.save(pedido);
    }
}
```

#### Por que `@Transactional`?

Imagine que estamos criando um pedido com 3 itens. Sem transação:
1. Debita estoque do produto A ✅
2. Debita estoque do produto B ✅
3. Tenta salvar pedido, mas dá erro ❌

Resultado: estoque ficou errado mas o pedido nem existe! Catástrofe.

Com `@Transactional`, **tudo ou nada**. Se qualquer passo falhar, o Spring desfaz (rollback) tudo o que já foi feito.

### 3.4 Controlador (`controlador/`)

O controlador é a **porta de entrada HTTP**. Ele recebe a requisição, chama o serviço (ou o repositório direto, se for simples), e devolve a resposta.

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoControlador {
    private final PedidoServico pedidoServico;

    public PedidoControlador(PedidoServico pedidoServico) {
        this.pedidoServico = pedidoServico;
    }

    @PostMapping
    public ResponseEntity<Pedido> criar(@RequestBody Pedido pedido) {
        Pedido salvo = pedidoServico.criarPedido(pedido);
        return ResponseEntity.ok(salvo);
    }
}
```

O que cada parte faz:

- `@RestController` → essa classe expõe endpoints HTTP que devolvem JSON.
- `@RequestMapping("/api/pedidos")` → todas as URLs começam com `/api/pedidos`.
- `@PostMapping` → esse método responde a `POST` na URL `/api/pedidos`.
- `@RequestBody` → "transforme o JSON recebido em um objeto Pedido".
- `ResponseEntity.ok(salvo)` → "responda HTTP 200 com o pedido como JSON".

#### A regra do controlador fino

O controlador **não deve ter lógica de negócio**. Sua única função é traduzir HTTP em chamada de método. Toda a lógica fica no serviço.

Por quê? Porque se um dia quisermos chamar `criarPedido` de outro lugar (ex: um teste automatizado, ou de uma fila de mensagens), o serviço pode ser usado direto, sem precisar simular uma requisição HTTP.

### 3.5 Configuração (`configuracao/`)

São classes que configuram o comportamento global da aplicação.

**`ConfiguracaoWeb`** habilita CORS — permite que o frontend (em `localhost:5173`) chame o backend (em `localhost:8080`). Sem isso, o navegador bloqueia por questão de segurança.

**`CarregadorInicial`** implementa `CommandLineRunner`. O Spring chama seu método `run()` **uma vez** quando a aplicação sobe. Usamos para inserir os dados iniciais (Garcom1, Cozinha1, produtos do cardápio) **só se o banco estiver vazio** (`if (count() == 0)`).

### 3.6 Aplicação principal

```java
@SpringBootApplication
public class RodoviaLanchesAplicacao {
    public static void main(String[] args) {
        SpringApplication.run(RodoviaLanchesAplicacao.class, args);
    }
}
```

Esse é o `main()` do Java padrão. A anotação `@SpringBootApplication` faz três coisas em uma:

1. Marca como classe de configuração.
2. Habilita autoconfiguração (Spring detecta o que está no classpath e configura).
3. Habilita o **component scan** (procura todas as classes com `@Component`, `@Service`, `@RestController`, etc. nesse pacote e abaixo).

---

## Parte 4 — Como cada parte do frontend funciona

### 4.1 main.jsx

```jsx
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

Pega o `<div id="root">` do HTML e injeta o React lá. `StrictMode` é um modo de desenvolvimento que ajuda a detectar problemas.

### 4.2 App.jsx

É o componente raiz. Tem o menu de navegação no topo e decide qual página mostrar:

```jsx
const [pagina, setPagina] = React.useState('garcom')

return (
  <>
    <button onClick={() => setPagina('garcom')}>Garçom</button>
    <button onClick={() => setPagina('cozinha')}>Cozinha</button>
    {/* ... */}

    {pagina === 'garcom' && <Garcom />}
    {pagina === 'cozinha' && <Cozinha />}
    {/* ... */}
  </>
)
```

Não usa router (como React Router) porque o projeto é pequeno. `useState` + renderização condicional resolve.

### 4.3 api.js

Centraliza todas as chamadas HTTP. Cada função faz `fetch`, trata erros e devolve um formato consistente:

```js
export async function listarPedidos(){
  const res = await fetch(`${API}/api/pedidos`)
  return res.json()
}

export async function criarPedido(pedido){
  const res = await fetch(`${API}/api/pedidos`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(pedido)
  })
  return res.json()
}
```

#### Por que `async/await`?

Requisições HTTP são **assíncronas** — demoram. Em vez de travar a página esperando, JavaScript usa **Promises**. `async/await` é uma forma mais legível de trabalhar com Promises:

```js
// Sem async/await (com .then):
function carregar() {
  fetch('/api/pedidos').then(res => {
    res.json().then(dados => {
      console.log(dados)
    })
  })
}

// Com async/await (mais legível):
async function carregar() {
  const res = await fetch('/api/pedidos')
  const dados = await res.json()
  console.log(dados)
}
```

### 4.4 Páginas

Cada arquivo em `paginas/` é uma tela completa. Todas seguem o mesmo padrão:

```jsx
export default function Cozinha() {
  // 1. Estado local
  const [pedidos, setPedidos] = React.useState([])

  // 2. Função para carregar dados do backend
  async function carregar() {
    const todos = await listarPedidos()
    setPedidos(todos.filter(p => p.status === 'AGUARDANDO_PREPARO'))
  }

  // 3. useEffect roda quando o componente aparece na tela
  React.useEffect(() => {
    carregar()
    // Atualiza a cada 3 segundos (polling)
    const timer = setInterval(carregar, 3000)
    return () => clearInterval(timer)  // limpa quando o componente é desmontado
  }, [])

  // 4. JSX que descreve como a tela aparece
  return (
    <div>
      {pedidos.map(p => <div key={p.id}>{p.id}</div>)}
    </div>
  )
}
```

#### useEffect

`useEffect` é o hook do React para **efeitos colaterais** — coisas que acontecem fora do "render puro", como buscar dados, registrar timers, escutar eventos.

```jsx
React.useEffect(() => {
  // código que roda quando o componente aparece
  return () => {
    // código que roda quando o componente sai
  }
}, [])  // array vazio = roda só uma vez (na montagem)
```

#### Polling

Como o nosso backend não notifica o frontend quando algo muda (não tem WebSocket), o frontend **pergunta a cada 3 segundos** se há novidades. Esse padrão chama-se **polling**.

```jsx
const timer = setInterval(carregar, 3000)
return () => clearInterval(timer)
```

O `return` do `useEffect` é importante: quando o usuário troca de página, o React desmonta o componente. Se não cancelarmos o timer, ele continuaria rodando para sempre.

---

## Parte 5 — O fluxo de um pedido, do começo ao fim

Agora vamos juntar tudo. Acompanhe um pedido sendo criado:

### Passo 1 — Garçom monta o pedido

O garçom abre a página Garçom. O componente roda:

```jsx
React.useEffect(() => {
  buscarProdutos().then(setProdutos)
  carregarUsuarios()
}, [])
```

`buscarProdutos()` chama `GET /api/produtos`. O backend responde com a lista. O React guarda no estado `produtos` e renderiza os cards.

### Passo 2 — Garçom seleciona produtos e clica "Enviar"

A função `enviar()` monta o objeto e chama a API:

```jsx
async function enviar() {
  const pedido = {
    garcom: { id: garcomSelecionado },
    cliente: { id: clienteSelecionado },
    numeroMesa: Number(mesaSelecionada),
    itens: itens.map(i => ({ produto: { id: i.produto.id }, quantidade: i.quantidade }))
  }
  await criarPedido(pedido)
}
```

### Passo 3 — Frontend faz a requisição

`api.js` faz:

```js
POST http://localhost:8080/api/pedidos
Content-Type: application/json

{
  "garcom": { "id": 1 },
  "cliente": { "id": 5 },
  "numeroMesa": 3,
  "itens": [{ "produto": { "id": 1 }, "quantidade": 2 }]
}
```

### Passo 4 — Backend recebe

O Spring vê que o `POST /api/pedidos` corresponde ao método `criar()` de `PedidoControlador`. Ele:

1. Deserializa o JSON em um objeto `Pedido`.
2. Chama `pedidoServico.criarPedido(pedido)`.

### Passo 5 — Serviço aplica as regras

```java
@Transactional
public Pedido criarPedido(Pedido pedido) {
    // 1. Busca o garçom pelo ID
    var garcom = usuarioRepositorio.findById(pedido.getGarcom().getId())
            .orElseThrow(() -> new IllegalArgumentException("Garçom não encontrado"));

    // 2. Busca o cliente, valida que é mesmo CLIENTE
    var cliente = usuarioRepositorio.findById(pedido.getCliente().getId()).orElseThrow(...);
    if (!"CLIENTE".equals(cliente.getPapel())) {
        throw new IllegalArgumentException("O usuário não é cliente");
    }

    // 3. Valida número da mesa
    if (pedido.getNumeroMesa() < 1 || pedido.getNumeroMesa() > 8) {
        throw new IllegalArgumentException("Mesa inválida");
    }

    // 4. Para cada item: debita o estoque
    for (ItemPedido it : pedido.getItens()) {
        var produto = produtoRepositorio.findById(it.getProduto().getId()).orElseThrow(...);
        if (produto.getQuantidade() < it.getQuantidade()) {
            throw new IllegalArgumentException("Sem estoque");
        }
        produto.setQuantidade(produto.getQuantidade() - it.getQuantidade());
        produtoRepositorio.save(produto);
    }

    // 5. Salva o pedido (com cascade, salva os itens junto)
    return pedidoRepositorio.save(pedido);
}
```

### Passo 6 — Hibernate gera o SQL

O Hibernate, vendo `pedidoRepositorio.save(pedido)`, executa:

```sql
INSERT INTO pedido (garcom_id, cliente_id, numero_mesa, status, criado_em)
VALUES (1, 5, 3, 'AGUARDANDO_PREPARO', '2026-05-24 17:00:00');

INSERT INTO item_pedido (pedido_id, produto_id, quantidade) VALUES (1, 1, 2);

UPDATE produto SET quantidade = 18 WHERE id = 1;
```

### Passo 7 — Resposta volta

O controlador devolve `ResponseEntity.ok(salvo)`, o Spring serializa em JSON, e a resposta chega no frontend.

### Passo 8 — Cozinha vê o pedido (3 segundos depois)

A página Cozinha está fazendo polling. Em até 3 segundos:

```jsx
const todos = await listarPedidos()
setPedidos(todos.filter(p => p.status === 'AGUARDANDO_PREPARO'))
```

O novo pedido aparece na lista. O cozinheiro clica "Marcar Pronto", que faz:

```
PUT /api/pedidos/1/status?status=PRONTO_PARA_PAGAMENTO
```

E o ciclo continua: Balcão vê → marca como PAGO → Gerente vê nas estatísticas.

---

## Parte 6 — Dicas para entender qualquer parte do projeto

Quando você encontrar uma classe que não conhece, faça esse roteiro:

1. **Leia as anotações no topo da classe.** `@RestController`? É controlador. `@Service`? É serviço. `@Entity`? É modelo.
2. **Veja o pacote.** Está em `modelo/`? `servico/`? Cada pasta dá uma pista forte da função.
3. **Leia o construtor.** Quais dependências essa classe recebe? Isso mostra com quem ela conversa.
4. **Procure os métodos públicos.** São os pontos de entrada — quem usa essa classe vai chamar algum deles.
5. **Ignore os getters/setters.** São burocracia do Java, não têm lógica.

Quando algo der errado, leia o **stack trace** de baixo pra cima. A causa raiz costuma estar no `Caused by` mais profundo.

---

## Parte 7 — Para estudar mais

Se quiser se aprofundar:

- **HTTP e REST**: [https://developer.mozilla.org/pt-BR/docs/Web/HTTP](https://developer.mozilla.org/pt-BR/docs/Web/HTTP)
- **Spring Boot**: [https://spring.io/guides/gs/spring-boot/](https://spring.io/guides/gs/spring-boot/)
- **Spring Data JPA**: [https://spring.io/projects/spring-data-jpa](https://spring.io/projects/spring-data-jpa)
- **React Hooks**: [https://react.dev/reference/react](https://react.dev/reference/react)
- **JavaScript moderno**: [https://javascript.info/](https://javascript.info/) (tem versão em português)

---

## Resumo em uma frase

> **Frontend** mostra a interface e envia requisições; **backend** valida regras e fala com o banco; **camadas** mantêm o código organizado para crescer sem virar bagunça.
