import React from 'react'
import { buscarProdutosComDisponibilidade, buscarUsuarios, criarPedido, criarUsuario, listarPedidos, removerPedidosDoGarcom } from '../api'

/**
 * Página do GARÇOM.
 * - Lista produtos disponíveis (com base no estoque de matérias-primas da receita) e permite montar um pedido (carrinho local).
 * - Permite selecionar o garçom responsável, o cliente e a mesa (1 a 8).
 * - Mostra os pedidos que estão "Prontos para pagamento" (vindos da cozinha)
 *   para o garçom saber quais já pode levar ao balcão.
 * - Permite cadastrar cliente rapidamente sem sair da tela.
 * - Permite limpar todos os pedidos de um garçom (necessário antes de excluir).
 */
export default function Garcom(){
  const [produtos, setProdutos] = React.useState([])
  const [usuarios, setUsuarios] = React.useState([])
  const [itens, setItens] = React.useState([])
  const [pedidosProntos, setPedidosProntos] = React.useState([])
  const [garcomSelecionado, setGarcomSelecionado] = React.useState('')
  const [clienteSelecionado, setClienteSelecionado] = React.useState('')
  const [mesaSelecionada, setMesaSelecionada] = React.useState('1')
  const [novoClienteNome, setNovoClienteNome] = React.useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = React.useState('')
  const [mensagem, setMensagem] = React.useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)

  // IDs de pedidos que o garçom já entregou na mesa (estado local, não vai pro backend).
  // Persiste em localStorage para sobreviver a refresh da página.
  const [pedidosEntregues, setPedidosEntregues] = React.useState(() => {
    try {
      const salvo = localStorage.getItem('pedidosEntregues')
      return salvo ? new Set(JSON.parse(salvo)) : new Set()
    } catch { return new Set() }
  })

  function marcarEntregue(pedidoId){
    setPedidosEntregues(prev => {
      const novo = new Set(prev)
      novo.add(pedidoId)
      try { localStorage.setItem('pedidosEntregues', JSON.stringify([...novo])) } catch {}
      return novo
    })
  }

  async function carregarPedidosProntos(){
    const todos = await listarPedidos()
    setPedidosProntos(todos.filter(p => p.status === 'PRONTO_PARA_PAGAMENTO'))
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  async function carregarUsuarios(){
    const us = await buscarUsuarios()
    setUsuarios(us)
  }

  async function carregarProdutos(){
    const prods = await buscarProdutosComDisponibilidade()
    setProdutos(prods)
  }

  React.useEffect(()=>{
    carregarProdutos()
    carregarUsuarios()
    carregarPedidosProntos()
    const timer = setInterval(carregarPedidosProntos, 3000)
    return ()=>clearInterval(timer)
  }, [])

  async function cadastrarCliente(e){
    e.preventDefault()
    if (!novoClienteNome.trim() || !novoClienteTelefone.trim()) {
      setMensagem('Informe nome e telefone do cliente.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    try {
      setMensagem('Cadastrando cliente...')
      const resultado = await criarUsuario({ nome: novoClienteNome, telefone: novoClienteTelefone, papel: 'CLIENTE' })
      if (resultado.ok) {
        setNovoClienteNome('')
        setNovoClienteTelefone('')
        await carregarUsuarios()
        if (resultado.usuario?.id) setClienteSelecionado(resultado.usuario.id)
        setMensagem('Cliente cadastrado com sucesso!')
      } else {
        setMensagem(resultado.message || 'Erro ao cadastrar cliente')
      }
      setTimeout(()=>setMensagem(''), 3000)
    } catch (err) {
      setMensagem('Erro ao cadastrar cliente')
      setTimeout(()=>setMensagem(''), 3000)
    }
  }

  function adicionarItem(produto){
    const existente = itens.find(i=>i.produto.id===produto.id)
    const quantidadeAtual = existente ? existente.quantidade : 0
    // Usa quantidadeDisponivel (calculada pelo backend baseado na receita + estoque de matérias-primas)
    const qtdDisponivel = produto.quantidadeDisponivel ?? 0
    const temReceita = produto.temReceita ?? false

    if (!temReceita) {
      setMensagem(`${produto.nome} não tem lista de ingredientes cadastrada. Não pode ser vendido.`)
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    if (quantidadeAtual + 1 > qtdDisponivel) {
      setMensagem(`Estoque insuficiente para ${produto.nome} (disponível: ${qtdDisponivel})`)
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    if(existente){
      setItens(itens.map(i=>i.produto.id===produto.id?{...i,quantidade:i.quantidade+1}:i))
    } else {
      setItens([...itens,{produto, quantidade:1}])
    }
  }

  function removerItem(produtoId){
    setItens(itens.filter(i=>i.produto.id!==produtoId))
  }

  function mudarQuantidade(produtoId, delta){
    setItens(itens.map(i=>{
      if (i.produto.id !== produtoId) return i
      const qtdDisponivel = i.produto.quantidadeDisponivel ?? 0
      const novaQtd = Math.max(1, i.quantidade + delta)
      if (novaQtd > qtdDisponivel) {
        setMensagem(`Estoque insuficiente (máx: ${qtdDisponivel})`)
        setTimeout(()=>setMensagem(''), 3000)
        return i
      }
      return {...i, quantidade: novaQtd}
    }))
  }

  async function enviar(){
    if (!garcomSelecionado) {
      setMensagem('Cadastre/selecione um garçom antes de enviar o pedido.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    if (!clienteSelecionado) {
      setMensagem('Cadastre/selecione um cliente antes de enviar o pedido.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    // Validar se todos os itens têm receita e estoque suficiente
    for (const item of itens) {
      if (!item.produto.temReceita) {
        setMensagem(`${item.produto.nome} não tem lista de ingredientes. Não pode ser vendido.`)
        setTimeout(()=>setMensagem(''), 3000)
        return
      }
      if (item.quantidade > (item.produto.quantidadeDisponivel ?? 0)) {
        setMensagem(`Estoque insuficiente para ${item.produto.nome}`)
        setTimeout(()=>setMensagem(''), 3000)
        return
      }
    }
    setMensagem('Enviando pedido...')
    const pedido = {
      garcom: { id: garcomSelecionado },
      cliente: { id: clienteSelecionado },
      numeroMesa: Number(mesaSelecionada),
      itens: itens.map(i=>({produto: {id: i.produto.id}, quantidade: i.quantidade}))
    }
    const resultado = await criarPedido(pedido)
    if (resultado.ok) {
      setItens([])
      setMensagem('Pedido enviado com sucesso! A cozinha já recebeu.')
      // Recarrega imediatamente para reduzir a janela em que o pedido fica invisível
      // antes do próximo tick do polling (a cada 3s).
      await carregarPedidosProntos()
      await carregarProdutos() // Atualiza disponibilidade após baixa de estoque
    } else {
      setMensagem(resultado.message || 'Erro ao enviar pedido — o pedido NÃO foi criado.')
    }
    setTimeout(()=>setMensagem(''), 4000)
  }

  async function limparPedidosDoGarcom(){
    if (!garcomSelecionado) {
      setMensagem('Selecione um garçom para limpar os pedidos.')
      setTimeout(()=>setMensagem(''), 3000)
      return
    }
    const nomeGarcom = usuarios.find(u => u.id === Number(garcomSelecionado) || u.id === garcomSelecionado)?.nome || 'garçom'
    if (!window.confirm(`Excluir TODOS os pedidos do garçom "${nomeGarcom}"? Esta ação não pode ser desfeita.`)) return
    setMensagem('Limpando pedidos do garçom...')
    const resultado = await removerPedidosDoGarcom(garcomSelecionado)
    if (resultado.ok) {
      setMensagem(`${resultado.removidos} pedido(s) removido(s). Agora você pode excluir o garçom.`)
      await carregarPedidosProntos()
    } else {
      setMensagem(resultado.message || 'Erro ao limpar pedidos do garçom.')
    }
    setTimeout(()=>setMensagem(''), 4000)
  }

  const total = itens.reduce((soma, i) => soma + i.produto.preco * i.quantidade, 0)

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Garçom</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
        </div>
      </div>
      <div className="stats-card">
        <label style={{ display: 'block', marginBottom: '12px' }}>
          Garçom
          <select
            value={garcomSelecionado}
            onChange={e=>setGarcomSelecionado(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
          >
            <option value="">-- selecione --</option>
            {usuarios.filter(u=>u.papel==='GARCOM').map(u=> <option value={u.id} key={u.id}>{u.nome}</option>)}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          Cliente
          <select
            value={clienteSelecionado}
            onChange={e=>setClienteSelecionado(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
          >
            <option value="">-- selecione --</option>
            {usuarios.filter(u=>u.papel==='CLIENTE').map(u=> (
              <option value={u.id} key={u.id}>{u.nome}{u.telefone ? ` - ${u.telefone}` : ''}</option>
            ))}
          </select>
        </label>
        {usuarios.filter(u=>u.papel==='GARCOM').length === 0 && (
          <div style={{ color: '#d32f2f', marginTop: '8px' }}>
            Nenhum garçom cadastrado. Cadastre um garçom antes de criar pedidos.
          </div>
        )}
        <button
          type="button"
          className="action-button secondary"
          style={{ marginTop: '8px' }}
          onClick={limparPedidosDoGarcom}
          disabled={!garcomSelecionado}
        >
          Limpar pedidos do garçom
        </button>
        <div style={{ marginTop: '8px' }}>{mensagem}</div>
      </div>
      <div className="stats-card">
        <h3>Cadastrar Cliente</h3>
        <form onSubmit={cadastrarCliente}>
          <label>
            Nome do cliente
            <input
              type="text"
              value={novoClienteNome}
              onChange={e=>setNovoClienteNome(e.target.value)}
              placeholder="Digite o nome do cliente"
              style={{ display: 'block', width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', border: '1px solid #dbe4ff' }}
            />
          </label>
          <label style={{ display: 'block', marginTop: '8px' }}>
            Telefone
            <input
              type="tel"
              value={novoClienteTelefone}
              onChange={e=>setNovoClienteTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              style={{ display: 'block', width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', border: '1px solid #dbe4ff' }}
            />
          </label>
          <button type="submit" className="action-button" style={{ marginTop: '12px' }} disabled={!novoClienteNome.trim() || !novoClienteTelefone.trim()}>
            Cadastrar cliente
          </button>
        </form>
      </div>
      <div className="tables-section">
        <h3>Mesas</h3>
        <div className="tables-grid">
          {Array.from({length:8}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              type="button"
              className={"table-box" + (mesaSelecionada === String(num) ? ' selected-table' : '')}
              onClick={() => setMesaSelecionada(String(num))}
            >
              Mesa {num}
            </button>
          ))}
        </div>
      </div>
      <div className="section-grid">
        <div className="page-title-row">
          <h3>Pedidos prontos para entrega</h3>
        </div>
        {(() => {
          // Mostra só os pedidos prontos que o garçom ainda NÃO marcou como entregues.
          const pendentesDeEntrega = pedidosProntos.filter(p => !pedidosEntregues.has(p.id))
          if (pendentesDeEntrega.length === 0) {
            return <div className="stats-card">Nenhum pedido pronto para entregar.</div>
          }
          return pendentesDeEntrega.map((p, idx) => {
            const totalPedido = p.itens.reduce((soma, it) => soma + it.produto.preco * it.quantidade, 0)
            return (
              <div key={p.id} className="order-card">
                <div><strong>Pedido #{idx + 1}</strong> - Mesa {p.numeroMesa || 'N/A'}</div>
                <div>Garçom: {p.garcom?.nome || 'Garçom'}</div>
                <div>Total: R$ {totalPedido.toFixed(2)}</div>
                <ul className="order-items">
                  {p.itens.map(it=> <li key={it.id}>{it.produto.nome} x{it.quantidade}</li>)}
                </ul>
                <button
                  className="action-button"
                  style={{ background: '#388e3c', marginTop: '8px' }}
                  onClick={() => marcarEntregue(p.id)}
                >
                  Entreguei na mesa
                </button>
              </div>
            )
          })
        })()}
      </div>
      <div>
        <h3>Produtos</h3>
        <div className="products-grid">
          {produtos.map(p=> {
            const qtdDisponivel = p.quantidadeDisponivel ?? 0
            const temReceita = p.temReceita ?? false
            const semEstoque = qtdDisponivel <= 0
            const semReceita = !temReceita
            return (
              <div key={p.id} className="product-card" style={{ opacity: semEstoque || semReceita ? 0.6 : 1, borderLeft: semReceita ? '4px solid #f57c00' : semEstoque ? '4px solid #d32f2f' : 'none' }}>
                <div><strong>{p.nome}</strong></div>
                <div>R$ {p.preco.toFixed(2)}</div>
                <div style={{ color: semReceita ? '#f57c00' : semEstoque ? '#d32f2f' : '#2e7d32', fontWeight: 'bold' }}>
                  {semReceita ? 'Sem lista de ingredientes' : semEstoque ? 'Indisponível' : `Disponível: ${qtdDisponivel}`}
                </div>
                <button
                  onClick={()=>adicionarItem(p)}
                  disabled={semEstoque || semReceita}
                  style={{ marginTop: '8px', background: semReceita ? '#f57c00' : semEstoque ? '#d32f2f' : '' }}
                >
                  {semReceita ? 'Sem receita' : semEstoque ? 'Indisponível' : 'Adicionar'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <div>
        <h3>Itens do pedido</h3>
        <ul className="order-items">
          {itens.map(i=> (
            <li key={i.produto.id}>
              <div>{i.produto.nome} x{i.quantidade}</div>
              <div>
                <button className="secondary" onClick={()=>mudarQuantidade(i.produto.id, -1)}>-</button>
                <button className="secondary" onClick={()=>mudarQuantidade(i.produto.id, 1)}>+</button>
                <button className="secondary" onClick={()=>removerItem(i.produto.id)}>Remover</button>
              </div>
            </li>
          ))}
          {itens.length===0 && <li>Nenhum item adicionado.</li>}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px', fontSize: '18px', fontWeight: 'bold' }}>
          Total do pedido: R$ {total.toFixed(2)}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="action-button" onClick={enviar} disabled={itens.length===0 || !garcomSelecionado || !clienteSelecionado}>Enviar Pedido</button>
          <button className="action-button secondary" onClick={()=>setItens([])} disabled={itens.length===0}>Limpar pedido</button>
        </div>
      </div>
    </div>
  )
}