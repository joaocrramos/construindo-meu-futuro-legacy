import { ClientResponseError } from 'pocketbase'

export interface AppErrorDetails {
  title: string
  message: string
  fieldErrors?: Record<string, string>
  statusCode?: number
  isTechnical?: boolean
}

/**
 * Mapeia erros do PocketBase ou exceções gerais em mensagens amigáveis em português do Brasil,
 * garantindo que detalhes técnicos ou sensíveis não vazem para o usuário.
 */
export function parseAppError(error: unknown): AppErrorDetails {
  if (error instanceof ClientResponseError) {
    const status = error.status
    const rawData = error.response?.data
    const fieldErrors: Record<string, string> = {}

    if (rawData && typeof rawData === 'object') {
      for (const [key, val] of Object.entries(rawData)) {
        if (val && typeof val === 'object' && 'message' in val) {
          fieldErrors[key] = String((val as { message: unknown }).message)
        } else if (typeof val === 'string') {
          fieldErrors[key] = val
        }
      }
    }

    switch (status) {
      case 400:
        return {
          title: 'Dados inválidos',
          message: 'Por favor, revise os dados informados no formulário.',
          fieldErrors,
          statusCode: 400,
        }
      case 401:
        return {
          title: 'Não autenticado',
          message: 'Sua sessão expirou ou você não está autenticado. Faça login novamente.',
          statusCode: 401,
        }
      case 403:
        return {
          title: 'Acesso negado',
          message: 'Você não possui permissão para executar esta operação.',
          statusCode: 403,
        }
      case 404:
        return {
          title: 'Registro não encontrado',
          message: 'O recurso solicitado não existe ou foi removido.',
          statusCode: 404,
        }
      case 429:
        return {
          title: 'Muitas requisições',
          message: 'Você realizou muitas tentativas em pouco tempo. Aguarde alguns instantes.',
          statusCode: 429,
        }
      case 500:
      case 502:
      case 503:
        return {
          title: 'Instabilidade temporária',
          message: 'O servidor está temporariamente indisponível. Tente novamente em instantes.',
          statusCode: status,
        }
      default:
        return {
          title: 'Falha na operação',
          message: 'Não foi possível concluir a ação no momento.',
          fieldErrors,
          statusCode: status,
        }
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        title: 'Falha de conexão',
        message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
      }
    }

    return {
      title: 'Aviso do sistema',
      message: error.message || 'Ocorreu um erro inesperado.',
      isTechnical: false,
    }
  }

  return {
    title: 'Erro inesperado',
    message: 'Ocorreu uma falha imprevista. Por favor, tente novamente mais tarde.',
  }
}
