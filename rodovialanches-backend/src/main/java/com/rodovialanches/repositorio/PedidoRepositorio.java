package com.rodovialanches.repositorio;

import com.rodovialanches.modelo.Pedido;
import com.rodovialanches.modelo.StatusPedido;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Acesso ao banco para a entidade Pedido.
 * Inclui consultas por status (usada pelas telas Cozinha/Balcão)
 * e por garçom/cliente (para validar exclusões e limpar pedidos).
 */
public interface PedidoRepositorio extends JpaRepository<Pedido, Long> {
    List<Pedido> findByStatus(StatusPedido status);
    boolean existsByGarcom_Id(Long garcomId);
    boolean existsByCliente_Id(Long clienteId);
    List<Pedido> findByGarcom_Id(Long garcomId);
}
