migrate(
  (app) => {
    // Limpeza TOTAL de dados de negócio para início de produção
    // Operação autorizada pelo usuário dono do produto.
    // Preserva a coleção de usuários (_pb_users_auth_ / users).
    // Ordem de limpeza respeitando dependências de chaves estrangeiras:
    // 1. alerts
    // 2. account_balances (depende de movements e accounts)
    // 3. movements (depende de movements via reversal_of_id, positions, accounts, assets)
    // 4. positions (depende de accounts e assets)
    // 5. accounts (depende de institutions)
    // 6. assets
    // 7. institutions
    // 8. portfolios
    // 9. invitations
    // 10. audit_logs (limpa logs legados e recria evento de auditoria SYSTEM_RESET)

    const collectionsToClean = [
      'alerts',
      'account_balances',
      'movements',
      'positions',
      'accounts',
      'assets',
      'institutions',
      'portfolios',
      'invitations',
      'audit_logs',
    ]

    for (let i = 0; i < collectionsToClean.length; i++) {
      const colName = collectionsToClean[i]
      try {
        if (app.hasTable(colName)) {
          app
            .db()
            .newQuery('DELETE FROM ' + colName)
            .execute()
          console.log('CLEANUP_SUCCESS: collection ' + colName + ' esvaziada.')
        }
      } catch (err) {
        console.log('CLEANUP_WARN: erro ao esvaziar ' + colName + ': ' + err.message)
      }
    }

    // Identificar usuário admin para o log de auditoria
    let adminUserId = ''
    try {
      const owner = app.findFirstRecordByData('users', 'email', 'joao.carlos@jcrtecnologia.com')
      adminUserId = owner.id
    } catch (_) {
      try {
        const anyAdmin = app.findFirstRecordByData('users', 'role', 'admin')
        adminUserId = anyAdmin.id
      } catch (_) {}
    }

    // Registrar evento de auditoria auditável documentando a limpeza de início de produção
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const resetLog = new Record(auditCol)
      if (adminUserId) {
        resetLog.set('user_id', adminUserId)
      }
      resetLog.set('event_type', 'SYSTEM_RESET')
      resetLog.set('severity', 'critical')
      resetLog.set('entity', 'system')
      resetLog.set('entity_id', 'production_init')
      resetLog.set(
        'summary',
        'Limpeza total da base executada com sucesso para início de produção.',
      )
      resetLog.set('details', {
        operation: 'PRODUCTION_RESET',
        scope: 'TOTAL_DATA_CLEANUP',
        cleaned_collections: [
          'alerts',
          'account_balances',
          'movements',
          'positions',
          'accounts',
          'assets',
          'institutions',
          'portfolios',
          'invitations',
          'audit_logs',
        ],
        preserved_collections: ['users'],
        executed_at: new Date().toISOString(),
        authorized_by: 'joao.carlos@jcrtecnologia.com',
        note: 'Ambiente pronto e higienizado para produção.',
      })
      app.save(resetLog)
      console.log('AUDIT_LOG_SUCCESS: evento SYSTEM_RESET registrado com sucesso.')
    } catch (auditErr) {
      console.log('AUDIT_LOG_ERROR_RESET: ' + auditErr.message)
    }
  },
  (app) => {
    // Operação irreversível por natureza; down handler não restaura dados destruídos.
    console.log('DOWN_MIGRATION: reset de produção não possui rollback de dados.')
  },
)
