import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renderiza título', () => {
    const html = renderToString(<App />)
    expect(html).toContain('App DisÁgua')
  })
})

