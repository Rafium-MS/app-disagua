import { render, screen } from '@testing-library/react'
import App from './App'

it('renderiza título', () => {
  render(<App />)
  expect(screen.getByText(/App DisÁgua/i)).toBeInTheDocument()
})

