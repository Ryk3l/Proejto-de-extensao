import React from 'react'
import { listarPedidos, buscarProdutosComDisponibilidade, removerPedido, removerProduto, criarProduto, atualizarProduto, rotuloStatus } from '../api'

/**
 * Página do GERENTE.
 *
 * Centraliza a visão administrativa:
 *  - Painel de estatísticas (totais por status).
 *  - Filtro por data (de / até) sobre os pedidos.
 *  - Lista de todos os pedidos com botão de excluir individualmente.
 *  - Cadastro/edição/remoção de produtos (CRUD do cardápio).
 *  - Navegação clara para Matérias-Primas e Fichas Técnicas.
 *
 * Atualização automática a cada 3 segundos.
 * NOTA: Produtos não têm mais estoque próprio. A disponibilidade é calculada
 * automaticamente baseada nas Fichas Técnicas + estoque de Matérias-Primas.
 */
export default function Gerente(){
  const [pedidos, setPedidos] = React.useState([])
  const [produtos, setProdutos] = React.useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)
  const [mensagem, setMensagem] = React.useState('')
  const [novoProduto, setNovoProduto] = React.useState({ nome: '', preco: '' })
  const [produtoEmEdicaoId, setProdutoEmEdicaoId] = React.useState(null)
  const [edicaoNome, setEdicaoNome] = React.useState('')
  const [edicaoPreco, setEdicaoPreco] = React.useState('')
  const [filtroDataDe, setFiltroDataDe] = React.useState('')
  const [filtroDataAte, setFiltroDataAte] = React.useState('')

  async function carregar(){
    const [todosPedidos, todosProdutos] = await Promise.all([listarPedidos(), buscarProdutosComDisponibilidade()])
    setPedidos([...todosPedidos].sort((a, b) => a.id - b.id))
    setProdutos([...todosProdutos].sort((a, b) => a.id - b.id))
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(()=>{ carregar(); const t = setInterval(carregar,3000); return ()=>clearInterval(t); },[])

  async function aoExcluirPedido(id, posicao){
    if (!confirm(`Excluir definitivamente o pedido #${posicao}?`)) return
    const resultado = await removerPedido(id)
    if (resultado.ok) {
      setMensagem(`Pedido #${posicao} removido.`)
      carregar()
    } else {
      setMensagem(resultado.message || 'Erro ao remover pedido')
    }
    setTimeout(()=>setMensagem(''), 4000)
  }

  async function aoExcluirProduto(produtoId, nome){
    if (!confirm(`Excluir definitivamente o produto "${nome}"?`)) return
    const resultado = await removerProduto(produtoId)
    if (resultado.ok) {
      setMensagem(`Produto "${nome}" removido.`)
      carregar()
    } else {
      setMensagem(resultado.message || 'Erro ao remover produto')
    }
    setTimeout(()=>setMensagem(''), 4000)
  }

  function iniciarEdicaoProduto(produto){
    setProdutoEmEdicaoId(produto.id)
    setEdicaoNome(produto.nome)
    setEdicaoPreco(String(produto.preco ?? ''))
  }

  function cancelarEdicaoProduto(){
    setProdutoEmEdicaoId(null)
    setEdicaoNome('')
    setEdicaoPreco('')
  }

  async function salvarEdicaoProduto(produtoId){
    const nome = edicaoNome.trim()
    const preco = Number(edicaoPreco)
    if (!nome) {
      setMensagem('Nome não pode ficar vazio.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    if (edicaoPreco === '' || Number.isNaN(preco) || preco < 0) {
      setMensagem('Preço inválido.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    const resultadoUpdate = await atualizarProduto(produtoId, { nome, preco })
    if (!resultadoUpdate.ok) {
      setMensagem(resultadoUpdate.message || 'Erro ao atualizar produto')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    cancelarEdicaoProduto()
    carregar()
  }

  async function aoCriarProduto(e){
    e.preventDefault()
    const nome = novoProduto.nome.trim()
    const preco = Number(novoProduto.preco)
    if (!nome) {
      setMensagem('Nome do produto é obrigatório.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    if (Number.isNaN(preco) || preco < 0) {
      setMensagem('Preço inválido.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    const resultado = await criarProduto({ nome, preco })
    if (resultado.ok) {
      setMensagem(`Produto "${nome}" cadastrado.`)
      setNovoProduto({ nome: '', preco: '' })
      carregar()
    } else {
      setMensagem(resultado.message || 'Erro ao cadastrar produto')
    }
    setTimeout(()=>setMensagem(''), 3000)
  }

  function obterDataPedido(pedido){
    if (!pedido.criadoEm) return null
    const d = new Date(pedido.criadoEm)
    return Number.isNaN(d.getTime()) ? null : d
  }

  function formatarDataPedido(pedido){
    const d = obterDataPedido(pedido)
    if (!d) return '-'
    return d.toLocaleString('pt-BR')
  }

  const pedidosFiltrados = pedidos.filter(p => {
    const d = obterDataPedido(p)
    if (!d) return !filtroDataDe && !filtroDataAte
    if (filtroDataDe) {
      const de = new Date(filtroDataDe + 'T00:00:00')
      if (d < de) return false
    }
    if (filtroDataAte) {
      const ate = new Date(filtroDataAte + 'T23:59:59.999')
      if (d > ate) return false
    }
    return true
  })

  const resumo = pedidosFiltrados.reduce((acc, pedido) => {
    acc[pedido.status] = (acc[pedido.status] || 0) + 1
    return acc
  }, {})

  // Navegação usando o hash da URL (compatível com o App.jsx)
  const navegarPara = (pagina) => {
    window.location.hash = pagina
  }

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>👨‍💼 Gerente</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>

      {/* ===== NAVEGAÇÃO RÁPIDA - DESTAQUE VISUAL ===== */}
      <div className="stats-card" style={{ 
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        border: '2px solid #ddd',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>🚀 Ações Rápidas de Estoque</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
              Gerencie insumos e fichas técnicas para controlar a disponibilidade dos produtos
            </p>
          </div>
          <button
            type="button"
            className="action-button"
            style={{ 
              background: '#1976d2', 
              color: 'white', 
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
            }}
            onClick={() => navegarPara('cadastro-materias-primas')}
          >
            📦 Matérias-Primas / Insumos
          </button>
          <button
            type="button"
            className="action-button"
            style={{ 
              background: '#7b1fa2', 
              color: 'white', 
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(123, 31, 162, 0.3)'
            }}
            onClick={() => navegarPara('gerenciar-receita')}
          >
            📋 Fichas Técnicas (Receitas)
          </button>
        </div>
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #ccc', fontSize: '0.8rem', color: '#888' }}>
          💡 <strong>Dica:</strong> Use as abas no topo da tela ("Matérias-Primas" e "Fichas Técnicas") 
          ou clique nos botões acima. O fluxo ideal: 1️⃣ Cadastre insumos → 2️⃣ Monte as receitas → 3️⃣ Venda!
        </div>
      </div>

      {mensagem && (
        <div className="stats-card" style={{ 
          background: mensagem.includes('Erro') ? '#ffebee' : '#e8f5e9',
          borderLeft: `4px solid ${mensagem.includes('Erro') ? '#d32f2f' : '#388e3c'}`,
          color: mensagem.includes('Erro') ? '#d32f2f' : '#388e3c'
        }}>
          {mensagem}
        </div>
      )}

      {/* ===== ESTATÍSTICAS DE PEDIDOS ===== */}
      <div className="stats-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1976d2' }}>
              {pedidosFiltrados.length} pedidos
            </div>
            {(filtroDataDe || filtroDataAte) && (
              <div style={{ fontSize: '0.85rem', color: '#666' }}>de {pedidos.length} no total</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(resumo).map(([chaveStatus, qtd]) => (
              <span key={chaveStatus} style={{ 
                background: '#e3f2fd', 
                color: '#1976d2', 
                padding: '4px 10px', 
                borderRadius: '12px', 
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}>
                {rotuloStatus(chaveStatus)}: {qtd}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== PEDIDOS ===== */}
      <div>
        <h3>📋 Pedidos</h3>
        <div className="stats-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
            De
            <input
              type="date"
              value={filtroDataDe}
              onChange={e=>setFiltroDataDe(e.target.value)}
              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #dbe4ff', marginTop: '4px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
            Até
            <input
              type="date"
              value={filtroDataAte}
              onChange={e=>setFiltroDataAte(e.target.value)}
              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #dbe4ff', marginTop: '4px' }}
            />
          </label>
          <button
            type="button"
            className="action-button secondary"
            onClick={()=>{ setFiltroDataDe(''); setFiltroDataAte('') }}
            disabled={!filtroDataDe && !filtroDataAte}
          >
            Limpar filtro
          </button>
        </div>
        {pedidosFiltrados.length === 0 ? (
          <div className="stats-card" style={{ textAlign: 'center', color: '#666' }}>
            {pedidos.length === 0 ? 'Nenhum pedido registrado.' : 'Nenhum pedido no período selecionado.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {pedidosFiltrados.map((p, idx) => {
              const total = (p.itens || []).reduce((soma, it) => soma + it.produto.preco * it.quantidade, 0)
              const statusColor = {
                'NOVO': '#2196f3',
                'AGUARDANDO_PREPARO': '#ff9800',
                'EM_PREPARO': '#ff5722',
                'PRONTO_PARA_PAGAMENTO': '#4caf50',
                'PAGO': '#388e3c',
                'CANCELADO': '#d32f2f'
              }[p.status] || '#666'
              return (
                <div key={p.id} className="order-card" style={{ borderLeft: `4px solid ${statusColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Pedido #{idx + 1}</strong>
                    <span style={{ 
                      background: statusColor, 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {rotuloStatus(p.status)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    Data: {formatarDataPedido(p)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginTop: '8px', fontSize: '0.85rem' }}>
                    <div>Mesa: <strong>{p.numeroMesa ?? 'N/A'}</strong></div>
                    <div>Garçom: <strong>{p.garcom?.nome || '-'}</strong></div>
                    <div>Cliente: <strong>{p.cliente?.nome || '-'}</strong></div>
                    <div>Total: <strong style={{ color: '#1976d2' }}>R$ {total.toFixed(2)}</strong></div>
                  </div>
                  <ul className="order-items" style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                    {(p.itens || []).map(it => <li key={it.id}>{it.produto.nome} x{it.quantidade}</li>)}
                  </ul>
                  <button
                    className="action-button"
                    onClick={() => aoExcluirPedido(p.id, idx + 1)}
                    style={{ background: '#d32f2f', marginTop: '8px', width: '100%' }}
                  >
                    🗑️ Excluir pedido
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== CADASTRAR NOVO PRODUTO ===== */}
      <div>
        <h3>➕ Cadastrar novo produto</h3>
        <form onSubmit={aoCriarProduto} className="stats-card" style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
          <label>
            Nome do produto
            <input
              type="text"
              value={novoProduto.nome}
              onChange={e=>setNovoProduto({...novoProduto, nome: e.target.value})}
              placeholder="Ex: X-Bacon, Batata Grande, Suco Natural"
              style={{ display: 'block', width: '100%', marginTop: '4px', padding: '10px', borderRadius: '8px', border: '1px solid #dbe4ff' }}
            />
          </label>
          <label>
            Preço de venda (R$)
            <input
              type="number"
              step="0.01"
              min="0"
              value={novoProduto.preco}
              onChange={e=>setNovoProduto({...novoProduto, preco: e.target.value})}
              placeholder="0,00"
              style={{ display: 'block', width: '100%', marginTop: '4px', padding: '10px', borderRadius: '8px', border: '1px solid #dbe4ff' }}
            />
          </label>
          <button type="submit" className="action-button" style={{ height: 'fit-content', padding: '10px 20px', fontSize: '1rem' }}>
            ✅ Cadastrar produto
          </button>
        </form>
      </div>

      {/* ===== PRODUTOS DO CARDÁPIO ===== */}
      <div>
        <h3>🍔 Produtos do Cardápio</h3>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {produtos.length === 0 ? (
            <div className="stats-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>
              Nenhum produto cadastrado. Use o formulário acima para criar o primeiro.
            </div>
          ) : (
            produtos.map(p=> {
              const qtdDisponivel = p.quantidadeDisponivel ?? 0
              const temReceita = p.temReceita ?? false
              const semEstoque = qtdDisponivel <= 0
              const semReceita = !temReceita

              let statusBadge, statusColor, statusIcon
              if (semReceita) {
                statusBadge = '⚠ Sem ficha técnica'
                statusColor = '#f57c00'
                statusIcon = '⚠️'
              } else if (semEstoque) {
                statusBadge = 'Indisponível (estoque 0)'
                statusColor = '#d32f2f'
                statusIcon = '🚫'
              } else {
                statusBadge = `Disponível: ${qtdDisponivel} un.`
                statusColor = '#388e3c'
                statusIcon = '✅'
              }

              return (
                <div key={p.id} className="product-card" style={{ 
                  borderLeft: `4px solid ${statusColor}`,
                  position: 'relative'
                }}>
                  {/* BADGE DE STATUS NO CANTO */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px',
                    background: statusColor,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    {statusIcon}
                  </div>

                  {produtoEmEdicaoId === p.id ? (
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '8px', marginTop: '20px' }}>
                      <label style={{ fontSize: '0.85rem' }}>
                        Nome
                        <input
                          type="text"
                          value={edicaoNome}
                          onChange={e=>setEdicaoNome(e.target.value)}
                          onKeyDown={e=>{
                            if (e.key === 'Enter') { e.preventDefault(); salvarEdicaoProduto(p.id) }
                            if (e.key === 'Escape') { e.preventDefault(); cancelarEdicaoProduto() }
                          }}
                          autoFocus
                          style={{ display: 'block', width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff', marginTop: '2px' }}
                        />
                      </label>
                      <label style={{ fontSize: '0.85rem' }}>
                        Preço (R$)
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={edicaoPreco}
                          onChange={e=>setEdicaoPreco(e.target.value)}
                          onKeyDown={e=>{
                            if (e.key === 'Enter') { e.preventDefault(); salvarEdicaoProduto(p.id) }
                            if (e.key === 'Escape') { e.preventDefault(); cancelarEdicaoProduto() }
                          }}
                          style={{ display: 'block', width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff', marginTop: '2px' }}
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="secondary" onClick={()=>salvarEdicaoProduto(p.id)} style={{ flex: 1 }}>✅ Salvar</button>
                        <button className="secondary" onClick={cancelarEdicaoProduto} style={{ flex: 1 }}>❌ Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{p.nome}</strong>
                        <button className="secondary" onClick={()=>iniciarEdicaoProduto(p)} style={{ padding: '6px 12px' }}>✏️ Editar</button>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1976d2', margin: '8px 0' }}>
                        R$ {p.preco.toFixed(2)}
                      </div>
                      <div style={{ 
                        color: statusColor, 
                        fontWeight: 'bold',
                        padding: '8px',
                        background: statusColor + '15',
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        {statusIcon} {statusBadge}
                      </div>
                      {semReceita && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px', 
                          background: '#fff3e0', 
                          borderRadius: '6px',
                          border: '1px solid #ffcc80',
                          fontSize: '0.8rem',
                          color: '#e65100'
                        }}>
                          ⚠ <strong>Este produto não pode ser vendido!</strong><br/>
                          Clique em <strong>"Fichas Técnicas"</strong> acima e cadastre os ingredientes.
                        </div>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => aoExcluirProduto(p.id, p.nome)}
                    style={{ marginTop: '12px', background: '#d32f2f', width: '100%' }}
                  >
                    🗑️ Excluir produto
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}