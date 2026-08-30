/* 404 Page - Displays when a user attempts to access a non-existent route - translate to the language of the user */
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    document.title = 'Página não encontrada · Construindo Meu Futuro'
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-5xl font-extrabold text-foreground font-heading">404</h1>
        <p className="text-lg font-semibold text-foreground">Página não encontrada</p>
        <p className="text-xs text-muted-foreground">
          O endereço solicitado não existe ou não está mais disponível no sistema.
        </p>
        <div className="pt-2">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    </div>
  )
}

export default NotFound
