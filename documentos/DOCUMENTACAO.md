# Rodovia Lanches — Documentação do Projeto

Projeto acadêmico desenvolvido para a disciplina de Trabalho de Conclusão de Curso.
Trata-se de um sistema web para gerenciamento de uma lanchonete, contemplando o
fluxo de pedidos entre garçom, cozinha, balcão e gerência, além do cadastro de
clientes, garçons e produtos com controle de estoque.

---

## 1. Objetivos do Sistema

### 1.1. Objetivo Geral

Desenvolver um sistema computacional que automatize e organize o atendimento da
lanchonete **Rodovia Lanches**, integrando em uma única aplicação web o
lançamento de pedidos pelo garçom, a visualização desses pedidos pela cozinha,
o controle de pagamentos no balcão e o acompanhamento gerencial das operações
(pedidos, estoque e cadastros).

O sistema atende aos seguintes requisitos levantados junto à empresa:

- Possibilitar ao garçom efetuar pedidos vinculados a uma mesa e a um cliente;
- Permitir à cozinha visualizar e marcar como prontos os pedidos pendentes;
- Permitir ao balcão registrar o pagamento dos pedidos prontos;
- Centralizar no gerente a administração de cadastros (garçons, clientes,
  produtos) e o acompanhamento dos pedidos;
- Garantir o controle de estoque dos produtos, com baixa automática a cada
  pedido lançado.

### 1.2. Objetivos Específicos

**Informações a serem cadastradas**

- **Usuários do sistema** (garçons, clientes e demais perfis: cozinha, balcão,
  gerente), com nome, função (papel) e, no caso do cliente, telefone.
- **Produtos**, com nome, preço unitário e quantidade em estoque.
- **Pedidos**, vinculados a um garçom, a um cliente, a uma mesa (1 a 8) e a uma
  lista de itens (produto + quantidade), com status do pedido.

**Informações a serem movimentadas**

- Pedidos transitam entre os status:
  `AGUARDANDO_PREPARO` (aguardando preparo) → `EM_PREPARO` (em preparo) →
  `PRONTO_PARA_PAGAMENTO` (pronto para pagamento) → `PAGO` (pago); também é possível
  `CANCELADO` (cancelado).
- Estoque dos produtos é decrementado automaticamente quando um pedido é criado
  e pode ser ajustado manualmente pelo gerente (definir valor absoluto ou ajuste
  por delta negativo).
- Cadastros de clientes, garçons e produtos podem ser inseridos, editados e
  removidos, respeitando integridade referencial (não é possível remover um
  usuário/produto vinculado a pedidos existentes).

**Possíveis relatórios cadastrais**

- Listagem de clientes cadastrados (nome, telefone).
- Listagem de garçons cadastrados.
- Listagem de produtos cadastrados com preço e estoque atual.

**Possíveis relatórios gerenciais**

- Total de pedidos do sistema, por status.
- Acompanhamento em tempo real (auto-refresh a cada 3 s) dos pedidos
  pendentes, em preparo, prontos e pagos.
- Lista completa de pedidos com cliente, garçom, mesa, itens e total para a
  gerência tomar decisões (ex.: pedidos cancelados, ticket médio, picos de
  consumo por produto).
- Filtro de pedidos por intervalo de data (campos "De" e "Até") na página
  do Gerente.

**Tópicos de "Ajuda" ao usuário**

