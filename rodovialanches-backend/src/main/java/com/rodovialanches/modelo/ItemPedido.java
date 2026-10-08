package com.rodovialanches.modelo;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

/**
 * Linha de um pedido: associa um produto a uma quantidade dentro de um pedido.
 * Ex: "2x X-Salada" vira um ItemPedido com produto=X-Salada e quantidade=2.
 */
@Entity // 1. Diz ao JPA que essa classe vai virar uma tabela no banco
@Table(name = "item_pedido") // 2. Força o nome da tabela a ser "item_pedido"
public class ItemPedido {

    @Id // 3. Define que este campo é a Chave Primária (PK)
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 4. Faz o banco gerar o ID automaticamente (Auto-incremento)
    private Long id;

    @ManyToOne // 5. Relacionamento: Muitos itens podem ser do mesmo Produto
    @JoinColumn(name = "produto_id") // 6. Cria a coluna de Chave Estrangeira "produto_id" no banco
    private Produto produto;

    private Integer quantidade; // 7. Coluna comum no banco para guardar números inteiros

    // Preço CONGELADO no momento da venda: alterações futuras de preço do produto
    // não mudam o valor de vendas antigas. Null apenas em pedidos antigos (antes deste campo).
    @Column(name = "preco_unitario")
    private Double precoUnitario;

    @ManyToOne // 8. Relacionamento: Muitos itens pertencem a um único Pedido
    @JoinColumn(name = "pedido_id") // 9. Cria a coluna de Chave Estrangeira "pedido_id" no banco
    @JsonBackReference // 10. Corta o loop infinito na hora de transformar o objeto em JSON
    private Pedido pedido;

    // --- Daqui para baixo são apenas os Getters e Setters padrão do Java ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Produto getProduto() { return produto; }
    public void setProduto(Produto produto) { this.produto = produto; }
    public Integer getQuantidade() { return quantidade; }
    public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }
    public Double getPrecoUnitario() { return precoUnitario; }
    public void setPrecoUnitario(Double precoUnitario) { this.precoUnitario = precoUnitario; }
    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }
}
