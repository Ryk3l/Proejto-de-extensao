import React from 'react'
import { buscarMateriasPrimas, criarMateriaPrima, atualizarMateriaPrima, removerMateriaPrima, definirQuantidadeMateriaPrima } from '../api'

/**
 * Página DE CADASTRO DE MATÉRIAS-PRIMAS (CRUD completo).
 *
 * CREATE — cadastra nova matéria-prima (nome, unidade, estoque inicial, custo unitário).
 * READ   — lista todas com estoque, custo unitário e valor total em estoque.
 * UPDATE — edita nome, unidade, custo unitário e a QUANTIDADE EM ESTOQUE direto
 *          (o PUT principal não altera quantidade; usa-se o endpoint próprio).
 * DELETE — remove matéria-prima (bloqueado se usada em alguma receita).
 */
export default function CadastroMateriasPrimas() {
  const [materias, setMaterias] = React.useState([])
  const [formulario, setFormulario] = React.useState({ nome: '', unidade: 'UN', quantidade: '', precoCusto: '' })
  const [mensagem, setMensagem] = React.useState('')
  const [editandoId, setEditandoId] = React.useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)

  // READ
  async function carregarMaterias() {
    const lista = await buscarMateriasPrimas()
    setMaterias(lista)
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(() => {
    carregarMaterias()
  }, [])

  // CREATE
  async function aoCriar(e) {
    e.preventDefault()
    if (!formulario.nome.trim() || !formulario.unidade.trim()) {
      setMensagem('Por favor, informe nome e unidade')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Cadastrando matéria-prima...')
      const quantidade = formulario.quantidade === '' ? 0 : Number(formulario.quantidade)
      const precoCusto = formulario.precoCusto === '' ? null : Number(formulario.precoCusto)
      const resultado = await criarMateriaPrima({
        nome: formulario.nome,
        unidade: formulario.unidade.toUpperCase(),
        quantidade,
        precoCusto
      })
      if (resultado.ok) {
        setFormulario({ nome: '', unidade: 'UN', quantidade: '', precoCusto: '' })
        setMensagem('Matéria-prima cadastrada com sucesso!')
        carregarMaterias()
      } else {
        setMensagem(resultado.message || 'Erro ao cadastrar matéria-prima')
      }
      setTimeout(() => setMensagem(''), 3000)
    } catch (error) {
      setMensagem('Erro ao cadastrar matéria-prima')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  // UPDATE — dados cadastrais + estoque (alteração direta da quantidade)
  async function aoAtualizar(e) {
    e.preventDefault()
    if (!formulario.nome.trim() || !formulario.unidade.trim()) {
      setMensagem('Por favor, informe nome e unidade')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    const quantidade = Number(formulario.quantidade)
    if (formulario.quantidade === '' || Number.isNaN(quantidade) || quantidade < 0) {
      setMensagem('Informe um estoque válido (0 ou maior)')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Atualizando matéria-prima...')
      const precoCusto = formulario.precoCusto === '' ? null : Number(formulario.precoCusto)
      const resultado = await atualizarMateriaPrima(editandoId, {
        nome: formulario.nome,
        unidade: formulario.unidade.toUpperCase(),
        precoCusto
      })
      if (resultado.ok) {
        // O PUT principal não altera quantidade — usa o endpoint próprio de estoque.
        const estoque = await definirQuantidadeMateriaPrima(editandoId, quantidade)
        if (!estoque.ok) {
          setMensagem(estoque.message || 'Erro ao atualizar o estoque')
          carregarMaterias()
          setTimeout(() => setMensagem(''), 4000)
          return
        }
        setFormulario({ nome: '', unidade: 'UN', quantidade: '', precoCusto: '' })
        setEditandoId(null)
        setMensagem('Matéria-prima atualizada com sucesso!')
        carregarMaterias()
      } else {
        setMensagem(resultado.message || 'Erro ao atualizar matéria-prima')
      }
      setTimeout(() => setMensagem(''), 3000)
    } catch (error) {
      setMensagem('Erro ao atualizar matéria-prima')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  // DELETE
  async function aoRemover(id, nome) {
    if (confirm(`Tem certeza que deseja remover "${nome}"?`)) {
      try {
        setMensagem('Removendo matéria-prima...')
        const resultado = await removerMateriaPrima(id)
        if (resultado.ok) {
          setMensagem('Matéria-prima removida com sucesso!')
          carregarMaterias()
        } else {
          setMensagem(resultado.message || 'Erro ao remover matéria-prima')
        }
        setTimeout(() => setMensagem(''), 4000)
      } catch (error) {
        setMensagem('Erro ao remover matéria-prima')
        setTimeout(() => setMensagem(''), 4000)
      }
    }
  }

  const aoMudarInput = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value })
  }

  const iniciarEdicao = (mp) => {
    setEditandoId(mp.id)
    setFormulario({ nome: mp.nome, unidade: mp.unidade, quantidade: String(mp.quantidade), precoCusto: mp.precoCusto ? String(mp.precoCusto) : '' })
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setFormulario({ nome: '', unidade: 'UN', quantidade: '', precoCusto: '' })
  }

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Matérias-Primas / Insumos</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>

      {/* CREATE/UPDATE */}
      <div className="stats-card">
        <h3>{editandoId ? 'Editar Matéria-Prima' : 'Nova Matéria-Prima'}</h3>
        <form onSubmit={editandoId ? aoAtualizar : aoCriar}>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <label>
              Nome
              <input
                type="text"
                name="nome"
                value={formulario.nome}
                onChange={aoMudarInput}
                placeholder="Ex: Pão de hambúrguer"
                style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
              />
            </label>
            <label>
              Unidade
              <select
                name="unidade"
                value={formulario.unidade}
                onChange={aoMudarInput}
                style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
              >
                <option value="UN">UN (unidade)</option>
                <option value="KG">KG (quilograma)</option>
                <option value="G">G (grama)</option>
                <option value="L">L (litro)</option>
                <option value="ML">ML (mililitro)</option>
              </select>
            </label>
            <label>
              {editandoId ? 'Quantidade em estoque' : 'Estoque inicial'}
              <input
                type="number"
                step="0.001"
                min="0"
                name="quantidade"
                value={formulario.quantidade}
                onChange={aoMudarInput}
                placeholder="0"
                style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
              />
            </label>
            <label>
              Custo unitário (R$ / {formulario.unidade})
              <input
                type="number"
                step="0.01"
                min="0"
                name="precoCusto"
                value={formulario.precoCusto}
                onChange={aoMudarInput}
                placeholder="0,00"
                style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="submit" className="action-button" disabled={!formulario.nome.trim() || !formulario.unidade.trim()}>
              {editandoId ? 'Atualizar' : 'Cadastrar'}
            </button>
            {editandoId && (
              <button type="button" className="action-button secondary" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </div>
          {mensagem && <div style={{ marginTop: '12px', color: mensagem.includes('Erro') ? '#d32f2f' : '#388e3c' }}>{mensagem}</div>}
        </form>
      </div>

      {/* READ */}
      <div>
        <h3>Matérias-Primas Cadastradas</h3>
        {materias.length === 0 ? (
          <div className="stats-card">Nenhuma matéria-prima cadastrada.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {materias.map((mp, idx) => (
              <div key={mp.id} className="product-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <strong>#{idx + 1} {mp.nome}</strong>
                  <span className="badge">{mp.unidade}</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '8px 0', color: mp.quantidade <= 0 ? '#d32f2f' : '#2e7d32' }}>
                  Estoque: {Number(mp.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {mp.unidade}
                </div>
                {mp.precoCusto != null && (
                  <>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Custo unitário: R$ {Number(mp.precoCusto).toFixed(2)} / {mp.unidade}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Custo total em estoque: R$ {(Number(mp.quantidade) * Number(mp.precoCusto)).toFixed(2)}
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="action-button secondary"
                    onClick={() => iniciarEdicao(mp)}
                    style={{ flex: 1, minWidth: '80px' }}
                  >
                    Editar
                  </button>
                  <button
                    className="action-button secondary"
                    onClick={() => aoRemover(mp.id, mp.nome)}
                    style={{ flex: 1, minWidth: '80px', background: '#d32f2f' }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
