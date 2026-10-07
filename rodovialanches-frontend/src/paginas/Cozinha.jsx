import React from 'react'
import { listarPedidos, atualizarStatusPedido, rotuloStatus } from '../api'

/**
 * Página da COZINHA.
 * Mostra todos os pedidos que estão em AGUARDANDO_PREPARO ou EM_PREPARO.
 * Quando a comida fica pronta, o cozinheiro clica em "Marcar Pronto" e o
 * pedido sobe para o status PRONTO_PARA_PAGAMENTO (vai para a tela do Balcão/Garçom).
 *
 * A lista é atualizada a cada 3 segundos (polling), evitando precisar de WebSocket.
 */
export default function Cozinha(){
  const [pedidos, setPedidos] = React.useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)

  async function carregar(){
    const todos = await listarPedidos()
    setPedidos(todos.filter(p=> p.status==='AGUARDANDO_PREPARO' || p.status==='EM_PREPARO'))
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(()=>{ carregar(); const t = setInterval(carregar,3000); return ()=>clearInterval(t); },[])

  async function marcarPronto(id){
    await atualizarStatusPedido(id,'PRONTO_PARA_PAGAMENTO')
    carregar()
  }

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Cozinha</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>
      {pedidos.length === 0 ? (
        <div className="stats-card">Nenhum pedido aguardando preparação.</div>
      ) : (
        <div className="section-grid">
          {pedidos.map((p, idx)=> (
            <div key={p.id} className="order-card">
              <div><strong>Pedido #{idx + 1}</strong> - {p.garcom?.nome || 'Garçom'}{p.numeroMesa ? ` - Mesa ${p.numeroMesa}` : ''}</div>
              <div className="badge">{rotuloStatus(p.status)}</div>
              <ul className="order-items">
                {p.itens.map(it=> <li key={it.id}>{it.produto.nome} x{it.quantidade}</li>)}
              </ul>
              <div>
                <button className="action-button" onClick={()=>marcarPronto(p.id)}>Marcar Pronto</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
