import React from 'react'
import { buscarUsuarios, criarUsuario, atualizarUsuario, removerUsuario } from '../api'

/**
 * Página de CADASTRO DE CLIENTES (CRUD completo).
 *
 * CREATE — cadastra novo cliente (papel="CLIENTE") com nome + telefone.
 * READ   — lista todos os usuários filtrados por papel="CLIENTE".
 * UPDATE — edita nome e telefone de um cliente existente.
 * DELETE — remove cliente (backend bloqueia se tiver pedidos vinculados).
 */
export default function CadastroClientes() {
  const [clientes, setClientes] = React.useState([])
  const [formulario, setFormulario] = React.useState({ nome: '', telefone: '' })
  const [mensagem, setMensagem] = React.useState('')
  const [editandoId, setEditandoId] = React.useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)

  // READ
  async function carregarClientes() {
    const todos = await buscarUsuarios()
    const lista = todos.filter(u => u.papel === 'CLIENTE')
    setClientes(lista)
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(() => {
    carregarClientes()
  }, [])

  // CREATE
  async function aoCriar(e) {
    e.preventDefault()
    if (!formulario.nome.trim() || !formulario.telefone.trim()) {
      setMensagem('Por favor, informe nome e telefone')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Cadastrando cliente...')
      const resultado = await criarUsuario({ nome: formulario.nome, telefone: formulario.telefone, papel: 'CLIENTE' })
      if (resultado.ok) {
        setFormulario({ nome: '', telefone: '' })
        setMensagem('Cliente cadastrado com sucesso!')
        carregarClientes()
      } else {
        setMensagem(resultado.message || 'Erro ao cadastrar cliente')
      }
      setTimeout(() => setMensagem(''), 3500)
    } catch (error) {
      setMensagem('Erro ao cadastrar cliente')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  // UPDATE
  async function aoAtualizar(e) {
    e.preventDefault()
    if (!formulario.nome.trim() || !formulario.telefone.trim()) {
      setMensagem('Por favor, informe nome e telefone')
      setTimeout(() => setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Atualizando cliente...')
      const resultado = await atualizarUsuario(editandoId, { nome: formulario.nome, telefone: formulario.telefone })
      if (resultado.ok) {
        setFormulario({ nome: '', telefone: '' })
        setEditandoId(null)
        setMensagem('Cliente atualizado com sucesso!')
        carregarClientes()
      } else {
        setMensagem(resultado.message || 'Erro ao atualizar cliente')
      }
      setTimeout(() => setMensagem(''), 3500)
    } catch (error) {
      setMensagem('Erro ao atualizar cliente')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  // DELETE
  async function aoRemover(id) {
    if (confirm('Tem certeza que deseja remover este cliente?')) {
      try {
        setMensagem('Removendo cliente...')
        const resultado = await removerUsuario(id)
        if (resultado.ok) {
          setMensagem('Cliente removido com sucesso!')
          carregarClientes()
        } else {
          setMensagem(resultado.message || 'Erro ao remover cliente')
        }
        setTimeout(() => setMensagem(''), 4000)
      } catch (error) {
        setMensagem('Erro ao remover cliente')
        setTimeout(() => setMensagem(''), 4000)
      }
    }
  }

  const aoMudarInput = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value })
  }

  const iniciarEdicao = (cliente) => {
    setEditandoId(cliente.id)
    setFormulario({ nome: cliente.nome, telefone: cliente.telefone || '' })
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setFormulario({ nome: '', telefone: '' })
  }

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Cadastro de Clientes</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>

      {/* CREATE/UPDATE */}
      <div className="stats-card">
        <h3>{editandoId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
        <form onSubmit={editandoId ? aoAtualizar : aoCriar}>
          <label>
            Nome do Cliente
            <input
              type="text"
              name="nome"
              value={formulario.nome}
              onChange={aoMudarInput}
              placeholder="Digite o nome do cliente"
              style={{ display: 'block', width: '100%', marginTop: '8px', marginBottom: '12px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
            />
          </label>
          <label>
            Telefone
            <input
              type="tel"
              name="telefone"
              value={formulario.telefone}
              onChange={aoMudarInput}
              placeholder="(00) 00000-0000"
              style={{ display: 'block', width: '100%', marginTop: '8px', marginBottom: '12px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="action-button" disabled={!formulario.nome.trim() || !formulario.telefone.trim()}>
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
        <h3>Clientes Cadastrados</h3>
        {clientes.length === 0 ? (
          <div className="stats-card">Nenhum cliente cadastrado.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {clientes.map((cliente, idx) => (
              <div key={cliente.id} className="order-card">
                <div><strong>#{idx + 1}</strong></div>
                <div><strong>Nome:</strong> {cliente.nome}</div>
                <div><strong>Telefone:</strong> {cliente.telefone || '-'}</div>
                <div><strong>Função:</strong> {cliente.papel === 'CLIENTE' ? 'Cliente' : cliente.papel}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    className="action-button secondary"
                    onClick={() => iniciarEdicao(cliente)}
                    style={{ flex: 1, fontSize: '0.9rem', padding: '8px' }}
                  >
                    Editar
                  </button>
                  <button
                    className="action-button secondary"
                    onClick={() => aoRemover(cliente.id)}
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
