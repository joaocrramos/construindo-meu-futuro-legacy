import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '@/pages/public/Register'
import ForgotPasswordPage from '@/pages/public/ForgotPassword'
import FirstAccessPage from '@/pages/public/FirstAccess'
import AccountProfilePage from '@/pages/account/Profile'
import AccountSessionsPage from '@/pages/account/Sessions'
import { AuthProvider } from '@/contexts/AuthContext'

describe('Testes de Regressão de Telas e Fluxos Desabilitados (Sem Sucesso Falso)', () => {
  it('1. Cadastro por convite exige validação e bloqueia autocadastro sem token', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>,
    )

    // Exibe campo de token para validação manual quando acessado sem parâmetro
    const inputToken = screen.getByLabelText(/Token do Convite/i) as HTMLInputElement
    expect(inputToken).not.toBeNull()

    // O botão de verificação deve existir
    const submitButton = screen.getByRole('button', {
      name: /Verificar e Continuar/i,
    }) as HTMLButtonElement
    expect(submitButton).not.toBeNull()

    // Política de acesso restrito deve estar presente
    expect(screen.getByText(/Política de Acesso Restrito/i)).not.toBeNull()
  })

  it('2. Recuperação de Senha exibe aviso de implementação e não simula envio de e-mail', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    )

    // O input de e-mail deve estar desabilitado
    const emailInput = screen.getByLabelText(/E-mail da Conta/i) as HTMLInputElement
    expect(emailInput.disabled).toBe(true)

    // O botão deve estar desabilitado
    const submitButton = screen.getByRole('button', {
      name: /Recuperação Temporariamente Indisponível/i,
    }) as HTMLButtonElement
    expect(submitButton.disabled).toBe(true)

    // Não deve conter mensagem de sucesso falso de instruções enviadas
    expect(screen.queryByText(/Instruções enviadas/i)).toBeNull()
    expect(screen.queryByText(/Funcionalidade em Implementação/i)).not.toBeNull()
  })

  it('3. Primeiro Acesso exibe aviso de implementação e não simula ativação ou redirecionamento', () => {
    render(
      <MemoryRouter>
        <FirstAccessPage />
      </MemoryRouter>,
    )

    // Campos desabilitados
    const codeInput = screen.getByLabelText(/Código Temporário de Acesso/i) as HTMLInputElement
    const passInput = screen.getByLabelText(/^Nova Senha Definitiva/i) as HTMLInputElement
    const cpassInput = screen.getByLabelText(/Confirmar Nova Senha/i) as HTMLInputElement

    expect(codeInput.disabled).toBe(true)
    expect(passInput.disabled).toBe(true)
    expect(cpassInput.disabled).toBe(true)

    // Botão desabilitado
    const submitButton = screen.getByRole('button', {
      name: /Ativação Temporariamente Indisponível/i,
    }) as HTMLButtonElement
    expect(submitButton.disabled).toBe(true)

    // Não deve conter alerta de sucesso falso
    expect(screen.queryByText(/Credencial Ativada!/i)).toBeNull()
  })

  it('5. Atualização de Perfil na Conta exibe aviso e bloqueia persistência sem backend', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <AccountProfilePage />
        </MemoryRouter>
      </AuthProvider>,
    )

    // Aba Dados: e-mail centralizado bloqueado para edição
    const emailInput = screen.getByLabelText(/E-mail/i) as HTMLInputElement
    expect(emailInput.disabled).toBe(true)

    // Alerta explicativo de bloqueio / administração centralizada
    expect(
      screen.getByText(/Para alterar seu e-mail de acesso, contate um administrador do sistema/i),
    ).not.toBeNull()

    // Não deve exibir indicação de Salvo sem submissão
    expect(screen.queryByText(/Salvo!/i)).toBeNull()
  })

  it('6. Sessões Ativas exibe aviso de implementação, botão desabilitado e não simula card de sessão ativa', () => {
    render(
      <MemoryRouter>
        <AccountSessionsPage />
      </MemoryRouter>,
    )

    // Botão desabilitado
    const submitButton = screen.getByRole('button', {
      name: /Gestão de Sessões Temporariamente Indisponível/i,
    }) as HTMLButtonElement
    expect(submitButton.disabled).toBe(true)

    // Deve exibir aviso de funcionalidade em implementação
    expect(screen.queryByText(/Funcionalidade em Implementação/i)).not.toBeNull()

    // NÃO deve exibir card simulando sessão ativa ou "Conectado agora"
    expect(screen.queryByText(/Navegador Atual \(Sessão Atual\)/i)).toBeNull()
    expect(screen.queryByText(/Conectado agora/i)).toBeNull()
    expect(screen.queryByText(/Desconectar Outras Sessões/i)).toBeNull()
  })
})
