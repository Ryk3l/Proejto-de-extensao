package com.rodovialanches.modelo;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Produto final vendido ao cliente (lanche, bebida, acompanhamento).
 * Não possui estoque próprio — o estoque é gerenciado pelas Matérias-Primas da sua Receita.
 */
@Entity
@Table(name = "produto")
public class Produto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    private Double preco;

    @OneToMany(mappedBy = "produto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Receita> receita = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public Double getPreco() { return preco; }
    public void setPreco(Double preco) { this.preco = preco; }
    public List<Receita> getReceita() { return receita; }
    public void setReceita(List<Receita> receita) { this.receita = receita; }
}