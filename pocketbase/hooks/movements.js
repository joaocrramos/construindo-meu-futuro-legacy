routerAdd('POST', '/backend/v1/movements', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.',
    })
  }

  const userId = authRecord.id
  const body = e.requestInfo().body || {}

  const accountId = (body.account_id || '').trim()
  const assetId = (body.asset_id || '').trim() || null
  const movementType = (body.movement_type || '').trim()
  const dateStr = (body.date || '').trim()
  const idempotencyKey = (body.idempotency_key || '').trim() || null
  const notes = (body.notes || '').trim() || null

  const validMovementTypes = [
    'deposit',
    'withdrawal',
    'buy',
    'sell',
    'dividend',
    'interest_on_capital',
    'amortization',
    'fee',
    'tax',
    'reversal',
  ]

  if (!validMovementTypes.includes(movementType)) {
    return e.json(400, {
      code: 'INVALID_MOVEMENT_TYPE',
      message: 'Tipo de movimentação inválido.',
    })
  }

  if (!accountId) {
    return e.json(400, {
      code: 'ACCOUNT_REQUIRED',
      message: 'Por favor, selecione uma conta válida.',
    })
  }

  if (!dateStr) {
    return e.json(400, {
      code: 'DATE_REQUIRED',
      message: 'A data da movimentação é obrigatória.',
    })
  }

  // Validação de ativo obrigatório conforme tipo
  const assetRequiredTypes = ['buy', 'sell', 'dividend', 'interest_on_capital', 'amortization']
  if (assetRequiredTypes.includes(movementType) && !assetId) {
    return e.json(400, {
      code: 'ASSET_REQUIRED',
      message: 'Esta operação exige que um ativo do catálogo seja informado.',
    })
  }

  // Validação de propriedade da conta
  let accountRec
  try {
    accountRec = $app.findRecordById('accounts', accountId)
    if (accountRec.getString('user_id') !== userId) {
      return e.json(400, {
        code: 'ACCOUNT_NOT_OWNED',
        message: 'A conta informada não pertence ao usuário autenticado.',
      })
    }
  } catch (_) {
    return e.json(400, {
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Conta bancária ou de custódia não encontrada.',
    })
  }

  // Validação de propriedade do ativo (se informado)
  let assetRec = null
  if (assetId) {
    try {
      assetRec = $app.findRecordById('assets', assetId)
      if (assetRec.getString('user_id') !== userId) {
        return e.json(400, {
          code: 'ASSET_NOT_OWNED',
          message: 'O ativo informado não pertence ao usuário autenticado.',
        })
      }
    } catch (_) {
      return e.json(400, {
        code: 'ASSET_NOT_FOUND',
        message: 'Ativo informado não encontrado.',
      })
    }
  }

  // Validação dos valores monetários e numéricos
  if (
    body.gross_amount_cents === undefined ||
    body.gross_amount_cents === null ||
    typeof body.gross_amount_cents !== 'number'
  ) {
    return e.json(400, {
      code: 'GROSS_AMOUNT_REQUIRED',
      message: 'O valor bruto da movimentação é obrigatório.',
    })
  }

  const grossAmountCents = Math.round(body.gross_amount_cents)
  if (grossAmountCents <= 0) {
    return e.json(400, {
      code: 'INVALID_GROSS_AMOUNT',
      message: 'O valor bruto da operação deve ser maior que zero.',
    })
  }

  const feesCents =
    body.fees_cents !== undefined && body.fees_cents !== null ? Math.round(body.fees_cents) : 0
  const taxesCents =
    body.taxes_cents !== undefined && body.taxes_cents !== null ? Math.round(body.taxes_cents) : 0

  if (feesCents < 0 || taxesCents < 0) {
    return e.json(400, {
      code: 'INVALID_FEES_OR_TAXES',
      message: 'Taxas e impostos não podem ser negativos.',
    })
  }

  const isBuy = movementType === 'buy'
  const expectedNetCents = isBuy
    ? grossAmountCents + feesCents
    : grossAmountCents - feesCents - taxesCents
  const providedNetCents =
    body.net_amount_cents !== undefined && body.net_amount_cents !== null
      ? Math.round(body.net_amount_cents)
      : expectedNetCents

  if (providedNetCents !== expectedNetCents) {
    return e.json(400, {
      code: 'NET_AMOUNT_MISMATCH',
      message: isBuy
        ? 'Divergência no valor líquido: na compra de ativo, o valor líquido deve ser igual ao valor bruto mais taxas e emolumentos.'
        : 'Divergência no valor líquido: o valor líquido deve ser igual ao valor bruto menos taxas e impostos.',
    })
  }

  const netAmountCents = expectedNetCents

  // Quantidade e preço unitário
  let quantityE8 = 0
  if (body.quantity_e8 !== undefined && body.quantity_e8 !== null) {
    if (typeof body.quantity_e8 !== 'number' || body.quantity_e8 < 0) {
      return e.json(400, {
        code: 'INVALID_QUANTITY',
        message: 'A quantidade deve ser um número inteiro não negativo na escala e8.',
      })
    }
    quantityE8 = Math.round(body.quantity_e8)
  }

  // Limite de magnitude 10^15
  if (Math.abs(quantityE8) > 1000000000000000) {
    return e.json(400, {
      code: 'QUANTITY_OUT_OF_RANGE',
      message: 'Quantidade informada excede o limite máximo permitido.',
    })
  }

  let unitPriceCents = 0
  if (body.unit_price_cents !== undefined && body.unit_price_cents !== null) {
    if (typeof body.unit_price_cents !== 'number' || body.unit_price_cents < 0) {
      return e.json(400, {
        code: 'INVALID_UNIT_PRICE',
        message: 'O preço unitário não pode ser negativo.',
      })
    }
    unitPriceCents = Math.round(body.unit_price_cents)
  }

  // Idempotência: verificar se chave de idempotência já existe para o usuário
  if (idempotencyKey) {
    try {
      const existingRecords = $app.findRecordsByFilter(
        'movements',
        `user_id = "${userId}" && idempotency_key = "${idempotencyKey}"`,
        '-created',
        1,
        0,
      )
      if (existingRecords.length > 0) {
        const existing = existingRecords[0]
        return e.json(200, {
          id: existing.id,
          user_id: existing.getString('user_id'),
          account_id: existing.getString('account_id'),
          asset_id: existing.getString('asset_id') || undefined,
          movement_type: existing.getString('movement_type'),
          date: existing.getString('date'),
          quantity_e8: existing.getInt('quantity_e8'),
          unit_price_cents: existing.getInt('unit_price_cents'),
          gross_amount_cents: existing.getInt('gross_amount_cents'),
          fees_cents: existing.getInt('fees_cents'),
          taxes_cents: existing.getInt('taxes_cents'),
          net_amount_cents: existing.getInt('net_amount_cents'),
          idempotency_key: existing.getString('idempotency_key') || undefined,
          is_reversed: existing.getBool('is_reversed'),
          notes: existing.getString('notes') || undefined,
          created: existing.getString('created'),
          updated: existing.getString('updated'),
          expand: {
            account_id: {
              id: accountRec.id,
              name: accountRec.getString('name'),
              account_type: accountRec.getString('account_type'),
              currency: accountRec.getString('currency'),
              is_active: accountRec.getBool('is_active'),
            },
            asset_id: assetRec
              ? {
                  id: assetRec.id,
                  ticker: assetRec.getString('ticker'),
                  name: assetRec.getString('name'),
                  asset_class: assetRec.getString('asset_class'),
                  currency: assetRec.getString('currency'),
                  is_active: assetRec.getBool('is_active'),
                }
              : undefined,
          },
        })
      }
    } catch (_) {}
  }

  // Executar mutações de forma atômica
  let createdMovementId = ''
  let finalCreatedDate = ''
  let finalUpdatedDate = ''

  try {
    $app.runInTransaction((txApp) => {
      // 1. Criar o registro em movements
      const movementsCol = txApp.findCollectionByNameOrId('movements')
      const movRecord = new Record(movementsCol)
      movRecord.set('user_id', userId)
      movRecord.set('account_id', accountId)
      if (assetId) {
        movRecord.set('asset_id', assetId)
      }
      movRecord.set('movement_type', movementType)
      movRecord.set('date', dateStr)
      movRecord.set('quantity_e8', quantityE8 !== undefined && quantityE8 !== null ? quantityE8 : 0)
      movRecord.set(
        'unit_price_cents',
        unitPriceCents !== undefined && unitPriceCents !== null ? unitPriceCents : 0,
      )
      movRecord.set(
        'gross_amount_cents',
        grossAmountCents !== undefined && grossAmountCents !== null ? grossAmountCents : 0,
      )
      movRecord.set('fees_cents', feesCents !== undefined && feesCents !== null ? feesCents : 0)
      movRecord.set('taxes_cents', taxesCents !== undefined && taxesCents !== null ? taxesCents : 0)
      movRecord.set(
        'net_amount_cents',
        netAmountCents !== undefined && netAmountCents !== null ? netAmountCents : 0,
      )
      if (idempotencyKey) {
        movRecord.set('idempotency_key', idempotencyKey)
      }
      movRecord.set('is_reversed', false)
      if (notes) {
        movRecord.set('notes', notes)
      }

      // O validador "required" nativo do PocketBase trata 0 numérico como valor em branco (IsZero).
      // Como o endpoint já valida estritamente todos os campos e regras de negócio antes de salvar,
      // usa-se saveNoValidate nos saves para contornar a rejeição de 0 em number required (fees_cents, taxes_cents, balance_cents, quantity_e8).
      txApp.saveNoValidate(movRecord)
      createdMovementId = movRecord.id
      finalCreatedDate = movRecord.getString('created')
      finalUpdatedDate = movRecord.getString('updated')

      // Registrar auditoria em audit_logs para nova movimentação
      try {
        const auditCol = txApp.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('event_type', 'MOVEMENT_CREATED')
        log.set('severity', 'info')
        log.set('entity', 'movements')
        log.set('entity_id', movRecord.id)
        log.set(
          'summary',
          `Movimentação ${movementType} criada (Líquido: R$ ${(netAmountCents / 100).toFixed(2)})`,
        )
        log.set('details', {
          movement_id: movRecord.id,
          movement_type: movementType,
          account_id: accountId,
          asset_id: assetId || null,
          gross_amount_cents: grossAmountCents,
          net_amount_cents: netAmountCents,
          quantity_e8: quantityE8,
          date: dateStr,
        })
        txApp.save(log)
      } catch (auditErr) {
        console.log('AUDIT_LOG_ERROR_MOVEMENT_CREATED: ' + auditErr.message)
      }

      // 2. Atualizar account_balances
      const currency = accountRec.getString('currency') || 'BRL'
      let balanceRec = null
      try {
        const foundBalances = txApp.findRecordsByFilter(
          'account_balances',
          `user_id = "${userId}" && account_id = "${accountId}" && currency = "${currency}"`,
          '',
          1,
          0,
        )
        if (foundBalances.length > 0) {
          balanceRec = foundBalances[0]
        }
      } catch (_) {}

      if (!balanceRec) {
        const balanceCol = txApp.findCollectionByNameOrId('account_balances')
        balanceRec = new Record(balanceCol)
        balanceRec.set('user_id', userId)
        balanceRec.set('account_id', accountId)
        balanceRec.set('currency', currency)
        balanceRec.set('balance_cents', 0)
        balanceRec.set('last_recalculated_at', new Date().toISOString())
      }

      // Recalcular saldo da conta a partir de TODAS as movimentações não estornadas da conta
      const accMovements = txApp.findRecordsByFilter(
        'movements',
        `user_id = "${userId}" && account_id = "${accountId}" && is_reversed = false`,
        'date,created',
        10000,
        0,
      )

      let recalculatedCashCents = 0
      for (let i = 0; i < accMovements.length; i++) {
        const m = accMovements[i]
        const mType = m.getString('movement_type')
        const mNet = m.getInt('net_amount_cents') || 0
        if (
          ['deposit', 'sell', 'dividend', 'interest_on_capital', 'amortization'].includes(mType)
        ) {
          recalculatedCashCents += mNet
        } else if (['withdrawal', 'buy', 'fee', 'tax'].includes(mType)) {
          recalculatedCashCents -= mNet
        }
      }

      // Validação de saldo insuficiente para saque
      if (recalculatedCashCents < 0 && movementType === 'withdrawal') {
        throw new Error('Saldo insuficiente na conta.')
      }

      balanceRec.set('balance_cents', recalculatedCashCents)
      balanceRec.set('last_movement_id', createdMovementId)
      balanceRec.set('last_recalculated_at', new Date().toISOString())
      txApp.saveNoValidate(balanceRec)

      // 3. Atualizar positions se houver asset_id
      if (assetId) {
        // Busca todas as movimentações não estornadas desta conta e ativo ordenadas cronologicamente
        const movList = txApp.findRecordsByFilter(
          'movements',
          `user_id = "${userId}" && account_id = "${accountId}" && asset_id = "${assetId}" && is_reversed = false`,
          'date,created',
          5000,
          0,
        )

        let accQtyE8 = 0
        let accTotalCostCents = 0
        let accAvgPriceCents = 0

        for (let i = 0; i < movList.length; i++) {
          const m = movList[i]
          const mType = m.getString('movement_type')
          const mQtyE8 = m.getInt('quantity_e8') || 0
          const mGross = m.getInt('gross_amount_cents') || 0
          const mNet = m.getInt('net_amount_cents') || 0
          const mUnitPrice = m.getInt('unit_price_cents') || 0

          if (mType === 'buy') {
            const addedQty = mQtyE8
            const addedCost =
              mNet > 0
                ? mNet
                : mUnitPrice > 0
                  ? Math.round((mUnitPrice * addedQty) / 100000000)
                  : mGross
            const newQty = accQtyE8 + addedQty
            const newCost = accTotalCostCents + addedCost
            accQtyE8 = newQty
            accTotalCostCents = newCost
            accAvgPriceCents = newQty > 0 ? Math.round((newCost * 100000000) / newQty) : 0
          } else if (mType === 'sell') {
            const soldQty = Math.min(mQtyE8, accQtyE8)
            const remainingQty = accQtyE8 - soldQty
            const remainingCost =
              remainingQty > 0 ? Math.round((accAvgPriceCents * remainingQty) / 100000000) : 0
            accQtyE8 = remainingQty
            accTotalCostCents = remainingCost
            if (remainingQty === 0) {
              accAvgPriceCents = 0
            }
          } else if (mType === 'amortization') {
            // Amortização devolve capital investido, reduzindo o custo total contábil
            const amortAmount = mNet > 0 ? mNet : mGross
            accTotalCostCents = Math.max(0, accTotalCostCents - amortAmount)
            accAvgPriceCents =
              accQtyE8 > 0 ? Math.round((accTotalCostCents * 100000000) / accQtyE8) : 0
          }
        }

        // Buscar registro existente em positions ou criar novo
        let posRec = null
        try {
          const foundPositions = txApp.findRecordsByFilter(
            'positions',
            `user_id = "${userId}" && account_id = "${accountId}" && asset_id = "${assetId}"`,
            '',
            1,
            0,
          )
          if (foundPositions.length > 0) {
            posRec = foundPositions[0]
          }
        } catch (_) {}

        if (!posRec) {
          const positionsCol = txApp.findCollectionByNameOrId('positions')
          posRec = new Record(positionsCol)
          posRec.set('user_id', userId)
          posRec.set('account_id', accountId)
          posRec.set('asset_id', assetId)
        }

        posRec.set('quantity_e8', accQtyE8)
        posRec.set('average_price_cents', accAvgPriceCents)
        posRec.set('total_cost_cents', accTotalCostCents)
        posRec.set('last_recalculated_at', new Date().toISOString())
        txApp.saveNoValidate(posRec)
      }

      // Registrar auditoria em audit_logs para atualização de movimentação
      try {
        const auditCol = txApp.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('event_type', 'MOVEMENT_UPDATED')
        log.set('severity', 'info')
        log.set('entity', 'movements')
        log.set('entity_id', movementId)
        log.set(
          'summary',
          `Movimentação ${movementType} editada (Líquido: R$ ${(netAmountCents / 100).toFixed(2)})`,
        )
        log.set('details', {
          movement_id: movementId,
          movement_type: movementType,
          account_id: accountId,
          asset_id: assetId || null,
          gross_amount_cents: grossAmountCents,
          net_amount_cents: netAmountCents,
          quantity_e8: quantityE8,
          date: dateStr,
        })
        txApp.save(log)
      } catch (auditErr) {
        console.log('AUDIT_LOG_ERROR_MOVEMENT_UPDATED: ' + auditErr.message)
      }
    })
  } catch (err) {
    const errStr = err && err.message ? err.message : String(err)
    if (errStr.includes('Saldo insuficiente na conta.')) {
      return e.json(400, {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Saldo insuficiente na conta.',
      })
    }
    if (
      errStr.includes('idx_movements_user_idempotency') ||
      errStr.includes('UNIQUE constraint failed')
    ) {
      // Tratar colisão de chave de idempotência buscando registro existente
      try {
        const existingRecords = $app.findRecordsByFilter(
          'movements',
          `user_id = "${userId}" && idempotency_key = "${idempotencyKey}"`,
          '-created',
          1,
          0,
        )
        if (existingRecords.length > 0) {
          const existing = existingRecords[0]
          return e.json(200, {
            id: existing.id,
            user_id: existing.getString('user_id'),
            account_id: existing.getString('account_id'),
            asset_id: existing.getString('asset_id') || undefined,
            movement_type: existing.getString('movement_type'),
            date: existing.getString('date'),
            quantity_e8: existing.getInt('quantity_e8'),
            unit_price_cents: existing.getInt('unit_price_cents'),
            gross_amount_cents: existing.getInt('gross_amount_cents'),
            fees_cents: existing.getInt('fees_cents'),
            taxes_cents: existing.getInt('taxes_cents'),
            net_amount_cents: existing.getInt('net_amount_cents'),
            idempotency_key: existing.getString('idempotency_key') || undefined,
            is_reversed: existing.getBool('is_reversed'),
            notes: existing.getString('notes') || undefined,
            created: existing.getString('created'),
            updated: existing.getString('updated'),
          })
        }
      } catch (_) {}

      return e.json(409, {
        code: 'DUPLICATE_IDEMPOTENCY_KEY',
        message:
          'Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).',
      })
    }

    return e.json(400, {
      code: 'TRANSACTION_FAILED',
      message: 'Falha ao processar movimentação: ' + errStr,
    })
  }

  return e.json(201, {
    id: createdMovementId,
    user_id: userId,
    account_id: accountId,
    asset_id: assetId || undefined,
    movement_type: movementType,
    date: dateStr,
    quantity_e8: quantityE8,
    unit_price_cents: unitPriceCents,
    gross_amount_cents: grossAmountCents,
    fees_cents: feesCents,
    taxes_cents: taxesCents,
    net_amount_cents: netAmountCents,
    idempotency_key: idempotencyKey || undefined,
    is_reversed: false,
    notes: notes || undefined,
    created: finalCreatedDate,
    updated: finalUpdatedDate,
    expand: {
      account_id: {
        id: accountRec.id,
        name: accountRec.getString('name'),
        account_type: accountRec.getString('account_type'),
        currency: accountRec.getString('currency'),
        is_active: accountRec.getBool('is_active'),
      },
      asset_id: assetRec
        ? {
            id: assetRec.id,
            ticker: assetRec.getString('ticker'),
            name: assetRec.getString('name'),
            asset_class: assetRec.getString('asset_class'),
            currency: assetRec.getString('currency'),
            is_active: assetRec.getBool('is_active'),
          }
        : undefined,
    },
  })
})

