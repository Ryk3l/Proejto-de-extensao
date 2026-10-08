import React from 'react'
import { entrar, buscarUsuarios } from '../api'

/**
 * Tela de ACESSO AO SISTEMA (login).
 * O usuário informa nome + senha; em caso de sucesso o App guarda a sessão
 * e libera apenas as páginas do papel dele (GERENTE vê todas).
 * Clientes (papel CLIENTE) não entram no sistema.
 */
export default function TelaAcesso({ onEntrar }){
  const [nome, setNome] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [mensagem, setMensagem] = React.useState('')
  const [entrando, setEntrando] = React.useState(false)
  const [sugestoes, setSugestoes] = React.useState([])

  // Sugestões de nomes (apenas quem é do sistema — não clientes)
  React.useEffect(() => {
    buscarUsuarios().then(lista => {
      setSugestoes(lista.filter(u => u.papel !== 'CLIENTE').map(u => u.nome))
    })
  }, [])

  async function aoEnviar(e){
    e.preventDefault()
    if (entrando) return
    if (!nome.trim() || !senha) {
      setMensagem('Informe nome e senha.')
      setTimeout(() => setMensagem(''), 3500)
      return
    }
    setEntrando(true)
    const resultado = await entrar({ nome: nome.trim(), senha })
    setEntrando(false)
    if (resultado.ok) {
      onEntrar(resultado.usuario)
      return // a sessão iniciou — a mensagem não é mais necessária
    }
    setMensagem(resultado.message || 'Nome ou senha inválidos.')
    setTimeout(() => setMensagem(''), 4000)
  }

  return (
    <div className="tela-acesso">
      <form className="tela-acesso-card" onSubmit={aoEnviar}>
        <h1>Rodovia Lanches</h1>
        <p>Acesso ao sistema</p>

        <label className="rotulo-form">
          Nome
          <input
            type="text"
            className="campo-form"
            list="nomes-sistema"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Digite seu nome"
            autoFocus
          />
          <datalist id="nomes-sistema">
            {sugestoes.map(n => <option key={n} value={n} />)}
          </datalist>
        </label>

        <label className="rotulo-form">
          Senha
          <input
            type="password"
            className="campo-form"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="Digite sua senha"
          />
        </label>

        <button type="submit" className="action-button" disabled={entrando} style={{ width: '100%' }}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>

        {mensagem && <div className="mensagem-erro">{mensagem}</div>}
      </form>
    </div>
  )
}
