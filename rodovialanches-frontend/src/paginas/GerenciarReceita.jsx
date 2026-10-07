import React from 'react'
import { buscarProdutos, buscarMateriasPrimas, buscarReceita, adicionarIngredienteReceita, atualizarIngredienteReceita, removerIngredienteReceita } from '../api'


/**
 * Página de GESTÃO DE FICHAS TÉCNICAS (RECEITAS).
 *
 * Visualização clara: lista todos os produtos com seus ingredientes.
 * Permite adicionar, editar e remover ingredientes de cada receita.
 * Mostra custo, margem e disponibilidade baseada no estoque atual.
 */
export default function GerenciarReceita() {
  const [produtos, setProdutos] = React.useState([])
  const [materiasPrimas, setMateriasPrimas] = React.useState([])
  const [receitas, setReceitas] = React.useState({}) // { produtoId: [ingredientes] }
  const [mensagem, setMensagem] = React.useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)
  const [expandedProduto, setExpandedProduto] = React.useState(null)
  const [novoIngredientePorProduto, setNovoIngredientePorProduto] = React.useState({}) // { produtoId: { materiaPrimaId, quantidade, observacao } }
  const [editandoItem, setEditandoItem] = React.useState(null) // { produtoId, receitaId, quantidade, observacao }


  // Carregar produtos e matérias-primas
  React.useEffect(() => {
    Promise.all([buscarProdutos(), buscarMateriasPrimas()]).then(([prods, mps]) => {
      setProdutos(prods)
      setMateriasPrimas(mps)
      // Carregar receita de cada produto
      Promise.all(prods.map(p => buscarReceita(p.id).then(r => ({ id: p.id, receita: r }))))
        .then(resultados => {
          const mapa = {}
          resultados.forEach(({ id, receita }) => { mapa[id] = receita })
          setReceitas(mapa)
          setUltimaAtualizacao(new Date().toLocaleTimeString())
        })
    })
  }, [])


  // Helpers
  const getMateriaPrima = (id) => materiasPrimas.find(m => m.id === id)


  const calcularCustoReceita = (produtoId) => {
    const receita = receitas[produtoId] || []
    return receita.reduce((total, item) => {
      const mp = getMateriaPrima(item.materiaPrimaId)
      if (mp && mp.precoCusto != null) {
        return total + (Number(item.quantidade) * Number(mp.precoCusto))
      }
      return total
    }, 0)
  }


  const calcularMaxProduzivel = (produtoId) => {
    const receita = receitas[produtoId] || []
    if (receita.length === 0) return 0
    let minProduzivel = Infinity
    receita.forEach(item => {
      const mp = getMateriaPrima(item.materiaPrimaId)
      if (!mp || mp.quantidade == null) { minProduzivel = 0; return }
      const qtdNecessaria = Number(item.quantidade)
      if (qtdNecessaria <= 0) return
      const podeProduzir = Math.floor(Number(mp.quantidade) / qtdNecessaria)
      if (podeProduzir < minProduzivel) minProduzivel = podeProduzir
    })
    return minProduzivel === Infinity ? 0 : minProduzivel
  }


  // Ações
  async function aoAdicionarIngrediente(produtoId, e) {
    e.preventDefault()
    const form = novoIngredientePorProduto[produtoId] || {}
    if (!form.materiaPrimaId || !form.quantidade) {
      setMensagem('Selecione a matéria-prima e informe a quantidade')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Adicionando ingrediente...')
      const resultado = await adicionarIngredienteReceita(produtoId, {
        materiaPrimaId: Number(form.materiaPrimaId),
        quantidade: Number(form.quantidade),
        observacao: form.observacao || undefined
      })
      if (resultado.ok) {
        setMensagem('Ingrediente adicionado!')
        setNovoIngredientePorProduto(prev => ({ ...prev, [produtoId]: { materiaPrimaId: '', quantidade: '', observacao: '' } }))
        // Recarregar receita
        const r = await buscarReceita(produtoId)
        setReceitas(prev => ({ ...prev, [produtoId]: r }))
      } else {
        setMensagem(resultado.message || 'Erro ao adicionar ingrediente')
      }
      setTimeout(() => setMensagem(''), 3000)
    } catch (error) {
      setMensagem('Erro ao adicionar ingrediente')
      setTimeout(() => setMensagem(''), 3000)
    }
  }


  const iniciarEdicao = (produtoId, item) => {
    setEditandoItem({ produtoId, receitaId: item.id, quantidade: String(item.quantidade), observacao: item.observacao || '' })
  }


  async function aoSalvarEdicao() {
    if (!editandoItem) return
    if (!editandoItem.quantidade || Number(editandoItem.quantidade) <= 0) {
      setMensagem('Quantidade deve ser maior que zero')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Atualizando ingrediente...')
      const resultado = await atualizarIngredienteReceita(editandoItem.produtoId, editandoItem.receitaId, {
        quantidade: Number(editandoItem.quantidade),
        observacao: editandoItem.observacao || undefined
      })
      if (resultado.ok) {
        setMensagem('Ingrediente atualizado!')
        setEditandoItem(null)
        const r = await buscarReceita(editandoItem.produtoId)
        setReceitas(prev => ({ ...prev, [editandoItem.produtoId]: r }))
      } else {
        setMensagem(resultado.message || 'Erro ao atualizar ingrediente')
      }
      setTimeout(() => setMensagem(''), 3000)
    } catch (error) {
      setMensagem('Erro ao atualizar ingrediente')
      setTimeout(() => setMensagem(''), 3000)
    }
  }


  const cancelarEdicao = () => setEditandoItem(null)


  async function aoRemoverIngrediente(produtoId, receitaId, mpNome) {
    if (!confirm(`Remover "${mpNome}" da receita?`)) return
    try {
      setMensagem('Removendo ingrediente...')
      const resultado = await removerIngredienteReceita(produtoId, receitaId)
      if (resultado.ok) {
        setMensagem('Ingrediente removido!')
        const r = await buscarReceita(produtoId)
        setReceitas(prev => ({ ...prev, [produtoId]: r }))
      } else {
        setMensagem(resultado.message || 'Erro ao remover ingrediente')
      }
      setTimeout(() => setMensagem(''), 3000)
    } catch (error) {
      setMensagem('Erro ao remover ingrediente')
      setTimeout(() => setMensagem(''), 3000)
    }
  }


  const toggleExpand = (produtoId) => {
    setExpandedProduto(prev => prev === produtoId ? null : produtoId)
  }


  const handleInputChange = (produtoId, field, value) => {
    setNovoIngredientePorProduto(prev => ({
      ...prev,
      [produtoId]: { ...(prev[produtoId] || {}), [field]: value }
    }))
  }


  const handleEditChange = (field, value) => {
    setEditandoItem(prev => prev ? { ...prev, [field]: value } : null)
  }


  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>📋 Fichas Técnicas (Receitas)</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>


      {/* MENSAGEM GLOBAL */}
      {mensagem && (
        <div className="stats-card" style={{ 
          background: mensagem.includes('Erro') ? '#ffebee' : '#e8f5e9',
          borderLeft: `4px solid ${mensagem.includes('Erro') ? '#d32f2f' : '#388e3c'}`,
          color: mensagem.includes('Erro') ? '#d32f2f' : '#388e3c'
        }}>
          {mensagem}
        </div>
      )}


      {/* LEGENDA */}
      <div className="stats-card" style={{ background: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
        <strong>Como funciona:</strong>
        <ul style={{ margin: '8px 0 0 20px', fontSize: '0.9rem' }}>
          <li>Cada <strong>Produto</strong> tem sua ficha técnica (receita) listada abaixo</li>
          <li>Ao vender 1 unidade do produto, o estoque das <strong>Matérias-Primas</strong> é baixado automaticamente</li>
          <li><strong>Disponível</strong> = quantas unidades dá pra produzir com o estoque atual (limitado pelo ingrediente mais escasso)</li>
          <li><strong>Margem</strong> = (Preço de venda - Custo dos ingredientes) / Preço de venda</li>
        </ul>
      </div>


      {/* LISTA DE PRODUTOS COM RECEITAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {produtos.length === 0 ? (
          <div className="stats-card" style={{ textAlign: 'center' }}>
            Nenhum produto cadastrado. Cadastre produtos na aba <strong>Gerente</strong>.
          </div>
        ) : (
          produtos.map(produto => {
            const receita = receitas[produto.id] || []
            const temReceita = receita.length > 0
            const custo = calcularCustoReceita(produto.id)
            const margem = custo > 0 ? (((produto.preco - custo) / produto.preco) * 100).toFixed(1) : null
            const maxProduzivel = calcularMaxProduzivel(produto.id)
            const isExpanded = expandedProduto === produto.id
            const semEstoque = maxProduzivel === 0


            return (
              <div key={produto.id} className="product-card" style={{ 
                borderLeft: !temReceita ? '4px solid #f57c00' : semEstoque ? '4px solid #d32f2f' : '4px solid #388e3c',
                transition: 'all 0.2s'
              }}>
                {/* CABEÇALHO DO PRODUTO - SEMPRE VISÍVEL */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: isExpanded ? '0 0 12px 0' : 0,
                  borderBottom: isExpanded ? '1px solid #eee' : 'none',
                  marginBottom: isExpanded ? '12px' : 0
                }} onClick={() => toggleExpand(produto.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '1.5rem' }}>{isExpanded ? '▼' : '▶'}</span>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>{produto.nome}</strong>
                      <span style={{ marginLeft: '8px', color: '#666', fontSize: '0.9rem' }}>R$ {produto.preco.toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.9rem' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontWeight: 'bold',
                      background: !temReceita ? '#fff3e0' : semEstoque ? '#ffebee' : '#e8f5e9',
                      color: !temReceita ? '#f57c00' : semEstoque ? '#d32f2f' : '#388e3c'
                    }}>
                      {temReceita ? (semEstoque ? '⚠ Indisponível' : `✓ Disponível: ${maxProduzivel}`) : '⚠ Sem ficha técnica'}
                    </span>
                    {temReceita && (
                      <>
                        <span><strong>Custo:</strong> R$ {custo.toFixed(2)}</span>
                        {margem !== null && (
                          <span style={{ 
                            color: margem >= 30 ? '#388e3c' : margem >= 15 ? '#f57c00' : '#d32f2f',
                            fontWeight: 'bold'
                          }}>
                            <strong>Margem:</strong> {margem}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>


                {/* CONTEÚDO EXPANDIDO - INGREDIENTES + FORMULÁRIO */}
                {isExpanded && (
                  <div style={{ animation: 'slideDown 0.2s ease' }}>
                    {/* FORMULÁRIO ADICIONAR INGREDIENTE */}
                    <div style={{ 
                      background: '#fafafa', 
                      padding: '16px', 
                      borderRadius: '8px', 
                      marginBottom: '16px',
                      border: '1px dashed #ddd'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>➕ Adicionar Ingrediente</h4>
                      <form onSubmit={e => aoAdicionarIngrediente(produto.id, e)} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Matéria-Prima</label>
                          <select
                            value={novoIngredientePorProduto[produto.id]?.materiaPrimaId || ''}
                            onChange={e => handleInputChange(produto.id, 'materiaPrimaId', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
                          >
                            <option value="">-- selecione --</option>
                            {materiasPrimas.map(mp => (
                              <option key={mp.id} value={mp.id}>
                                {mp.nome} ({mp.unidade}) — Estoque: {Number(mp.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ minWidth: '100px' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Qtd/unidade</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={novoIngredientePorProduto[produto.id]?.quantidade || ''}
                            onChange={e => handleInputChange(produto.id, 'quantidade', e.target.value)}
                            placeholder="Ex: 150"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
                          />
                        </div>
                        <div style={{ minWidth: '80px' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Unidade</label>
                          <input
                            type="text"
                            value={getMateriaPrima(novoIngredientePorProduto[produto.id]?.materiaPrimaId)?.unidade || ''}
                            readOnly
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff', background: '#f5f5f5' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Observação (opcional)</label>
                          <input
                            type="text"
                            value={novoIngredientePorProduto[produto.id]?.observacao || ''}
                            onChange={e => handleInputChange(produto.id, 'observacao', e.target.value)}
                            placeholder="Ex: cortar ao meio"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
                          />
                        </div>
                        <button 
                          type="submit" 
                          className="action-button"
                          disabled={!novoIngredientePorProduto[produto.id]?.materiaPrimaId || !novoIngredientePorProduto[produto.id]?.quantidade}
                          style={{ height: 'fit-content' }}
                        >
                          Adicionar
                        </button>
                      </form>
                    </div>


                    {/* LISTA DE INGREDIENTES DA RECEITA */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>
                        {temReceita ? `📝 Ingredientes da Receita (${receita.length})` : '⚠ Nenhum ingrediente cadastrado'}
                      </h4>
                      
                      {temReceita ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {receita.map((item, idx) => {
                            const mp = getMateriaPrima(item.materiaPrimaId)
                            const custoItem = mp && mp.precoCusto != null ? (Number(item.quantidade) * Number(mp.precoCusto)) : 0
                            const estoqueDisponivel = mp ? Number(mp.quantidade) : 0
                            const qtdNecessaria = Number(item.quantidade)
                            const maxUnidades = qtdNecessaria > 0 ? Math.floor(estoqueDisponivel / qtdNecessaria) : 0
                            const isEditing = editandoItem?.receitaId === item.id


                            return (
                              <div key={item.id} className="product-card" style={{ 
                                background: isEditing ? '#e3f2fd' : 'white',
                                borderLeft: isEditing ? '4px solid #1976d2' : (maxUnidades === 0 ? '4px solid #d32f2f' : '4px solid #4caf50'),
                                padding: '12px'
                              }}>
                                {isEditing ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <strong>Editando: {mp?.nome || 'Ingrediente'}</strong>
                                      <button className="secondary" onClick={cancelarEdicao} style={{ padding: '4px 8px', fontSize: '0.85rem' }}>Cancelar</button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
                                      <div style={{ flex: 1, minWidth: '120px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Qtd/unidade ({mp?.unidade})</label>
                                        <input
                                          type="number"
                                          step="0.001"
                                          min="0.001"
                                          value={editandoItem.quantidade}
                                          onChange={e => handleEditChange('quantidade', e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); aoSalvarEdicao() } if (e.key === 'Escape') { e.preventDefault(); cancelarEdicao() } }}
                                          autoFocus
                                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
                                        />
                                      </div>
                                      <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Observação</label>
                                        <input
                                          type="text"
                                          value={editandoItem.observacao}
                                          onChange={e => handleEditChange('observacao', e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); aoSalvarEdicao() } if (e.key === 'Escape') { e.preventDefault(); cancelarEdicao() } }}
                                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
                                        />
                                      </div>
                                      <button className="action-button" onClick={aoSalvarEdicao} style={{ height: 'fit-content', background: '#388e3c' }}>Salvar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                      <div style={{ flex: 1, minWidth: '200px' }}>
                                        <strong style={{ fontSize: '1rem' }}>{mp?.nome || 'Ingrediente'}</strong>
                                        {item.observacao && <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>"{item.observacao}"</div>}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px', textAlign: 'right' }}>
                                        <span><strong>Qtd/unidade:</strong> {Number(item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {mp?.unidade || ''}</span>
                                        <span><strong>Custo:</strong> R$ {custoItem.toFixed(2)}</span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px', textAlign: 'right' }}>
                                        <span><strong>Estoque:</strong> {estoqueDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {mp?.unidade || ''}</span>
                                        <span style={{ 
                                          color: maxUnidades === 0 ? '#d32f2f' : maxUnidades < 10 ? '#f57c00' : '#388e3c',
                                          fontWeight: 'bold'
                                        }}>
                                          <strong>Produz até:</strong> {maxUnidades} un.
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button className="secondary" onClick={() => iniciarEdicao(produto.id, item)} style={{ padding: '6px 12px' }}>✏️ Editar</button>
                                        <button className="secondary" onClick={() => aoRemoverIngrediente(produto.id, item.id, mp?.nome || 'Ingrediente')} style={{ padding: '6px 12px', background: '#d32f2f', color: 'white' }}>🗑️ Remover</button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="stats-card" style={{ textAlign: 'center', padding: '20px', color: '#f57c00' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠</div>
                          <strong>Este produto não tem ficha técnica cadastrada</strong>
                          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                            Adicione os ingredientes acima para poder vender este produto.<br/>
                            Sem ficha técnica, o sistema não sabe quais matérias-primas baixar no estoque.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
        )}))}
      </div>


      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}