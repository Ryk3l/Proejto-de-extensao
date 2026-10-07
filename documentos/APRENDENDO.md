# Aprendendo — Guia comentado do Rodovia Lanches

Este documento é um passeio guiado pelo código do projeto, escrito para quem
nunca viu backend ou frontend. A ideia é que, ao final, você consiga olhar
para qualquer arquivo do projeto e entender **o quê** está escrito, **por que**
está escrito assim e **qual conceito** existe por trás.

---

## Sumário

1. [O quadro geral: o que é "back" e o que é "front"?](#1-o-quadro-geral)
2. [Como a comunicação acontece (HTTP, JSON, REST)](#2-como-a-comunicação-acontece)
3. [Backend — passo a passo](#3-backend--passo-a-passo)
4. [Banco de dados — o que o PostgreSQL guarda](#4-banco-de-dados)
5. [Frontend — passo a passo](#5-frontend--passo-a-passo)
6. [Como back e front conversam no nosso código](#6-como-back-e-front-conversam)
7. [Padrões e decisões — por que cada coisa é assim](#7-padrões-e-decisões)
8. [Fluxos completos (exemplos reais do projeto)](#8-fluxos-completos)
9. [Glossário rápido](#9-glossário-rápido)

---

## 1. O quadro geral

Quase todo sistema web tem **três peças** que rodam em lugares diferentes:

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

- **Frontend** = o que o usuário **vê e clica**. No nosso projeto é uma página
  web feita em React. Roda no navegador (Chrome, Firefox...).
- **Backend** = o "cérebro" que decide as regras de negócio e fala com o banco.
  No nosso projeto é uma aplicação Java/Spring Boot que escuta requisições em
  `http://localhost:8080`.
- **Banco de dados** = onde os dados ficam guardados de verdade, mesmo quando
  ninguém está usando o sistema. No nosso projeto é o PostgreSQL.

Por que separar? Porque cada parte tem uma função:

- O frontend é **visual**. Ele se preocupa com botões, cores, formulários.
- O backend é **regra**. Ele decide "esse usuário pode fazer isso?", "o estoque
  está disponível?", "qual o próximo número do pedido?".
- O banco é **memória**. Quando o servidor reinicia, ele não esquece nada
  porque o banco continua lá.

Separar isso permite, por exemplo, ter **vários frontends diferentes**
(navegador, celular, totem) usando o **mesmo backend**.

---

## 2. Como a comunicação acontece

### 2.1. HTTP — o "idioma" da web

Quando o frontend precisa de algo, ele envia uma **requisição HTTP** para o
backend. A requisição tem:

- Um **método** (`GET`, `POST`, `PUT`, `DELETE`) — a "intenção";
- Uma **URL** (ex.: `/api/produtos`) — o "endereço";
- Opcionalmente um **corpo** (body), geralmente em JSON.

| Método | Quando usar |
|---|---|
| `GET`    | Pedir/ler informação. Não muda nada. |
| `POST`   | Criar algo novo. |
| `PUT`    | Atualizar algo que já existe. |
| `DELETE` | Apagar. |

Esse padrão se chama **REST**. É só uma convenção, mas é praticamente universal.

### 2.2. JSON — o "formato"

Quando back e front trocam dados, usam **JSON** (texto estruturado). Exemplo
de um produto em JSON:

```json
{
  "id": 1,
  "nome": "X-Salada",
  "preco": 12.50,
  "quantidade": 20
}
```

JSON funciona porque tanto Java quanto JavaScript conseguem traduzir esse texto
em objetos da sua linguagem.

### 2.3. Quem fala primeiro?

O **frontend sempre inicia**. O backend só responde. Ele fica "escutando" no
endereço/porta `http://localhost:8080` esperando alguém perguntar algo.

---

## 3. Backend — passo a passo

### 3.1. Stack escolhida

| Recurso | O que é | Por quê |
|---|---|---|
| **Java 17** | Linguagem de programação fortemente tipada. | Linguagem madura, ensinada na faculdade, com excelente ecossistema para APIs corporativas. |
| **Spring Boot** | Framework que "monta" um servidor web pronto. | Evita milhares de linhas de configuração; com poucas anotações já temos um servidor REST funcionando. |
| **Spring Data JPA** | Biblioteca que traduz Java em SQL automaticamente. | Não precisa escrever `SELECT * FROM ...` na mão; basta criar uma interface. |
| **PostgreSQL** | Banco de dados relacional. | Livre, robusto, usado em produção em todo lugar. |
| **Maven (mvnd)** | Gerenciador de dependências e build. | É quem baixa as bibliotecas que o projeto precisa (declaradas no `pom.xml`). O `mvnd` é a versão "daemon" do Maven, mais rápida. |

### 3.2. A estrutura de pastas (e por que ela é assim)

```
rodovialanches-backend/
└── src/main/java/com/rodovialanches/
    ├── RodoviaLanchesAplicacao.java    <-- ponto de partida
    ├── configuracao/                   <-- coisas que rodam no boot
    │   ├── CarregadorInicial.java
    │   └── ConfiguracaoWeb.java
    ├── controlador/                    <-- "porta de entrada" HTTP
    │   ├── PedidoControlador.java
    │   ├── ProdutoControlador.java
    │   ├── UsuarioControlador.java
    │   └── TratadorDeErrosApi.java
    ├── servico/                        <-- regras de negócio
    │   └── PedidoServico.java
    ├── repositorio/                    <-- acesso ao banco
    │   ├── PedidoRepositorio.java
    │   ├── ItemPedidoRepositorio.java
    │   ├── ProdutoRepositorio.java
    │   └── UsuarioRepositorio.java
    └── modelo/                         <-- entidades (espelham as tabelas)
        ├── Pedido.java
        ├── ItemPedido.java
        ├── StatusPedido.java
        ├── Produto.java
        └── Usuario.java
```

Esse padrão chama-se **arquitetura em camadas**:

```
Controlador → recebe a requisição HTTP
    ↓
Serviço     → aplica as regras de negócio
    ↓
Repositório → conversa com o banco
    ↓
Modelo      → representa a tabela em memória
```

Cada camada **só conhece a de baixo**. Isso isola responsabilidades e facilita
manutenção: se eu trocar o banco de PostgreSQL para outro, só o repositório
precisa mudar.

### 3.3. Entrando pelo `main`

O arquivo `RodoviaLanchesAplicacao.java`:

```java
@SpringBootApplication
public class RodoviaLanchesAplicacao {
    public static void main(String[] args) {
        SpringApplication.run(RodoviaLanchesAplicacao.class, args);
    }
}
```

- `@SpringBootApplication` — uma **anotação**. Anotações em Java são metadados
  que dizem ao framework "trate essa classe de forma especial". Aqui ela
  significa: "essa é a classe principal de um projeto Spring Boot".
- `SpringApplication.run(...)` — sobe o servidor web embutido (Tomcat), faz
  a varredura por outros componentes (Controladores, Serviços etc.) e começa a
  escutar a porta 8080.

### 3.4. Modelo — espelhos das tabelas

Os arquivos em `modelo/` representam o que existe no banco. Exemplo
`Produto.java` (resumido):

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

    // getters e setters
}
```

Recursos da linguagem/framework usados aqui:

- `@Entity` — diz "essa classe vira uma tabela no banco" (JPA).
- `@Table(name = "produto")` — nome da tabela no banco.
- `@Id` + `@GeneratedValue(IDENTITY)` — `id` é a chave primária e o banco
  decide o valor automaticamente (auto-incremento).
- `@Column(nullable = false)` — gera a tabela com a coluna `NOT NULL`.
- **Encapsulamento** — todos os campos são `private`. O acesso é via getters
  e setters. É uma convenção do Java (e o framework Jackson depende disso para
  serializar/deserializar JSON).

Outro modelo importante, `Pedido.java`:

```java
@Entity
@Table(name = "pedido")
public class Pedido {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "garcom_id")  // chave estrangeira para a tabela usuario
    private Usuario garcom;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference             // ajuda o Jackson a não cair em loop infinito de serialização
    private List<ItemPedido> itens = new ArrayList<>();
    ...
}
```

Conceitos novos:

- **Relacionamentos JPA**: `@ManyToOne`, `@OneToMany`. É a forma de dizer
  "vários pedidos pertencem a um garçom" / "um pedido tem vários itens".
- **Cascata** (`CascadeType.ALL`): se eu salvar o pedido, os itens dele são
  salvos junto. Se eu remover o pedido, os itens vão junto.
- **`orphanRemoval = true`**: se eu remover um item da lista do pedido, ele é
  apagado do banco também.

### 3.5. Repositório — o "atalho" para o banco

```java
public interface PedidoRepositorio extends JpaRepository<Pedido, Long> {
    List<Pedido> findByStatus(StatusPedido status);
    boolean existsByGarcom_Id(Long garcomId);
}
```

Coisas interessantes:

- É uma **interface** (não tem corpo de método). O Spring Data JPA gera a
  implementação automaticamente em tempo de execução.
- `JpaRepository<Pedido, Long>` já dá de graça métodos como `findAll`,
  `findById`, `save`, `delete`, `count`...
- `findByStatus`, `existsByGarcom_Id` — o **nome do método é a query**. O
  Spring lê o nome ("encontrar por status", "existe por garcom.id") e gera
  o SQL automaticamente. Isso se chama **derived query**.

### 3.6. Serviço — onde mora a regra de negócio

Trecho de `PedidoServico.criarPedido`:

```java
@Transactional
public Pedido criarPedido(Pedido pedido) {
    if (pedido.getGarcom() == null || pedido.getGarcom().getId() == null) {
        throw new IllegalArgumentException("Garçom não informado");
    }
    var garcom = usuarioRepositorio.findById(pedido.getGarcom().getId())
            .orElseThrow(() -> new IllegalArgumentException("Garçom não encontrado"));
    pedido.setGarcom(garcom);
    ...
    for (ItemPedido it : pedido.getItens()) {
        var produto = produtoRepositorio.findById(it.getProduto().getId())
                .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado"));
        if (produto.getQuantidade() < it.getQuantidade()) {
            throw new IllegalArgumentException("Estoque insuficiente para " + produto.getNome());
        }
        produto.setQuantidade(produto.getQuantidade() - it.getQuantidade());
        produtoRepositorio.save(produto);
        ...
    }
    return pedidoRepositorio.save(pedido);
}
```

Por que esse código está aqui e não no Controlador?

- **Regra de negócio fica no Serviço.** O Controlador deve ser "burro": apenas
  pega o pedido HTTP e delega.
- **`@Transactional`** garante que tudo dentro do método ocorra como uma
  única transação no banco. Se qualquer linha lançar exceção, **nada é
  salvo** (rollback). Sem isso, daria pra ter um pedido salvo sem ter
  baixado o estoque — um bug terrível.
- **`var`** (Java 10+) deixa o compilador inferir o tipo da variável. Apenas
  açúcar sintático.
- **`Optional` + `orElseThrow`** — `findById` devolve um `Optional<T>` (pode
  ou não ter valor). `orElseThrow` força nós a tratarmos o caso "não
  achou".
- **Exceções como controle de fluxo**: lançamos `IllegalArgumentException`
  com a mensagem. Quem captura isso? O `TratadorDeErrosApi` (veja abaixo).

### 3.7. Controlador — porta de entrada HTTP

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoControlador {
    private final PedidoServico pedidoServico;

    public PedidoControlador(PedidoServico pedidoServico) {
        this.pedidoServico = pedidoServico;     // injeção de dependência via construtor
    }

    @PostMapping
    public ResponseEntity<Pedido> criar(@RequestBody Pedido pedido) {
        Pedido salvo = pedidoServico.criarPedido(pedido);
        return ResponseEntity.ok(salvo);
    }
}
```

- `@RestController` — combina `@Controller` + `@ResponseBody`. Quer dizer:
  "tudo que esse método devolver, vire JSON e mande pelo HTTP".
- `@RequestMapping("/api/pedidos")` — todos os métodos da classe começam com
  essa URL.
- `@PostMapping`, `@GetMapping`, `@PutMapping`, `@DeleteMapping` —
  correspondem aos métodos HTTP.
- `@RequestBody Pedido pedido` — o Spring lê o JSON do corpo da requisição e
  converte para um objeto Java `Pedido`.
- **Injeção de dependência**: a gente declara `private final PedidoServico
  pedidoServico` e recebe ele pelo construtor. O Spring é quem cria o
  `PedidoServico` e passa para o Controlador. Vantagem: a classe não precisa
  saber como construir suas dependências; isso facilita testes.

### 3.8. TratadorDeErrosApi — tratamento global de erro

```java
@ControllerAdvice
public class TratadorDeErrosApi {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> tratarArgumentoInvalido(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                .body(ex.getMessage());
    }
}
```

- `@ControllerAdvice` — diz "esse handler vale para todos os controladores".
- Sempre que **qualquer** método de Controlador deixar uma
  `IllegalArgumentException` "subir", esse método captura e devolve um
  HTTP 400 com a mensagem.
- Por isso conseguimos lançar exceções no Serviço tranquilamente — o
  resultado já vai chegar ao frontend como um erro 400 com mensagem
  amigável.

### 3.9. Configurações iniciais

`application.properties`:

```
spring.datasource.url=jdbc:postgresql://localhost:5432/rodovialanches
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
server.port=8080
```

- `ddl-auto=update` — o Hibernate **cria e altera as tabelas automaticamente**
  com base nas anotações `@Entity`. Em produção isso é perigoso (pode
  remover dados), mas em desenvolvimento é prático.
- `show-sql=true` — imprime no console todo SQL que o Hibernate executa.
  Ótimo para aprender.

`ConfiguracaoWeb.java` configura **CORS** — permite que o frontend (rodando em
`http://localhost:5173`) chame o backend (em `8080`). Sem isso, o navegador
bloquearia por segurança.

`CarregadorInicial.java` é um `CommandLineRunner` — Spring executa o método `run`
assim que a aplicação sobe. Usamos para popular usuários e produtos iniciais
caso o banco esteja vazio.

---

## 4. Banco de dados

O Hibernate, baseado nas classes `@Entity`, gera estas tabelas no PostgreSQL:

```
usuario
+----+--------+--------+-----------+
| id | nome   | papel  | telefone  |
+----+--------+--------+-----------+

produto
+----+----------+--------+-------------+
| id | nome     | preco  | quantidade  |
+----+----------+--------+-------------+

pedido
+----+------------+-------------+--------------+---------+------------+
| id | garcom_id  | cliente_id  | numero_mesa  | status  | criado_em  |
+----+------------+-------------+--------------+---------+------------+

item_pedido
+----+------------+-------------+-------------+
| id | pedido_id  | produto_id  | quantidade  |
+----+------------+-------------+-------------+
```

- `garcom_id` e `cliente_id` em `pedido` apontam para `usuario.id`
  (chave estrangeira). Por isso o backend **não deixa apagar** um usuário
  que ainda tem pedidos: o banco rejeitaria.
- `item_pedido.pedido_id` aponta para `pedido.id` com cascata: deletar o
  pedido apaga os itens junto.

---

## 5. Frontend — passo a passo

### 5.1. Stack escolhida

| Recurso | O que é | Por quê |
|---|---|---|
| **JavaScript** | Linguagem do navegador. | É a única linguagem que roda nativamente nos navegadores. |
| **React** | Biblioteca para construir interfaces. | Permite descrever a tela como **componentes reutilizáveis** com **estado**. |
| **Vite** | Empacotador de desenvolvimento. | Sobe o servidor `dev` instantaneamente e atualiza o navegador a cada save (HMR). |
| **JSX** | Sintaxe que mistura HTML com JavaScript. | Deixa o componente ser uma função que **retorna a marcação**. |
| **`fetch`** | API do navegador para fazer HTTP. | Não precisa de biblioteca externa para chamar o backend. |

### 5.2. Estrutura de pastas

```
rodovialanches-frontend/
├── index.html                  <-- página de entrada; o React "preenche" o <div id="root">
├── package.json                <-- declara dependências e scripts (dev/build)
├── vite.config.js
└── src/
    ├── main.jsx                <-- monta o React no #root
    ├── App.jsx                 <-- componente principal; controla qual página mostrar
    ├── api.js                  <-- funções que fazem fetch para o backend
    ├── estilos.css
    └── paginas/
        ├── Garcom.jsx          <-- página do Garçom
        ├── Cozinha.jsx
        ├── Balcao.jsx
        ├── Gerente.jsx
        ├── CadastroGarcons.jsx
        └── CadastroClientes.jsx
```

### 5.3. Entrando pelo `main.jsx` (resumido)

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

- O navegador abre `index.html` que tem um `<div id="root"></div>`.
- O React substitui o conteúdo desse `div` pelo que o componente `<App />`
  retornar.

### 5.4. Componentes — a unidade básica

Um componente é uma **função JavaScript** que retorna marcação JSX.

```jsx
export default function App() {
  const [pagina, setPagina] = React.useState('garcom')
  return (
    <div className="app-shell">
      <h1>Rodovia Lanches</h1>
      <button onClick={() => setPagina('cozinha')}>Cozinha</button>
      {pagina === 'garcom' && <Garcom />}
      {pagina === 'cozinha' && <Cozinha />}
    </div>
  )
}
```

Conceitos a observar:

- **JSX**: parece HTML, mas é convertido em código JS pelo Vite.
- **`useState`**: cria um **estado**. Quando ele muda, o React **re-renderiza**
  o componente. `pagina` é a variável, `setPagina` é a função que muda.
- **Renderização condicional**: `{pagina === 'garcom' && <Garcom />}` — se a
  expressão antes do `&&` for verdadeira, renderiza o componente.
- **`className`** (e não `class`) — `class` é palavra reservada em JS, então
  o JSX usa `className`.

### 5.5. Hooks do React usados no projeto

| Hook | Para que serve | Exemplo no projeto |
|---|---|---|
| `useState`   | Guardar um valor que, quando muda, atualiza a tela. | `const [itens, setItens] = useState([])` |
| `useEffect`  | Rodar um efeito colateral (fetch, timer, etc.) depois que o componente aparece ou quando algo muda. | Carregar produtos quando a página abre. |

Exemplo do `Garcom.jsx`:

```jsx
React.useEffect(() => {
  buscarProdutos().then(setProdutos)
  carregarUsuarios()
  carregarPedidosProntos()
  const timer = setInterval(carregarPedidosProntos, 3000)
  return () => clearInterval(timer)  // cleanup
}, [])  // array vazio = roda só na primeira renderização
```

- `setInterval(..., 3000)` — recarrega os pedidos prontos a cada 3 segundos.
- A função retornada (`() => clearInterval(...)`) é chamada quando o
  componente é desmontado, evitando vazamento de memória.

### 5.6. Lidando com formulários

```jsx
const [novoClienteNome, setNovoClienteNome] = React.useState('')

<input
  type="text"
  value={novoClienteNome}
  onChange={e => setNovoClienteNome(e.target.value)}
/>
```

Esse padrão se chama **input controlado**: o estado React é a fonte da
verdade; o input apenas reflete o valor.

### 5.7. `api.js` — falando com o backend

```js
const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export async function buscarProdutos() {
  const res = await fetch(`${API}/api/produtos`)
  return res.json()
}
```

- **`async`/`await`** — sintaxe moderna para lidar com operações
  assíncronas. `fetch` retorna uma Promise; `await` pausa até ela resolver.
- **Template literal** (` ` `) — permite interpolar variáveis com `${...}`.
- **`import.meta.env.VITE_API_URL`** — variável de ambiente do Vite, dá
  pra trocar o endereço da API sem alterar o código.

Funções mais complexas retornam um objeto `{ ok, ...}` para o componente
poder mostrar mensagens de erro:

```js
export async function removerUsuario(id) {
  const res = await fetch(`${API}/api/usuarios/${id}`, { method: 'DELETE' })
  if (res.status === 204 || res.ok) return { ok: true }
  const message = await res.text().catch(() => '')
  return { ok: false, message: message || 'Erro ao remover usuário.' }
}
```

Por que? Porque o backend pode rejeitar com 409 ("usuário tem pedidos") e
queremos exibir essa mensagem na tela.

### 5.8. Lista renderizada

```jsx
{produtos.map(p => (
  <div key={p.id} className="product-card">
    <strong>{p.nome}</strong>
    <div>R$ {p.preco.toFixed(2)}</div>
  </div>
))}
```

- `.map(...)` percorre o array e devolve um array de elementos JSX.
- **`key={p.id}`** é obrigatório — o React usa essa chave para saber qual
  item mudou e atualizar só o necessário.

### 5.9. Por que existe um componente por papel?

`Garcom`, `Cozinha`, `Balcao`, `Gerente` são **componentes separados**
porque:

- A **regra de cada papel** é diferente (garçom cria pedido; cozinha marca
  pronto; balcão marca pago; gerente vê tudo).
- Separar o código é mais fácil de manter — eu posso mudar a tela do
  garçom sem medo de quebrar a do gerente.

---

## 6. Como back e front conversam

Exemplo: o garçom clica em "Enviar Pedido".

```
[Garcom.jsx] usuário clica no botão
       │
       ▼
[Garcom.jsx] chama criarPedido(pedido)
       │
       ▼
[api.js] fetch('http://localhost:8080/api/pedidos', { method:'POST', body: JSON })
       │  (atravessa a rede)
       ▼
[PedidoControlador.criar]  recebe e desserializa o JSON em um objeto Pedido
       │
       ▼
[PedidoServico.criarPedido]  aplica as regras (estoque, validações), salva
       │
       ▼
[PedidoRepositorio.save]    grava no PostgreSQL
       │  (sobe de volta com o Pedido salvo)
       ▼
[PedidoControlador]  serializa de volta para JSON
       │  (resposta HTTP 200)
       ▼
[api.js] retorna o JSON parseado
       │
       ▼
[Garcom.jsx] limpa o carrinho e mostra "Pedido enviado com sucesso!"
```

Cada caixa só conhece a próxima — esse desacoplamento é o que permite a
manutenção evolutiva do sistema.

---

## 7. Padrões e decisões

### 7.1. Por que campos `private` + getters/setters?

Convenção do Java. Permite:

- **Encapsulamento** — controlar como o valor é lido/gravado.
- O **Jackson** (serializador JSON) descobrir as propriedades pelo nome do
  getter.

### 7.2. Por que injeção de dependência via construtor?

Em vez de `new PedidoServico()` dentro do Controlador, deixamos o Spring
construir. Vantagens:

- O Controlador fica testável (podemos passar um mock do Serviço).
- Os componentes ficam **stateless** e reutilizáveis.

### 7.3. Por que separar Serviço de Controlador?

- Controlador só "traduz" HTTP → método Java.
- Serviço tem as regras do mundo real (estoque, validações).
- Se amanhã eu fizer um app de celular que também cria pedidos, posso
  reutilizar o Serviço inteirinho — só preciso de outro Controlador (ou
  até de um Serviço exposto por outro protocolo).

### 7.4. Por que retornar `ResponseEntity` em alguns endpoints?

`ResponseEntity` permite controlar **status HTTP** e **headers**. Em endpoints
simples basta retornar o objeto; quando preciso de "201 Created" ou "409
Conflict" com mensagem, uso `ResponseEntity`.

### 7.5. Por que React usa "estado" em vez de manipular o DOM direto?

Antigamente, mexer no DOM (com `document.getElementById(...).innerHTML = ...`)
era um caos: era fácil esquecer de atualizar uma parte. No React, você
**descreve como deve ser** dado um estado, e ele cuida de atualizar só o que
mudou. Isso reduz bugs.

### 7.6. Por que `useState` retorna um array `[valor, setValor]`?

É **desestruturação** de array. Você poderia chamar de qualquer nome:
`const [x, setX] = useState(0)`. A convenção é prefixar com `set`.

### 7.7. Por que mostrar números de pedido/usuário pela posição na lista?

Quando você apaga e cria registros, a sequência do PostgreSQL continua
avançando (esse "8" mesmo só tendo um cliente). Para uma UI mais amigável
em um trabalho de faculdade, mostramos `idx + 1` em vez do `id` real. O
banco continua identificando pelo `id` verdadeiro nos endpoints.

### 7.8. Por que validar **duas vezes** (front e back)?

- **Validar no front** dá feedback rápido para o usuário (não precisa
  esperar a resposta do servidor).
- **Validar no back** é **obrigatório**, porque alguém pode chamar o
  endpoint diretamente (sem usar o frontend). O servidor é a "última
  linha de defesa".

### 7.9. Por que CORS?

Por segurança, o navegador bloqueia chamadas entre **origens diferentes**
(porta diferente conta como origem diferente!). O backend precisa
**explicitamente** dizer "tudo bem, aceito chamadas de
http://localhost:5173" — é isso que o `ConfiguracaoWeb` faz.

---

## 8. Fluxos completos

### 8.1. Cadastrar um cliente

1. **Usuário** abre "Cadastro Cliente", digita nome + telefone e clica em
   "Cadastrar".
2. **CadastroClientes.jsx** chama `criarUsuario({ nome, telefone, papel: 'CLIENTE' })`.
3. **api.js** dispara `POST /api/usuarios/clientes` com `{nome, telefone}`.
4. **UsuarioControlador.criarCliente**:
   - Valida nome e telefone obrigatórios;
   - Chama `usuarioRepositorio.existsByNomeIgnoreCaseAndTelefoneAndPapel(...)`;
   - Se já existir → retorna 409 com "Já existe um cliente...";
   - Senão grava com `papel=CLIENTE`.
5. **Response 201** volta para o front. O `CadastroClientes` recarrega a
   lista.

### 8.2. Lançar um pedido

1. **Garçom** seleciona Garçom + Cliente + Mesa (botões) + adiciona produtos
   no carrinho.
2. Clica em "Enviar Pedido".
3. **Garcom.jsx** monta o objeto `pedido` e chama `criarPedido`.
4. **PedidoControlador** → **PedidoServico.criarPedido** (com `@Transactional`):
   - Valida garçom existente;
   - Valida cliente é `papel=CLIENTE`;
   - Para cada item: confere estoque, debita, salva o produto;
   - Salva o pedido com status `AGUARDANDO_PREPARO`.
5. Front limpa o carrinho.

### 8.3. Cozinha marca pronto

1. **Cozinha.jsx** roda `carregar` a cada 3s (`setInterval`).
2. Filtra pedidos com `status === 'AGUARDANDO_PREPARO' || 'EM_PREPARO'`.
3. Garçom da cozinha clica "Marcar Pronto" → chama
   `atualizarStatusPedido(id, 'PRONTO_PARA_PAGAMENTO')`.
4. **Balcao.jsx** (rodando o mesmo intervalo) **passa a enxergar** esse
   pedido pois ele agora está `PRONTO_PARA_PAGAMENTO`.

### 8.4. Excluir um produto

1. Gerente clica "Excluir produto".
2. Front confirma com `confirm(...)`.
3. **ProdutoControlador.remover** verifica `itemPedidoRepositorio.existsByProduto_Id(id)`.
4. Se algum pedido já consumiu esse produto → 409 + mensagem.
5. Senão → `DELETE` no banco e 204 (No Content).

---

## 9. Glossário rápido

- **API REST**: conjunto de URLs/métodos para acessar recursos pela web.
- **Anotação (Java)**: marcador especial (ex.: `@Entity`) que o framework
  lê em tempo de execução.
- **JSON**: formato de texto para troca de dados estruturados.
- **JSX**: sintaxe que parece HTML, escrita dentro de arquivos JS.
- **Hook (React)**: função especial que dá superpoderes ao componente
  (`useState`, `useEffect`, etc).
- **Estado (state)**: dado que, quando muda, força o componente a se
  redesenhar.
- **Renderização**: processo de o React decidir o que mostrar na tela
  com base no estado atual.
- **Promise**: objeto JavaScript que representa um resultado futuro.
- **`async`/`await`**: sintaxe para usar Promises de forma legível.
- **Endpoint**: uma URL específica do backend que faz uma ação.
- **CORS**: regra do navegador que controla chamadas entre origens
  diferentes.
- **DDL** (`ddl-auto=update`): SQL que cria/altera tabelas; o Hibernate
  gera automaticamente.
- **Cascata / Orphan removal**: regras do JPA para o que acontece com os
  filhos quando o pai some.
- **Transação (`@Transactional`)**: bloco de operações que devem suceder
  ou falhar em conjunto.
- **`Optional<T>`**: caixinha que pode ou não conter um valor — força o
  desenvolvedor a tratar o caso "não tem nada lá".
- **Injeção de dependência**: o framework passa os objetos prontos
  (`PedidoServico`, `Repositório`, etc) pelo construtor; o Controlador só
  recebe e usa.

---

## Resumo de uma frase só

**Backend** é um conjunto de classes Java que escutam HTTP, validam regras,
lêem/gravam no PostgreSQL via JPA, e respondem JSON.
**Frontend** é um conjunto de componentes React que mostram a tela
com base num estado em memória, e usam `fetch` para conversar com o
backend.
Tudo o resto — anotações, hooks, padrões de pastas — é estrutura para que
isso funcione de forma confiável e seja fácil de manter.
