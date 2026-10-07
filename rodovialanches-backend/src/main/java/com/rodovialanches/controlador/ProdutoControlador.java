package com.rodovialanches.controlador;

import com.rodovialanches.modelo.MateriaPrima;
import com.rodovialanches.modelo.Produto;
import com.rodovialanches.modelo.Receita;
import com.rodovialanches.repositorio.ItemPedidoRepositorio;
import com.rodovialanches.repositorio.MateriaPrimaRepositorio;
import com.rodovialanches.repositorio.ProdutoRepositorio;
import com.rodovialanches.repositorio.ReceitaRepositorio;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Endpoints REST para Produtos (itens de venda final).
 *
 * Base: /api/produtos
 *  GET    /                              → lista todos os produtos (sem disponibilidade)
 *  GET    /com-disponibilidade           → lista produtos com quantidade máxima produzível
 *  POST   /                              → cria um produto
 *  PUT    /{id}                          → atualiza nome/preço
 *  DELETE /{id}                          → remove produto (bloqueado se já foi vendido)
 *
 * NOTA: Produtos não possuem mais estoque próprio.
 * O estoque é gerenciado pelas Matérias-Primas (/api/materias-primas)
 * e pela Ficha Técnica (/api/produtos/{id}/receita).
 */
@RestController
@RequestMapping("/api/produtos")
public class ProdutoControlador {
    private final ProdutoRepositorio produtoRepositorio;
    private final ItemPedidoRepositorio itemPedidoRepositorio;
    private final ReceitaRepositorio receitaRepositorio;
    private final MateriaPrimaRepositorio materiaPrimaRepositorio;

    public ProdutoControlador(ProdutoRepositorio produtoRepositorio,
                              ItemPedidoRepositorio itemPedidoRepositorio,
                              ReceitaRepositorio receitaRepositorio,
                              MateriaPrimaRepositorio materiaPrimaRepositorio) {
        this.produtoRepositorio = produtoRepositorio;
        this.itemPedidoRepositorio = itemPedidoRepositorio;
        this.receitaRepositorio = receitaRepositorio;
        this.materiaPrimaRepositorio = materiaPrimaRepositorio;
    }

    @GetMapping
    public List<Produto> listar() { return produtoRepositorio.findAll(); }

    /**
     * Lista produtos com a quantidade máxima que pode ser produzida
     * com base no estoque atual das matérias-primas da receita.
     * Retorna: [{ id, nome, preco, quantidadeDisponivel, temReceita }]
     */
    @GetMapping("/com-disponibilidade")
    public List<Map<String, Object>> listarComDisponibilidade() {
        List<Produto> produtos = produtoRepositorio.findAll();
        List<MateriaPrima> todasMaterias = materiaPrimaRepositorio.findAll();

        // Map para acesso rápido: materiaPrimaId -> MateriaPrima
        Map<Long, MateriaPrima> mapaMaterias = todasMaterias.stream()
                .collect(Collectors.toMap(MateriaPrima::getId, mp -> mp));

        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Produto p : produtos) {
            List<Receita> receita = receitaRepositorio.findByProduto(p);
            boolean temReceita = !receita.isEmpty();
            int qtdDisponivel = 0;

            if (temReceita) {
                // Para cada ingrediente da receita, calcula quantas unidades do produto dá pra fazer
                // O limite é o ingrediente mais escasso
                int minProduzivel = Integer.MAX_VALUE;
                for (Receita r : receita) {
                    MateriaPrima mp = mapaMaterias.get(r.getMateriaPrima().getId());
                    if (mp == null || mp.getQuantidade() == null) {
                        minProduzivel = 0;
                        break;
                    }
                    BigDecimal qtdNecessariaPorUnidade = r.getQuantidade();
                    if (qtdNecessariaPorUnidade.compareTo(BigDecimal.ZERO) <= 0) {
                        continue; // ingrediente com qtd 0 ou negativa não limita
                    }
                    int podeProduzir = mp.getQuantidade().divide(qtdNecessariaPorUnidade, 0, java.math.RoundingMode.DOWN).intValue();
                    if (podeProduzir < minProduzivel) {
                        minProduzivel = podeProduzir;
                    }
                }
                qtdDisponivel = (minProduzivel == Integer.MAX_VALUE) ? 0 : minProduzivel;
            }

            resultado.add(Map.of(
                    "id", p.getId(),
                    "nome", p.getNome(),
                    "preco", p.getPreco(),
                    "quantidadeDisponivel", qtdDisponivel,
                    "temReceita", temReceita
            ));
        }
        return resultado;
    }

    /** Cria um novo produto. */
    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Produto produto) {
        if (produto.getNome() == null || produto.getNome().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Nome do produto é obrigatório.");
        }
        if (produto.getPreco() == null || produto.getPreco() < 0) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Preço inválido.");
        }
        produto.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(produtoRepositorio.save(produto));
    }

    /** Atualiza nome e/ou preço de um produto existente. */
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody Produto corpo) {
        return produtoRepositorio.findById(id)
                .map(produto -> {
                    if (corpo.getNome() != null) {
                        String nome = corpo.getNome().trim();
                        if (nome.isEmpty()) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Nome do produto não pode ficar vazio.");
                        }
                        produto.setNome(nome);
                    }
                    if (corpo.getPreco() != null) {
                        if (corpo.getPreco() < 0) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Preço inválido.");
                        }
                        produto.setPreco(corpo.getPreco());
                    }
                    return ResponseEntity.ok((Object) produtoRepositorio.save(produto));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remover(@PathVariable Long id) {
        if (!produtoRepositorio.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        if (itemPedidoRepositorio.existsByProduto_Id(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Produto possui pedidos vinculados e não pode ser removido.");
        }
        produtoRepositorio.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}