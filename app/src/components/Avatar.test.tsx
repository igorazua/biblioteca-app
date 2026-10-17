// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Avatar } from './ui'

afterEach(cleanup)

describe('Avatar', () => {
  it('renderiza iniciales y color cuando no hay url', () => {
    render(<Avatar name="Igor Arroyo" color="#F5B544" size={40} />)
    const span = screen.getByLabelText('Igor Arroyo')
    expect(span).toBeDefined()
    expect(span.textContent).toBe('IA')
    expect(span.getAttribute('style')).toContain('background: #F5B544')
  })

  it('renderiza una etiqueta img cuando se pasa url', () => {
    render(<Avatar name="Igor Arroyo" color="#F5B544" url="https://example.com/avatar.webp" size={40} />)
    const img = screen.getByRole('img', { name: 'Igor Arroyo' })
    expect(img).toBeDefined()
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.webp')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('cae a iniciales si la imagen falla al cargar (onError)', () => {
    render(<Avatar name="Igor Arroyo" color="#F5B544" url="https://broken-url.com/avatar.webp" size={40} />)
    const img = screen.getByRole('img', { name: 'Igor Arroyo' })
    expect(img).toBeDefined()

    // Simular error al cargar la imagen
    fireEvent.error(img)

    // Ahora debe mostrar las iniciales
    const span = screen.getByLabelText('Igor Arroyo')
    expect(span).toBeDefined()
    expect(span.textContent).toBe('IA')
  })
})
