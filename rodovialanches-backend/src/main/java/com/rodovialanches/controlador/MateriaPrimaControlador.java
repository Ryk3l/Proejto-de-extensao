package com.rodovialanches.controlador;

import com.rodovialanches.modelo.MateriaPrima;
import com.rodovialanches.repositorio.MateriaPrimaRepositorio;
import com.rodovialanches.repositorio.ReceitaRepositorio;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Endpoints REST para Matérias-Primas (insumos com estoque próprio).
 *
 * Base: /api/materias-primas
 *  GET    /                              → lista todas
 *  POST   /                              → cria uma
 *  PUT    /{id}                          → atualiza nome/unidade/preço custo
 *  PUT    /{id}/estoque?delta=...        → ajusta estoque (pode ser negativo para entrada/baixa manual)
 *  PUT    /{id}/quantidade?quantidade=... → define estoque absoluto
 *  DELETE /{id}                          → remove (bloqueado se usada em alguma receita)
 */
@RestController
@RequestMapping("/api/materias-primas")
public class MateriaPrimaControlador {
    private final MateriaPrimaRepositorio materiaPrimaRepositorio;
    private final ReceitaRepositorio receitaRepositorio;

    public MateriaPrimaControlador(MateriaPrimaRepositorio materiaPrimaRepositorio,
                                    ReceitaRepositorio receitaRepositorio) {
        this.materiaPrimaRepositorio = materiaPrimaRepositorio;
        this.receitaRepositorio = receitaRepositorio;
    }

    @GetMapping
    public List<MateriaPrima> listar() {
        return materiaPrimaRepositorio.findAll();
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody MateriaPrima mp) {
        if (mp.getNome() == null || mp.getNome().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Nome da matéria-prima é obrigatório.");
        }
        if (mp.getUnidade() == null || mp.getUnidade().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Unidade é obrigatória (ex: UN, KG, G, ML, L).");
        }
        if (materiaPrimaRepositorio.existsByNomeIgnoreCase(mp.getNome().trim())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Já existe uma matéria-prima com esse nome.");
        }
        mp.setNome(mp.getNome().trim());
        mp.setUnidade(mp.getUnidade().trim().toUpperCase());
        if (mp.getQuantidade() == null) mp.setQuantidade(BigDecimal.ZERO);
        if (mp.getPrecoCusto() != null && mp.getPrecoCusto().compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Preço de custo não pode ser negativo.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(materiaPrimaRepositorio.save(mp));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody MateriaPrima corpo) {
        return materiaPrimaRepositorio.findById(id)
                .map(mp -> {
                    if (corpo.getNome() != null) {
                        String nome = corpo.getNome().trim();
                        if (nome.isEmpty()) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Nome não pode ficar vazio.");
                        }
                        if (!nome.equalsIgnoreCase(mp.getNome()) && materiaPrimaRepositorio.existsByNomeIgnoreCase(nome)) {
                            return ResponseEntity.status(HttpStatus.CONFLICT)
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Já existe uma matéria-prima com esse nome.");
                        }
                        mp.setNome(nome);
                    }
                    if (corpo.getUnidade() != null) {
                        String unidade = corpo.getUnidade().trim().toUpperCase();
                        if (unidade.isEmpty()) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Unidade não pode ficar vazia.");
                        }
                        mp.setUnidade(unidade);
                    }
                    if (corpo.getPrecoCusto() != null) {
                        if (corpo.getPrecoCusto().compareTo(BigDecimal.ZERO) < 0) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Preço de custo não pode ser negativo.");
                        }
                        mp.setPrecoCusto(corpo.getPrecoCusto());
                    }
                    return ResponseEntity.ok((Object) materiaPrimaRepositorio.save(mp));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Ajusta o estoque somando o delta (pode ser negativo para baixa manual ou positivo para entrada). */
    @PutMapping("/{id}/estoque")
    public ResponseEntity<?> ajustarEstoque(@PathVariable Long id, @RequestParam BigDecimal delta) {
        return materiaPrimaRepositorio.findById(id)
                .map(mp -> {
                    BigDecimal novaQtd = mp.getQuantidade().add(delta);
                    if (novaQtd.compareTo(BigDecimal.ZERO) < 0) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                .body((Object) ("Estoque não pode ficar negativo. Atual: " + mp.getQuantidade().toString() + " " + mp.getUnidade()));
                    }
                    mp.setQuantidade(novaQtd);
                    return ResponseEntity.ok((Object) materiaPrimaRepositorio.save(mp));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Define o estoque com um valor absoluto. */
    @PutMapping("/{id}/quantidade")
    public ResponseEntity<?> definirQuantidade(@PathVariable Long id, @RequestParam BigDecimal quantidade) {
        if (quantidade.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Quantidade não pode ser negativa.");
        }
        return materiaPrimaRepositorio.findById(id)
                .map(mp -> {
                    mp.setQuantidade(quantidade);
                    return ResponseEntity.ok((Object) materiaPrimaRepositorio.save(mp));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remover(@PathVariable Long id) {
        if (!materiaPrimaRepositorio.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        if (receitaRepositorio.existsByMateriaPrima_Id(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Matéria-prima está sendo usada em uma ou mais receitas e não pode ser removida.");
        }
        materiaPrimaRepositorio.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}