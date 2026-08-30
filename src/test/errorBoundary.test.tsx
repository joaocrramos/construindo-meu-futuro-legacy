import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const ProblemChild = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Falha simulada para teste de ErrorBoundary')
  }
  return <div>Conteúdo normal e seguro</div>
}

describe('ErrorBoundary', () => {
  it('deve renderizar os filhos normalmente quando não há erro', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Conteúdo normal e seguro')).not.toBeNull()
  })

  it('deve capturar erro, exibir tela em pt-BR e NÃO expor stack trace', () => {
    // Suprime o console.error esperado do React durante o teste de lançamento
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    )

    // Título em pt-BR
    expect(screen.getByText('Ocorreu um erro inesperado')).not.toBeNull()

    // Explicação amigável sem stack trace
    expect(
      screen.getByText(/A aplicação encontrou uma instabilidade ao renderizar esta tela/i),
    ).not.toBeNull()

    // Botão de recarregar
    expect(screen.getByRole('button', { name: /Recarregar página/i })).not.toBeNull()

    // O texto do erro/stack trace técnico NÃO deve ser visível na tela
    expect(screen.queryByText(/Falha simulada para teste de ErrorBoundary/i)).toBeNull()
    expect(screen.queryByText(/at ProblemChild/i)).toBeNull()

    consoleErrorSpy.mockRestore()
  })

  it('deve acionar window.location.reload ao clicar no botão de recarregar', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    })

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    )

    const reloadButton = screen.getByRole('button', { name: /Recarregar página/i })
    fireEvent.click(reloadButton)

    expect(reloadMock).toHaveBeenCalledTimes(1)
    consoleErrorSpy.mockRestore()
  })
})