routerAdd('PUT', '/backend/v1/movements/{id}', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.',
    })
  }

  const userId = authRecord.id
  const movementId = e.request?.pathValue ? e.request.pathValue('id') : e.pathParam('id')
  if (!movementId) {
    return e.json(400, {
      code: 'MOVEMENT_ID_REQUIRED',
      message: 'ID da movimentação é obrigatório.',
    })
  }

  // Buscar movimentação original para validações
  let originalMov
  try {
    originalMov = $app.findRecordById('movements', movementId)
  } catch (_) {
    return e.json(404, {
      code: 'MOVEMENT_NOT_FOUND',
      message: 'Movimentação não encontrada.',
    })
  }

  // Validar titularidade
  if (originalMov.getString('user_id') !== userId) {
    return e.json(403, {
      code: 'FORBIDDEN',
      message: 'Você não tem permissão para editar esta movimentação.',
    })
  }

  // Validar se já está estornada
  if (originalMov.getBool('is_reversed')) {
    return e.json(400, {
      code: 'MOVEMENT_REVERSED',
      message: 'Não é possível editar uma movimentação que já foi estornada.',
    })
  }

  const oldAccountId = originalMov.getString('account_id')
  const oldAssetId = originalMov.getString('asset_id') || null

  const body = e.requestInfo().body || {}

  const accountId = (body.account_id || oldAccountId || '').trim()
  const assetId = body.asset_id !== undefined ? (body.asset_id || '').trim() || null : oldAssetId
  const movementType = (body.movement_type || originalMov.getString('movement_type') || '').trim()
  const dateStr = (body.date || originalMov.getString('date') || '').trim()
  const notes =
    body.notes !== undefined
      ? (body.notes || '').trim() || null
      : originalMov.getString('notes') || null
  const originalIdempotencyKey = originalMov.getString('idempotency_key') || null

  const validMovementTypes = [
    'deposit',
    'withdrawal',
    'buy',
    'sell',
    'dividend',
    'interest_on_capital',
    'amortization',
    'fee',
    'tax',
    'reversal',
  ]

  if (!validMovementTypes.includes(movementType)) {
    return e.json(400, {
      code: 'INVALID_MOVEMENT_TYPE',
      message: 'Tipo de movimentação inválido.',
    })
  }

  if (!accountId) {
    return e.json(400, {
      code: 'ACCOUNT_REQUIRED',
      message: 'Por favor, selecione uma conta válida.',
    })
  }

  if (!dateStr) {
    return e.json(400, {
      code: 'DATE_REQUIRED',
      message: 'A data da movimentação é obrigatória.',
    })
  }

  const assetRequiredTypes = ['buy', 'sell', 'dividend', 'interest_on_capital', 'amortization']
  if (assetRequiredTypes.includes(movementType) && !assetId) {
    return e.json(400, {
      code: 'ASSET_REQUIRED',
      message: 'Esta operação exige que um ativo do catálogo seja informado.',
    })
  }

  // Validação de titularidade da conta
  let accountRec
  try {
    accountRec = $app.findRecordById('accounts', accountId)
    if (accountRec.getString('user_id') !== userId) {
      return e.json(400, {
        code: 'ACCOUNT_NOT_OWNED',
        message: 'A conta informada não pertence ao usuário autenticado.',
      })
    }
  } catch (_) {
    return e.json(400, {
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Conta bancária ou de custódia não encontrada.',
    })
  }

  // Validação de titularidade do ativo
  let assetRec = null
  if (assetId) {
    try {
      assetRec = $app.findRecordById('assets', assetId)
      if (assetRec.getString('user_id') !== userId) {
        return e.json(400, {
          code: 'ASSET_NOT_OWNED',
          message: 'O ativo informado não pertence ao usuário autenticado.',
        })
      }
    } catch (_) {
      return e.json(400, {
        code: 'ASSET_NOT_FOUND',
        message: 'Ativo informado não encontrado.',
      })
    }
  }

  // Valores monetários
  const grossRaw =
    body.gross_amount_cents !== undefined
      ? body.gross_amount_cents
      : originalMov.getInt('gross_amount_cents')

  if (grossRaw === undefined || grossRaw === null || typeof grossRaw !== 'number') {
    return e.json(400, {
      code: 'GROSS_AMOUNT_REQUIRED',
      message: 'O valor bruto da movimentação é obrigatório.',
    })
  }

  const grossAmountCents = Math.round(grossRaw)
  if (grossAmountCents <= 0) {
    return e.json(400, {
      code: 'INVALID_GROSS_AMOUNT',
      message: 'O valor bruto da operação deve ser maior que zero.',
    })
  }

  const feesRaw = body.fees_cents !== undefined ? body.fees_cents : originalMov.getInt('fees_cents')
  const taxesRaw =
    body.taxes_cents !== undefined ? body.taxes_cents : originalMov.getInt('taxes_cents')

  const feesCents = feesRaw !== undefined && feesRaw !== null ? Math.round(feesRaw) : 0
  const taxesCents = taxesRaw !== undefined && taxesRaw !== null ? Math.round(taxesRaw) : 0

  if (feesCents < 0 || taxesCents < 0) {
    return e.json(400, {
      code: 'INVALID_FEES_OR_TAXES',
      message: 'Taxas e impostos não podem ser negativos.',
    })
  }

  const isBuy = movementType === 'buy'
  const expectedNetCents = isBuy
    ? grossAmountCents + feesCents
    : grossAmountCents - feesCents - taxesCents
  const providedNetCents =
    body.net_amount_cents !== undefined && body.net_amount_cents !== null
      ? Math.round(body.net_amount_cents)
      : expectedNetCents

  if (providedNetCents !== expectedNetCents) {
    return e.json(400, {
      code: 'NET_AMOUNT_MISMATCH',
      message: isBuy
        ? 'Divergência no valor líquido: na compra de ativo, o valor líquido deve ser igual ao valor bruto mais taxas e emolumentos.'
        : 'Divergência no valor líquido: o valor líquido deve ser igual ao valor bruto menos taxas e impostos.',
    })
  }

  const netAmountCents = expectedNetCents

  let quantityE8 = 0
  const qtyRaw =
    body.quantity_e8 !== undefined ? body.quantity_e8 : originalMov.getInt('quantity_e8')
  if (qtyRaw !== undefined && qtyRaw !== null) {
    if (typeof qtyRaw !== 'number' || qtyRaw < 0) {
      return e.json(400, {
        code: 'INVALID_QUANTITY',
        message: 'A quantidade deve ser um número inteiro não negativo na escala e8.',
      })
    }
    quantityE8 = Math.round(qtyRaw)
  }

  if (Math.abs(quantityE8) > 1000000000000000) {
    return e.json(400, {
      code: 'QUANTITY_OUT_OF_RANGE',
      message: 'Quantidade informada excede o limite máximo permitido.',
    })
  }

  let unitPriceCents = 0
  const unitPriceRaw =
    body.unit_price_cents !== undefined
      ? body.unit_price_cents
      : originalMov.getInt('unit_price_cents')
  if (unitPriceRaw !== undefined && unitPriceRaw !== null) {
    if (typeof unitPriceRaw !== 'number' || unitPriceRaw < 0) {
      return e.json(400, {
        code: 'INVALID_UNIT_PRICE',
        message: 'O preço unitário não pode ser negativo.',
      })
    }
    unitPriceCents = Math.round(unitPriceRaw)
  }

  let finalCreatedDate = ''
  let finalUpdatedDate = ''

  try {
    $app.runInTransaction((txApp) => {
      // 1. Atualizar o registro da movimentação
      const movRecord = txApp.findRecordById('movements', movementId)
      movRecord.set('account_id', accountId)
      if (assetId) {
        movRecord.set('asset_id', assetId)
      } else {
        movRecord.set('asset_id', null)
      }
      movRecord.set('movement_type', movementType)
      movRecord.set('date', dateStr)
      movRecord.set('quantity_e8', quantityE8 !== undefined && quantityE8 !== null ? quantityE8 : 0)
      movRecord.set(
        'unit_price_cents',
        unitPriceCents !== undefined && unitPriceCents !== null ? unitPriceCents : 0,
      )
      movRecord.set(
        'gross_amount_cents',
        grossAmountCents !== undefined && grossAmountCents !== null ? grossAmountCents : 0,
      )
      movRecord.set('fees_cents', feesCents !== undefined && feesCents !== null ? feesCents : 0)
      movRecord.set('taxes_cents', taxesCents !== undefined && taxesCents !== null ? taxesCents : 0)
      movRecord.set(
        'net_amount_cents',
        netAmountCents !== undefined && netAmountCents !== null ? netAmountCents : 0,
      )
      // Manter chave de idempotência original
      if (originalIdempotencyKey) {
        movRecord.set('idempotency_key', originalIdempotencyKey)
      }
      if (notes) {
        movRecord.set('notes', notes)
      } else {
        movRecord.set('notes', null)
      }

      txApp.saveNoValidate(movRecord)
      finalCreatedDate = movRecord.getString('created')
      finalUpdatedDate = movRecord.getString('updated')

      // 2. Recalcular saldo da conta (ou contas, caso tenha alterado de conta)
      const accountsToRecalc = [accountId]
      if (oldAccountId && oldAccountId !== accountId && !accountsToRecalc.includes(oldAccountId)) {
        accountsToRecalc.push(oldAccountId)
      }

      for (let a = 0; a < accountsToRecalc.length; a++) {
        const curAccId = accountsToRecalc[a]
        let curAccRec
        try {
          curAccRec = txApp.findRecordById('accounts', curAccId)
        } catch (_) {
          continue
        }
        const curCurrency = curAccRec.getString('currency') || 'BRL'

        const accMovements = txApp.findRecordsByFilter(
          'movements',
          `user_id = "${userId}" && account_id = "${curAccId}" && is_reversed = false`,
          'date,created',
          10000,
          0,
        )

        let recalculatedCashCents = 0
        let lastMovId = null
        for (let i = 0; i < accMovements.length; i++) {
          const m = accMovements[i]
          const mType = m.getString('movement_type')
          const mNet = m.getInt('net_amount_cents') || 0
          lastMovId = m.id
          if (
            ['deposit', 'sell', 'dividend', 'interest_on_capital', 'amortization'].includes(mType)
          ) {
            recalculatedCashCents += mNet
          } else if (['withdrawal', 'buy', 'fee', 'tax'].includes(mType)) {
            recalculatedCashCents -= mNet
          }
        }

        if (recalculatedCashCents < 0 && movementType === 'withdrawal' && curAccId === accountId) {
          throw new Error('Saldo insuficiente na conta.')
        }

        let balanceRec = null
        try {
          const foundBalances = txApp.findRecordsByFilter(
            'account_balances',
            `user_id = "${userId}" && account_id = "${curAccId}" && currency = "${curCurrency}"`,
            '',
            1,
            0,
          )
          if (foundBalances.length > 0) {
            balanceRec = foundBalances[0]
          }
        } catch (_) {}

        if (!balanceRec) {
          const balanceCol = txApp.findCollectionByNameOrId('account_balances')
          balanceRec = new Record(balanceCol)
          balanceRec.set('user_id', userId)
          balanceRec.set('account_id', curAccId)
          balanceRec.set('currency', curCurrency)
        }

        balanceRec.set('balance_cents', recalculatedCashCents)
        if (lastMovId) {
          balanceRec.set('last_movement_id', lastMovId)
        }
        balanceRec.set('last_recalculated_at', new Date().toISOString())
        txApp.saveNoValidate(balanceRec)
      }

      // 3. Recalcular posições afetadas (conta e ativo atual, e anterior se mudou)
      const positionPairs = []
      if (assetId) {
        positionPairs.push({ accId: accountId, astId: assetId })
      }
      if (oldAssetId && (oldAssetId !== assetId || oldAccountId !== accountId)) {
        positionPairs.push({ accId: oldAccountId, astId: oldAssetId })
      }

      for (let p = 0; p < positionPairs.length; p++) {
        const pair = positionPairs[p]
        const movList = txApp.findRecordsByFilter(
          'movements',
          `user_id = "${userId}" && account_id = "${pair.accId}" && asset_id = "${pair.astId}" && is_reversed = false`,
          'date,created',
          5000,
          0,
        )

        let accQtyE8 = 0
        let accTotalCostCents = 0
        let accAvgPriceCents = 0

        for (let i = 0; i < movList.length; i++) {
          const m = movList[i]
          const mType = m.getString('movement_type')
          const mQtyE8 = m.getInt('quantity_e8') || 0
          const mGross = m.getInt('gross_amount_cents') || 0
          const mNet = m.getInt('net_amount_cents') || 0
          const mUnitPrice = m.getInt('unit_price_cents') || 0

          if (mType === 'buy') {
            const addedQty = mQtyE8
            const addedCost =
              mNet > 0
                ? mNet
                : mUnitPrice > 0
                  ? Math.round((mUnitPrice * addedQty) / 100000000)
                  : mGross
            const newQty = accQtyE8 + addedQty
            const newCost = accTotalCostCents + addedCost
            accQtyE8 = newQty
            accTotalCostCents = newCost
            accAvgPriceCents = newQty > 0 ? Math.round((newCost * 100000000) / newQty) : 0
          } else if (mType === 'sell') {
            const soldQty = Math.min(mQtyE8, accQtyE8)
            const remainingQty = accQtyE8 - soldQty
            const remainingCost =
              remainingQty > 0 ? Math.round((accAvgPriceCents * remainingQty) / 100000000) : 0
            accQtyE8 = remainingQty
            accTotalCostCents = remainingCost
            if (remainingQty === 0) {
              accAvgPriceCents = 0
            }
          } else if (mType === 'amortization') {
            const amortAmount = mNet > 0 ? mNet : mGross
            accTotalCostCents = Math.max(0, accTotalCostCents - amortAmount)
            accAvgPriceCents =
              accQtyE8 > 0 ? Math.round((accTotalCostCents * 100000000) / accQtyE8) : 0
          }
        }

        let posRec = null
        try {
          const foundPositions = txApp.findRecordsByFilter(
            'positions',
            `user_id = "${userId}" && account_id = "${pair.accId}" && asset_id = "${pair.astId}"`,
            '',
            1,
            0,
          )
          if (foundPositions.length > 0) {
            posRec = foundPositions[0]
          }
        } catch (_) {}

        if (!posRec) {
          const positionsCol = txApp.findCollectionByNameOrId('positions')
          posRec = new Record(positionsCol)
          posRec.set('user_id', userId)
          posRec.set('account_id', pair.accId)
          posRec.set('asset_id', pair.astId)
        }

        posRec.set('quantity_e8', accQtyE8)
        posRec.set('average_price_cents', accAvgPriceCents)
        posRec.set('total_cost_cents', accTotalCostCents)
        posRec.set('last_recalculated_at', new Date().toISOString())
        txApp.saveNoValidate(posRec)
      }
    })
  } catch (err) {
    const errStr = err && err.message ? err.message : String(err)
    if (errStr.includes('Saldo insuficiente na conta.')) {
      return e.json(400, {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Saldo insuficiente na conta.',
      })
    }
    return e.json(400, {
      code: 'TRANSACTION_FAILED',
      message: 'Falha ao processar atualização: ' + errStr,
    })
  }

  return e.json(200, {
    id: movementId,
    user_id: userId,
    account_id: accountId,
    asset_id: assetId || undefined,
    movement_type: movementType,
    date: dateStr,
    quantity_e8: quantityE8,
    unit_price_cents: unitPriceCents,
    gross_amount_cents: grossAmountCents,
    fees_cents: feesCents,
    taxes_cents: taxesCents,
    net_amount_cents: netAmountCents,
    idempotency_key: originalIdempotencyKey || undefined,
    is_reversed: false,
    notes: notes || undefined,
    created: finalCreatedDate,
    updated: finalUpdatedDate,
    expand: {
      account_id: {
        id: accountRec.id,
        name: accountRec.getString('name'),
        account_type: accountRec.getString('account_type'),
        currency: accountRec.getString('currency'),
        is_active: accountRec.getBool('is_active'),
      },
      asset_id: assetRec
        ? {
            id: assetRec.id,
            ticker: assetRec.getString('ticker'),
            name: assetRec.getString('name'),
            asset_class: assetRec.getString('asset_class'),
            currency: assetRec.getString('currency'),
            is_active: assetRec.getBool('is_active'),
          }
        : undefined,
    },
  })
})
