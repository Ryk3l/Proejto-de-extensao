package com.rodovialanches.repositorio;

import com.rodovialanches.modelo.Produto;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acesso ao banco para a entidade Produto.
 * Usa apenas os métodos padrão do JpaRepository (findAll, save, delete, etc.).
 */
public interface ProdutoRepositorio extends JpaRepository<Produto, Long> {
}
