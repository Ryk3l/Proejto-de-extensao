package com.rodovialanches.repositorio;

import com.rodovialanches.modelo.ItemPedido;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acesso ao banco para a entidade ItemPedido.
 * Possui uma consulta para verificar se um produto está vinculado a algum item,
 * usada para impedir a exclusão de produtos que já foram vendidos.
 */
public interface ItemPedidoRepositorio extends JpaRepository<ItemPedido, Long> {
    boolean existsByProduto_Id(Long produtoId);
}
