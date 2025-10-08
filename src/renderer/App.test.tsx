import { renderToString } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renderiza título e estados iniciais', () => {
    const markup = renderToString(<App />)

    expect(markup).toContain('App DisÁgua')
    expect(markup).toContain('Buscar parceiros...')
    expect(markup).toContain('Filtrar por nome, documento ou email')
    expect(markup).toContain('Filtrar relatórios por parceiro')
    expect(markup).toContain('Todos os parceiros')
    expect(markup).toContain('Filtrar vouchers por status')
    expect(markup).toContain('Filtrar vouchers por parceiro')
    expect(markup).toContain('Todos os vouchers')
    expect(markup).toContain('Todos os parceiros')
    expect(markup).toContain('Carregando resumo...')
    expect(markup).toContain('Carregando parceiros...')
    expect(markup).toContain('Carregando relatórios...')
    expect(markup).toContain('Carregando vouchers...')
  })
})

