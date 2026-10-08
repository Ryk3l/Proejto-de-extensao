import React from 'react'
import Garcom from './paginas/Garcom'
import Cozinha from './paginas/Cozinha'
import Balcao from './paginas/Balcao'
import Gerente from './paginas/Gerente'
import CadastroGarcons from './paginas/CadastroGarcons'
import CadastroClientes from './paginas/CadastroClientes'
import CadastroMateriasPrimas from './paginas/CadastroMateriasPrimas'
import './estilos.css'

/**
 * Componente raiz da aplicação.
 * Controla qual página está visível com base no estado "pagina".
 * Como o projeto é pequeno, não usamos router — só renderização condicional.
 */
export default function App(){
  const [pagina, setPagina] = React.useState('garcom')

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

  const rotulosPagina = {
    garcom: 'Garçom',
    cozinha: 'Cozinha',
    balcao: 'Balcão',
    gerente: 'Gerente',
    'cadastro-garcom': 'Cadastro de Garçons',
    'cadastro-cliente': 'Cadastro de Clientes',
    'cadastro-materias-primas': 'Matérias-Primas',
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
      </header>
      <div className="app-corpo">
        {/* Menu vertical à esquerda */}
        <aside className="sidebar">
          <nav className="side-nav">
            <button className={pagina==='garcom' ? 'active' : ''} onClick={()=>setPagina('garcom')}>Garçom</button>
            <button className={pagina==='cozinha' ? 'active' : ''} onClick={()=>setPagina('cozinha')}>Cozinha</button>
            <button className={pagina==='balcao' ? 'active' : ''} onClick={()=>setPagina('balcao')}>Balcão</button>
            <button className={pagina==='gerente' ? 'active' : ''} onClick={()=>setPagina('gerente')}>Gerente</button>
            <button className={pagina==='cadastro-garcom' ? 'active' : ''} onClick={()=>setPagina('cadastro-garcom')}>Cadastro Garçom</button>
            <button className={pagina==='cadastro-cliente' ? 'active' : ''} onClick={()=>setPagina('cadastro-cliente')}>Cadastro Cliente</button>
            <button className={pagina==='cadastro-materias-primas' ? 'active' : ''} onClick={()=>setPagina('cadastro-materias-primas')}>Matérias-Primas</button>
          </nav>
        </aside>
        <div className="page-card">
          {pagina==='garcom' && <Garcom />}
          {pagina==='cozinha' && <Cozinha />}
          {pagina==='balcao' && <Balcao />}
          {pagina==='gerente' && <Gerente />}
          {pagina==='cadastro-garcom' && <CadastroGarcons />}
          {pagina==='cadastro-cliente' && <CadastroClientes />}
          {pagina==='cadastro-materias-primas' && <CadastroMateriasPrimas />}
        </div>
      </div>
    </div>
  )
}