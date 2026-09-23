import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DatePicker } from '@/components/DatePicker'

describe('DatePicker Component (pt-BR)', () => {
  it('deve renderizar com o placeholder padrão quando não houver valor', () => {
    render(<DatePicker />)
    expect(screen.getByText('Selecione uma data')).not.toBeNull()
  })

  it('deve renderizar com placeholder customizado', () => {
    render(<DatePicker placeholder="Data de vencimento" />)
    expect(screen.getByText('Data de vencimento')).not.toBeNull()
  })

  it('deve renderizar a data formatada no padrão brasileiro dd/mm/aaaa quando houver valor', () => {
    const data = new Date(2025, 4, 15) // 15 de maio de 2025
    render(<DatePicker value={data} />)
    expect(screen.getByText('15/05/2025')).not.toBeNull()
  })

  it('deve respeitar a propriedade disabled', () => {
    render(<DatePicker disabled placeholder="Data desabilitada" />)
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('deve permitir limpar a data quando clearable=true e valor existir', () => {
    const handleChange = vi.fn()
    const data = new Date(2025, 4, 15)
    render(<DatePicker value={data} onChange={handleChange} clearable />)

    const clearBtn = screen.getByLabelText('Limpar data')
    expect(clearBtn).not.toBeNull()

    fireEvent.click(clearBtn)
    expect(handleChange).toHaveBeenCalledWith(undefined)
  })

  it('deve abrir o popover e exibir elementos do calendário ao clicar', () => {
    render(<DatePicker placeholder="Abrir calendário" />)
    const button = screen.getByRole('button', { name: 'Abrir calendário' })
    fireEvent.click(button)

    // O popover deve abrir e renderizar a estrutura do react-day-picker
    const popoverContent = document.querySelector('[data-slot="calendar"]')
    expect(popoverContent).not.toBeNull()
  })
})
