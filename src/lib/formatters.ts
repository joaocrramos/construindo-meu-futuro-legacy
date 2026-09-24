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

  // Normalização de entrada numérica em string:
  // Suporta padrões '1234.56', '1234,56', '1.234,56', '10.000,00', '1,234.56'.
  // DECISÃO FECHADA: O caso ambíguo com apenas um ponto e 3 dígitos subsequentes (ex: '1.234')
  // é interpretado no contexto brasileiro estritamente como separador de milhar: 1234 (mil duzentos e trinta e quatro).
  let numericValue: number
  if (typeof value === 'number') {
    numericValue = value
  } else if (typeof value === 'string') {
    let clean = value
      .trim()
      .replace(/^R\$\s*/i, '')
      .replace(/\s+/g, '')
    const hasComma = clean.includes(',')
    const hasDot = clean.includes('.')

    if (hasComma && hasDot) {
      const lastComma = clean.lastIndexOf(',')
      const lastDot = clean.lastIndexOf('.')
      if (lastComma > lastDot) {
        // Formato pt-BR: 1.234.567,89 -> remove pontos de milhar, troca vírgula por ponto
        clean = clean.replace(/\./g, '').replace(',', '.')
      } else {
        // Formato en-US: 1,234,567.89 -> remove vírgulas de milhar
        clean = clean.replace(/,/g, '')
      }
    } else if (hasComma) {
      // Ex: "1234,56" ou "1,234,56" -> troca a última vírgula por ponto decimal e remove anteriores
      const lastComma = clean.lastIndexOf(',')
      const intPart = clean.slice(0, lastComma).replace(/,/g, '')
      const decPart = clean.slice(lastComma + 1)
      clean = `${intPart}.${decPart}`
    } else if (hasDot) {
      // Caso ambíguo ou ponto decimal/milhar:
      // Se tiver mais de um ponto (ex: '1.000.000'), são milhares pt-BR
      const dotCount = (clean.match(/\./g) || []).length
      if (dotCount > 1) {
        clean = clean.replace(/\./g, '')
      } else {
        // Exatamente um ponto. Se seguido de exatamente 3 dígitos e nada mais (ex: '1.234'),
        // a DECISÃO FECHADA é interpretar como milhar pt-BR (1234).
        const matchSingleDotThousand = /^-?\d+\.\d{3}$/.test(clean)
        if (matchSingleDotThousand) {
          clean = clean.replace('.', '')
        }
        // Caso contrário, '1234.56' ou '0.5' permanece como decimal padrão.
      }
    }

    numericValue = Number.parseFloat(clean)
  } else {
    return fallback
  }

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

  let numericValue: number
  if (typeof value === 'number') {
    numericValue = value
  } else if (typeof value === 'string') {
    let clean = value.trim().replace(/%/g, '').replace(/\s+/g, '')
    const hasComma = clean.includes(',')
    const hasDot = clean.includes('.')

    if (hasComma && hasDot) {
      const lastComma = clean.lastIndexOf(',')
      const lastDot = clean.lastIndexOf('.')
      if (lastComma > lastDot) {
        clean = clean.replace(/\./g, '').replace(',', '.')
      } else {
        clean = clean.replace(/,/g, '')
      }
    } else if (hasComma) {
      const lastComma = clean.lastIndexOf(',')
      const intPart = clean.slice(0, lastComma).replace(/,/g, '')
      const decPart = clean.slice(lastComma + 1)
      clean = `${intPart}.${decPart}`
    } else if (hasDot) {
      const dotCount = (clean.match(/\./g) || []).length
      if (dotCount > 1) {
        clean = clean.replace(/\./g, '')
      } else if (/^-?\d+\.\d{3}$/.test(clean)) {
        clean = clean.replace('.', '')
      }
    }
    numericValue = Number.parseFloat(clean)
  } else {
    return fallback
  }

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
    // Quando a entrada for string iniciando com data civil (YYYY-MM-DD) e includeTime não for solicitado,
    // extrair os componentes civis diretamente da string para evitar conversão de fuso (ex: UTC midnight -> dia anterior em UTC-3).
    if (typeof dateValue === 'string' && !includeTime) {
      const civilMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (civilMatch) {
        const [, year, month, day] = civilMatch
        const y = Number.parseInt(year, 10)
        const m = Number.parseInt(month, 10)
        const d = Number.parseInt(day, 10)

        // Validação básica de limites do calendário civil
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const testDate = new Date(Date.UTC(y, m - 1, d))
          if (
            testDate.getUTCFullYear() === y &&
            testDate.getUTCMonth() === m - 1 &&
            testDate.getUTCDate() === d
          ) {
            return `${day}/${month}/${year}`
          }
        }
        return fallback
      }
    }

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
