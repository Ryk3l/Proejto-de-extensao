// Diz em qual "pasta lógica" do projeto essa classe vive.
// O Spring procura componentes recursivamente a partir de com.rodovialanches,
// por isso qualquer classe abaixo desse pacote é descoberta automaticamente.
package com.rodovialanches.configuracao;

// Importamos as classes de modelo
import com.rodovialanches.modelo.MateriaPrima;
import com.rodovialanches.modelo.Produto;
import com.rodovialanches.modelo.Receita;
import com.rodovialanches.modelo.Usuario;

// Importamos as interfaces de repositório
import com.rodovialanches.repositorio.MateriaPrimaRepositorio;
import com.rodovialanches.repositorio.ProdutoRepositorio;
import com.rodovialanches.repositorio.ReceitaRepositorio;
import com.rodovialanches.repositorio.UsuarioRepositorio;

// CommandLineRunner é uma interface do Spring Boot. Qualquer bean que a
// implemente tem seu método run() executado uma única vez logo após a
// aplicação subir (depois do contexto Spring estar pronto). Perfeito para
// rodar tarefas de inicialização como "popular o banco com dados base".
import org.springframework.boot.CommandLineRunner;

// @Component diz ao Spring "gerencie essa classe". Sem isso, o Spring
// nem saberia que ela existe e o run() nunca seria chamado.
import org.springframework.stereotype.Component;

// Utilidades
import java.math.BigDecimal;
import java.util.List;

/**
 * Carrega dados iniciais ao subir a aplicação.
 *
 * Só insere se o banco estiver vazio (evita duplicar a cada restart).
 * Cria:
 *  - Usuários padrão (Garcom1, Cozinha1, Balcao1, Gerente1, Cliente1)
 *  - Matérias-Primas (Pão, Carne, Queijo, Alface, Tomate, Ketchup, Batata, Refrigerante)
 *  - Produtos do cardápio (X-Salada, X-Burguer, Batata Frita, Refrigerante Lata)
 *  - Fichas Técnicas (Receitas) ligando produtos às matérias-primas
 *
 * Implementa CommandLineRunner para o Spring chamar o método run()
 * automaticamente assim que a aplicação termina de subir.
 */
@Component  // Marca a classe como um "bean" do Spring (gerenciado pelo container).
public class CarregadorInicial implements CommandLineRunner {

    // ----------------- ATRIBUTOS -----------------
    private final UsuarioRepositorio usuarioRepositorio;
    private final ProdutoRepositorio produtoRepositorio;
    private final MateriaPrimaRepositorio materiaPrimaRepositorio;
    private final ReceitaRepositorio receitaRepositorio;

    // ----------------- CONSTRUTOR -----------------
    public CarregadorInicial(UsuarioRepositorio usuarioRepositorio,
                             ProdutoRepositorio produtoRepositorio,
                             MateriaPrimaRepositorio materiaPrimaRepositorio,
                             ReceitaRepositorio receitaRepositorio) {
        this.usuarioRepositorio = usuarioRepositorio;
        this.produtoRepositorio = produtoRepositorio;
        this.materiaPrimaRepositorio = materiaPrimaRepositorio;
        this.receitaRepositorio = receitaRepositorio;
    }

