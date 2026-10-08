package com.rodovialanches.modelo;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    /** CPF do usuário, guardado com máscara 000.000.000-00. */
    private String cpf;

    /**
     * Senha do acesso ao sistema, guardada como hash (SHA-256 + salt).
     * WRITE_ONLY: aceita a senha na entrada (login/cadastro), mas NUNCA
     * é devolvida em nenhuma resposta da API.
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String senha;

    /** true se o acesso já tem senha — exposto para a tela do gerente ver quem já pode entrar. */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public boolean isTemSenha() { return senha != null && !senha.isBlank(); }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getPapel() { return papel; }
    public void setPapel(String papel) { this.papel = papel; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }
}
