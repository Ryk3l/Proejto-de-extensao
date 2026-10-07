package com.rodovialanches.modelo;

/**
 * Estados possíveis de um pedido ao longo do seu ciclo de vida.
 *
 * Fluxo normal:
 *   NOVO -> AGUARDANDO_PREPARO -> EM_PREPARO -> PRONTO_PARA_PAGAMENTO -> PAGO
 * O estado CANCELADO pode ocorrer a qualquer momento antes do pagamento.
 */
public enum StatusPedido {
    NOVO,
    AGUARDANDO_PREPARO,
    EM_PREPARO,
    PRONTO_PARA_PAGAMENTO,
    PAGO,
    CANCELADO
}
