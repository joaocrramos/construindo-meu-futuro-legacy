import * as React from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { ptBR } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateBRL } from '@/lib/formatters'

export interface DatePickerProps {
  /**
   * Valor selecionado (Date ou undefined).
   */
  value?: Date
  /**
   * Callback invocado quando a data é alterada.
   */
  onChange?: (date: Date | undefined) => void
  /**
   * Texto de placeholder exibido quando nenhuma data está selecionada.
   * @default 'Selecione uma data'
   */
  placeholder?: string
  /**
   * Se o componente está desabilitado para interação.
   * @default false
   */
  disabled?: boolean
  /**
   * Limite mínimo permitido para a data.
   */
  minDate?: Date
  /**
   * Limite máximo permitido para a data.
   */
  maxDate?: Date
  /**
   * Se permite limpar a data selecionada via botão dedicado.
   * @default true
   */
  clearable?: boolean
  /**
   * Classes CSS adicionais aplicadas ao botão do gatilho.
   */
  className?: string
  /**
   * ID HTML para associação com labels de formulário.
   */
  id?: string
  /**
   * Nome do campo para formulários HTML.
   */
  name?: string
  /**
   * Alinhamento do popover em relação ao botão gatilho.
   * @default 'start'
   */
  align?: 'start' | 'center' | 'end'
}

/**
 * Componente reutilizável de seleção de data no padrão visual shadcn/ui com localização pt-BR.
 *
 * Utiliza o Calendar (DayPicker) e Popover nativos da base do projeto, integrados ao formatador
 * oficial `formatDateBRL`. Suporta limites mínimo/máximo (`minDate`, `maxDate`), estado desabilitado
 * e temas claro/escuro.
 *
 * @example
 * ```tsx
 * import { DatePicker } from '@/components/DatePicker'
 *
 * function MeuFormulario() {
 *   const [data, setData] = React.useState<Date | undefined>(new Date())
 *
 *   return (
 *     <DatePicker
 *       value={data}
 *       onChange={setData}
 *       placeholder="Selecione a data de vencimento"
 *       minDate={new Date()}
 *     />
 *   )
 * }
 * ```
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled = false,
  minDate,
  maxDate,
  clearable = true,
  className,
  id,
  name,
  align = 'start',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selected: Date | undefined) => {
    onChange?.(selected)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
  }

  // Desabilita dias fora do intervalo permitido minDate/maxDate
  const isDateDisabled = React.useCallback(
    (date: Date) => {
      if (minDate) {
        // Zera as horas para comparação pura de data
        const minZero = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
        const curZero = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        if (curZero < minZero) return true
      }
      if (maxDate) {
        const maxZero = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
        const curZero = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        if (curZero > maxZero) return true
      }
      return false
    },
    [minDate, maxDate],
  )

  const formattedText = value ? formatDateBRL(value) : null

  return (
    <div className={cn('relative inline-block w-full', className)}>
      {name && (
        <input type="hidden" name={name} value={value ? value.toISOString().split('T')[0] : ''} />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={value ? `Data selecionada: ${formattedText}` : placeholder}
            className={cn(
              'w-full justify-start text-left font-normal h-9 px-3',
              !value && 'text-muted-foreground',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="flex-1 truncate">{formattedText || placeholder}</span>
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpar data"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange?.(undefined)
                  }
                }}
                className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            locale={ptBR}
            disabled={isDateDisabled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
