import { Navigate } from 'react-router-dom'

export default function AccountAppearancePage() {
  return <Navigate to="/profile?tab=appearance" replace />
}

export function AccountAppearancePageLegacy() {
  const { theme, setTheme } = useTheme()

  const options = [
    {
      id: 'light' as const,
      name: 'Modo Claro',
      desc: 'Fundo claro com alto contraste e leitura límpida em ambientes iluminados.',
      icon: Sun,
    },
    {
      id: 'dark' as const,
      name: 'Modo Escuro (Obsidian)',
      desc: 'Fundo profundo em tons obsidian e grafite, ideal para baixa luminosidade.',
      icon: Moon,
    },
    {
      id: 'system' as const,
      name: 'Automático (Sistema)',
      desc: 'Alterna automaticamente respeitando a preferência configurada no seu dispositivo.',
      icon: Laptop,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preferências de Aparência"
        description="Personalize o tema visual e a experiência de contraste da aplicação."
        icon={Palette}
        breadcrumbs={[{ label: 'Conta', href: '/account/profile' }, { label: 'Aparência' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
        {options.map((opt) => {
          const isSelected = theme === opt.id
          const Icon = opt.icon
          return (
            <Card
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`cursor-pointer transition-all border-2 ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border/80 hover:border-primary/40 bg-card'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold pt-2">{opt.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs leading-relaxed">{opt.desc}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
