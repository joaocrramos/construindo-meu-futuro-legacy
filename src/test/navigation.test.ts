import { describe, it, expect } from 'vitest'
import { navigationConfig } from '@/config/navigation'

describe('Configuração da Navegação Estrutural', () => {
  it('deve conter as 4 áreas principais solicitadas', () => {
    const sectionIds = navigationConfig.map((s) => s.id)
    expect(sectionIds).toEqual(['overview', 'wealth', 'admin', 'account'])
  })

  it('deve conter todos os subitens de Visão Geral', () => {
    const overview = navigationConfig.find((s) => s.id === 'overview')
    expect(overview).toBeDefined()
    const titles = overview?.items.map((i) => i.title)
    expect(titles).toContain('Dashboard')
    expect(titles).toContain('Resumo Patrimonial')
    expect(titles).toContain('Evolução do Patrimônio')
    expect(titles).toContain('Distribuição por Categoria')
    expect(titles).toContain('Alertas')
    expect(titles).toContain('Próximos Vencimentos')
    expect(titles).toContain('Progresso das Metas')
    expect(titles).toContain('Atividades Recentes')
  })

  it('deve conter todos os 11 subitens de Patrimônio', () => {
    const wealth = navigationConfig.find((s) => s.id === 'wealth')
    expect(wealth).toBeDefined()
    const titles = wealth?.items.map((i) => i.title)
    expect(titles).toContain('Carteiras')
    expect(titles).toContain('Instituições')
    expect(titles).toContain('Contas')
    expect(titles).toContain('Ativos')
    expect(titles).toContain('Posições')
    expect(titles).toContain('Movimentações')
    expect(titles).toContain('Transferências')
    expect(titles).toContain('Cotações')
    expect(titles).toContain('Vencimentos')
    expect(titles).toContain('Metas')
    expect(titles).toContain('Consolidação Patrimonial')
  })

  it('deve conter a área de Administração protegida por requireAdmin', () => {
    const admin = navigationConfig.find((s) => s.id === 'admin')
    expect(admin).toBeDefined()
    expect(admin?.requireAdmin).toBe(true)
    const titles = admin?.items.map((i) => i.title)
    expect(titles).toContain('Usuários')
    expect(titles).toContain('Convites')
    expect(titles).toContain('Papéis e Permissões')
    expect(titles).toContain('Auditoria')
    expect(titles).toContain('Backup & Restore')
    expect(titles).toContain('Segurança')
    expect(titles).toContain('E-mail Transacional')
    expect(titles).toContain('Configurações do Ambiente')
    expect(titles).toContain('Limpeza do Ambiente de Dev')
  })

  it('deve conter os subitens consolidados de Conta sem entradas duplicadas de senha ou aparência', () => {
    const account = navigationConfig.find((s) => s.id === 'account')
    expect(account).toBeDefined()
    const titles = account?.items.map((i) => i.title)
    expect(titles).toEqual([
      'Meu Perfil',
      'Segurança da Conta',
      'Sessões Ativas',
      'Ajuda e Informações',
    ])
    // Garante que Meu Perfil aponta para /profile consolidado e que itens removidos não constam
    const profileItem = account?.items.find((i) => i.title === 'Meu Perfil')
    expect(profileItem?.href).toBe('/profile')
    expect(titles).not.toContain('Alteração de Senha')
    expect(titles).not.toContain('Preferências de Aparência')
    expect(titles).not.toContain('Aparência')
  })
})
