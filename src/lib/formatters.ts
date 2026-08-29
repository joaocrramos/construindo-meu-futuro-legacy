export interface CurrencyFormatOptions {
  /**
   * Se deve mostrar o símbolo da moeda ('R$'). Padrão: true.
   */
  showSymbol?: boolean
  /**
   * Casas decimais. Padrão: 2.
   */
  decimals?: number
  /**
   * Valor padrão quando for nulo, indefinido ou inválido. Padrão: '—'.
   */
  fallback?: string
  /**
   * Se true, força o sinal positivo '+' para valores maiores que zero.
   */
  showPositiveSign?: boolean
  /**
   * Indicador visual de tipo de valor: 'bruto', 'liquido' ou nenhum.
   */
  type?: 'bruto' | 'liquido' | 'nominal'
}

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (pt-BR - R$ 0,00).
 * Seguro para valores nulos, strings numéricas, undefined e NaN.
 */
export function formatCurrencyBRL(
  value: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  const {
    showSymbol = true,
    decimals = 2,
    fallback = '—',
    showPositiveSign = false,
    type,
  } = options

  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const numericValue =
    typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) : value

  if (Number.isNaN(numericValue) || !Number.isFinite(numericValue)) {
    return fallback
  }

  const isPositive = numericValue > 0
  const isNegative = numericValue < 0
  const absValue = Math.abs(numericValue)

  const formattedNumber = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absValue)

  let prefix = ''
  if (isNegative) {
    prefix = '- '
  } else if (showPositiveSign && isPositive) {
    prefix = '+ '
  }

  const symbolStr = showSymbol ? 'R$ ' : ''
  const typeSuffix = type === 'bruto' ? ' (Bruto)' : type === 'liquido' ? ' (Líquido)' : ''

  return `${prefix}${symbolStr}${formattedNumber}${typeSuffix}`
}

/**
 * Formata percentuais no padrão brasileiro (ex: +12,45% ou -3,20%).
 */
export function formatPercentBRL(
  value: number | string | null | undefined,
  options: { decimals?: number; showPositiveSign?: boolean; fallback?: string } = {},
): string {
  const { decimals = 2, showPositiveSign = true, fallback = '—' } = options

  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const numericValue =
    typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) : value

  if (Number.isNaN(numericValue) || !Number.isFinite(numericValue)) {
    return fallback
  }

  const isPositive = numericValue > 0
  const isNegative = numericValue < 0
  const absValue = Math.abs(numericValue)

  const formattedNumber = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absValue)

  let prefix = ''
  if (isNegative) {
    prefix = '-'
  } else if (showPositiveSign && isPositive) {
    prefix = '+'
  }

  return `${prefix}${formattedNumber}%`
}

/**
 * Formatação de datas no padrão pt-BR (dd/mm/aaaa).
 */
export function formatDateBRL(
  dateValue: Date | string | number | null | undefined,
  options: { includeTime?: boolean; fallback?: string } = {},
): string {
  const { includeTime = false, fallback = '—' } = options

  if (!dateValue) return fallback

  try {
    const date =
      typeof dateValue === 'string' || typeof dateValue === 'number'
        ? new Date(dateValue)
        : dateValue

    if (Number.isNaN(date.getTime())) return fallback

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date)
  } catch {
    return fallback
  }
}