    // ----------------- MÉTODO PRINCIPAL -----------------
    @Override
    public void run(String... args) throws Exception {
        // ===== Bloco 1: Usuários =====
        if (usuarioRepositorio.count() == 0) {
            var usuarios = List.of(
                    novoUsuario(1L, "Garcom1", "GARCOM"),
                    novoUsuario(2L, "Cozinha1", "COZINHA"),
                    novoUsuario(3L, "Balcao1", "BALCAO"),
                    novoUsuario(4L, "Gerente1", "GERENTE"),
                    novoUsuario(5L, "Cliente1", "CLIENTE")
            );
            usuarioRepositorio.saveAll(usuarios);
        }

        // ===== Bloco 2: Matérias-Primas =====
        // Insumos com estoque próprio (UN, KG, G, ML, L)
        if (materiaPrimaRepositorio.count() == 0) {
            var materias = List.of(
                    novaMateriaPrima(1L, "Pão de hambúrguer", "UN", new BigDecimal("100"), new BigDecimal("0.80")),
                    novaMateriaPrima(2L, "Carne bovina", "KG", new BigDecimal("20.000"), new BigDecimal("35.00")),
                    novaMateriaPrima(3L, "Queijo muçarela", "KG", new BigDecimal("10.000"), new BigDecimal("45.00")),
                    novaMateriaPrima(4L, "Alface", "KG", new BigDecimal("5.000"), new BigDecimal("12.00")),
                    novaMateriaPrima(5L, "Tomate", "KG", new BigDecimal("5.000"), new BigDecimal("10.00")),
                    novaMateriaPrima(6L, "Ketchup", "ML", new BigDecimal("5000"), new BigDecimal("8.00")), // 5 litros
                    novaMateriaPrima(7L, "Maionese", "ML", new BigDecimal("5000"), new BigDecimal("10.00")),
                    novaMateriaPrima(8L, "Batata congelada", "KG", new BigDecimal("20.000"), new BigDecimal("15.00")),
                    novaMateriaPrima(9L, "Óleo para fritura", "L", new BigDecimal("10"), new BigDecimal("20.00")),
                    novaMateriaPrima(10L, "Refrigerante lata", "UN", new BigDecimal("100"), new BigDecimal("3.00"))
            );
            materiaPrimaRepositorio.saveAll(materias);
        }

        // ===== Bloco 3: Produtos (sem estoque próprio) =====
        if (produtoRepositorio.count() == 0) {
            var produtos = List.of(
                    novoProduto(1L, "X-Salada", 18.50),
                    novoProduto(2L, "X-Burguer", 15.00),
                    novoProduto(3L, "Batata Frita", 12.00),
                    novoProduto(4L, "Refrigerante Lata", 6.00)
            );
            produtoRepositorio.saveAll(produtos);

            // ===== Bloco 4: Fichas Técnicas (Receitas) =====
            // Buscar referências para montar as receitas
            Produto xSalada = produtoRepositorio.findById(1L).orElseThrow();
            Produto xBurguer = produtoRepositorio.findById(2L).orElseThrow();
            Produto batataFrita = produtoRepositorio.findById(3L).orElseThrow();
            Produto refrigerante = produtoRepositorio.findById(4L).orElseThrow();

            MateriaPrima pao = materiaPrimaRepositorio.findById(1L).orElseThrow();
            MateriaPrima carne = materiaPrimaRepositorio.findById(2L).orElseThrow();
            MateriaPrima queijo = materiaPrimaRepositorio.findById(3L).orElseThrow();
            MateriaPrima alface = materiaPrimaRepositorio.findById(4L).orElseThrow();
            MateriaPrima tomate = materiaPrimaRepositorio.findById(5L).orElseThrow();
            MateriaPrima ketchup = materiaPrimaRepositorio.findById(6L).orElseThrow();
            MateriaPrima maionese = materiaPrimaRepositorio.findById(7L).orElseThrow();
            MateriaPrima batata = materiaPrimaRepositorio.findById(8L).orElseThrow();
            MateriaPrima oleo = materiaPrimaRepositorio.findById(9L).orElseThrow();
            MateriaPrima refriLata = materiaPrimaRepositorio.findById(10L).orElseThrow();

            var receitas = List.of(
                    // X-Salada: 1 pão + 150g carne + 50g queijo + 30g alface + 40g tomate + 20ml ketchup + 15ml maionese
                    novaReceita(xSalada, pao, new BigDecimal("1"), "1 unidade"),
                    novaReceita(xSalada, carne, new BigDecimal("150"), "150g"),
                    novaReceita(xSalada, queijo, new BigDecimal("50"), "50g"),
                    novaReceita(xSalada, alface, new BigDecimal("30"), "30g"),
                    novaReceita(xSalada, tomate, new BigDecimal("40"), "40g"),
                    novaReceita(xSalada, ketchup, new BigDecimal("20"), "20ml"),
                    novaReceita(xSalada, maionese, new BigDecimal("15"), "15ml"),

                    // X-Burguer: 1 pão + 150g carne + 50g queijo + 20ml ketchup + 15ml maionese
                    novaReceita(xBurguer, pao, new BigDecimal("1"), "1 unidade"),
                    novaReceita(xBurguer, carne, new BigDecimal("150"), "150g"),
                    novaReceita(xBurguer, queijo, new BigDecimal("50"), "50g"),
                    novaReceita(xBurguer, ketchup, new BigDecimal("20"), "20ml"),
                    novaReceita(xBurguer, maionese, new BigDecimal("15"), "15ml"),

                    // Batata Frita: 200g batata + 50ml óleo (consumo estimado)
                    novaReceita(batataFrita, batata, new BigDecimal("200"), "200g"),
                    novaReceita(batataFrita, oleo, new BigDecimal("50"), "50ml de óleo (consumo estimado)"),

                    // Refrigerante Lata: 1 lata
                    novaReceita(refrigerante, refriLata, new BigDecimal("1"), "1 lata")
            );
            receitaRepositorio.saveAll(receitas);
        }
    }

    // ----------------- MÉTODOS AUXILIARES -----------------

    private Usuario novoUsuario(Long id, String nome, String papel) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setNome(nome);
        u.setPapel(papel);
        return u;
    }

    private Produto novoProduto(Long id, String nome, Double preco) {
        Produto p = new Produto();
        p.setId(id);
        p.setNome(nome);
        p.setPreco(preco);
        return p;
    }

    private MateriaPrima novaMateriaPrima(Long id, String nome, String unidade, BigDecimal quantidade, BigDecimal precoCusto) {
        MateriaPrima mp = new MateriaPrima();
        mp.setId(id);
        mp.setNome(nome);
        mp.setUnidade(unidade);
        mp.setQuantidade(quantidade);
        mp.setPrecoCusto(precoCusto);
        return mp;
    }

    private Receita novaReceita(Produto produto, MateriaPrima materiaPrima, BigDecimal quantidade, String observacao) {
        Receita r = new Receita();
        r.setProduto(produto);
        r.setMateriaPrima(materiaPrima);
        r.setQuantidade(quantidade);
        r.setObservacao(observacao);
        return r;
    }
}