migrate(
  (app) => {
    // 1. Localizar ou buscar a posição do CDB XP
    let posRec = null
    try {
      posRec = app.findRecordById('positions', 'e5ryvrhz6kbcwoq')
    } catch (_) {
      try {
        const found = app.findRecordsByFilter(
          'positions',
          'user_id = "6ib7abl76x921af" && asset_id = "yd09o24dmlc4rbg"',
          '',
          1,
          0,
        )
        if (found && found.length > 0) {
          posRec = found[0]
        }
      } catch (_) {}
    }

    if (!posRec) {
      console.log('Posição e5ryvrhz6kbcwoq não encontrada para reparo.')
      return
    }

    // 2. Dados auditados:
    // Compra R$ 5.000 (500000 cents) - Venda R$ 2.000 (200000 cents) = Saldo R$ 3.000 (300000 cents)
    // Normalização canônica por valor de Renda Fixa:
    // total_cost_cents = 300000 (R$ 3.000,00)
    // average_price_cents = 100 (R$ 1,00/unidade)
    // quantity_e8 = 300000 * 1000000 = 300000000000 (3.000 unidades)
    // maturity_date = 2026-09-30 00:00:00.000Z
    // indexer = CDI (100%)
    const nowIso = new Date().toISOString()
    posRec.set('total_cost_cents', 300000)
    posRec.set('average_price_cents', 100)
    posRec.set('quantity_e8', 300000000000)
    posRec.set('maturity_date', '2026-09-30 00:00:00.000Z')
    posRec.set('indexer', 'CDI (100%)')
    posRec.set('last_recalculated_at', nowIso)

    app.save(posRec)

    // 3. Registrar auditoria em audit_logs
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', '6ib7abl76x921af')
      log.set('event_type', 'POSITION_RECALCULATED')
      log.set('severity', 'info')
      log.set('entity', 'positions')
      log.set('entity_id', posRec.id)
      log.set(
        'summary',
        'Reparo contábil da posição CDB XP por valor: R$ 5.000 aplicação - R$ 2.000 resgate = R$ 3.000 saldo',
      )
      log.set('details', {
        position_id: posRec.id,
        asset_id: 'yd09o24dmlc4rbg',
        account_id: '0n8mennpev0x5kp',
        total_cost_cents: 300000,
        average_price_cents: 100,
        quantity_e8: 300000000000,
        maturity_date: '2026-09-30',
        indexer: 'CDI (100%)',
        reason: 'Correção de cálculo por valor em renda fixa após venda parcial',
      })
      app.save(log)
    } catch (auditErr) {
      console.log('AUDIT_LOG_ERROR_POSITION_RECALCULATED: ' + auditErr.message)
    }
  },
  (app) => {
    try {
      const posRec = app.findRecordById('positions', 'e5ryvrhz6kbcwoq')
      posRec.set('total_cost_cents', 0)
      posRec.set('average_price_cents', 0)
      posRec.set('quantity_e8', 0)
      posRec.set('maturity_date', '')
      posRec.set('indexer', '')
      app.save(posRec)
    } catch (_) {}
  },
)
