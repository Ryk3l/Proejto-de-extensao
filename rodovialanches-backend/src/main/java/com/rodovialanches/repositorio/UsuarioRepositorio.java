package com.rodovialanches.repositorio;

import com.rodovialanches.modelo.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acesso ao banco para a entidade Usuario.
 * O Spring Data JPA já oferece findAll/findById/save/delete automaticamente.
 * Aqui só adicionamos uma consulta personalizada para impedir clientes duplicados.
 */
public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {
    boolean existsByNomeIgnoreCaseAndTelefoneAndPapel(String nome, String telefone, String papel);
}
