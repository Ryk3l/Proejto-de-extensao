# Rodovia Lanches — Documentação do Projeto

Projeto acadêmico desenvolvido para a disciplina de Trabalho de Conclusão de Curso.
Trata-se de um sistema web para gerenciamento de uma lanchonete, contemplando o
fluxo de pedidos entre garçom, cozinha, balcão e gerência, o cadastro de clientes,
garçons e produtos com ficha técnica (receita), o controle de estoque de
matérias-primas, o acesso restrito por login e senha e a entrega pronta para
rodar na máquina do estabelecimento (interface embutida no backend).

---

## 1. Objetivos do Sistema

### 1.1. Objetivo Geral

Desenvolver um sistema computacional que automatize e organize o atendimento da
lanchonete **Rodovia Lanches**, integrando em uma única aplicação web o
lançamento de pedidos pelo garçom, a visualização desses pedidos pela cozinha,
o controle de pagamentos no balcão e o acompanhamento gerencial das operações
(pedidos, estoque e cadastros).

O sistema atende aos seguintes requisitos levantados junto à empresa:

- Possibilitar ao garçom efetuar pedidos vinculados a uma mesa e a um cliente
  (com opção de delivery);
- Permitir à cozinha visualizar e marcar como prontos os pedidos pendentes;
- Permitir ao balcão registrar o pagamento dos pedidos prontos;
- Centralizar no gerente a administração de cadastros (garçons, clientes,
  produtos, matérias-primas e acessos) e o acompanhamento dos pedidos;
- Garantir o controle de estoque de matérias-primas, com baixa automática a
  cada pedido lançado, conforme a receita (ficha técnica) do produto;
- Controlar o acesso ao sistema com login e senha, restringindo cada perfil
  às suas telas.

### 1.2. Objetivos Específicos

**Informações a serem cadastradas**

- **Usuários do sistema** (garçons, clientes e demais perfis: cozinha, balcão,
  gerente), com nome, função (papel), telefone, CPF e senha (acesso ao sistema);
  no caso do cliente, o telefone segue a máscara `(dd) 98765-4321`.
- **Produtos**, com nome e preço unitário; a quantidade disponível é controlada
  pelas matérias-primas que o compõem.
- **Matérias-primas**, com nome, unidade (UN, KG, G, ML, L), quantidade em
  estoque e custo unitário (exibição `Custo unitário: R$ X,XX / UN` e
  `Valor em estoque`).
- **Receitas (ficha técnica)**, vinculando cada produto à "Lista de
  Ingredientes" (matéria-prima + quantidade com seletor de unidade e
  conversão automática) — nível único, sem sub-receitas.
- **Pedidos**, vinculados a um garçom, a um cliente, a uma mesa (1 a 8) e a uma
  lista de itens (produto + quantidade + **preço congelado no momento da
  venda**), com status do pedido e indicador de delivery.

**Informações a serem movimentadas**

- Pedidos transitam entre os status:
  `AGUARDANDO_PREPARO` (aguardando preparo) → `EM_PREPARO` (em preparo) →
  `PRONTO_PARA_PAGAMENTO` (pronto para pagamento) → `PAGO` (pago); também é possível
  `CANCELADO` (cancelado).
- Estoque de matérias-primas é decrementado automaticamente quando um pedido é
  criado (a receita define o consumo de cada ingrediente) e pode ser ajustado
  manualmente pelo gerente (definir valor absoluto ou ajuste por delta). O
  backend valida a disponibilidade **antes** de vender e informa o máximo
  produzível de cada produto — o menor `floor(estoque / quantidade da receita)`
  entre os ingredientes.
- O preço de cada item é gravado no pedido no momento da venda (snapshot em
  `item_pedido.preco_unitario`); alterar o preço do produto depois **não**
  reescreve pedidos já lançados.
- Cadastros de clientes, garçons, produtos, matérias-primas e acessos podem ser
  inseridos, editados e removidos, respeitando integridade referencial (não é
  possível remover um usuário/produto vinculado a pedidos existentes).

**Possíveis relatórios cadastrais**

- Listagem de clientes cadastrados (nome, telefone).
- Listagem de garçons cadastrados.
- Listagem de produtos cadastrados com preço e disponibilidade (máximo
  produzível pelas matérias-primas em estoque).
- Listagem de matérias-primas com estoque, custo unitário e valor total em
  estoque.
- Listagem de acessos ao sistema com papel, CPF e situação da senha.

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
  vinculados e não pode ser removido.", "CPF incompleto — use o formato
  000.000.000-00.").
