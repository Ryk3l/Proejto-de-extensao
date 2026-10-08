package com.rodovialanches.servico;

import com.rodovialanches.modelo.ItemPedido;
import com.rodovialanches.modelo.MateriaPrima;
import com.rodovialanches.modelo.Pedido;
import com.rodovialanches.modelo.Produto;
import com.rodovialanches.modelo.Receita;
import com.rodovialanches.modelo.StatusPedido;
import com.rodovialanches.repositorio.MateriaPrimaRepositorio;
import com.rodovialanches.repositorio.PedidoRepositorio;
import com.rodovialanches.repositorio.ProdutoRepositorio;
import com.rodovialanches.repositorio.ReceitaRepositorio;
import com.rodovialanches.repositorio.UsuarioRepositorio;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Camada de regras de negócio para Pedido.
 *
 * Concentra as validações (garçom existe, cliente é mesmo CLIENTE, mesa válida,
 * estoque suficiente de matérias-primas) e o efeito colateral de debitar o estoque
 * das matérias-primas conforme a ficha técnica (receita) de cada produto.
 * O controlador (PedidoControlador) fica fino e só repassa as chamadas aqui.
 */
@Service
public class PedidoServico {
    private final PedidoRepositorio pedidoRepositorio;
    private final UsuarioRepositorio usuarioRepositorio;
    private final ProdutoRepositorio produtoRepositorio;
    private final ReceitaRepositorio receitaRepositorio;
    private final MateriaPrimaRepositorio materiaPrimaRepositorio;

    public PedidoServico(PedidoRepositorio pedidoRepositorio,
                         UsuarioRepositorio usuarioRepositorio,
                         ProdutoRepositorio produtoRepositorio,
                         ReceitaRepositorio receitaRepositorio,
                         MateriaPrimaRepositorio materiaPrimaRepositorio) {
        this.pedidoRepositorio = pedidoRepositorio;
        this.usuarioRepositorio = usuarioRepositorio;
        this.produtoRepositorio = produtoRepositorio;
        this.receitaRepositorio = receitaRepositorio;
        this.materiaPrimaRepositorio = materiaPrimaRepositorio;
    }

    /**
     * Cria um pedido, validando garçom, cliente, mesa e estoque de matérias-primas,
     * e debita a quantidade necessária de cada matéria-prima conforme a receita.
     */
    @Transactional
    public Pedido criarPedido(Pedido pedido) {
        if (pedido.getGarcom() == null || pedido.getGarcom().getId() == null) {
            throw new IllegalArgumentException("Garçom não informado");
        }
        var garcom = usuarioRepositorio.findById(pedido.getGarcom().getId())
                .orElseThrow(() -> new IllegalArgumentException("Garçom não encontrado: " + pedido.getGarcom().getId()));
        pedido.setGarcom(garcom);

        if (pedido.getCliente() == null || pedido.getCliente().getId() == null) {
            throw new IllegalArgumentException("Cliente não informado");
        }
        var cliente = usuarioRepositorio.findById(pedido.getCliente().getId())
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado: " + pedido.getCliente().getId()));
        if (!"CLIENTE".equals(cliente.getPapel())) {
            throw new IllegalArgumentException("O usuário informado não é um cliente");
        }
        pedido.setCliente(cliente);

        boolean ehDelivery = Boolean.TRUE.equals(pedido.getDelivery());
        if (ehDelivery) {
            // Delivery não se destina a mesa nenhuma.
            pedido.setNumeroMesa(null);
        } else if (pedido.getNumeroMesa() == null || pedido.getNumeroMesa() < 1 || pedido.getNumeroMesa() > 8) {
            throw new IllegalArgumentException("Número de mesa inválido (deve ser entre 1 e 8)");
        }

        pedido.setStatus(StatusPedido.AGUARDANDO_PREPARO);

        // Para cada item do pedido, verifica e debita as matérias-primas da receita
        for (ItemPedido it : pedido.getItens()) {
            Produto produto = produtoRepositorio.findById(it.getProduto().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado: " + it.getProduto().getId()));

            List<Receita> receita = receitaRepositorio.findByProduto(produto);
            if (receita.isEmpty()) {
                throw new IllegalArgumentException("Produto \"" + produto.getNome() + "\" não possui ficha técnica (receita) cadastrada. Cadastre a receita antes de vender.");
            }

            int qtdPedida = it.getQuantidade();

            // Primeira passada: validar se tem estoque suficiente de TODAS as matérias-primas
            for (Receita r : receita) {
                MateriaPrima mp = r.getMateriaPrima();
                BigDecimal qtdNecessaria = r.getQuantidade().multiply(BigDecimal.valueOf(qtdPedida));
                if (mp.getQuantidade().compareTo(qtdNecessaria) < 0) {
                    throw new IllegalArgumentException(
                            "Estoque insuficiente de " + mp.getNome() +
                            " (disponível: " + mp.getQuantidade() + " " + mp.getUnidade() +
                            ", necessário: " + qtdNecessaria + " " + mp.getUnidade() +
                            " para " + qtdPedida + "x " + produto.getNome() + ")"
                    );
                }
            }

            // Segunda passada: debitar efetivamente (só chega aqui se tudo passou na validação)
            for (Receita r : receita) {
                MateriaPrima mp = r.getMateriaPrima();
                BigDecimal qtdNecessaria = r.getQuantidade().multiply(BigDecimal.valueOf(qtdPedida));
                mp.setQuantidade(mp.getQuantidade().subtract(qtdNecessaria));
                materiaPrimaRepositorio.save(mp);
            }

            it.setProduto(produto);
            it.setPedido(pedido);
        }
        return pedidoRepositorio.save(pedido);
    }

    public List<Pedido> listarTodos() { return pedidoRepositorio.findAll(); }

    public List<Pedido> listarPorStatus(StatusPedido status) { return pedidoRepositorio.findByStatus(status); }

    public Optional<Pedido> buscar(Long id) { return pedidoRepositorio.findById(id); }

    /** Atualiza apenas o campo status do pedido (usado por Cozinha e Balcão). */
    @Transactional
    public Pedido atualizarStatus(Long id, StatusPedido status) {
        Pedido p = pedidoRepositorio.findById(id).orElseThrow();
        p.setStatus(status);
        return pedidoRepositorio.save(p);
    }

    /** Remove um pedido pelo id. Retorna false se o id não existir. */
    @Transactional
    public boolean remover(Long id) {
        if (!pedidoRepositorio.existsById(id)) return false;
        pedidoRepositorio.deleteById(id);
        return true;
    }

    /**
     * Remove todos os pedidos vinculados a um garçom.
     * Usado quando o gerente precisa excluir um garçom que já tem pedidos no histórico.
     */
    @Transactional
    public int removerPorGarcom(Long garcomId) {
        List<Pedido> pedidos = pedidoRepositorio.findByGarcom_Id(garcomId);
        pedidoRepositorio.deleteAll(pedidos);
        return pedidos.size();
    }
}