// Hook admin_reset.js: limpeza total dos dados de negócio sob demanda.
//
// Substitui a antiga migration 0024_production_total_reset.js (arquivada em
// docs/migrations-history/). Uma migration roda uma única vez por banco; esta rota permite repetir a
// mesma limpeza quando necessário, com as proteções abaixo:
//   1. Só administrador ativo autenticado.
//   2. Só se a variável de ambiente ALLOW_DATA_RESET for "true" no servidor.
//   3. Exige a frase de confirmação exata no corpo da requisição.
//   4. Executa em transação: ou limpa tudo, ou nada.
//   5. Registra SYSTEM_RESET em audit_logs com a contagem apagada por collection.
// A collection users é preservada.

routerAdd('POST', '/backend/v1/admin/reset-data', (e) => {
  const CONFIRMATION_PHRASE = 'LIMPAR AMBIENTE DESENVOLVIMENTO'
  // Ordem de limpeza respeitando dependências: quem referencia vem antes de quem é referenciado
  const COLLECTIONS_TO_CLEAN = [
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

  const authRecord = e.auth
  if (
    !authRecord ||
    authRecord.getString('role') !== 'admin' ||
    authRecord.getString('status') !== 'active'
  ) {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores ativos podem executar a limpeza da base.',
    })
  }

  if (($os.getenv('ALLOW_DATA_RESET') || '').trim().toLowerCase() !== 'true') {
    return e.json(403, {
      code: 'RESET_DISABLED',
      message:
        'A limpeza da base está desabilitada neste ambiente. Defina ALLOW_DATA_RESET=true no servidor para habilitá-la.',
    })
  }

  let confirmation = ''
  try {
    const body = e.requestInfo().body || {}
    confirmation = String(body.confirmation || '').trim()
  } catch (_) {}
  if (confirmation !== CONFIRMATION_PHRASE) {
    return e.json(400, {
      code: 'INVALID_CONFIRMATION',
      message: `Frase de confirmação incorreta. Digite exatamente "${CONFIRMATION_PHRASE}".`,
    })
  }

  const cleaned = {}
  try {
    $app.runInTransaction((txApp) => {
      for (let i = 0; i < COLLECTIONS_TO_CLEAN.length; i++) {
        const colName = COLLECTIONS_TO_CLEAN[i]
        if (!txApp.hasTable(colName)) {
          continue
        }
        cleaned[colName] = txApp.countRecords(colName)
        txApp
          .db()
          .newQuery('DELETE FROM ' + colName)
          .execute()
      }

      const auditCol = txApp.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', authRecord.id)
      log.set('event_type', 'SYSTEM_RESET')
      log.set('severity', 'critical')
      log.set('entity', 'system')
      log.set('entity_id', 'admin_reset')
      log.set('summary', 'Limpeza total da base executada pelo painel administrativo.')
      log.set('details', {
        operation: 'DATA_RESET',
        scope: 'TOTAL_DATA_CLEANUP',
        cleaned_collections: Object.keys(cleaned),
        deleted_counts: cleaned,
        preserved_collections: ['users'],
        executed_at: new Date().toISOString(),
        authorized_by: authRecord.getString('email'),
      })
      txApp.save(log)
    })
  } catch (err) {
    console.log('[ERROR][ADMIN_RESET] Falha na limpeza da base: ' + err.message)
    return e.json(500, {
      code: 'RESET_FAILED',
      message: 'A limpeza falhou e nenhuma alteração foi aplicada: ' + err.message,
    })
  }

  console.log(
    '[INFO][ADMIN_RESET] Limpeza total executada por ' +
      authRecord.getString('email') +
      ': ' +
      JSON.stringify(cleaned),
  )
  return e.json(200, { success: true, deleted_counts: cleaned })
})