- Mensagens contextuais na própria tela informando o motivo de um bloqueio
  (ex.: "Nenhum garçom cadastrado. Cadastre um garçom antes de criar pedidos.",
  "Já existe um cliente com esse nome e telefone.", "Produto possui pedidos
  vinculados e não pode ser removido.").
- Confirmação antes de ações destrutivas (excluir pedido, excluir produto,
  remover garçom/cliente).
- Botões desabilitados quando a ação não é válida (ex.: não há itens no carrinho,
  não há garçom ou cliente selecionado).

**Formas de segurança lógica (usuário e perfil)**

- Cada usuário possui um papel (campo `papel`):
  - `GARCOM` — lança pedidos pela página do Garçom.
  - `COZINHA` — visualiza/atualiza pedidos na página da Cozinha.
  - `BALCAO` — registra pagamentos na página do Balcão.
  - `GERENTE` — administra pedidos, produtos e estoque na página do Gerente.
  - `CLIENTE` — consumidor do produto, vinculado ao pedido pelo telefone.
- O backend valida o papel ao criar pedido (somente usuário com `papel=CLIENTE`
  pode ser o cliente do pedido).
- Endpoints REST com validação no servidor (preço/quantidade ≥ 0, nome
  obrigatório, duplicidade de cliente etc.) impedem inserções inconsistentes.

**Segurança física (cópia de segurança e restauração)**

- Banco de dados PostgreSQL pode ser exportado/restaurado com `pg_dump` /
  `pg_restore` (cópia integral e incremental do banco `rodovialanches`).
- Estratégia recomendada: backup diário automatizado para diretório separado
  e, em produção, armazenamento em mídia externa/servidor remoto.

**Requisitos não-funcionais**

- **Usabilidade**: interface web responsiva, com identificação clara das ações
  permitidas em cada papel; mensagens em português.
- **Desempenho**: resposta inferior a 1 s para operações de leitura/escrita
  em ambiente local; auto-refresh de 3 s nas telas operacionais.
- **Manutenibilidade**: separação clara entre backend (Spring Boot/JPA) e
  frontend (React/Vite); modelo de dados normalizado; código e nomes de
  variáveis em português para facilitar a leitura por novos desenvolvedores.
- **Confiabilidade**: transações JPA garantem consistência (ex.: baixa de
  estoque + criação do pedido ocorrem dentro da mesma transação).
- **Portabilidade**: frontend roda em qualquer navegador moderno; backend
  roda em qualquer sistema com JVM 17+.

---

## 2. Justificativa para o Desenvolvimento do Sistema

A lanchonete Rodovia Lanches realiza atualmente seus atendimentos de forma
predominantemente manual: os pedidos são anotados em comandas de papel, o
controle de estoque é feito por contagem visual no fim do expediente e a
comunicação entre garçom e cozinha depende de gritar o pedido ou de levar a
comanda fisicamente até a área de preparo.

**Problemas identificados (situação atual):**

- Comandas extraviadas ou ilegíveis geram retrabalho e prejuízo.
- Cozinha demora para receber o pedido depois que o garçom o anota.
- O gerente não tem visibilidade em tempo real sobre quantos pedidos estão
  pendentes, prontos ou pagos.
- Estoque só é conhecido ao final do dia, podendo ocorrer a venda de produtos
  que já acabaram.
- Cliente recorrente não tem histórico fácil de identificar — sempre é
  considerado um cadastro novo.

**Situação pretendida com o projeto:**

- Pedidos digitais lançados pelo garçom aparecem imediatamente na cozinha,
  reduzindo o tempo de atendimento.
- Estoque baixado automaticamente a cada pedido evita venda de itens em falta.
- Painel do gerente exibe o resumo de pedidos por status, o estoque atual e
  toda a lista de pedidos com filtro e detalhamento.
- Cadastro de clientes vinculado ao telefone evita duplicidade e cria base
  para futuras ações de fidelização.

**Vantagens proporcionadas pelo sistema:**

- **Agilidade** no atendimento (sem trânsito de papel entre os setores).
- **Confiabilidade** no estoque (sempre atualizado em tempo real).
- **Visibilidade gerencial** com painel consolidado.
- **Padronização** do processo (todo pedido segue o mesmo fluxo de status).
- **Redução de erros** em pedidos e em controle de caixa.

**Impactos positivos:**

- **Operacionais**: tempo médio de entrega reduzido; menos retrabalho;
  cozinha priorizando o que realmente chegou no sistema.
- **Administrativos**: gerente acompanha o movimento sem precisar estar
  fisicamente no salão; cadastros centralizados em uma única ferramenta.
- **Financeiros**: menos perda de venda por produto fora de estoque; menos
  divergência entre comanda e caixa; possibilidade de análise de ticket
  médio e produtos mais vendidos.
- **Comportamentais**: equipe se acostuma com um fluxo padronizado e
  transparente; gestor toma decisões com base em dados em vez de impressão.

---

## 3. Tecnologias e Ferramentas Computacionais

| Categoria | Ferramenta |
|---|---|
| **Linguagem (backend)** | Java 17 |
| **Linguagem (frontend)** | JavaScript (ES2020+) com JSX |
| **Framework backend** | Spring Boot 3.1.4 (Spring Web, Spring Data JPA) |
| **Framework frontend** | React 18 |
| **Build frontend** | Vite 4 |
| **ORM / Persistência** | Hibernate (via Spring Data JPA), Jakarta Persistence |
| **Banco de dados** | PostgreSQL |
| **Servidor de aplicação** | Tomcat embarcado (incluído no Spring Boot) |
| **IDE recomendada** | IntelliJ IDEA / VS Code |
| **Ferramenta CASE (modelagem)** | Mermaid (.mmd) para diagramas; draw.io para complementos |
| **Gerenciador de dependências (Java)** | Maven (executado via `mvnd` — Maven Daemon) |
| **Gerenciador de pacotes (JS)** | npm |
| **Controle de versão** | Git |
| **Serialização JSON** | Jackson (incluindo `jackson-datatype-jsr310` para tipos de data) |

> Os recursos disponíveis na Universidade estão à disposição dos acadêmicos.
> Caso outros produtos sejam necessários, ficarão sob responsabilidade do aluno.

---

## 4. Disponibilidade Semanal para o Desenvolvimento

| Dia | Horário |
|---|---|
| Segunda-feira | 19h00 – 22h00 |
| Terça-feira | 19h00 – 22h00 |
| Quarta-feira | 19h00 – 22h00 |
| Quinta-feira | 19h00 – 22h00 |
| Sexta-feira | (não disponível) |
| Sábado | 09h00 – 12h00 / 14h00 – 18h00 |
| Domingo | 14h00 – 18h00 |

Total estimado: ~24 horas semanais dedicadas ao desenvolvimento e à
documentação do trabalho.

---

## 5. Informações Complementares

### 5.1. Estrutura do projeto

```
faculdade-extensao/
├── rodovialanches-backend/             # API REST em Spring Boot
│   ├── src/main/java/com/rodovialanches/
│   │   ├── RodoviaLanchesAplicacao.java
│   │   ├── controlador/                # PedidoControlador, ProdutoControlador,
│   │   │                                # UsuarioControlador, TratadorDeErrosApi
│   │   ├── modelo/                     # Pedido, ItemPedido, StatusPedido,
│   │   │                                # Produto, Usuario
│   │   ├── repositorio/                # PedidoRepositorio, ItemPedidoRepositorio,
│   │   │                                # ProdutoRepositorio, UsuarioRepositorio
│   │   ├── servico/                    # PedidoServico (regra de negócio principal)
│   │   └── configuracao/               # CarregadorInicial (popula dados iniciais),
│   │                                    # ConfiguracaoWeb (CORS)
│   └── src/main/resources/application.properties
└── rodovialanches-frontend/            # SPA em React/Vite
    └── src/
        ├── App.jsx                     # Navegação por estado entre páginas
        ├── api.js                      # Cliente HTTP + helpers (rotuloStatus)
        ├── paginas/
        │   ├── Garcom.jsx              # Tela do Garçom
        │   ├── Cozinha.jsx             # Tela da Cozinha
        │   ├── Balcao.jsx              # Tela do Balcão
        │   ├── Gerente.jsx             # Tela do Gerente
        │   ├── CadastroGarcons.jsx     # Cadastro de garçons
        │   └── CadastroClientes.jsx    # Cadastro de clientes
        └── estilos.css
```

### 5.2. Como executar

**Pré-requisito**: PostgreSQL rodando e banco `rodovialanches` criado:

```bash
psql -U postgres -c "CREATE DATABASE rodovialanches;"
```

**Backend**

```bash
cd rodovialanches-backend
mvnd spring-boot:run
```

O backend sobe em `http://localhost:8080`.

**Frontend**

```bash
cd rodovialanches-frontend
npm install
npm run dev
```

O frontend sobe em `http://localhost:5173` e consome a API do backend.

### 5.3. Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| GET    | `/api/usuarios` | Lista todos os usuários |
| POST   | `/api/usuarios/garcons` | Cadastra garçom |
| POST   | `/api/usuarios/clientes` | Cadastra cliente (nome + telefone, sem duplicidade) |
| PUT    | `/api/usuarios/{id}` | Atualiza nome/telefone |
| DELETE | `/api/usuarios/{id}` | Remove usuário (bloqueado se houver pedidos vinculados) |
| GET    | `/api/produtos` | Lista produtos |
| POST   | `/api/produtos` | Cria produto |
| PUT    | `/api/produtos/{id}` | Atualiza nome e preço |
| PUT    | `/api/produtos/{id}/quantidade?quantidade=N` | Define estoque absoluto |
| PUT    | `/api/produtos/{id}/estoque?delta=N` | Ajusta estoque por delta |
| DELETE | `/api/produtos/{id}` | Remove produto (bloqueado se vinculado a pedidos) |
| GET    | `/api/pedidos` | Lista pedidos |
| GET    | `/api/pedidos/status/{status}` | Lista pedidos por status |
| POST   | `/api/pedidos` | Cria pedido (baixa estoque automaticamente) |
| PUT    | `/api/pedidos/{id}/status?status=...` | Atualiza status |
| DELETE | `/api/pedidos/{id}` | Remove pedido |
| DELETE | `/api/pedidos/por-garcom/{garcomId}` | Remove todos os pedidos de um garçom |

### 5.4. Itens entregues no trabalho

Conforme exigido pela disciplina, o trabalho contém:

- [x] **Sistema funcionando com cadastros** — backend Spring Boot + frontend React com cadastros de garçons, clientes e produtos.
- [x] **Diagrama de caso de uso** — `rodovialanches-backend/docs/diagrams/usecase.mmd`.
- [x] **Diagrama de classes** — modelagem das entidades (Usuario, Produto, Pedido, ItemPedido, StatusPedido).
- [x] **Diagrama de sequência** — fluxo de criação de pedido (Garçom → API → Estoque → Cozinha → Balcão).
- [x] **DER (Diagrama Entidade-Relacionamento)** — tabelas `usuario`, `produto`, `pedido`, `item_pedido`.

### 5.5. Modelo de dados (resumo)

- `usuario` (id, nome, papel, telefone)
- `produto` (id, nome, preco, quantidade)
- `pedido` (id, garcom_id → usuario, cliente_id → usuario, numero_mesa, status, criado_em)
- `item_pedido` (id, pedido_id → pedido, produto_id → produto, quantidade)

### 5.6. Observações finais

- O sistema utiliza CORS liberado para `http://localhost:5173` (frontend dev).
- O DDL é gerado automaticamente pelo Hibernate (`spring.jpa.hibernate.ddl-auto=update`).
- A semente inicial (`CarregadorInicial`) popula usuários e produtos básicos no
  primeiro start, caso o banco esteja vazio.
- Os IDs internos do banco (sequência PostgreSQL) não são exibidos diretamente
  na tela; o frontend mostra uma numeração por posição na lista, de forma a
  ficar amigável após exclusões.
- O código (classes, atributos, endpoints, variáveis) foi traduzido para
  português para facilitar a leitura e a apresentação acadêmica.