- Confirmação antes de ações destrutivas (excluir pedido, excluir produto,
  remover garçom/cliente/acesso).
- Botões desabilitados quando a ação não é válida (ex.: não há itens no carrinho,
  não há garçom ou cliente selecionado).

**Formas de segurança lógica (usuário e perfil)**

- Cada usuário possui um papel (campo `papel`):
  - `GARCOM` — lança pedidos pela página do Garçom.
  - `COZINHA` — visualiza/atualiza pedidos na página da Cozinha.
  - `BALCAO` — registra pagamentos na página do Balcão.
  - `GERENTE` — acesso a todas as telas, incluindo a página **Cadastro de
    Acesso**, onde cria acessos e troca senhas/CPF.
  - `CLIENTE` — consumidor do produto, vinculado ao pedido pelo telefone;
    **não entra no sistema**.
- **Login com senha**: o acesso às telas exige login (`POST /api/auth/login`).
  As senhas são armazenadas com hash **SHA-256 + salt aleatório de 16 bytes**
  e nunca são devolvidas pela API (campo `senha` é somente escrita; a API
  expõe apenas `temSenha`). Perfis ainda sem senha recebem a senha padrão
  `123456` no primeiro boot, para o gerente trocar.
- **Sessão por navegador**: após o login, a sessão fica no `sessionStorage`
  (some ao fechar a aba) e o menu mostra apenas as telas do papel — tentar
  abrir outra tela pela URL resulta no painel "Acesso negado".
- **Cadastro de Acesso** (exclusivo do gerente): cria usuário com papel,
  telefone, **CPF** (máscara `000.000.000-00`, obrigatório com 11 dígitos e
  único no sistema) e senha; permite editar CPF, trocar senha e remover
  acessos.
- Endpoints REST com validação no servidor (preço/quantidade ≥ 0, nome
  obrigatório, CPF completo e não duplicado, duplicidade de cliente etc.)
  impedem inserções inconsistentes.

**Segurança física (cópia de segurança e restauração)**

- Banco de dados PostgreSQL pode ser exportado/restaurado com `pg_dump` /
  `psql` (cópia integral do banco `rodovialanches`).
- Estratégia recomendada: backup diário automatizado para diretório separado
  e, em produção, armazenamento em mídia externa/servidor remoto.

**Requisitos não-funcionais**

- **Usabilidade**: interface web responsiva, com identificação clara das ações
  permitidas em cada papel; mensagens em português; menu lateral vertical
  recolhível.
- **Desempenho**: resposta inferior a 1 s para operações de leitura/escrita
  em ambiente local; auto-refresh de 3 s nas telas operacionais.
- **Manutenibilidade**: separação clara entre backend (Spring Boot/JPA) e
  frontend (React/Vite); modelo de dados normalizado; código e nomes de
  variáveis em português para facilitar a leitura por novos desenvolvedores.
- **Confiabilidade**: transações JPA garantem consistência (ex.: baixa de
  estoque + criação do pedido ocorrem dentro da mesma transação).
- **Portabilidade**: frontend roda em qualquer navegador moderno; backend
  roda em qualquer sistema com JVM 17+.
- **Implantação simples**: em produção a interface é compilada (`npm run
  build`) e embutida no `.jar` — a máquina do cliente precisa apenas de
  Java 17+ e PostgreSQL, sem Node/npm.
- **Acesso em rede local**: o sistema escuta em todas as interfaces de rede;
  os aparelhos do estabelecimento (tablet, celular, outro PC) acessam pelo IP
  do servidor, sem instalação alguma no dispositivo.

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
- Estoque de matérias-primas baixado automaticamente a cada pedido evita
  venda de itens em falta (o sistema bloqueia a venda se o estoque não
  cobrir a receita).
- Painel do gerente exibe o resumo de pedidos por status, o estoque atual e
  toda a lista de pedidos com filtro e detalhamento.
- Cadastro de clientes vinculado ao telefone evita duplicidade e cria base
  para futuras ações de fidelização.
- Acesso por senha garante que cada equipe use apenas a sua tela.

**Vantagens proporcionadas pelo sistema:**

- **Agilidade** no atendimento (sem trânsito de papel entre os setores).
- **Confiabilidade** no estoque (sempre atualizado em tempo real).
- **Visibilidade gerencial** com painel consolidado.
- **Padronização** do processo (todo pedido segue o mesmo fluxo de status).
- **Redução de erros** em pedidos e em controle de caixa.
- **Controle de acesso** (cada perfil vê apenas o que lhe compete).

**Impactos positivos:**

