package com.rodovialanches.modelo;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * Matéria-prima / Insumo com estoque próprio.
 * Ex: Pão (UN), Carne (KG), Ketchup (ML), Queijo (KG).
 * O estoque é debitado automaticamente quando um produto que usa essa matéria-prima é vendido.
 */
@Entity
@Table(name = "materia_prima")
public class MateriaPrima {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;           // "Pão de hambúrguer"
    private String unidade;        // "UN", "KG", "G", "ML", "L"

    @Column(nullable = false, precision = 19, scale = 3)
    private BigDecimal quantidade = BigDecimal.ZERO; // estoque atual

    @Column(precision = 19, scale = 2)
    private BigDecimal precoCusto; // opcional: custo unitário para calcular custo da receita

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }
    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }
    public BigDecimal getPrecoCusto() { return precoCusto; }
    public void setPrecoCusto(BigDecimal precoCusto) { this.precoCusto = precoCusto; }
}