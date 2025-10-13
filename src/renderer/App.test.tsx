import { renderToString } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renderiza layout principal com navegação', () => {
    const markup = renderToString(<App />)

    expect(markup).toContain('Gerenciador de Parceiros')
    expect(markup).toContain('Acesse sua conta para continuar')
  })
})