- **Operacionais**: tempo médio de entrega reduzido; menos retrabalho;
  cozinha priorizando o que realmente chegou no sistema.
- **Administrativos**: gerente acompanha o movimento sem precisar estar
  fisicamente no salão; cadastros centralizados em uma única ferramenta.
- **Financeiros**: menos perda de venda por produto fora de estoque; menos
  divergência entre comanda e caixa; possibilidade de análise de ticket
  médio e produtos mais vendidos; custo de estoque valorizado por matéria-prima.
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
| **Build frontend** | Vite 4 (`npm run build` → arquivos estáticos) |
| **ORM / Persistência** | Hibernate (via Spring Data JPA), Jakarta Persistence |
| **Banco de dados** | PostgreSQL |
| **Servidor de aplicação** | Tomcat embarcado (incluído no Spring Boot) |
| **Empacotamento final** | Spring Boot Maven Plugin (`mvn package` → `.jar` único com a interface embutida) |
| **IDE recomendada** | IntelliJ IDEA / VS Code |
| **Ferramenta CASE (modelagem)** | Mermaid (.mmd) para diagramas; draw.io para complementos |
| **Gerenciador de dependências (Java)** | Maven |
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
Proejto de extensao/
├── documentos/                            # Documentação do projeto
│   ├── DOCUMENTACAO.md                    # Este arquivo
│   ├── fluxo.md                           # Fluxo de navegação do sistema
│   ├── explicacao.md                      # Explicação técnica
│   └── APRENDENDO.md                      # Caderno de aprendizado
├── entrega/                               # Pacote para a máquina do cliente
│   ├── rodovia-lanches.jar                # Sistema completo (interface + API)
│   ├── application.properties             # Configuração editável (banco, porta)
│   ├── iniciar.bat                        # Inicializador (duplo clique)
│   └── INSTALACAO.md                      # Manual de instalação
├── rodovialanches-backend/                # API REST em Spring Boot
│   ├── src/main/java/com/rodovialanches/
│   │   ├── RodoviaLanchesAplicacao.java   # Classe principal
│   │   ├── configuracao/                  # CarregadorInicial (popula dados e
│   │   │                                  # senhas padrão), ConfiguracaoWeb (CORS)
│   │   ├── controlador/                   # AuthControlador, UsuarioControlador,
│   │   │                                  # ProdutoControlador, MateriaPrimaControlador,
│   │   │                                  # ReceitaControlador, PedidoControlador,
│   │   │                                  # TratadorDeErrosApi
│   │   ├── modelo/                        # Usuario, Produto, MateriaPrima, Receita,
│   │   │                                  # Pedido, ItemPedido, StatusPedido
│   │   ├── repositorio/                   # Um repositório JPA por entidade (6)
│   │   ├── servico/                       # PedidoServico (regra de negócio:
│   │   │                                  # baixa de estoque, snapshot de preço)
│   │   └── util/                          # SenhaUtil (hash SHA-256 + salt)
│   ├── src/main/resources/
│   │   ├── application.properties         # Conexão com o banco, porta
│   │   └── static/                        # Interface compilada (gerada pelo
│   │                                      # npm run build) — embutida no .jar
│   └── docs/diagrams/                     # Diagramas (SVG e Mermaid)
└── rodovialanches-frontend/               # SPA em React/Vite
    ├── vite.config.js                     # Dev server liberado na rede local
    └── src/
        ├── App.jsx                        # Sessão, permissões por papel, menu lateral
        ├── api.js                         # Cliente HTTP (usa o hostname da página)
        ├── componentes/IconeMoto.jsx      # Ícone de delivery (único desenho do sistema)
        ├── paginas/
        │   ├── TelaAcesso.jsx             # Login (nome + senha)
        │   ├── Garcom.jsx                 # Tela do Garçom (carrinho + delivery)
        │   ├── Cozinha.jsx                # Tela da Cozinha
        │   ├── Balcao.jsx                 # Tela do Balcão (pagamentos)
        │   ├── Gerente.jsx                # Tela do Gerente (pedidos, estatísticas e produtos)
        │   ├── CadastroGarcons.jsx        # Cadastro de garçons
        │   ├── CadastroClientes.jsx       # Cadastro de clientes (máscara de telefone)
        │   ├── CadastroMateriasPrimas.jsx # Matérias-primas, estoque e fichas técnicas
        │   └── CadastroAcesso.jsx         # Cadastro de Acesso (exclusivo do gerente)
        └── estilos.css                    # Estilos globais
