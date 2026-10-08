import React from 'react'
import { listarPedidos, atualizarStatusPedido, rotuloStatus } from '../api'
import IconeMoto from '../componentes/IconeMoto'

/**
 * Página do BALCÃO (caixa).
 * Mostra somente pedidos PRONTO_PARA_PAGAMENTO, com o total calculado.
 * Ao receber o pagamento, o operador clica em "Marcar Pago" e o pedido vai para PAGO.
 *
 * Também usa polling de 3s para se manter sincronizada com a cozinha.
 */
export default function Balcao(){
  const [pedidos, setPedidos] = React.useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)

  async function carregar(){
    const todos = await listarPedidos()
    setPedidos(todos.filter(p=> p.status==='PRONTO_PARA_PAGAMENTO'))
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(()=>{ carregar(); const t = setInterval(carregar,3000); return ()=>clearInterval(t); },[])

  async function pagar(id){
    await atualizarStatusPedido(id,'PAGO')
    carregar()
  }

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Balcão</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>
      {pedidos.length === 0 ? (
        <div className="stats-card">Nenhum pedido aguardando pagamento.</div>
      ) : (
        <div className="section-grid">
          {pedidos.map((p, idx)=> {
            const total = p.itens.reduce((s,it)=>s + it.produto.preco * it.quantidade,0)
            return (
              <div key={p.id} className="order-card">
                <div><strong>Pedido #{idx + 1}</strong></div>
                <div>Garçom: {p.garcom?.nome || 'Desconhecido'}</div>
                <div>Cliente: {p.cliente?.nome || 'Desconhecido'}</div>
                <div>{p.delivery ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f57c00', fontWeight: 'bold' }}>
                    <IconeMoto size={14} /> Delivery
                  </span>
                ) : `Mesa: ${p.numeroMesa || 'N/A'}`}</div>
                <div>Status: {rotuloStatus(p.status)}</div>
                <ul className="order-items">
                  {p.itens.map(it=> <li key={it.id}>{it.produto.nome} x{it.quantidade}</li>)}
                </ul>
                <div>Total: R$ {total.toFixed(2)}</div>
                <button className="action-button" onClick={()=>pagar(p.id)}>Marcar Pago</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
