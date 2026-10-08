// Camada que isola todas as chamadas HTTP ao backend.
// Cada função aqui devolve dados já tratados (ok/erro) para as páginas usarem
// sem precisar repetir lógica de fetch/headers/erros.

// Base da API: usa o MESMO hostname da página — "localhost" quando aberto
// nesta máquina e o IP da rede local quando aberto em outro dispositivo.
// Assim o sistema funciona liberado na rede sem ajuste em cada cliente.
const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080`

/** Rótulos amigáveis em português para os status do pedido (vindos da enum StatusPedido). */
export const ROTULOS_STATUS_PEDIDO = {
  NOVO: 'Novo',
  AGUARDANDO_PREPARO: 'Aguardando preparo',
  EM_PREPARO: 'Em preparo',
  PRONTO_PARA_PAGAMENTO: 'Pronto para pagamento',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
}

export function rotuloStatus(status){
  return ROTULOS_STATUS_PEDIDO[status] || status
}

// Helpers internos: sempre devolvem array, mesmo se a API falhar.
// Evita TypeError silencioso em .filter()/.map() nas páginas.
async function listaSegura(url){
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json().catch(() => [])
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

// ===================== PRODUTOS =====================

export async function buscarProdutos(){
  return listaSegura(`${API}/api/produtos`)
}

export async function buscarProdutosComDisponibilidade(){
  return listaSegura(`${API}/api/produtos/com-disponibilidade`)
}

export async function criarProduto({ nome, preco }){
  const res = await fetch(`${API}/api/produtos`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ nome, preco })
  })
  if (res.ok) return { ok: true, produto: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao cadastrar produto.' }
}

export async function atualizarProduto(id, { nome, preco }){
  const body = {}
  if (nome !== undefined) body.nome = nome
  if (preco !== undefined) body.preco = preco
  const res = await fetch(`${API}/api/produtos/${id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  if (res.ok) return { ok: true, produto: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao atualizar produto.' }
}

export async function removerProduto(id){
  const res = await fetch(`${API}/api/produtos/${id}`,{method:'DELETE'})
  if (res.status === 204 || res.ok) return { ok: true }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao remover produto.' }
}

// ===================== MATÉRIAS-PRIMAS =====================

export async function buscarMateriasPrimas(){
  return listaSegura(`${API}/api/materias-primas`)
}

export async function criarMateriaPrima({ nome, unidade, quantidade, precoCusto }){
  const res = await fetch(`${API}/api/materias-primas`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ nome, unidade, quantidade, precoCusto })
  })
  if (res.ok) return { ok: true, materiaPrima: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao cadastrar matéria-prima.' }
}

export async function atualizarMateriaPrima(id, { nome, unidade, precoCusto }){
  const body = {}
  if (nome !== undefined) body.nome = nome
  if (unidade !== undefined) body.unidade = unidade
  if (precoCusto !== undefined) body.precoCusto = precoCusto
  const res = await fetch(`${API}/api/materias-primas/${id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  if (res.ok) return { ok: true, materiaPrima: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao atualizar matéria-prima.' }
}

export async function ajustarEstoqueMateriaPrima(id, delta){
  const res = await fetch(`${API}/api/materias-primas/${id}/estoque?delta=${delta}`,{method:'PUT'})
  if (res.ok) return { ok: true, materiaPrima: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao ajustar estoque.' }
}

export async function definirQuantidadeMateriaPrima(id, quantidade){
  const res = await fetch(`${API}/api/materias-primas/${id}/quantidade?quantidade=${quantidade}`,{method:'PUT'})
  if (res.ok) return { ok: true, materiaPrima: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao definir estoque.' }
}

export async function removerMateriaPrima(id){
  const res = await fetch(`${API}/api/materias-primas/${id}`,{method:'DELETE'})
  if (res.status === 204 || res.ok) return { ok: true }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao remover matéria-prima.' }
}

// ===================== RECEITAS (LISTA DE INGREDIENTES) =====================

export async function buscarReceita(produtoId){
  return listaSegura(`${API}/api/produtos/${produtoId}/receita`)
}

export async function adicionarIngredienteReceita(produtoId, { materiaPrimaId, quantidade, observacao }){
  const res = await fetch(`${API}/api/produtos/${produtoId}/receita`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ materiaPrimaId, quantidade, observacao })
  })
  if (res.ok) return { ok: true, receita: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao adicionar ingrediente.' }
}

export async function atualizarIngredienteReceita(produtoId, receitaId, { quantidade, observacao }){
  const body = {}
  if (quantidade !== undefined) body.quantidade = quantidade
  if (observacao !== undefined) body.observacao = observacao
  const res = await fetch(`${API}/api/produtos/${produtoId}/receita/${receitaId}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  if (res.ok) return { ok: true, receita: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao atualizar ingrediente.' }
}

export async function removerIngredienteReceita(produtoId, receitaId){
  const res = await fetch(`${API}/api/produtos/${produtoId}/receita/${receitaId}`,{method:'DELETE'})
  if (res.status === 204 || res.ok) return { ok: true }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao remover ingrediente.' }
}

// ===================== ACESSO AO SISTEMA (LOGIN) =====================

/** Tenta entrar com nome + senha. Devolve { ok, usuario } ou { ok:false, message }. */
export async function entrar({ nome, senha }){
  const res = await fetch(`${API}/api/auth/login`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ nome, senha })
  })
  if (res.ok) return { ok: true, usuario: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Nome ou senha inválidos.' }
}

