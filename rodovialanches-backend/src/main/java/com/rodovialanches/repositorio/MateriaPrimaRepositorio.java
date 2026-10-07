package com.rodovialanches.repositorio;

import com.rodovialanches.modelo.MateriaPrima;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MateriaPrimaRepositorio extends JpaRepository<MateriaPrima, Long> {
    Optional<MateriaPrima> findByNomeIgnoreCase(String nome);
    List<MateriaPrima> findByNomeContainingIgnoreCase(String nome);
    boolean existsByNomeIgnoreCase(String nome);
}