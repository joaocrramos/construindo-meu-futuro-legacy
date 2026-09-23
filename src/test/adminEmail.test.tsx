import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminEmailPage from '@/pages/admin/Email'
import pb from '@/lib/pocketbase/client'

vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    send: vi.fn(),
  },
}))

describe('AdminEmailPage - E-mail de Teste e Status Resend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Renderiza os status das variáveis de ambiente Resend', async () => {
    vi.mocked(pb.send).mockImplementation(async (path) => {
      if (path === '/backend/v1/admin/email-status') {
        return {
          resend_configured: true,
          has_resend_api_key: true,
          has_from_email: true,
          from_email: 'contato@construindomeufuturo.com',
          has_from_name: true,
          from_name: 'Construindo Meu Futuro',
          has_site_url: true,
          site_url: 'https://construindomeufuturo.com',
        }
      }
      return {}
    })

    render(<AdminEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('Ativo & Configurado')).not.toBeNull()
    })

    expect(screen.getByText('Presente no Backend')).not.toBeNull()
    expect(screen.getAllByText('Enviar E-mail de Teste').length).toBeGreaterThan(0)
  })

  it('2. Dispara e-mail de teste com sucesso e exibe feedback em pt-BR', async () => {
    vi.mocked(pb.send).mockImplementation(async (path, options) => {
      if (path === '/backend/v1/admin/email-status') {
        return {
          resend_configured: true,
          has_resend_api_key: true,
          has_from_email: true,
          from_email: 'contato@construindomeufuturo.com',
          has_from_name: true,
          from_name: 'Construindo Meu Futuro',
          has_site_url: true,
          site_url: 'https://construindomeufuturo.com',
        }
      }
      if (path === '/backend/v1/email/test') {
        const body = (options as { body?: { email?: string } })?.body
        return {
          success: true,
          message: `E-mail de teste enviado para ${body?.email}`,
          resend_id: 're_123456',
        }
      }
      return {}
    })

    render(<AdminEmailPage />)

    const input = await screen.findByPlaceholderText('ex.: seu-email@exemplo.com')
    const button = screen.getByRole('button', { name: /Enviar E-mail de Teste/i })

    fireEvent.change(input, { target: { value: 'gestor@exemplo.com' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(pb.send).toHaveBeenCalledWith('/backend/v1/email/test', {
        method: 'POST',
        body: { email: 'gestor@exemplo.com' },
      })
    })

    const successEl = await screen.findByText('E-mail de teste enviado para gestor@exemplo.com')
    expect(successEl).not.toBeNull()
  })

  it('3. Trata falha no envio de teste e exibe mensagem amigável sem estourar 500', async () => {
    vi.mocked(pb.send).mockImplementation(async (path) => {
      if (path === '/backend/v1/admin/email-status') {
        return {
          resend_configured: false,
          has_resend_api_key: false,
          has_from_email: false,
          from_email: 'contato@construindomeufuturo.com (padrão)',
          has_from_name: false,
          from_name: 'Construindo Meu Futuro (padrão)',
          has_site_url: false,
          site_url: 'https://construindomeufuturo.com (padrão)',
        }
      }
      if (path === '/backend/v1/email/test') {
        const err = Object.assign(new Error('Falha ao enviar via Resend: Chave de API inválida'), {
          data: {
            code: 'RESEND_API_ERROR',
            message: 'Falha ao enviar via Resend: Chave de API inválida',
          },
        })
        throw err
      }
      return {}
    })

    render(<AdminEmailPage />)

    const input = await screen.findByPlaceholderText('ex.: seu-email@exemplo.com')
    const button = screen.getByRole('button', { name: /Enviar E-mail de Teste/i })

    fireEvent.change(input, { target: { value: 'teste@dominio.com' } })
    fireEvent.click(button)

    const errorEl = await screen.findByText('Falha ao enviar via Resend: Chave de API inválida')
    expect(errorEl).not.toBeNull()
  })
})