```

### 5.2. Como executar

**Pré-requisito comum**: PostgreSQL rodando e banco `rodovialanches` criado:

```bash
psql -U postgres -c "CREATE DATABASE rodovialanches;"
```

No primeiro boot, o `CarregadorInicial` cria os usuários
(`Garcom1`, `Cozinha1`, `Balcao1`, `Gerente1`, `Cliente1`), os produtos e as
matérias-primas de exemplo, além de aplicar a senha padrão `123456` nos acessos
ainda sem senha.

#### Modo desenvolvimento

**Backend**

```bash
cd rodovialanches-backend
mvn spring-boot:run
```

O backend sobe em `http://localhost:8080`.

**Frontend**

```bash
cd rodovialanches-frontend
npm install
npm run dev
```

O frontend sobe em `http://localhost:5173` e consome a API do backend. O dev
server está liberado para a rede local (`vite.config.js` com `host: true`):
outros aparelhos acessam pelo IP da máquina (`http://SEU_IP:5173`), e o
frontend chama a API pelo mesmo hostname da página.

#### Modo produção (interface embutida — o usado no estabelecimento)

```bash
# 1. Compila a interface
cd rodovialanches-frontend
npm run build

# 2. Copia os arquivos estáticos para dentro do backend
#    (Windows/PowerShell)
Copy-Item dist\* ..\rodovialanches-backend\src\main\resources\static -Recurse -Force

# 3. Empacota tudo em um único .jar
cd ..\rodovialanches-backend
mvn package -DskipTests

# 4. Executa (requer Java 17+)
java -jar target/rodovialanches-backend-0.0.1-SNAPSHOT.jar
```

O sistema sobe em `http://localhost:8080` servindo **interface e API juntas**
(mesma origem, sem CORS). Na máquina do cliente isso é feito pelo
`entrega/iniciar.bat` — veja a seção 5.6 e o manual `entrega/INSTALACAO.md`.

### 5.3. Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| **Autenticação** | | |
| POST | `/api/auth/login` | Login `{nome, senha}` — devolve o usuário ou 401 |
| **Usuários e acessos** | | |
| GET | `/api/usuarios` | Lista usuários (sem a senha; inclui `temSenha`) |
| POST | `/api/usuarios/garcons` | Cadastra garçom |
| POST | `/api/usuarios/clientes` | Cadastra cliente (nome + telefone com máscara, sem duplicidade) |
| POST | `/api/usuarios/acesso` | Cria acesso (papel, CPF obrigatório e único, senha) — gerente |
| PUT | `/api/usuarios/{id}` | Atualiza nome/telefone; grava senha/CPF quando enviados |
| DELETE | `/api/usuarios/{id}` | Remove usuário (bloqueado se houver pedidos vinculados) |
| **Produtos** | | |
| GET | `/api/produtos` | Lista produtos |
| GET | `/api/produtos/com-disponibilidade` | Produtos + máximo produzível pelo estoque |
| POST | `/api/produtos` | Cria produto (nome, preço) |
| PUT | `/api/produtos/{id}` | Atualiza nome e preço |
| DELETE | `/api/produtos/{id}` | Remove produto (bloqueado se vinculado a pedidos) |
| **Matérias-primas** | | |
| GET | `/api/materias-primas` | Lista matérias-primas (estoque, custo) |
| POST | `/api/materias-primas` | Cria matéria-prima (nome, unidade, quantidade, custo) |
| PUT | `/api/materias-primas/{id}` | Atualiza nome, unidade e custo unitário |
| PUT | `/api/materias-primas/{id}/quantidade?quantidade=N` | Define estoque absoluto |
| PUT | `/api/materias-primas/{id}/estoque?delta=N` | Ajusta estoque por delta |
| DELETE | `/api/materias-primas/{id}` | Remove (bloqueada se houver receita/pedido vinculado) |
| **Receita (ficha técnica)** | | |
| GET | `/api/produtos/{produtoId}/receita` | Lista ingredientes do produto |
| POST | `/api/produtos/{produtoId}/receita` | Adiciona ingrediente (matéria-prima + quantidade) |
| PUT | `/api/produtos/{produtoId}/receita/{receitaId}` | Atualiza ingrediente |
| DELETE | `/api/produtos/{produtoId}/receita/{receitaId}` | Remove ingrediente |
| **Pedidos** | | |
| GET | `/api/pedidos` | Lista pedidos (com itens e preço congelado) |
| GET | `/api/pedidos/status/{status}` | Lista pedidos por status |
| POST | `/api/pedidos` | Cria pedido (valida e baixa estoque na transação) |
| PUT | `/api/pedidos/{id}/status?status=...` | Atualiza status |
| DELETE | `/api/pedidos/{id}` | Remove pedido (não repõe estoque) |
| DELETE | `/api/pedidos/por-garcom/{garcomId}` | Remove todos os pedidos de um garçom |

