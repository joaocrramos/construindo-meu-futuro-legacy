import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_error: Error): State {
    return { hasError: true }
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log estruturado em ambiente controlado sem expor stack trace na UI
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  private handleReset = (): void => {
    this.setState({ hasError: false })
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Ocorreu um erro inesperado
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A aplicação encontrou uma instabilidade ao renderizar esta tela. Nenhuma informação
                técnica ou sensível foi exposta. Recomendamos recarregar a página para restabelecer
                o sistema.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Tentar novamente
              </Button>
              <Button
                onClick={this.handleReload}
                className="w-full sm:w-auto text-xs sm:text-sm inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
