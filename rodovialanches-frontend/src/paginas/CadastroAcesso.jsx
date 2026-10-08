import React from 'react'
import { buscarUsuarios, criarAcesso, definirSenhaUsuario, definirCpfUsuario, removerUsuario } from '../api'

const ROTULOS_PAPEL = {
  GARCOM: 'Garçom',
  COZINHA: 'Cozinha',
  BALCAO: 'Balcão',
  GERENTE: 'Gerente',
}

/** Máscara de telefone enquanto digita: (DD) 98765-4321 (10 ou 11 dígitos). */
function mascaraTelefone(valor){
  const d = (valor || '').replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

/** Máscara de CPF enquanto digita: 000.000.000-00 (11 dígitos). */
function mascaraCpf(valor){
  const d = (valor || '').replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

/**
 * Página CADASTRO DE ACESSO (restrita ao GERENTE).
 * - Cadastra acessos ao sistema (nome + CPF + papel + senha).
 * - Lista os acessos existentes com o status (tem senha ou não).
 * - Permite definir/trocar a senha, editar o CPF e remover acessos.
 * Clientes não aparecem aqui: eles não entram no sistema.
 */
export default function CadastroAcesso(){
  const [usuarios, setUsuarios] = React.useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)
  const [aviso, setAviso] = React.useState(null) // { texto, erro }

  const [form, setForm] = React.useState({ nome: '', telefone: '', cpf: '', papel: 'GARCOM', senha: '', repetirSenha: '' })

  // Edição de senha de um usuário existente (id em edição ou null)
  const [editandoSenhaId, setEditandoSenhaId] = React.useState(null)
  const [novaSenha, setNovaSenha] = React.useState('')
  const [repetirNovaSenha, setRepetirNovaSenha] = React.useState('')

  // Edição de CPF de um usuário existente (id em edição ou null)
  const [editandoCpfId, setEditandoCpfId] = React.useState(null)
  const [novoCpf, setNovoCpf] = React.useState('')

  function mostrar(texto, erro = false){
    setAviso({ texto, erro })
    setTimeout(() => setAviso(null), 4500)
  }

  async function carregar(){
    const todos = await buscarUsuarios()
    setUsuarios(todos.filter(u => u.papel !== 'CLIENTE'))
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(() => { carregar() }, [])

  function aoMudarCampo(e){
    const { name, value } = e.target
    if (name === 'telefone') {
      setForm(f => ({ ...f, telefone: mascaraTelefone(value) }))
      return
    }
    if (name === 'cpf') {
      setForm(f => ({ ...f, cpf: mascaraCpf(value) }))
      return
    }
    setForm(f => ({ ...f, [name]: value }))
  }

  async function aoCriar(e){
    e.preventDefault()
    if (!form.nome.trim()) return mostrar('Informe o nome do acesso.', true)
    if (form.cpf.replace(/\D/g, '').length !== 11) return mostrar('CPF incompleto — use o formato 000.000.000-00.', true)
    if (form.senha.trim().length < 4) return mostrar('A senha deve ter pelo menos 4 caracteres.', true)
    if (form.senha !== form.repetirSenha) return mostrar('As senhas não conferem.', true)

    const resultado = await criarAcesso({
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || undefined,
      cpf: form.cpf,
      papel: form.papel,
      senha: form.senha,
    })
    if (resultado.ok) {
      setForm({ nome: '', telefone: '', cpf: '', papel: 'GARCOM', senha: '', repetirSenha: '' })
      mostrar(`Acesso de "${resultado.usuario.nome}" cadastrado com sucesso!`)
      carregar()
    } else {
      mostrar(resultado.message || 'Erro ao cadastrar acesso.', true)
    }
  }

  async function aoSalvarSenha(id){
    if (novaSenha.trim().length < 4) return mostrar('A senha deve ter pelo menos 4 caracteres.', true)
    if (novaSenha !== repetirNovaSenha) return mostrar('As senhas não conferem.', true)
    const resultado = await definirSenhaUsuario(id, novaSenha)
    if (resultado.ok) {
      setEditandoSenhaId(null)
      setNovaSenha('')
      setRepetirNovaSenha('')
      mostrar('Senha definida com sucesso!')
      carregar()
    } else {
      mostrar(resultado.message || 'Erro ao definir senha.', true)
    }
  }

  async function aoSalvarCpf(id){
    if (novoCpf.replace(/\D/g, '').length !== 11) return mostrar('CPF incompleto — use o formato 000.000.000-00.', true)
    const resultado = await definirCpfUsuario(id, novoCpf)
    if (resultado.ok) {
      setEditandoCpfId(null)
      setNovoCpf('')
      mostrar('CPF atualizado com sucesso!')
      carregar()
    } else {
      mostrar(resultado.message || 'Erro ao atualizar CPF.', true)
    }
  }

  async function aoRemover(id, nome){
    if (!confirm(`Remover o acesso de "${nome}"?`)) return
    const resultado = await removerUsuario(id)
    if (resultado.ok) {
      mostrar(`Acesso de "${nome}" removido.`)
      carregar()
    } else {
      mostrar(resultado.message || 'Erro ao remover acesso.', true)
    }
  }

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Cadastro de Acesso</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>

      {/* CREATE */}
      <div className="stats-card">
        <h3>Novo acesso</h3>
        <form onSubmit={aoCriar}>
          <div className="form-grid">
            <label className="rotulo-form">
              Nome
              <input
                type="text"
                className="campo-form"
                name="nome"
                value={form.nome}
                onChange={aoMudarCampo}
                placeholder="Nome de quem vai entrar"
              />
            </label>
            <label className="rotulo-form">
              CPF
              <input
                type="text"
                className="campo-form"
                name="cpf"
                value={form.cpf}
                onChange={aoMudarCampo}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </label>
            <label className="rotulo-form">
              Telefone (opcional)
              <input
                type="tel"
                className="campo-form"
                name="telefone"
                value={form.telefone}
                onChange={aoMudarCampo}
                placeholder="(00) 00000-0000"
              />
            </label>
            <label className="rotulo-form">
              Papel
              <select className="campo-form" name="papel" value={form.papel} onChange={aoMudarCampo}>
                <option value="GARCOM">Garçom</option>
                <option value="COZINHA">Cozinha</option>
                <option value="BALCAO">Balcão</option>
                <option value="GERENTE">Gerente</option>
              </select>
            </label>
            <label className="rotulo-form">
              Senha
              <input
                type="password"
                className="campo-form"
                name="senha"
                value={form.senha}
                onChange={aoMudarCampo}
                placeholder="Mínimo de 4 caracteres"
              />
            </label>
            <label className="rotulo-form">
              Repetir senha
              <input
                type="password"
                className="campo-form"
                name="repetirSenha"
                value={form.repetirSenha}
                onChange={aoMudarCampo}
                placeholder="Digite a senha de novo"
              />
            </label>
          </div>
          <button type="submit" className="action-button">Cadastrar acesso</button>
        </form>
        {aviso && <div style={{ marginTop: '12px', color: aviso.erro ? '#d32f2f' : '#388e3c' }}>{aviso.texto}</div>}
      </div>

      {/* READ */}
      <div>
        <h3>Acessos existentes</h3>
        {usuarios.length === 0 ? (
          <div className="stats-card">Nenhum acesso cadastrado.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {usuarios.map(u => (
              <div key={u.id} className="order-card">
                <div><strong>{u.nome}</strong></div>
                <div>Papel: {ROTULOS_PAPEL[u.papel] || u.papel}</div>
                <div>CPF: {u.cpf || '-'}</div>
                <div>Telefone: {u.telefone || '-'}</div>
                <div style={{ marginTop: '6px' }}>
                  <span className={'status-acesso ' + (u.temSenha ? 'ativo' : 'inativo')}>
                    {u.temSenha ? 'Acesso ativo' : 'Sem senha definida'}
                  </span>
                </div>

                {editandoSenhaId === u.id ? (
                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="password"
                      className="campo-form"
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      placeholder="Nova senha"
                      autoFocus
                    />
                    <input
                      type="password"
                      className="campo-form"
                      value={repetirNovaSenha}
                      onChange={e => setRepetirNovaSenha(e.target.value)}
                      placeholder="Repetir nova senha"
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="action-button" style={{ flex: 1 }} onClick={() => aoSalvarSenha(u.id)}>Salvar</button>
                      <button
                        className="action-button secondary"
                        style={{ flex: 1 }}
                        onClick={() => { setEditandoSenhaId(null); setNovaSenha(''); setRepetirNovaSenha('') }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : editandoCpfId === u.id ? (
                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="text"
                      className="campo-form"
                      value={novoCpf}
                      onChange={e => setNovoCpf(mascaraCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="action-button" style={{ flex: 1 }} onClick={() => aoSalvarCpf(u.id)}>Salvar</button>
                      <button
                        className="action-button secondary"
                        style={{ flex: 1 }}
                        onClick={() => { setEditandoCpfId(null); setNovoCpf('') }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        className="action-button secondary"
                        style={{ flex: 1, fontSize: '0.9rem', padding: '8px' }}
                        onClick={() => { setEditandoSenhaId(u.id); setNovaSenha(''); setRepetirNovaSenha('') }}
                      >
                        {u.temSenha ? 'Trocar senha' : 'Definir senha'}
                      </button>
                      <button
                        className="action-button secondary"
                        style={{ flex: 1, fontSize: '0.9rem', padding: '8px' }}
                        onClick={() => { setEditandoCpfId(u.id); setNovoCpf(u.cpf || '') }}
                      >
                        Editar CPF
                      </button>
                    </div>
                    <button
                      className="action-button secondary"
                      style={{ width: '100%', marginTop: '8px', fontSize: '0.9rem', padding: '8px', background: '#d32f2f' }}
                      onClick={() => aoRemover(u.id, u.nome)}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