### 5.4. Itens entregues no trabalho

Conforme exigido pela disciplina, o trabalho contém:

- [x] **Sistema funcionando com cadastros** — backend Spring Boot + frontend React com cadastros de garçons, clientes, produtos, matérias-primas e acessos.
- [x] **Diagrama de caso de uso** — `rodovialanches-backend/docs/diagrams/usecase.svg`.
- [x] **Diagrama de classes** — `docs/diagrams/class.svg` (Usuario, Produto, MateriaPrima, Receita, Pedido, ItemPedido, StatusPedido).
- [x] **Diagrama de sequência** — `sequence-garcom.mmd`, `sequence-cozinha.mmd` e `sequence-balcao.mmd` (Garçom → API → Estoque → Cozinha → Balcão).
- [x] **DER (Diagrama Entidade-Relacionamento)** — `der.mmd` com as tabelas `usuario`, `produto`, `materia_prima`, `receita`, `pedido` e `item_pedido`.
- [x] **Controle de estoque por ficha técnica** — baixa automática de matérias-primas a cada pedido, com validação de disponibilidade.
- [x] **Controle de acesso** — login com senha, perfis por papel, Cadastro de Acesso com CPF.
- [x] **Pacote de instalação** — pasta `entrega/` com `.jar`, inicializador e manual.

### 5.5. Modelo de dados (resumo)

- `usuario` (id, nome, papel, telefone, cpf, senha — hash, nunca exibido)
- `produto` (id, nome, preco)
- `materia_prima` (id, nome, unidade, quantidade, preco_custo)
- `receita` (id, produto_id → produto, materia_prima_id → materia_prima,
  quantidade, observacao)
- `pedido` (id, garcom_id → usuario, cliente_id → usuario, numero_mesa,
  status, delivery, criado_em)
- `item_pedido` (id, pedido_id → pedido, produto_id → produto, quantidade,
  preco_unitario — preço congelado no momento da venda)

### 5.6. Implantação na máquina do cliente

O pacote de instalação está na pasta **`entrega/`**:

| Arquivo | Função |
|---|---|
| `rodovia-lanches.jar` | Sistema completo (interface + API) |
| `application.properties` | Configuração do banco/porta, editável sem recompilar |
| `iniciar.bat` | Duplo clique → sobe o sistema e abre o navegador |
| `INSTALACAO.md` | Manual passo a passo (Java 17+, PostgreSQL, firewall, IP fixo, auto-início, backup, solução de problemas) |

Resumo dos requisitos no cliente:

1. **Java 17+** e **PostgreSQL** instalados (banco `rodovialanches` criado);
2. Pasta copiada para o PC (ex.: `C:\RodoviaLanches\`);
3. Porta **8080** liberada no firewall para entrada;
4. IP fixo no PC servidor (os aparelhos acessam `http://SEU_IP:8080`);
5. `iniciar.bat` na pasta de inicialização do Windows para subir sozinho.

### 5.7. Observações finais

- **CORS**: em desenvolvimento o backend aceita qualquer origem
  (localhost e IP da rede local); em produção a interface é servida pelo
  próprio `.jar` (mesma origem) e o CORS deixa de ser fator.
- **URL da API**: o frontend monta a API com o mesmo hostname da página —
  funciona em `localhost` e por IP da rede sem configuração extra
  (possível override pela variável `VITE_API_URL`).
- O DDL é gerado automaticamente pelo Hibernate (`spring.jpa.hibernate.ddl-auto=update`);
  as tabelas se criam e se ajustam sozinhas, inclusive entre versões.
- A semente inicial (`CarregadorInicial`) popula usuários, produtos e
  matérias-primas no primeiro start, caso o banco esteja vazio, e aplica a
  senha padrão `123456` aos acessos sem senha (idempotente).
- As senhas nunca trafegam nem são armazenadas em texto puro (SHA-256 + salt);
  a API só expõe o indicador `temSenha`.
- Os IDs internos do banco (sequência PostgreSQL) não são exibidos diretamente
  na tela; o frontend mostra uma numeração por posição na lista, de forma a
  ficar amigável após exclusões.
- O código (classes, atributos, endpoints, variáveis) foi traduzido para
  português para facilitar a leitura e a apresentação acadêmica.
