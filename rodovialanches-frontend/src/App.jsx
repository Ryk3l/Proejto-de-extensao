import React from 'react'
import Garcom from './paginas/Garcom'
import Cozinha from './paginas/Cozinha'
import Balcao from './paginas/Balcao'
import Gerente from './paginas/Gerente'
import CadastroGarcons from './paginas/CadastroGarcons'
import CadastroClientes from './paginas/CadastroClientes'
import CadastroMateriasPrimas from './paginas/CadastroMateriasPrimas'
import CadastroAcesso from './paginas/CadastroAcesso'
import TelaAcesso from './paginas/TelaAcesso'
import './estilos.css'

// Páginas que cada papel pode ver. GERENTE = null significa "todas".
const PAGINAS_POR_PAPEL = {
  GERENTE: null,
  COZINHA: ['cozinha'],
  GARCOM: ['garcom'],
  BALCAO: ['balcao'],
}

// Página inicial de cada papel quando entra no sistema.
const PAGINA_INICIAL = {
  GERENTE: 'gerente',
  COZINHA: 'cozinha',
  GARCOM: 'garcom',
  BALCAO: 'balcao',
}

// Menu completo — é filtrado pela permissão do papel de quem entrou.
const ITENS_MENU = [
  { id: 'garcom', rotulo: 'Garçom' },
  { id: 'cozinha', rotulo: 'Cozinha' },
  { id: 'balcao', rotulo: 'Balcão' },
  { id: 'gerente', rotulo: 'Gerente' },
  { id: 'cadastro-garcom', rotulo: 'Cadastro Garçom' },
  { id: 'cadastro-cliente', rotulo: 'Cadastro Cliente' },
  { id: 'cadastro-materias-primas', rotulo: 'Matérias-Primas' },
  { id: 'cadastro-acesso', rotulo: 'Cadastro de Acesso' },
]

const ROTULOS_PAPEL = {
  GERENTE: 'Gerente',
  COZINHA: 'Cozinha',
  GARCOM: 'Garçom',
  BALCAO: 'Balcão',
}

/** Lê a sessão salva (ou null = não está logado). */
function carregarSessao(){
  try {
    const salvo = window.sessionStorage.getItem('rodovia-usuario')
    return salvo ? JSON.parse(salvo) : null
  } catch {
    return null
  }
}

/**
 * Componente raiz da aplicação.
 * - Sem sessão → mostra a tela de acesso (login com senha).
 * - Com sessão → barra lateral + conteúdo, liberando SOMENTE as páginas
 *   do papel do usuário (GERENTE vê todas, inclusive o Cadastro de Acesso).
 * Navegação via hash (sem router).
 */
