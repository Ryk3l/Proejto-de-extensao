package com.rodovialanches.controlador;

import com.rodovialanches.modelo.Usuario;
import com.rodovialanches.repositorio.PedidoRepositorio;
import com.rodovialanches.repositorio.UsuarioRepositorio;
import com.rodovialanches.util.SenhaUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST para Usuários (garçom, cozinha, balcão, gerente, cliente).
 *
 * Base: /api/usuarios
 *  GET    /              → lista todos os usuários
 *  POST   /garcons       → cadastra um garçom
 *  POST   /clientes      → cadastra um cliente (com nome + telefone)
 *  POST   /acesso        → cadastra um acesso ao sistema (papel + CPF + senha)
 *  PUT    /{id}          → atualiza nome/telefone e, opcionalmente, CPF e senha
 *  DELETE /{id}          → remove usuário (bloqueado se houver pedidos vinculados)
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioControlador {
    private final UsuarioRepositorio usuarioRepositorio;
    private final PedidoRepositorio pedidoRepositorio;

    public UsuarioControlador(UsuarioRepositorio usuarioRepositorio, PedidoRepositorio pedidoRepositorio) {
        this.usuarioRepositorio = usuarioRepositorio;
        this.pedidoRepositorio = pedidoRepositorio;
    }

    /**READ 
     * Lista todos os usuários registrados. */
    @GetMapping
    public List<Usuario> listar() {
        return usuarioRepositorio.findAll();
    }

    /**CREATE
     * Cadastra um novo garçom.
     * Recebe apenas o nome no corpo da requisição e garante que o papel será GARCOM.
     */
    @PostMapping("/garcons")
    public ResponseEntity<Usuario> criarGarcom(@RequestBody Usuario usuario) {
        if (usuario.getNome() == null || usuario.getNome().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        usuario.setPapel("GARCOM");
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioRepositorio.save(usuario));
    }

    /**CREATE
     * Cadastra um novo cliente.
     * Recebe nome e telefone; bloqueia duplicidade (mesmo nome + mesmo telefone).
     */
    @PostMapping("/clientes")
    public ResponseEntity<?> criarCliente(@RequestBody Usuario usuario) {
        if (usuario.getNome() == null || usuario.getNome().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Nome é obrigatório.");
        }
        if (usuario.getTelefone() == null || usuario.getTelefone().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Telefone é obrigatório.");
        }
        String nome = usuario.getNome().trim();
        String telefone = usuario.getTelefone().trim();
        if (usuarioRepositorio.existsByNomeIgnoreCaseAndTelefoneAndPapel(nome, telefone, "CLIENTE")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Já existe um cliente com esse nome e telefone.");
        }
        usuario.setNome(nome);
        usuario.setTelefone(telefone);
        usuario.setPapel("CLIENTE");
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioRepositorio.save(usuario));
    }

    /**CREATE
     * Cadastra um ACESSO ao sistema (papel à escolha + CPF + senha).
     * Usado pela página "Cadastro de Acesso" (restrita ao gerente).
     * Exige nome único (o login é feito por nome) e CPF único com 11 dígitos;
     * guarda apenas o hash da senha.
     */
    @PostMapping("/acesso")
    public ResponseEntity<?> criarAcesso(@RequestBody Usuario usuario) {
        if (usuario.getNome() == null || usuario.getNome().isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Nome é obrigatório.");
        }
        String papel = usuario.getPapel() != null ? usuario.getPapel().trim().toUpperCase() : "";
        if (!List.of("GARCOM", "COZINHA", "BALCAO", "GERENTE").contains(papel)) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Papel inválido. Use GARCOM, COZINHA, BALCAO ou GERENTE.");
        }
        if (usuario.getSenha() == null || usuario.getSenha().trim().length() < 4) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("A senha é obrigatória e deve ter pelo menos 4 caracteres.");
        }
        String cpf = usuario.getCpf() != null ? usuario.getCpf().trim() : "";
        String cpfDigitos = cpf.replaceAll("\\D", "");
        if (cpfDigitos.length() != 11) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("CPF incompleto. Use o formato 000.000.000-00.");
        }
        boolean cpfJaCadastrado = usuarioRepositorio.findAll().stream()
                .filter(u -> u.getCpf() != null && !u.getCpf().isBlank())
                .anyMatch(u -> u.getCpf().replaceAll("\\D", "").equals(cpfDigitos));
        if (cpfJaCadastrado) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Já existe um usuário com esse CPF.");
        }
        String nome = usuario.getNome().trim();
        if (usuarioRepositorio.existsByNomeIgnoreCase(nome)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Já existe um usuário com esse nome.");
        }
        usuario.setNome(nome);
        usuario.setPapel(papel);
        usuario.setTelefone(usuario.getTelefone() != null ? usuario.getTelefone().trim() : null);
        usuario.setCpf(cpf);
        usuario.setSenha(SenhaUtil.criar(usuario.getSenha().trim()));
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioRepositorio.save(usuario));
    }

    /**UPDATE
     * Atualiza um usuário existente.
     * Permite alterar nome, telefone e, opcionalmente, CPF e senha do acesso.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody Usuario usuario) {
        return usuarioRepositorio.findById(id)
                .map(existente -> {
                    String novoNome = usuario.getNome() != null && !usuario.getNome().isBlank() ? usuario.getNome().trim() : existente.getNome();
                    String novoTelefone = usuario.getTelefone() != null ? usuario.getTelefone().trim() : existente.getTelefone();
                    if ("CLIENTE".equals(existente.getPapel()) && novoTelefone != null && !novoTelefone.isBlank()) {
                        boolean mudou = !novoNome.equalsIgnoreCase(existente.getNome()) || !novoTelefone.equals(existente.getTelefone());
                        if (mudou && usuarioRepositorio.existsByNomeIgnoreCaseAndTelefoneAndPapel(novoNome, novoTelefone, "CLIENTE")) {
                            return ResponseEntity.status(HttpStatus.CONFLICT)
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Já existe um cliente com esse nome e telefone.");
                        }
                    }
                    // Senha do acesso: se veio no corpo, faz a troca (com hash);
                    // se não veio, mantém a atual — editar nome/telefone nunca apaga a senha.
                    if (usuario.getSenha() != null && !usuario.getSenha().isBlank()) {
                        String novaSenha = usuario.getSenha().trim();
                        if (novaSenha.length() < 4) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "A senha deve ter pelo menos 4 caracteres.");
                        }
                        existente.setSenha(SenhaUtil.criar(novaSenha));
                    }
                    // CPF: se veio no corpo, valida e troca; se não veio, mantém o atual.
                    if (usuario.getCpf() != null && !usuario.getCpf().isBlank()) {
                        String novoCpf = usuario.getCpf().trim();
                        String digitos = novoCpf.replaceAll("\\D", "");
                        if (digitos.length() != 11) {
                            return ResponseEntity.badRequest()
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "CPF incompleto. Use o formato 000.000.000-00.");
                        }
                        boolean duplicado = usuarioRepositorio.findAll().stream()
                                .filter(u -> u.getId() != null && !u.getId().equals(id))
                                .filter(u -> u.getCpf() != null && !u.getCpf().isBlank())
                                .anyMatch(u -> u.getCpf().replaceAll("\\D", "").equals(digitos));
                        if (duplicado) {
                            return ResponseEntity.status(HttpStatus.CONFLICT)
                                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                                    .body((Object) "Já existe um usuário com esse CPF.");
                        }
                        existente.setCpf(novoCpf);
                    }
                    existente.setNome(novoNome);
                    if (usuario.getTelefone() != null) existente.setTelefone(novoTelefone);
                    return ResponseEntity.ok((Object) usuarioRepositorio.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Deleta um usuário do sistema.
     * Bloqueado se o usuário (como garçom ou cliente) já tiver pedidos no histórico.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> remover(@PathVariable Long id) {
        if (!usuarioRepositorio.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        if (pedidoRepositorio.existsByGarcom_Id(id) || pedidoRepositorio.existsByCliente_Id(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .body("Usuário possui pedidos vinculados e não pode ser removido.");
        }
        usuarioRepositorio.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
