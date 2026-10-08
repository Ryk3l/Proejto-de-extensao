import React from 'react'
import { listarPedidos, buscarProdutosComDisponibilidade, buscarMateriasPrimas, buscarReceita, removerPedido, removerProduto, criarProduto, atualizarProduto, adicionarIngredienteReceita, atualizarIngredienteReceita, removerIngredienteReceita, rotuloStatus } from '../api'
import IconeMoto from '../componentes/IconeMoto'

/**
 * Página do GERENTE - Versão integrada com listas de ingredientes.
 *
 * Centraliza tudo numa única tela:
 *  - Painel de estatísticas (totais por status).
 *  - Filtro por data (de / até) sobre os pedidos.
 *  - Lista de todos os pedidos com botão de excluir individualmente.
 *  - Cadastro de produto NOVO já com matérias-primas (sai pronto para venda).
 *  - Lista de ingredientes integrada em cada produto (adicionar várias matérias-primas de uma vez,
 *    editar quantidade e remover).
 *  - Link para Matérias-Primas (página separada).
 *
 * Atualização automática a cada 3 segundos.
 * NOTA: Produtos não têm estoque próprio. A disponibilidade é calculada
 * automaticamente baseada nas Listas de Ingredientes + estoque de Matérias-Primas.
 *
 * Observação: a quantidade da receita é "quanto entra em cada UNIDADE do produto".
 * O gerente DIGITA na unidade que quiser (KG, G, L, ML — seletor ao lado do campo)
 * e o sistema CONVERTE automaticamente para a unidade-base da matéria-prima
 * (ex: 150 G de carne → 0,150 KG). O banco guarda sempre a unidade-base.
 */