export default function App(){
  const [usuario, setUsuario] = React.useState(carregarSessao)
  const [pagina, setPagina] = React.useState(() => {
    const h = window.location.hash.replace('#', '')
    if (h) return h
    return (usuario && PAGINA_INICIAL[usuario.papel]) || 'garcom'
  })

  // Barra lateral: aberta/fechada. Abre sempre no desktop e começa fechada
  // no celular (pouco espaço); a preferência fica salva no navegador.
  const [sidebarAberta, setSidebarAberta] = React.useState(() => {
    const salvo = window.localStorage.getItem('rodovia-sidebar')
    if (salvo !== null) return salvo === 'aberta'
    return window.innerWidth > 720
  })

  React.useEffect(() => {
    window.localStorage.setItem('rodovia-sidebar', sidebarAberta ? 'aberta' : 'fechada')
  }, [sidebarAberta])

  // Navegação via hash da URL: permite que outras páginas (ex: Gerente)
  // abram uma seção usando window.location.hash = 'cadastro-materias-primas'
  React.useEffect(()=>{
    const aoMudarHash = () => {
      const h = window.location.hash.replace('#','')
      if (h) setPagina(h)
    }
    window.addEventListener('hashchange', aoMudarHash)
    aoMudarHash()
    return () => window.removeEventListener('hashchange', aoMudarHash)
  },[])

  /** true se o papel de quem está logado pode ver a página. */
  function podeVer(id){
    if (!usuario) return false
    const lista = PAGINAS_POR_PAPEL[usuario.papel]
    if (lista === null) return true // gerente: acesso total
    return Array.isArray(lista) && lista.includes(id)
  }

  function paginaInicialDoUsuario(){
    return (usuario && PAGINA_INICIAL[usuario.papel]) || 'garcom'
  }

  function aoEntrar(u){
    window.sessionStorage.setItem('rodovia-usuario', JSON.stringify(u))
    setUsuario(u)
    const inicial = PAGINA_INICIAL[u.papel] || 'garcom'
    setPagina(inicial)
    window.location.hash = inicial
  }

  function aoSair(){
    window.sessionStorage.removeItem('rodovia-usuario')
    setUsuario(null)
  }

  // Sem sessão → só a tela de acesso.
  if (!usuario) return <TelaAcesso onEntrar={aoEntrar} />

  const rotulosPagina = {
    garcom: 'Garçom',
    cozinha: 'Cozinha',
    balcao: 'Balcão',
    gerente: 'Gerente',
    'cadastro-garcom': 'Cadastro de Garçons',
    'cadastro-cliente': 'Cadastro de Clientes',
    'cadastro-materias-primas': 'Matérias-Primas',
    'cadastro-acesso': 'Cadastro de Acesso',
  }

  return (
    <div className={sidebarAberta ? 'app-shell' : 'app-shell sidebar-minimizada'}>
      {/* Topo: título no canto superior esquerdo + botão que minimiza/abre a barra lateral */}
      <header className="topbar">
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={sidebarAberta}
          onClick={() => setSidebarAberta(a => !a)}
        >
          {sidebarAberta ? 'Fechar menu' : 'Abrir menu'}
        </button>
        <h1>Rodovia Lanches</h1>
        <div className="badge">Página: {rotulosPagina[pagina] || ''}</div>
        <span className="topbar-usuario">{usuario.nome} · {ROTULOS_PAPEL[usuario.papel] || usuario.papel}</span>
        <button type="button" className="topbar-sair" onClick={aoSair}>Sair</button>
      </header>
      <div className="app-corpo">
        {/* Menu vertical à esquerda — apenas as páginas do papel */}
        <aside className="sidebar">
          <nav className="side-nav">
            {ITENS_MENU.filter(item => podeVer(item.id)).map(item => (
              <button
                key={item.id}
                className={pagina === item.id ? 'active' : ''}
                onClick={() => setPagina(item.id)}
              >
                {item.rotulo}
              </button>
            ))}
          </nav>
        </aside>
        {!podeVer(pagina) ? (
          /* Guarda de acesso: página fora do papel mostra aviso, nunca o conteúdo. */
          <div className="page-card acesso-negado">
            <h2>Acesso negado</h2>
            <p>Você não tem permissão para acessar esta página.</p>
            <button
              type="button"
              className="action-button"
              onClick={() => {
                const inicial = paginaInicialDoUsuario()
                setPagina(inicial)
                window.location.hash = inicial
              }}
            >
              Ir para minha página
            </button>
          </div>
        ) : (
          <div className="page-card">
            {pagina==='garcom' && <Garcom />}
            {pagina==='cozinha' && <Cozinha />}
            {pagina==='balcao' && <Balcao />}
            {pagina==='gerente' && <Gerente />}
            {pagina==='cadastro-garcom' && <CadastroGarcons />}
            {pagina==='cadastro-cliente' && <CadastroClientes />}
            {pagina==='cadastro-materias-primas' && <CadastroMateriasPrimas />}
            {pagina==='cadastro-acesso' && <CadastroAcesso />}
          </div>
        )}
      </div>
    </div>
  )
}
