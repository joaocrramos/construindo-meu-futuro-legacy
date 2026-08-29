import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '@/pages/public/Register'
import ForgotPasswordPage from '@/pages/public/ForgotPassword'
import FirstAccessPage from '@/pages/public/FirstAccess'
import AccountPasswordPage from '@/pages/account/Password'
import AccountProfilePage from '@/pages/account/Profile'
import { AuthProvider } from '@/contexts/AuthContext'

describe('Testes de Regressão de Telas e Fluxos Desabilitados (Sem Sucesso Falso)', () => {
  it('1. Cadastro por convite não aceita token fictício e exibe aviso de funcionalidade indisponível', () => {
    render(
      <MemoryRouter initialEntries={['/register?token=INV-FAKE-123']}>
        <RegisterPage />
      </MemoryRouter>,
    )

    // O campo de token deve estar desabilitado
    const inputToken = screen.getByLabelText(/Token do Convite/i) as HTMLInputElement
    expect(inputToken.disabled).toBe(true)

    // O botão principal deve estar desabilitado
    const submitButton = screen.getByRole('button', {
      name: /Cadastro Temporariamente Indisponível/i,
    }) as HTMLButtonElement
    expect(submitButton.disabled).toBe(true)

    // Deve exibir aviso em implementação
    expect(screen.queryByText(/Funcionalidade em Implementação/i)).not.toBeNull()
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

  it('4. Alteração de Senha na Conta exibe aviso e bloqueia submissão sem backend', () => {
    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    // Campos desabilitados
    const currPassInput = screen.getByLabelText(/Senha Atual/i) as HTMLInputElement
    const nPassInput = screen.getByLabelText(/^Nova Senha/i) as HTMLInputElement
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i) as HTMLInputElement

    expect(currPassInput.disabled).toBe(true)
    expect(nPassInput.disabled).toBe(true)
    expect(cPassInput.disabled).toBe(true)

    // Botão desabilitado
    const submitButton = screen.getByRole('button', {
      name: /Alteração Temporariamente Indisponível/i,
    }) as HTMLButtonElement
    expect(submitButton.disabled).toBe(true)

    // Não deve exibir sucesso simulado
    expect(screen.queryByText(/Senha Alterada/i)).toBeNull()
  })

  it('5. Atualização de Perfil na Conta exibe aviso e bloqueia persistência sem backend', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <AccountProfilePage />
        </MemoryRouter>
      </AuthProvider>,
    )

    // Campos bloqueados para edição
    const nameInput = screen.getByLabelText(/Nome Completo/i) as HTMLInputElement
    const phoneInput = screen.getByLabelText(/Telefone Celular/i) as HTMLInputElement

    expect(nameInput.disabled).toBe(true)
    expect(phoneInput.disabled).toBe(true)

    // Botão desabilitado
    const submitButton = screen.getByRole('button', {
      name: /Atualização Temporariamente Indisponível/i,
    }) as HTMLButtonElement
    expect(submitButton.disabled).toBe(true)

    // Não deve exibir indicação de Salvo
    expect(screen.queryByText(/Salvo!/i)).toBeNull()
  })
})