export default function Gerente(){
  const [pedidos, setPedidos] = React.useState([])
  const [produtos, setProdutos] = React.useState([])
  const [materiasPrimas, setMateriasPrimas] = React.useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null)
  const [mensagem, setMensagem] = React.useState('')
  const [novoProduto, setNovoProduto] = React.useState({ nome: '', preco: '' })
  const [produtoEmEdicaoId, setProdutoEmEdicaoId] = React.useState(null)
  const [edicaoNome, setEdicaoNome] = React.useState('')
  const [edicaoPreco, setEdicaoPreco] = React.useState('')
  const [filtroDataDe, setFiltroDataDe] = React.useState('')
  const [filtroDataAte, setFiltroDataAte] = React.useState('')
  // Receitas carregadas: { produtoId: [ingredientes] }
  const [receitas, setReceitas] = React.useState({})
  // Linhas de ingredientes a adicionar: { chave: [{materiaPrimaId, quantidade}] }
  // Chave 'novo' = formulário de cadastro de produto; chave = produtoId = lista de ingredientes dele.
  const [linhasIngrediente, setLinhasIngrediente] = React.useState({ novo: [{ materiaPrimaId: '', quantidade: '', unidade: '' }] })
  // Edição inline de um ingrediente existente: { produtoId, receitaId, quantidade }
  const [editandoItem, setEditandoItem] = React.useState(null)

  async function carregar(){
    const [todosPedidos, todosProdutos, todasMaterias] = await Promise.all([
      listarPedidos(),
      buscarProdutosComDisponibilidade(),
      buscarMateriasPrimas()
    ])
    setPedidos([...todosPedidos].sort((a, b) => a.id - b.id))
    setProdutos([...todosProdutos].sort((a, b) => a.id - b.id))
    setMateriasPrimas(todasMaterias)
    const receitasMap = {}
    for (const p of todosProdutos) {
      const r = await buscarReceita(p.id)
      receitasMap[p.id] = r
    }
    setReceitas(receitasMap)
    setUltimaAtualizacao(new Date().toLocaleTimeString())
  }

  React.useEffect(()=>{ carregar(); const t = setInterval(carregar,3000); return ()=>clearInterval(t); },[])

  function mostrarMensagem(texto){
    setMensagem(texto)
    setTimeout(()=>setMensagem(''), 6000)
  }

  const getMateriaPrima = (id) => materiasPrimas.find(m => m.id === id)

  // ===================== UNIDADES E CONVERSÃO =====================

  // Família de cada unidade e fator para a unidade canônica da família
  // (massa → KG, volume → ML, unidade avulsa → UN).
  // Ex: 1 G = 0.001 KG · 1 L = 1000 ML
  const UNIDADES = {
    KG: { familia: 'massa', fator: 1 },
    G: { familia: 'massa', fator: 0.001 },
    L: { familia: 'volume', fator: 1000 },
    ML: { familia: 'volume', fator: 1 },
    UN: { familia: 'un', fator: 1 },
  }

  // Unidades selecionáveis para uma matéria-prima com unidade-base X.
  // Ex: base KG → [KG, G] · base ML → [ML, L] · base UN → [UN]
  function unidadesDaFamilia(unidadeBase){
    const info = UNIDADES[unidadeBase]
    if (!info) return unidadeBase ? [unidadeBase] : []
    return Object.keys(UNIDADES).filter(u => UNIDADES[u].familia === info.familia)
  }

  // Converte um valor entre duas unidades da mesma família.
  // O banco guarda SEMPRE a unidade-base da matéria-prima (ex: 150 G → 0.15 KG).
  function converterValor(valor, de, para){
    const n = Number(valor)
    if (!Number.isFinite(n)) return valor
    if (!de || !para || de === para) return n
    const a = UNIDADES[de]
    const b = UNIDADES[para]
    if (!a || !b || a.familia !== b.familia) return n
    return Math.round((n * a.fator / b.fator) * 1e6) / 1e6
  }

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

  // ===================== LINHAS DE INGREDIENTES =====================

  const linhasDe = (chave) => linhasIngrediente[chave] || [{ materiaPrimaId: '', quantidade: '', unidade: '' }]

  const mudarLinha = (chave, idx, campo, valor) => {
    setLinhasIngrediente(prev => {
      const atual = prev[chave] || [{ materiaPrimaId: '', quantidade: '', unidade: '' }]
      return { ...prev, [chave]: atual.map((l, i) => i === idx ? { ...l, [campo]: valor } : l) }
    })
  }

  const adicionarLinha = (chave) => {
    setLinhasIngrediente(prev => {
      const atual = prev[chave] || [{ materiaPrimaId: '', quantidade: '', unidade: '' }]
      return { ...prev, [chave]: [...atual, { materiaPrimaId: '', quantidade: '', unidade: '' }] }
    })
  }

  const removerLinha = (chave, idx) => {
    setLinhasIngrediente(prev => {
      const atual = prev[chave] || [{ materiaPrimaId: '', quantidade: '', unidade: '' }]
      const novo = atual.filter((_, i) => i !== idx)
      return { ...prev, [chave]: novo.length ? novo : [{ materiaPrimaId: '', quantidade: '', unidade: '' }] }
    })
  }

  const limparLinhas = (chave) => {
    setLinhasIngrediente(prev => ({ ...prev, [chave]: [{ materiaPrimaId: '', quantidade: '', unidade: '' }] }))
  }

  // ===================== ABRIR/FECHAR CAMPO DE ADICIONAR =====================
  // Em cada produto o campo de ingredientes começa FECHADO; o botão
  // "+ Adicionar ingrediente" abre as linhas dinâmicas. Fechar limpa o digitado.
  const [formIngAberto, setFormIngAberto] = React.useState({})

  const abrirFormIngrediente = (chave) => {
    setFormIngAberto(prev => ({ ...prev, [chave]: true }))
    setLinhasIngrediente(prev => prev[chave]?.length
      ? prev
      : { ...prev, [chave]: [{ materiaPrimaId: '', quantidade: '', unidade: '' }] })
  }

  const fecharFormIngrediente = (chave) => {
    setFormIngAberto(prev => ({ ...prev, [chave]: false }))
    limparLinhas(chave)
  }

  // Lista de ingredientes de cada produto começa OCULTA (economiza espaço na página).
  // O botão Exibir/Ocultar no título do card mostra ou esconde o conteúdo da lista.
  const [listasExibidas, setListasExibidas] = React.useState({})
  const alternarLista = (produtoId) => {
    setListasExibidas(prev => ({ ...prev, [produtoId]: !prev[produtoId] }))
  }

  // Ao escolher a matéria-prima, a unidade do campo volta para a unidade-base dela.
  const selecionarMateriaPrima = (chave, idx, mpId) => {
    setLinhasIngrediente(prev => {
      const atual = prev[chave] || [{ materiaPrimaId: '', quantidade: '', unidade: '' }]
      const mp = getMateriaPrima(Number(mpId))
      return {
        ...prev,
        [chave]: atual.map((l, i) => i === idx
          ? { ...l, materiaPrimaId: mpId, unidade: mp ? mp.unidade : '' }
          : l)
      }
    })
  }

  /**
   * Valida as linhas de ingredientes antes de enviar.
   * Retorna mensagem de erro ou null se estiver tudo certo.
   * idsJaExistentes: matérias-primas que já estão na receita do produto (evita duplicata — o backend rejeita).
   */
  function validarLinhas(linhas, idsJaExistentes){
    let preenchidas = 0
    const ids = []
    for (const l of linhas){
      const temMp = !!l.materiaPrimaId
      const temQtd = !!l.quantidade && Number(l.quantidade) > 0
      if (!temMp && !temQtd) continue
      if (!temMp || !temQtd){
        return 'Preencha a matéria-prima e a quantidade em todas as linhas (ou remova a linha vazia).'
      }
      ids.push(Number(l.materiaPrimaId))
      preenchidas++
    }
    if (preenchidas === 0){
      return 'Adicione ao menos uma matéria-prima — a lista de ingredientes é obrigatória para o produto ser vendido.'
    }
    if (new Set(ids).size !== ids.length){
      return 'Não repita a mesma matéria-prima em linhas diferentes.'
    }
    if (idsJaExistentes && idsJaExistentes.length > 0){
      const repetida = ids.find(id => idsJaExistentes.includes(id))
      if (repetida !== undefined){
        return 'Uma das matérias-primas já está na lista de ingredientes deste produto.'
      }
    }
    return null
  }

  // Linha de ingrediente (select da matéria-prima + quantidade com unidade automática).
  // Usada no cadastro de produto (chave 'novo') e na lista de ingredientes de cada produto.
  const campoIngrediente = (chave, linha, idx, ultimaLinha) => {
    const mpLinha = getMateriaPrima(Number(linha.materiaPrimaId))
    const opcoesUnidade = mpLinha ? unidadesDaFamilia(mpLinha.unidade) : []
    const unidadeAtual = opcoesUnidade.includes(linha.unidade) ? linha.unidade : (opcoesUnidade[0] || '')
    return (
    <div key={idx} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'end', marginBottom: '8px' }}>
      <div style={{ flex: 2, minWidth: '170px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Matéria-prima</label>
        <select
          value={linha.materiaPrimaId}
          onChange={e => selecionarMateriaPrima(chave, idx, e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
        >
          <option value="">-- selecione --</option>
          {materiasPrimas.map(mp => (
            <option key={mp.id} value={mp.id}>
              {mp.nome} ({mp.unidade}) — Estoque: {Number(mp.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
            </option>
          ))}
        </select>
      </div>
      <div style={{ minWidth: '130px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Qtd por unidade</label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={linha.quantidade}
            onChange={e => mudarLinha(chave, idx, 'quantidade', e.target.value)}
            placeholder="Ex: 150"
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
          />
          <select
            value={unidadeAtual}
            onChange={e => mudarLinha(chave, idx, 'unidade', e.target.value)}
            disabled={opcoesUnidade.length <= 1}
            title="Unidade da quantidade digitada (converte automático para a unidade-base)"
            style={{
              padding: '8px 6px',
              borderRadius: '6px',
              border: '1px solid #dbe4ff',
              background: opcoesUnidade.length <= 1 ? '#f0f0f0' : 'white',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}
          >
            {opcoesUnidade.length === 0 ? (
              <option value="">-</option>
            ) : (
              opcoesUnidade.map(u => <option key={u} value={u}>{u}</option>)
            )}
          </select>
        </div>
      </div>
      <button
        type="button"
        className="secondary"
        onClick={() => removerLinha(chave, idx)}
        disabled={ultimaLinha}
        style={{ padding: '8px 10px' }}
      >
        Remover
      </button>
    </div>
    )
  }

  // ===================== PEDIDOS =====================

  async function aoExcluirPedido(id, posicao){
    if (!confirm(`Excluir definitivamente o pedido #${posicao}?`)) return
    const resultado = await removerPedido(id)
    if (resultado.ok) {
      mostrarMensagem(`Pedido #${posicao} removido.`)
      carregar()
    } else {
      mostrarMensagem(resultado.message || 'Erro ao remover pedido')
    }
  }

  // ===================== PRODUTOS =====================

  async function aoExcluirProduto(produtoId, nome){
    if (!confirm(`Excluir definitivamente o produto "${nome}"?`)) return
    const resultado = await removerProduto(produtoId)
    if (resultado.ok) {
      mostrarMensagem(`Produto "${nome}" removido.`)
      carregar()
    } else {
      mostrarMensagem(resultado.message || 'Erro ao remover produto')
    }
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
      mostrarMensagem('Nome não pode ficar vazio.')
      return
    }
    if (edicaoPreco === '' || Number.isNaN(preco) || preco < 0) {
      mostrarMensagem('Preço inválido.')
      return
    }
    const resultadoUpdate = await atualizarProduto(produtoId, { nome, preco })
    if (!resultadoUpdate.ok) {
      mostrarMensagem(resultadoUpdate.message || 'Erro ao atualizar produto')
      return
    }
    cancelarEdicaoProduto()
    carregar()
  }

  // Cria o produto E já associa as matérias-primas (lista de ingredientes pronta).
  async function aoCriarProduto(e){
    e.preventDefault()
    const nome = novoProduto.nome.trim()
    const preco = Number(novoProduto.preco)
    if (!nome) {
      mostrarMensagem('Nome do produto é obrigatório.')
      return
    }
    if (novoProduto.preco === '' || Number.isNaN(preco) || preco < 0) {
      mostrarMensagem('Preço inválido.')
      return
    }
    const linhas = linhasDe('novo')
    const erro = validarLinhas(linhas, [])
    if (erro) {
      mostrarMensagem(erro)
      return
    }
    const resultado = await criarProduto({ nome, preco })
    if (!resultado.ok) {
      mostrarMensagem(resultado.message || 'Erro ao cadastrar produto')
      return
    }
    let adicionados = 0
    const erros = []
    for (const l of linhas){
      if (!l.materiaPrimaId || !l.quantidade) continue
      const mp = getMateriaPrima(Number(l.materiaPrimaId))
      const unidadeBase = mp ? mp.unidade : ''
      const r = await adicionarIngredienteReceita(resultado.produto.id, {
        materiaPrimaId: Number(l.materiaPrimaId),
        quantidade: converterValor(l.quantidade, l.unidade || unidadeBase, unidadeBase)
      })
      if (r.ok) adicionados++
      else erros.push(r.message || 'Erro ao adicionar ingrediente')
    }
    let texto = `Produto "${nome}" cadastrado com ${adicionados} ingrediente(s) na lista de ingredientes.`
    if (erros.length > 0) texto += ` Atenção: ${erros.join(' ')}`
    mostrarMensagem(texto)
    setNovoProduto({ nome: '', preco: '' })
    limparLinhas('novo')
    carregar()
  }

  // ===================== LISTA DE INGREDIENTES =====================

  // Adiciona todas as linhas preenchidas de uma vez.
  async function aoAdicionarIngredientes(produtoId, e){
    e.preventDefault()
    const linhas = linhasDe(produtoId)
    const idsExistentes = (receitas[produtoId] || []).map(r => Number(r.materiaPrimaId))
    const erro = validarLinhas(linhas, idsExistentes)
    if (erro) {
      mostrarMensagem(erro)
      return
    }
    let adicionados = 0
    const erros = []
    for (const l of linhas){
      if (!l.materiaPrimaId || !l.quantidade) continue
      const mp = getMateriaPrima(Number(l.materiaPrimaId))
      const unidadeBase = mp ? mp.unidade : ''
      const r = await adicionarIngredienteReceita(produtoId, {
        materiaPrimaId: Number(l.materiaPrimaId),
        quantidade: converterValor(l.quantidade, l.unidade || unidadeBase, unidadeBase)
      })
      if (r.ok) adicionados++
      else erros.push(r.message || 'Erro ao adicionar ingrediente')
    }
    fecharFormIngrediente(produtoId)
    const receitaAtualizada = await buscarReceita(produtoId)
    setReceitas(prev => ({ ...prev, [produtoId]: receitaAtualizada }))
    let texto = adicionados > 0 ? `${adicionados} ingrediente(s) adicionado(s).` : 'Nenhum ingrediente adicionado.'
    if (erros.length > 0) texto += ` ${erros.join(' ')}`
    mostrarMensagem(texto)
  }

  function iniciarEdicao(produtoId, item){
    const mp = getMateriaPrima(item.materiaPrimaId)
    setEditandoItem({
      produtoId,
      receitaId: item.id,
      quantidade: String(item.quantidade),
      unidade: mp ? mp.unidade : '',
      unidadeBase: mp ? mp.unidade : ''
    })
  }

  // Na edição o número exibido está na unidade escolhida; ao trocar a unidade,
  // converte o valor mostrado (ex: 0.15 KG → 150 G) para não perder o sentido.
  const trocarUnidadeEdicao = (novaUnidade) => {
    setEditandoItem(prev => {
      if (!prev) return prev
      const novoValor = prev.quantidade === ''
        ? ''
        : String(converterValor(prev.quantidade, prev.unidade, novaUnidade))
      return { ...prev, unidade: novaUnidade, quantidade: novoValor }
    })
  }

  function cancelarEdicao(){
    setEditandoItem(null)
  }

  async function aoSalvarEdicao(){
    if (!editandoItem) return
    if (!editandoItem.quantidade || Number(editandoItem.quantidade) <= 0){
      mostrarMensagem('Quantidade deve ser maior que zero.')
      return
    }
    const resultado = await atualizarIngredienteReceita(editandoItem.produtoId, editandoItem.receitaId, {
      quantidade: converterValor(editandoItem.quantidade, editandoItem.unidade, editandoItem.unidadeBase)
    })
    if (resultado.ok) {
      mostrarMensagem('Ingrediente atualizado!')
      const r = await buscarReceita(editandoItem.produtoId)
      setReceitas(prev => ({ ...prev, [editandoItem.produtoId]: r }))
      setEditandoItem(null)
    } else {
      mostrarMensagem(resultado.message || 'Erro ao atualizar ingrediente')
    }
  }

  async function aoRemoverIngrediente(produtoId, receitaId, mpNome){
    if (!confirm(`Remover "${mpNome}" da lista de ingredientes?`)) return
    const resultado = await removerIngredienteReceita(produtoId, receitaId)
    if (resultado.ok) {
      mostrarMensagem('Ingrediente removido!')
      const r = await buscarReceita(produtoId)
      setReceitas(prev => ({ ...prev, [produtoId]: r }))
    } else {
      mostrarMensagem(resultado.message || 'Erro ao remover ingrediente')
    }
  }

  // ===================== PEDIDOS: FILTROS E FORMATAÇÃO =====================

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
    if (filtroDataDe){
      const de = new Date(filtroDataDe + 'T00:00:00')
      if (d < de) return false
    }
    if (filtroDataAte){
      const ate = new Date(filtroDataAte + 'T23:59:59.999')
      if (d > ate) return false
    }
    return true
  })

  const resumo = pedidosFiltrados.reduce((acc, pedido) => {
    acc[pedido.status] = (acc[pedido.status] || 0) + 1
    return acc
  }, {})

  const linhasNovo = linhasDe('novo')

  return (
    <div className="section-grid">
      <div className="page-title-row">
        <h2>Gerente</h2>
        <div className="badge">Atualizado: {ultimaAtualizacao || '-'}</div>
      </div>

      {mensagem && (
        <div className="stats-card" style={{ 
          background: mensagem.includes('Erro') || mensagem.includes('Atenção') ? '#fff3e0' : '#e8f5e9', 
          borderLeft: `4px solid ${mensagem.includes('Erro') || mensagem.includes('Atenção') ? '#f57c00' : '#388e3c'}`,
          color: mensagem.includes('Erro') || mensagem.includes('Atenção') ? '#e65100' : '#388e3c'
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
        <h3>Pedidos</h3>
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
              const total = (p.itens || []).reduce((soma, it) => soma + (it.precoUnitario ?? it.produto.preco) * it.quantidade, 0)
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
                    <div>{p.delivery ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f57c00', fontWeight: 'bold' }}>
                        <IconeMoto size={14} /> Delivery
                      </span>
                    ) : <>Mesa: <strong>{p.numeroMesa ?? 'N/A'}</strong></>}</div>
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
                    Excluir pedido
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== CADASTRAR NOVO PRODUTO (JÁ COM MATÉRIAS-PRIMAS) ===== */}
      <div>
        <h3>Cadastrar novo produto</h3>
        <form onSubmit={aoCriarProduto} className="stats-card" style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
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
          </div>

          <div style={{ borderTop: '1px dashed #ddd', paddingTop: '10px' }}>
            <strong>Matérias-primas do produto (lista de ingredientes)</strong>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
              Informe do que o produto é feito e quanto entra em cada unidade — ele sai pronto para venda.
            </div>
            {materiasPrimas.length === 0 && (
              <div style={{ fontSize: '0.85rem', color: '#e65100', background: '#fff3e0', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                Nenhuma matéria-prima cadastrada. Use o botão "Matérias-Primas / Insumos" acima antes de criar o produto.
              </div>
            )}
            {linhasNovo.map((linha, idx) => campoIngrediente('novo', linha, idx, linhasNovo.length === 1))}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="action-button secondary"
                onClick={() => adicionarLinha('novo')}
                style={{ padding: '8px 16px', background: '#7c83ff' }}
              >
                + Adicionar ingrediente
              </button>
            </div>
          </div>

          <button type="submit" className="action-button" style={{ padding: '10px 20px', fontSize: '1rem' }}>
            Cadastrar produto
          </button>
        </form>
      </div>

      {/* ===== PRODUTOS DO CARDÁPIO COM LISTA DE INGREDIENTES INTEGRADA ===== */}
      <div>
        <h3>Produtos do Cardápio</h3>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {produtos.length === 0 ? (
            <div className="stats-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>
              Nenhum produto cadastrado. Use o formulário acima para criar o primeiro.
            </div>
          ) : (
            produtos.map(p => {
              const qtdDisponivel = p.quantidadeDisponivel ?? 0
              const receitaAtual = receitas[p.id] || []
              const temReceita = receitaAtual.length > 0
              const semEstoque = qtdDisponivel <= 0
              const semReceita = !temReceita
              const custo = calcularCustoReceita(p.id)
              const margem = custo > 0 && p.preco > 0 ? (((p.preco - custo) / p.preco) * 100).toFixed(1) : null
              const linhasP = linhasDe(p.id)
              const listaVisivel = listasExibidas[p.id] ?? semReceita

              let statusLabel, statusColor, statusBg
              if (semReceita) {
                statusLabel = 'Sem lista de ingredientes'
                statusColor = '#f57c00'
                statusBg = '#fff3e0'
              } else if (semEstoque) {
                statusLabel = 'Indisponível (estoque 0)'
                statusColor = '#d32f2f'
                statusBg = '#ffebee'
              } else {
                statusLabel = `Disponível: ${qtdDisponivel} un.`
                statusColor = '#388e3c'
                statusBg = '#e8f5e9'
              }

              return (
                <div key={p.id} className="product-card" style={{ borderLeft: `4px solid ${statusColor}` }}>
                  {produtoEmEdicaoId === p.id ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
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
                        <button className="secondary" onClick={()=>salvarEdicaoProduto(p.id)} style={{ flex: 1 }}>Salvar</button>
                        <button className="secondary" onClick={cancelarEdicaoProduto} style={{ flex: 1 }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{p.nome}</strong>
                        <button className="secondary" onClick={()=>iniciarEdicaoProduto(p)} style={{ padding: '6px 12px' }}>Editar preço</button>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1976d2', margin: '8px 0' }}>
                        R$ {p.preco.toFixed(2)}
                      </div>

                      <div style={{ 
                        color: statusColor, 
                        fontWeight: 'bold',
                        padding: '8px',
                        background: statusBg,
                        borderRadius: '6px',
                        textAlign: 'center',
                        marginBottom: '8px'
                      }}>
                        {statusLabel}
                        {margem !== null && temReceita && (
                          <div style={{ fontSize: '0.85rem', fontWeight: 'normal', marginTop: '4px', color: margem >= 30 ? '#388e3c' : margem >= 15 ? '#f57c00' : '#d32f2f' }}>
                            Custo: R$ {custo.toFixed(2)} | Margem: {margem}%
                          </div>
                        )}
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
                          <strong>Produto sem lista de ingredientes — não pode ser vendido.</strong><br/>
                          Clique em "+ Adicionar ingrediente" abaixo para montar a lista.
                        </div>
                      )}

                      <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: '#333' }}>Lista de Ingredientes ({receitaAtual.length} itens)</h4>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => alternarLista(p.id)}
                            style={{ padding: '4px 12px', marginTop: 0, fontSize: '0.85rem' }}
                          >
                            {listaVisivel ? 'Ocultar' : 'Exibir'}
                          </button>
                        </div>

                        {listaVisivel && (
                          <>

                        <div style={{ 
                          background: '#fafafa', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          marginBottom: '12px',
                          border: '1px dashed #ddd'
                        }}>
                          {formIngAberto[p.id] ? (
                            <>
                              <h5 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Adicionar ingredientes</h5>
                              <form onSubmit={e => aoAdicionarIngredientes(p.id, e)}>
                                {linhasP.map((linha, idx) => campoIngrediente(p.id, linha, idx, linhasP.length === 1))}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => adicionarLinha(p.id)}
                                    style={{ padding: '8px 12px' }}
                                  >
                                    + Adicionar linha
                                  </button>
                                  <button type="submit" className="action-button" style={{ padding: '8px 16px' }}>
                                    Adicionar ingredientes
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => fecharFormIngrediente(p.id)}
                                    style={{ padding: '8px 16px' }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => abrirFormIngrediente(p.id)}
                                style={{ padding: '8px 16px' }}
                              >
                                + Adicionar ingrediente
                              </button>
                            </div>
                          )}
                        </div>

                        {receitaAtual.length === 0 ? (
                          <div className="stats-card" style={{ textAlign: 'center', padding: '16px', color: '#f57c00', fontSize: '0.85rem' }}>
                            Nenhum ingrediente cadastrado.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {receitaAtual.map(item => {
                              const mp = getMateriaPrima(item.materiaPrimaId)
                              const estoqueDisponivel = mp ? Number(mp.quantidade) : 0
                              const qtdNecessaria = Number(item.quantidade)
                              const maxUnidades = qtdNecessaria > 0 ? Math.floor(estoqueDisponivel / qtdNecessaria) : 0
                              const isEditing = !!editandoItem && editandoItem.receitaId === item.id
                              const opcoesEdicao = mp ? unidadesDaFamilia(mp.unidade) : []

                              return (
                                <div key={item.id} style={{ 
                                  background: isEditing ? '#e3f2fd' : 'white',
                                  border: '1px solid #eee',
                                  borderLeft: isEditing ? '4px solid #1976d2' : (maxUnidades === 0 ? '4px solid #d32f2f' : '4px solid #4caf50'),
                                  borderRadius: '6px',
                                  padding: '12px'
                                }}>
                                  {isEditing ? (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
                                      <div style={{ flex: 1, minWidth: '170px' }}>
                                        <strong>{mp?.nome || 'Ingrediente'}</strong>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginTop: '6px' }}>
                                          Quantidade por unidade
                                        </label>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          <input
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            value={editandoItem.quantidade}
                                            onChange={e => setEditandoItem({ ...editandoItem, quantidade: e.target.value })}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') { e.preventDefault(); aoSalvarEdicao() }
                                              if (e.key === 'Escape') { e.preventDefault(); cancelarEdicao() }
                                            }}
                                            autoFocus
                                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #dbe4ff' }}
                                          />
                                          <select
                                            value={opcoesEdicao.includes(editandoItem.unidade) ? editandoItem.unidade : (opcoesEdicao[0] || '')}
                                            onChange={e => trocarUnidadeEdicao(e.target.value)}
                                            disabled={opcoesEdicao.length <= 1}
                                            style={{
                                              padding: '8px 6px',
                                              borderRadius: '6px',
                                              border: '1px solid #dbe4ff',
                                              background: opcoesEdicao.length <= 1 ? '#f0f0f0' : 'white',
                                              fontSize: '0.85rem',
                                              fontWeight: 'bold'
                                            }}
                                          >
                                            {opcoesEdicao.length === 0 ? (
                                              <option value="">-</option>
                                            ) : (
                                              opcoesEdicao.map(u => <option key={u} value={u}>{u}</option>)
                                            )}
                                          </select>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                        <button className="action-button" onClick={aoSalvarEdicao} style={{ background: '#388e3c', height: 'fit-content' }}>
                                          Salvar
                                        </button>
                                        <button className="secondary" onClick={cancelarEdicao} style={{ height: 'fit-content' }}>
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <strong>{mp?.nome || 'Ingrediente'}</strong>
                                      <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '6px', paddingLeft: '12px', borderLeft: '3px solid #e0e0e0', display: 'grid', gap: '4px' }}>
                                        <div>Estoque: {estoqueDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {mp?.unidade || ''}</div>
                                        <div>Preço de custo: {mp?.precoCusto != null ? `R$ ${Number(mp.precoCusto).toFixed(2)} / ${mp.unidade || ''}` : '—'}</div>
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
                                        <button className="secondary" onClick={() => iniciarEdicao(p.id, item)} style={{ padding: '6px 12px' }}>Editar</button>
                                        <button className="secondary" onClick={() => aoRemoverIngrediente(p.id, item.id, mp?.nome || 'Ingrediente')} style={{ padding: '6px 12px', background: '#d32f2f', color: 'white' }}>Remover</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => aoExcluirProduto(p.id, p.nome)}
                    style={{ marginTop: '12px', background: '#d32f2f', width: '100%' }}
                  >
                    Excluir produto
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