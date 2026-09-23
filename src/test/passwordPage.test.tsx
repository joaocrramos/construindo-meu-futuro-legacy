import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AccountPasswordPage from '@/pages/account/Password'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ClientResponseError } from 'pocketbase'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

describe('Tela de Alteração de Senha (AccountPasswordPage)', () => {
  const mockRefreshAuth = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'usr_test_123',
        email: 'admin@construindomeufuturo.com',
        name: 'Administrador',
        role: 'admin',
        must_change_password: false,
      },
      token: 'fake-token',
      isAuthenticated: true,
      isAdmin: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshAuth: mockRefreshAuth,
    })
  })

  it('1. Renderiza o formulário com os três campos habilitados e labels associados', () => {
    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i) as HTMLInputElement
    const nPassInput = screen.getByLabelText(/^Nova Senha/i) as HTMLInputElement
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', {
      name: /Salvar Nova Senha/i,
    }) as HTMLButtonElement

    expect(currPassInput).toBeDefined()
    expect(currPassInput.disabled).toBe(false)
    expect(nPassInput).toBeDefined()
    expect(nPassInput.disabled).toBe(false)
    expect(cPassInput).toBeDefined()
    expect(cPassInput.disabled).toBe(false)
    expect(submitBtn).toBeDefined()
    expect(submitBtn.disabled).toBe(false)
  })

  it('2. Exibe alerta destacado quando must_change_password estiver true', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'usr_test_123',
        email: 'admin@construindomeufuturo.com',
        name: 'Administrador',
        role: 'admin',
        must_change_password: true,
      },
      token: 'fake-token',
      isAuthenticated: true,
      isAdmin: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshAuth: mockRefreshAuth,
    })

    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Troca Obrigatória de Senha/i)).toBeDefined()
    expect(
      screen.getByText(
        /Por segurança, você deve definir uma nova senha definitiva antes de prosseguir/i,
      ),
    ).toBeDefined()
  })

  it('3. Valida campos obrigatórios no submit', async () => {
    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const submitBtn = screen.getByRole('button', { name: /Salvar Nova Senha/i })
    fireEvent.click(submitBtn)

    expect(screen.getByText('A senha atual é obrigatória.')).toBeDefined()
    expect(screen.getByText('A nova senha é obrigatória.')).toBeDefined()
    expect(screen.getByText('A confirmação da nova senha é obrigatória.')).toBeDefined()
  })

  it('4. Valida tamanho mínimo de 8 caracteres para nova senha', async () => {
    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i)
    const nPassInput = screen.getByLabelText(/^Nova Senha/i)
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i)
    const submitBtn = screen.getByRole('button', { name: /Salvar Nova Senha/i })

    fireEvent.change(currPassInput, { target: { value: 'senha123' } })
    fireEvent.change(nPassInput, { target: { value: '12345' } })
    fireEvent.change(cPassInput, { target: { value: '12345' } })
    fireEvent.click(submitBtn)

    expect(screen.getByText('A nova senha deve ter no mínimo 8 caracteres.')).toBeDefined()
  })

  it('5. Valida divergência entre nova senha e confirmação', async () => {
    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i)
    const nPassInput = screen.getByLabelText(/^Nova Senha/i)
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i)
    const submitBtn = screen.getByRole('button', { name: /Salvar Nova Senha/i })

    fireEvent.change(currPassInput, { target: { value: 'senhaAtual123' } })
    fireEvent.change(nPassInput, { target: { value: 'NovaSenha@2026' } })
    fireEvent.change(cPassInput, { target: { value: 'OutraSenha@2026' } })
    fireEvent.click(submitBtn)

    expect(
      screen.getByText('A confirmação de senha não confere com a nova senha informada.'),
    ).toBeDefined()
  })

  it('6. Integra com pb.collection("users").update e limpa os campos em caso de sucesso', async () => {
    const updateSpy = vi.spyOn(pb.collection('users'), 'update').mockResolvedValueOnce({
      id: 'usr_test_123',
      email: 'admin@construindomeufuturo.com',
    } as any)

    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i) as HTMLInputElement
    const nPassInput = screen.getByLabelText(/^Nova Senha/i) as HTMLInputElement
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i) as HTMLInputElement
    const submitBtn = screen.getByRole('button', { name: /Salvar Nova Senha/i })

    fireEvent.change(currPassInput, { target: { value: 'SenhaTemporaria@123' } })
    fireEvent.change(nPassInput, { target: { value: 'NovaSenhaForte@456' } })
    fireEvent.change(cPassInput, { target: { value: 'NovaSenhaForte@456' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('usr_test_123', {
        oldPassword: 'SenhaTemporaria@123',
        password: 'NovaSenhaForte@456',
        passwordConfirm: 'NovaSenhaForte@456',
        must_change_password: false,
      })
    })

    await waitFor(() => {
      expect(mockRefreshAuth).toHaveBeenCalled()
      expect(screen.getByText(/Senha Alterada com Sucesso/i)).toBeDefined()
      expect(currPassInput.value).toBe('')
      expect(nPassInput.value).toBe('')
      expect(cPassInput.value).toBe('')
    })
  })

  it('7. Exibe erro amigável quando senha atual estiver incorreta', async () => {
    const clientError = new ClientResponseError({
      status: 400,
      response: {
        code: 400,
        message: 'Failed to update record.',
        data: {
          oldPassword: {
            code: 'validation_match_invalid',
            message: 'Failed to match the old password.',
          },
        },
      },
    })

    vi.spyOn(pb.collection('users'), 'update').mockRejectedValueOnce(clientError)

    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i)
    const nPassInput = screen.getByLabelText(/^Nova Senha/i)
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i)
    const submitBtn = screen.getByRole('button', { name: /Salvar Nova Senha/i })

    fireEvent.change(currPassInput, { target: { value: 'SenhaErrada@123' } })
    fireEvent.change(nPassInput, { target: { value: 'NovaSenhaForte@456' } })
    fireEvent.change(cPassInput, { target: { value: 'NovaSenhaForte@456' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('A senha atual está incorreta.')).toBeDefined()
    })
  })

  it('8. Exibe erro amigável ao receber HTTP 400 com validation_invalid_old_password', async () => {
    const clientError = new ClientResponseError({
      status: 400,
      response: {
        code: 400,
        message: 'Failed to update record.',
        data: {
          oldPassword: {
            code: 'validation_invalid_old_password',
            message: 'Missing or invalid old password.',
          },
        },
      },
    })

    vi.spyOn(pb.collection('users'), 'update').mockRejectedValueOnce(clientError)

    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i)
    const nPassInput = screen.getByLabelText(/^Nova Senha/i)
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i)
    const submitBtn = screen.getByRole('button', { name: /Salvar Nova Senha/i })

    // Simula usuário digitando com Caps Lock
    fireEvent.change(currPassInput, { target: { value: 'FUTURO2026!ADMIN' } })
    fireEvent.change(nPassInput, { target: { value: 'EADMQT.28' } })
    fireEvent.change(cPassInput, { target: { value: 'EADMQT.28' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('A senha atual está incorreta.')).toBeDefined()
    })
  })

  it('9. Inputs de senha possuem autoCapitalize="none", autoCorrect="off" e spellCheck=false', () => {
    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i)
    const nPassInput = screen.getByLabelText(/^Nova Senha/i)
    const cPassInput = screen.getByLabelText(/Confirmar Nova Senha/i)

    expect(currPassInput.getAttribute('autocapitalize')).toBe('none')
    expect(currPassInput.getAttribute('autocorrect')).toBe('off')
    expect(currPassInput.getAttribute('spellcheck')).toBe('false')

    expect(nPassInput.getAttribute('autocapitalize')).toBe('none')
    expect(nPassInput.getAttribute('autocorrect')).toBe('off')
    expect(nPassInput.getAttribute('spellcheck')).toBe('false')

    expect(cPassInput.getAttribute('autocapitalize')).toBe('none')
    expect(cPassInput.getAttribute('autocorrect')).toBe('off')
    expect(cPassInput.getAttribute('spellcheck')).toBe('false')
  })

  it('10. Exibe dica de maiúsculas e minúsculas quando o usuário digita a senha atual', () => {
    render(
      <MemoryRouter>
        <AccountPasswordPage />
      </MemoryRouter>,
    )

    const currPassInput = screen.getByLabelText(/Senha Atual/i)

    // Antes de digitar, a dica não deve aparecer
    expect(screen.queryByText('Atenção: a senha diferencia maiúsculas de minúsculas.')).toBeNull()

    // Ao digitar algo no campo de senha atual
    fireEvent.change(currPassInput, { target: { value: 'a' } })

    expect(screen.getByText('Atenção: a senha diferencia maiúsculas de minúsculas.')).toBeDefined()
  })
})
