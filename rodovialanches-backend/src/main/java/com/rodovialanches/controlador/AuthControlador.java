package com.rodovialanches.controlador;

import com.rodovialanches.modelo.Usuario;
import com.rodovialanches.repositorio.UsuarioRepositorio;
import com.rodovialanches.util.SenhaUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de acesso ao sistema.
 *
 * Base: /api/auth
 *  POST /login → valida nome + senha e devolve o usuário da sessão (sem a senha)
 *
 * Regras:
 *  - Cliente (papel CLIENTE) NÃO acessa o sistema.
 *  - Resposta 401 sempre com a mesma mensagem, para não revelar se o nome existe.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthControlador {

    private final UsuarioRepositorio usuarioRepositorio;

    public AuthControlador(UsuarioRepositorio usuarioRepositorio) {
        this.usuarioRepositorio = usuarioRepositorio;
    }

    /**POST
     * Login do sistema: { nome, senha }.
     * Devolve o usuário (JSON) em caso de sucesso — a senha nunca sai da API.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Credenciais credenciais) {
        String nome = credenciais.nome() != null ? credenciais.nome().trim() : "";
        String senha = credenciais.senha() != null ? credenciais.senha() : "";

        Usuario usuario = usuarioRepositorio.findAll().stream()
                .filter(u -> u.getNome() != null && u.getNome().equalsIgnoreCase(nome))
                .findFirst()
                .orElse(null);

        boolean ehCliente = usuario != null && "CLIENTE".equals(usuario.getPapel());
        boolean valido = usuario != null
                && !ehCliente
                && SenhaUtil.temSenha(usuario.getSenha())
                && SenhaUtil.confere(usuario.getSenha(), senha);

        if (!valido) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Nome ou senha inválidos.");
        }
        return ResponseEntity.ok(usuario);
    }

    /** Corpo do login. */
    public record Credenciais(String nome, String senha) {}
}
