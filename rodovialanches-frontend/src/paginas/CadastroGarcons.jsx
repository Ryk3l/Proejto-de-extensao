import React from 'react'
import { buscarUsuarios, criarUsuario, atualizarUsuario, removerUsuario } from '../api'

/**
 * Página de CADASTRO DE GARÇONS (CRUD completo).
 *
 * CREATE — cadastra novo garçom (papel="GARCOM").
 * READ   — lista todos os usuários filtrados por papel="GARCOM".
 * UPDATE — edita o nome de um garçom existente.
 * DELETE — remove garçom (backend bloqueia se tiver pedidos vinculados).
 */
export default function CadastroGarcons() {
  const [garcons, setGarcons] = React.useState([])
  const [formulario, setFormulario] = React.useState({ nome: '' })
  const [mensagem, setMensagem] = React.useState('')
  const [editandoId, setEditandoId] = React.useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)

  // READ
  async function carregarGarcons() {
    const todos = await buscarUsuarios()
    const lista = todos.filter(u => u.papel === 'GARCOM')
    setGarcons(lista)
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(() => {
    carregarGarcons()
  }, [])

  // CREATE
  async function aoCriar(e) {
    e.preventDefault()
    if (!formulario.nome.trim()) {
      setMensagem('Por favor, digite um nome')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Cadastrando garçom...')
      const resultado = await criarUsuario({ nome: formulario.nome, papel: 'GARCOM' })
      if (resultado.ok) {
        setFormulario({ nome: '' })
        setMensagem('Garçom cadastrado com sucesso!')
        carregarGarcons()
      } else {
        setMensagem(resultado.message || 'Erro ao cadastrar garçom')
      }
      setTimeout(() => setMensagem(''), 3000)
    } catch (error) {
      setMensagem('Erro ao cadastrar garçom')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  // UPDATE
  async function aoAtualizar(e) {
    e.preventDefault()
    if (!formulario.nome.trim()) {
      setMensagem('Por favor, digite um nome')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Atualizando garçom...')
      const resultado = await atualizarUsuario(editandoId, { nome: formulario.nome })
      if (resultado.ok) {
        setFormulario({ nome: '' })
        setEditandoId(null)
        setMensagem('Garçom atualizado com sucesso!')
        carregarGarcons()
      } else {
        setMensagem(resultado.message || 'Erro ao atualizar garçom')
      }
      setTimeout(() => setMensagem(''), 3000)
    } catch (error) {
      setMensagem('Erro ao atualizar garçom')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  // DELETE
  async function aoRemover(id) {
    if (confirm('Tem certeza que deseja remover este garçom?')) {
      try {
        setMensagem('Removendo garçom...')
        const resultado = await removerUsuario(id)
        if (resultado.ok) {
          setMensagem('Garçom removido com sucesso!')
          carregarGarcons()
        } else {
          setMensagem(resultado.message || 'Erro ao remover garçom')
        }
        setTimeout(() => setMensagem(''), 4000)
      } catch (error) {
        setMensagem('Erro ao remover garçom')
        setTimeout(() => setMensagem(''), 4000)
      }
    }
  }

  const aoMudarInput = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value })
  }

  const iniciarEdicao = (garcom) => {
    setEditandoId(garcom.id)
    setFormulario({ nome: garcom.nome })
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setFormulario({ nome: '' })
  }

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Cadastro de Garçons</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>

      {/* CREATE/UPDATE */}
      <div className="stats-card">
        <h3>{editandoId ? 'Editar Garçom' : 'Novo Garçom'}</h3>
        <form onSubmit={editandoId ? aoAtualizar : aoCriar}>
          <label>
            Nome do Garçom
            <input
              type="text"
              name="nome"
              value={formulario.nome}
              onChange={aoMudarInput}
              placeholder="Digite o nome do garçom"
              style={{ marginTop: '8px', marginBottom: '12px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="action-button" disabled={!formulario.nome.trim()}>
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
        <h3>Garçons Cadastrados</h3>
        {garcons.length === 0 ? (
          <div className="stats-card">Nenhum garçom cadastrado.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {garcons.map((garcom, idx) => (
              <div key={garcom.id} className="order-card">
                <div><strong>#{idx + 1}</strong></div>
                <div><strong>Nome:</strong> {garcom.nome}</div>
                <div><strong>Função:</strong> {garcom.papel === 'GARCOM' ? 'Garçom' : garcom.papel}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    className="action-button secondary"
                    onClick={() => iniciarEdicao(garcom)}
                    style={{ flex: 1, fontSize: '0.9rem', padding: '8px' }}
                  >
                    Editar
                  </button>
                  <button
                    className="action-button secondary"
                    onClick={() => aoRemover(garcom.id)}
                    style={{ flex: 1, fontSize: '0.9rem', padding: '8px', background: '#d32f2f' }}
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