/** Cadastra um acesso ao sistema (papel + CPF + senha) — página do gerente. */
export async function criarAcesso({ nome, telefone, cpf, papel, senha }){
  const res = await fetch(`${API}/api/usuarios/acesso`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ nome, telefone, cpf, papel, senha })
  })
  if (res.ok) return { ok: true, usuario: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao cadastrar acesso.' }
}

/** Define/troca a senha do acesso de um usuário existente. */
export async function definirSenhaUsuario(id, senha){
  const res = await fetch(`${API}/api/usuarios/${id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ senha })
  })
  if (res.ok) return { ok: true, usuario: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao definir senha.' }
}

/** Define/troca o CPF do acesso de um usuário existente. */
export async function definirCpfUsuario(id, cpf){
  const res = await fetch(`${API}/api/usuarios/${id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ cpf })
  })
  if (res.ok) return { ok: true, usuario: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao definir CPF.' }
}

// ===================== USUARIOS =====================

export async function buscarUsuarios(){
  return listaSegura(`${API}/api/usuarios`)
}

export async function criarUsuario({ nome, papel, telefone }){
  const endpoint = papel === 'GARCOM' ? 'garcons' : 'clientes'
  const body = papel === 'CLIENTE' ? { nome, telefone } : { nome }
  const res = await fetch(`${API}/api/usuarios/${endpoint}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  if (res.ok) return { ok: true, usuario: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao cadastrar usuário.' }
}

export async function atualizarUsuario(id, { nome, telefone }){
  const body = {}
  if (nome !== undefined) body.nome = nome
  if (telefone !== undefined) body.telefone = telefone
  const res = await fetch(`${API}/api/usuarios/${id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  if (res.ok) return { ok: true, usuario: await res.json() }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao atualizar usuário.' }
}

export async function removerUsuario(id){
  const res = await fetch(`${API}/api/usuarios/${id}`,{
    method:'DELETE',
    headers:{'Content-Type':'application/json'}
  })
  if (res.status === 204 || res.ok) return { ok: true }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao remover usuário.' }
}

// ===================== PEDIDOS =====================

export async function criarPedido(pedido){
  const res = await fetch(`${API}/api/pedidos`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(pedido)
  })
  // Resposta em JSON quando ok, em text/plain quando erro de validação (400).
  // Por isso checamos res.ok antes de chamar res.json() — senão estoura SyntaxError.
  if (res.ok) {
    const pedidoSalvo = await res.json().catch(() => null)
    return { ok: true, pedido: pedidoSalvo }
  }
  const message = await res.text().catch(() => '')
  return { ok: false, message: message || 'Erro ao criar pedido.' }
}

export async function listarPedidos(){
  return listaSegura(`${API}/api/pedidos`)
}

export async function atualizarStatusPedido(id, status){
  const res = await fetch(`${API}/api/pedidos/${id}/status?status=${status}`,{method:'PUT'})
  if (res.ok) return { ok: true, pedido: await res.json().catch(() => null) }
  const message = await res.text().catch(() => '')
  return { ok: false, message: message || 'Erro ao atualizar status.' }
}

export async function removerPedido(id){
  const res = await fetch(`${API}/api/pedidos/${id}`,{method:'DELETE'})
  if (res.status === 204 || res.ok) return { ok: true }
  const message = await res.text().catch(()=>'')
  return { ok: false, message: message || 'Erro ao remover pedido.' }
}