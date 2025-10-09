import { renderToString } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renderiza layout principal com navegação', () => {
    const markup = renderToString(<App />)

    expect(markup).toContain('Diságua')
    expect(markup).toContain('Parceiros')
    expect(markup).toContain('Importar Comprovantes')
    expect(markup).toContain('Relatórios')
    expect(markup).toContain('Carregando página')
  })
})
