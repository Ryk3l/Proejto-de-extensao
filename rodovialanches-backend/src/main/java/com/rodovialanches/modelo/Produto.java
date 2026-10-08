package com.rodovialanches.modelo;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    // @JsonIgnore: evita ciclo de serialização (Produto → Receita → Produto → ...),
    // que derrubava a requisição com StackOverflow. A ficha técnica é acessada
    // pelo endpoint dedicado GET /api/produtos/{id}/receita.
    @JsonIgnore
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