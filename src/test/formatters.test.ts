import { describe, it, expect } from 'vitest'
import { formatCurrencyBRL, formatPercentBRL, formatDateBRL } from '@/lib/formatters'

describe('Formatadores Financeiros (pt-BR)', () => {
  describe('formatCurrencyBRL', () => {
    it('deve formatar valores numéricos positivos com símbolo R$ e padrão brasileiro', () => {
      expect(formatCurrencyBRL(1250.5)).toBe('R$ 1.250,50')
      expect(formatCurrencyBRL(1000000)).toBe('R$ 1.000.000,00')
      expect(formatCurrencyBRL(0)).toBe('R$ 0,00')
    })

    it('deve formatar valores negativos com prefixo adequado', () => {
      expect(formatCurrencyBRL(-450.75)).toBe('- R$ 450,75')
    })

    it('deve formatar string numérica e tratar vírgulas', () => {
      expect(formatCurrencyBRL('1234.56')).toBe('R$ 1.234,56')
      expect(formatCurrencyBRL('1234,56')).toBe('R$ 1.234,56')
    })

    it('deve formatar corretamente entradas com separadores de milhar pt-BR', () => {
      expect(formatCurrencyBRL('1.234,56')).toBe('R$ 1.234,56')
      expect(formatCurrencyBRL('10.000,00')).toBe('R$ 10.000,00')
      expect(formatCurrencyBRL('1.000.000,00')).toBe('R$ 1.000.000,00')
      expect(formatCurrencyBRL('0,50')).toBe('R$ 0,50')
      expect(formatCurrencyBRL('-1.234,56')).toBe('- R$ 1.234,56')
    })

    it('deve interpretar o caso ambíguo 1.234 como milhar (1234) por decisão de produto', () => {
      expect(formatCurrencyBRL('1.234')).toBe('R$ 1.234,00')
    })

    it('deve tratar valores nulos, vazios ou indefinidos retornando fallback seguro', () => {
      expect(formatCurrencyBRL(null)).toBe('—')
      expect(formatCurrencyBRL(undefined)).toBe('—')
      expect(formatCurrencyBRL('')).toBe('—')
      expect(formatCurrencyBRL(null, { fallback: 'R$ 0,00' })).toBe('R$ 0,00')
    })

    it('deve respeitar a opção de ocultar símbolo de moeda', () => {
      expect(formatCurrencyBRL(1500, { showSymbol: false })).toBe('1.500,00')
    })

    it('deve aplicar indicador de tipo Bruto / Líquido', () => {
      expect(formatCurrencyBRL(5000, { type: 'bruto' })).toBe('R$ 5.000,00 (Bruto)')
      expect(formatCurrencyBRL(4200, { type: 'liquido' })).toBe('R$ 4.200,00 (Líquido)')
    })
  })

  describe('formatPercentBRL', () => {
    it('deve formatar percentuais com sinal positivo por padrão', () => {
      expect(formatPercentBRL(15.42)).toBe('+15,42%')
    })

    it('deve formatar percentuais negativos', () => {
      expect(formatPercentBRL(-3.85)).toBe('-3,85%')
    })

    it('deve tratar nulos com fallback', () => {
      expect(formatPercentBRL(null)).toBe('—')
    })
  })

  describe('formatDateBRL', () => {
    it('deve formatar datas no padrão dd/mm/aaaa', () => {
      const date = new Date(2025, 4, 15) // 15 de maio de 2025
      expect(formatDateBRL(date)).toBe('15/05/2025')
    })

    it('deve tratar data inválida ou nula retornando fallback', () => {
      expect(formatDateBRL(null)).toBe('—')
      expect(formatDateBRL('invalid-date')).toBe('—')
    })

    it('deve formatar "2026-09-30 00:00:00.000Z" como "30/09/2026" independentemente de fuso horário', () => {
      // Regressão do bug de exibição de vencimento no fuso America/Sao_Paulo (UTC-3)
      expect(formatDateBRL('2026-09-30 00:00:00.000Z')).toBe('30/09/2026')
      expect(formatDateBRL('2026-09-30T00:00:00.000Z')).toBe('30/09/2026')
      expect(formatDateBRL('2026-09-30')).toBe('30/09/2026')
    })

    it('deve preservar formatação com includeTime: true para timestamps e objetos Date', () => {
      const isoTimestamp = '2026-09-30T15:45:00.000Z'
      const formatted = formatDateBRL(isoTimestamp, { includeTime: true })
      // Deve conter dia/mês/ano e hora:minuto
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/)
      expect(formatted).toMatch(/\d{2}:\d{2}/)

      const dateObj = new Date(2026, 8, 30, 14, 30)
      expect(formatDateBRL(dateObj, { includeTime: true })).toMatch(/30\/09\/2026.*14:30/)
    })
  })
})
