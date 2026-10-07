package com.rodovialanches.repositorio;

import com.rodovialanches.modelo.Produto;
import com.rodovialanches.modelo.Receita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceitaRepositorio extends JpaRepository<Receita, Long> {
    List<Receita> findByProduto(Produto produto);
    List<Receita> findByProduto_Id(Long produtoId);
    boolean existsByProdutoAndMateriaPrima(Produto produto, com.rodovialanches.modelo.MateriaPrima materiaPrima);
    boolean existsByMateriaPrima_Id(Long materiaPrimaId);
    void deleteByProduto(Produto produto);
}