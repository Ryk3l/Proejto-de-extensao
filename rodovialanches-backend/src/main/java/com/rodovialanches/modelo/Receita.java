package com.rodovialanches.modelo;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * Item da ficha técnica (receita) de um produto.
 * Ex: X-Salada → 1 Pão (UN) + 150g Carne (G) + 20ml Ketchup (ML)
 */
@Entity
@Table(name = "receita")
public class Receita {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "produto_id")
    private Produto produto;

    @ManyToOne(optional = false)
    @JoinColumn(name = "materia_prima_id")
    private MateriaPrima materiaPrima;

    @Column(nullable = false, precision = 19, scale = 3)
    private BigDecimal quantidade; // ex: 1, 150, 20

    private String observacao; // opcional: "cortar ao meio", "passar na chapa"

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Produto getProduto() { return produto; }
    public void setProduto(Produto produto) { this.produto = produto; }
    public MateriaPrima getMateriaPrima() { return materiaPrima; }
    public void setMateriaPrima(MateriaPrima materiaPrima) { this.materiaPrima = materiaPrima; }
    /**
     * Expõe o id da matéria-prima em nível plano no JSON (ex: "materiaPrimaId": 1).
     * O front usa esse campo para exibir o ingrediente e validar duplicatas.
     */
    public Long getMateriaPrimaId() { return materiaPrima != null ? materiaPrima.getId() : null; }
    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}