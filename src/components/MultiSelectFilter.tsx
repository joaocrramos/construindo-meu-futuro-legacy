import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
  badge?: string
}

export interface MultiSelectFilterProps {
  title: string
  options: MultiSelectOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  id?: string
}

export function MultiSelectFilter({
  title,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar...',
  className,
  id,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false)

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onSelectionChange(selectedValues.filter((v) => v !== val))
    } else {
      onSelectionChange([...selectedValues, val])
    }
  }

  const selectAll = () => {
    onSelectionChange(options.map((o) => o.value))
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={title}
          className={cn(
            'h-9 justify-between text-xs border-input bg-background hover:bg-muted/50 font-normal min-w-[160px]',
            selectedValues.length > 0 && 'border-primary/50 text-foreground font-medium',
            className,
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-muted-foreground">{title}:</span>
            {selectedValues.length === 0 ? (
              <span className="text-muted-foreground font-normal">Todas</span>
            ) : selectedValues.length === 1 ? (
              <span className="truncate max-w-[120px]">
                {options.find((o) => o.value === selectedValues[0])?.label || selectedValues[0]}
              </span>
            ) : (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] h-5 rounded font-mono font-medium"
              >
                {selectedValues.length} selecionadas
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 bg-popover text-popover-foreground border-border"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="text-xs h-9" />
          <CommandList className="max-h-56">
            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
              Nenhuma opção encontrada.
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                    className="text-xs flex items-center justify-between cursor-pointer py-1.5 px-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border border-primary',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible',
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <div className="truncate">
                        <span className="truncate block">{option.label}</span>
                        {option.description && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {option.badge && (
                      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                        {option.badge}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <div className="flex items-center justify-between p-1.5 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Marcar todas
            </Button>
            {selectedValues.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
