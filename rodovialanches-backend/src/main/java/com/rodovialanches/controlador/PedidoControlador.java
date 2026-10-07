package com.rodovialanches.controlador;

import com.rodovialanches.modelo.Pedido;
import com.rodovialanches.modelo.StatusPedido;
import com.rodovialanches.servico.PedidoServico;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints REST para Pedidos.
 *
 * Base: /api/pedidos
 *  POST  /                          → cria um pedido
 *  GET   /                          → lista todos os pedidos
 *  GET   /status/{status}           → lista pedidos por status
 *  PUT   /{id}/status?status=...    → atualiza status (Cozinha/Balcão)
 *  DELETE /{id}                     → remove pedido
 *  DELETE /por-garcom/{garcomId}    → remove todos os pedidos do garçom
 */
@RestController
@RequestMapping("/api/pedidos")
public class PedidoControlador {
    private final PedidoServico pedidoServico;

    public PedidoControlador(PedidoServico pedidoServico) { this.pedidoServico = pedidoServico; }

    /**
     * Cria um novo pedido.
     * O payload deve enviar garcom.id, cliente.id, numeroMesa e itens.
     */
    @PostMapping
    public ResponseEntity<Pedido> criar(@RequestBody Pedido pedido) {
        Pedido salvo = pedidoServico.criarPedido(pedido);
        return ResponseEntity.ok(salvo);
    }

    /** Lista todos os pedidos no sistema. */
    @GetMapping
    public List<Pedido> listar() {
        return pedidoServico.listarTodos();
    }

    @GetMapping("/status/{status}")
    public List<Pedido> porStatus(@PathVariable StatusPedido status) {
        return pedidoServico.listarPorStatus(status);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Pedido> atualizarStatus(@PathVariable Long id, @RequestParam StatusPedido status) {
        Pedido atualizado = pedidoServico.atualizarStatus(id, status);
        return ResponseEntity.ok(atualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        return pedidoServico.remover(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/por-garcom/{garcomId}")
    public ResponseEntity<Map<String, Integer>> removerPorGarcom(@PathVariable Long garcomId) {
        int removidos = pedidoServico.removerPorGarcom(garcomId);
        return ResponseEntity.ok(Map.of("removidos", removidos));
    }
}
