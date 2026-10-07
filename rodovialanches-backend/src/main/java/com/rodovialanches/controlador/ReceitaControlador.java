package com.rodovialanches.controlador;

import com.rodovialanches.modelo.MateriaPrima;
import com.rodovialanches.modelo.Produto;
import com.rodovialanches.modelo.Receita;
import com.rodovialanches.repositorio.MateriaPrimaRepositorio;
import com.rodovialanches.repositorio.ProdutoRepositorio;
import com.rodovialanches.repositorio.ReceitaRepositorio;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Endpoints REST para Ficha Técnica (Receita) dos Produtos.
 *
 * Base: /api/produtos/{produtoId}/receita
 *  GET    /                              → lista ingredientes do produto
 *  POST   /                              → adiciona ingrediente à receita
 *  PUT    /{receitaId}                   → atualiza quantidade/observação do ingrediente
 *  DELETE /{receitaId}                   → remove ingrediente da receita
 */
@RestController
@RequestMapping("/api/produtos/{produtoId}/receita")
public class ReceitaControlador {
    private final ReceitaRepositorio receitaRepositorio;
    private final ProdutoRepositorio produtoRepositorio;
    private final MateriaPrimaRepositorio materiaPrimaRepositorio;

    public ReceitaControlador(ReceitaRepositorio receitaRepositorio,
                              ProdutoRepositorio produtoRepositorio,
                              MateriaPrimaRepositorio materiaPrimaRepositorio) {
        this.receitaRepositorio = receitaRepositorio;
        this.produtoRepositorio = produtoRepositorio;
        this.materiaPrimaRepositorio = materiaPrimaRepositorio;
    }

    @GetMapping
    public List<Receita> listar(@PathVariable Long produtoId) {
        return receitaRepositorio.findByProduto_Id(produtoId);
    }

    @PostMapping
    public ResponseEntity<?> adicionar(@PathVariable Long produtoId, @RequestBody ReceitaInput input) {
        return produtoRepositorio.findById(produtoId)
                .map(produto -> {
                    return materiaPrimaRepositorio.findById(input.materiaPrimaId)
                            .map(mp -> {
                                if (receitaRepositorio.existsByProdutoAndMateriaPrima(produto, mp)) {
                                    return ResponseEntity.status(HttpStatus.CONFLICT)
                                            .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                            .body((Object) "Essa matéria-prima já está na receita deste produto.");
                                }
                                if (input.quantidade == null || input.quantidade.compareTo(BigDecimal.ZERO) <= 0) {
                                    return ResponseEntity.badRequest()
                                            .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                            .body((Object) "Quantidade deve ser maior que zero.");
                                }
                                Receita r = new Receita();
                                r.setProduto(produto);
                                r.setMateriaPrima(mp);
                                r.setQuantidade(input.quantidade);
                                r.setObservacao(input.observacao);
                                return ResponseEntity.status(HttpStatus.CREATED).body(receitaRepositorio.save(r));
                            })
                            .orElse(ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Matéria-prima não encontrada."));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{receitaId}")
    public ResponseEntity<?> atualizar(@PathVariable Long produtoId, @PathVariable Long receitaId, @RequestBody ReceitaInput input) {
        return receitaRepositorio.findById(receitaId)
                .map(r -> {
                    if (!r.getProduto().getId().equals(produtoId)) {
                        return ResponseEntity.badRequest()
                                .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                .body((Object) "Receita não pertence a este produto.");
                    }
                    if (input.quantidade != null) {
                        if (input.quantidade.compareTo(BigDecimal.ZERO) <= 0) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Quantidade deve ser maior que zero.");
                        }
                        r.setQuantidade(input.quantidade);
                    }
                    if (input.observacao != null) {
                        r.setObservacao(input.observacao);
                    }
                    return ResponseEntity.ok((Object) receitaRepositorio.save(r));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{receitaId}")
    public ResponseEntity<?> remover(@PathVariable Long produtoId, @PathVariable Long receitaId) {
        return receitaRepositorio.findById(receitaId)
                .map(r -> {
                    if (!r.getProduto().getId().equals(produtoId)) {
                        return ResponseEntity.badRequest()
                                .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                .body((Object) "Receita não pertence a este produto.");
                    }
                    receitaRepositorio.delete(r);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DTO simples para input da receita
    public static class ReceitaInput {
        public Long materiaPrimaId;
        public BigDecimal quantidade;
        public String observacao;
    }
}