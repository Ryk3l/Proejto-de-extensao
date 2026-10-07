import React from 'react'
import Garcom from './paginas/Garcom'
import Cozinha from './paginas/Cozinha'
import Balcao from './paginas/Balcao'
import Gerente from './paginas/Gerente'
import CadastroGarcons from './paginas/CadastroGarcons'
import CadastroClientes from './paginas/CadastroClientes'
import CadastroMateriasPrimas from './paginas/CadastroMateriasPrimas'
import GerenciarReceita from './paginas/GerenciarReceita'
import './estilos.css'

/**
 * Componente raiz da aplicação.
 * Controla qual página está visível com base no estado "pagina".
 * Como o projeto é pequeno, não usamos router — só renderização condicional.
 */
export default function App(){
  const [pagina, setPagina] = React.useState('garcom')
  const rotulosPagina = {
    garcom: 'Garçom',
    cozinha: 'Cozinha',
    balcao: 'Balcão',
    gerente: 'Gerente',
    'cadastro-garcom': 'Cadastro de Garçons',
    'cadastro-cliente': 'Cadastro de Clientes',
    'cadastro-materias-primas': 'Matérias-Primas',
    'gerenciar-receita': 'Fichas Técnicas',
  }
  return (
    <div className="app-shell">
      <div className="page-title-row">
        <h1>Rodovia Lanches</h1>
        <div className="badge">Página: {rotulosPagina[pagina] || ''}</div>
      </div>
      <div className="top-nav">
        <button className={pagina==='garcom' ? 'active' : ''} onClick={()=>setPagina('garcom')}>Garçom</button>
        <button className={pagina==='cozinha' ? 'active' : ''} onClick={()=>setPagina('cozinha')}>Cozinha</button>
        <button className={pagina==='balcao' ? 'active' : ''} onClick={()=>setPagina('balcao')}>Balcão</button>
        <button className={pagina==='gerente' ? 'active' : ''} onClick={()=>setPagina('gerente')}>Gerente</button>
        <button className={pagina==='cadastro-garcom' ? 'active' : ''} onClick={()=>setPagina('cadastro-garcom')}>Cadastro Garçom</button>
        <button className={pagina==='cadastro-cliente' ? 'active' : ''} onClick={()=>setPagina('cadastro-cliente')}>Cadastro Cliente</button>
        <button className={pagina==='cadastro-materias-primas' ? 'active' : ''} onClick={()=>setPagina('cadastro-materias-primas')}>Matérias-Primas</button>
        <button className={pagina==='gerenciar-receita' ? 'active' : ''} onClick={()=>setPagina('gerenciar-receita')}>Fichas Técnicas</button>
      </div>
      <div className="page-card">
        {pagina==='garcom' && <Garcom />}
        {pagina==='cozinha' && <Cozinha />}
        {pagina==='balcao' && <Balcao />}
        {pagina==='gerente' && <Gerente />}
        {pagina==='cadastro-garcom' && <CadastroGarcons />}
        {pagina==='cadastro-cliente' && <CadastroClientes />}
        {pagina==='cadastro-materias-primas' && <CadastroMateriasPrimas />}
        {pagina==='gerenciar-receita' && <GerenciarReceita />}
      </div>
    </div>
  )
}