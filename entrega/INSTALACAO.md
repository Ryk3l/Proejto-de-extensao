# Rodovia Lanches — Manual de Instalação

Guia para colocar o sistema funcionando na máquina do estabelecimento.

---

## 1. O que está neste pacote

| Arquivo | Função |
|---|---|
| `rodovia-lanches.jar` | O sistema inteiro (interface + API) num único arquivo |
| `application.properties` | Configuração (banco de dados, porta) — editável sem abrir o `.jar` |
| `iniciar.bat` | Inicializador — é só dar duplo clique |
| `INSTALACAO.md` | Este manual |

Não é necessário instalar Node, npm nem copiar código-fonte. O computador
do estabelecimento precisa apenas de **Java 17+** e **PostgreSQL**.

---

## 2. Requisitos

- Windows 10 ou superior
- **Java 17 ou superior** (baixe em <https://adoptium.net>)
- **PostgreSQL 12 ou superior** (baixe em <https://www.postgresql.org/download/windows>)
- Endereço IP fixo no PC (recomendado — veja a seção 5)

### Como verificar o Java

Abra o Prompt de Comando (`Win + R`, digite `cmd`, Enter) e digite:

```
java -version
```

Precisa mostrar **17** ou superior. Se mostrar `1.8.0_xxx` (Java 8) ou
"não é reconhecido", instale o Java 17+ primeiro.

---

## 3. Instalação passo a passo

### 3.1 Instalar o Java 17+

1. Baixe o instalador em <https://adoptium.net> (versão LTS 17 ou 21)
2. Instale com as opções padrão
3. Confira no Prompt de Comando: `java -version` → deve mostrar 17+

> **Se o PC já tinha um Java antigo** (comum em máquinas antigas) e o
> `java -version` continua mostrando 1.8, edite o `iniciar.bat` com o
> bloco de notas: descomente a linha `set JAVA=C:\Program Files\Java\jdk-17\bin\java.exe`
> e ajuste o caminho para onde o Java 17 foi instalado.

### 3.2 Instalar o PostgreSQL

1. Instale com as opções padrão
2. **Anote a senha do superusuário `postgres`** definida no instalador
3. Crie o banco de dados do sistema. Abra o **pgAdmin** ou o Prompt de
   Comando e rode:

```
psql -U postgres -c "CREATE DATABASE rodovialanches;"
```

4. Se o usuário ou a senha do banco forem diferentes de
   `postgres` / `Redf!234`, edite o arquivo `application.properties`
   que está ao lado do `.jar`:

```properties
spring.datasource.username=SEU_USUARIO
spring.datasource.password=SUA_SENHA
```

> O Spring Boot lê esse arquivo automaticamente — não precisa "recompilar"
> nada para mudar a configuração.

### 3.3 Copiar a pasta

Copie a **pasta inteira** deste pacote para o PC do estabelecimento, por
exemplo:

```
C:\RodoviaLanches\
├── rodovia-lanches.jar
├── application.properties
├── iniciar.bat
└── INSTALACAO.md
```

### 3.4 Liberar o firewall (uma vez)

Abra o **PowerShell como administrador** e rode:

```powershell
New-NetFirewallRule -DisplayName "Rodovia Lanches" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

Isso permite que os celulares e tablets da rede acesrem o sistema.

### 3.5 Testar

1. Dê **duplo clique em `iniciar.bat`**
2. Espera cerca de 15 segundos — abre sozinho o navegador em
   `http://localhost:8080` (se a página demorar, atualize com F5)
3. Faça login:

| Usuário | Senha | Perfil |
|---|---|---|
| `Gerente1` | `123456` | Acesso completo |
| `Cozinha1` | `123456` | Só a tela da Cozinha |
| `Balcao1` | `123456` | Só a tela do Balcão |
| `Garcom1` | `123456` | Só a tela do Garçom |

> Numa base vazia, o sistema **cria sozinho** esses usuários e os produtos
> e matérias-primas de exemplo no primeiro boot.

**Enquanto o sistema estiver em uso, a janela preta "Rodovia Lanches" não
pode ser fechada** — ela é o servidor. Fechá-la derruba o sistema para
todos os aparelhos.

### 3.6 Iniciar sozinho com o Windows (recomendado)

1. `Win + R` → digite `shell:startup` → Enter
2. Crie um **atalho** para o `iniciar.bat` nessa pasta

Assim, ao ligar o PC do caixa, o sistema sobe automaticamente e abre no
navegador.

---

## 4. Acessos pela rede

Descubra o IP do PC do caixa (Prompt de Comando → `ipconfig`, olhe
"IPv4 Address", ex.: `192.168.0.107`) e use nos aparelhos:

| Onde | Endereço |
|---|---|
| PC do caixa | `http://localhost:8080` |
| Tablet / celular | `http://SEU_IP:8080` |

Depois do login, cada perfil cai direto na sua tela (Cozinha, Garçom,
Balcão, Gerente). O gerente troca as senhas pela página **Cadastro de
Acesso** — recomenda-se trocar as senhas padrão na primeira configuração.

> Para o endereço não mudar nunca, configure um IP fixo (ou reserva DHCP
> pelo MAC) no roteador para o PC do caixa.

---

## 5. Backup do banco de dados

O banco guarda todo o histórico de pedidos. Para exportar:

```
pg_dump -U postgres rodovialanches > backup_rodovia.sql
```

Para restaurar:

```
psql -U postgres rodovialanches < backup_rodovia.sql
```

---

## 6. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `UnsupportedClassVersionError` na janela preta | Java antigo (8 ou 11) | Instale Java 17+ ou ajuste o `set JAVA=` no `iniciar.bat` |
| `'java' não é reconhecido` | Java não instalado | Instale o Java 17+ (seção 3.1) |
| Página não abre de outro aparelho | Firewall ou IP errado | Repita a seção 3.4; confira o IP com `ipconfig` |
| Erro de conexão com o banco | Senha/usuário do PostgreSQL | Ajuste o `application.properties` ao lado do `.jar` |
| `Port 8080 was already in use` | Outra instância aberta | Feche a janela antiga do Rodovia Lanches |
| Página em branco ao abrir | Sistema ainda subindo | Aguarde 15 s e atualize (F5) |

---

## 7. Atualizando o sistema

1. Feche a janela preta do sistema atual
2. Substitua o `rodovia-lanches.jar` pela nova versão
3. Dê duplo clique em `iniciar.bat`

Os dados **não são perdidos** — tudo fica no PostgreSQL, e as tabelas se
ajustam sozinhas nas atualizações.
