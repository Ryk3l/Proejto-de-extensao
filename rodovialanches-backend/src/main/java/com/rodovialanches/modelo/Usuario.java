package com.rodovialanches.modelo;

import jakarta.persistence.*;

/**
 * Representa um usuário do sistema (garçom, cozinha, balcão, gerente ou cliente).
 * O campo "papel" guarda qual função esse usuário exerce.
 */
@Entity
@Table(name = "usuario")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    /** Papel/função do usuário: GARCOM, COZINHA, BALCAO, GERENTE ou CLIENTE. */
    private String papel;

    private String telefone;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getPapel() { return papel; }
    public void setPapel(String papel) { this.papel = papel; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
}
