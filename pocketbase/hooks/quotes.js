// Hook quotes.js: Atualização de cotações de ativos e câmbio via brapi.dev
// Agendado via cronAdd nos dias úteis (11:00 e 18:00 horário de Brasília / 14:00 e 21:00 UTC)
// e acionável sob demanda via POST /backend/v1/quotes/refresh para usuários autenticados.

// Cron job 1: 14:00 UTC (11:00 Horário de Brasília) dias de semana (seg-sex)
cronAdd('quotes_refresh_morning', '0 14 * * 1-5', () => {
  const token = ($os.getenv('BRAPI_TOKEN') || '').trim()
  if (!token) {
    console.log('[WARN][QUOTES_CRON] BRAPI_TOKEN ausente. Atualização de cotações ignorada.')
    return
  }

  try {
    let quotesCol
    try {
      quotesCol = $app.findCollectionByNameOrId('quotes')
    } catch (_) {
      console.log('[WARN][QUOTES_CRON] Collection quotes não encontrada.')
      return
    }

    // 1. Obter todos os tickers únicos cadastrados em assets (classes de mercado)
    const tickersSet = {}
    try {
      const assetsList = $app.findRecordsByFilter(
        'assets',
        'is_active = true && ticker != ""',
        'ticker',
        1000,
        0,
      )
      for (let i = 0; i < assetsList.length; i++) {
        const rawTicker = (assetsList[i].getString('ticker') || '').trim().toUpperCase()
        if (rawTicker && rawTicker.length >= 2 && !rawTicker.includes(' ')) {
          tickersSet[rawTicker] = true
        }
      }
    } catch (astErr) {
      console.log('[WARN][QUOTES_CRON] Erro ao buscar ativos: ' + astErr.message)
    }

    const tickersList = Object.keys(tickersSet)
    let updatedCount = 0

    // 2. Buscar cotações na brapi.dev em lotes de até 10 tickers
    if (tickersList.length > 0) {
      const batchSize = 10
      for (let b = 0; b < tickersList.length; b += batchSize) {
        const batchTickers = tickersList.slice(b, b + batchSize)
        const tickersParam = batchTickers.join(',')

        try {
          const res = $http.send({
            url: `https://brapi.dev/api/quote/${encodeURIComponent(tickersParam)}`,
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 20,
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const body = res.json || {}
            const results = body.results || []
            for (let r = 0; r < results.length; r++) {
              const item = results[r]
              const itemTicker = (item.symbol || '').trim().toUpperCase()
              const price = item.regularMarketPrice
              if (itemTicker && typeof price === 'number' && !isNaN(price)) {
                const priceCents = Math.round(price * 100)
                const currency = (item.currency || 'BRL').toUpperCase()
                const changePct =
                  typeof item.regularMarketChangePercent === 'number'
                    ? item.regularMarketChangePercent
                    : 0
                const quotedAt = item.regularMarketTime
                  ? new Date(item.regularMarketTime).toISOString()
                  : new Date().toISOString()

                try {
                  let existingRecord = null
                  try {
                    existingRecord = $app.findFirstRecordByData('quotes', 'ticker', itemTicker)
                  } catch (_) {}

                  if (existingRecord) {
                    existingRecord.set('price_cents', priceCents)
                    existingRecord.set('currency', currency)
                    existingRecord.set('quoted_at', quotedAt)
                    existingRecord.set('change_percent', changePct)
                    existingRecord.set('source', 'brapi.dev')
                    existingRecord.set('raw_data', item)
                    $app.save(existingRecord)
                  } else {
                    const newRecord = new Record(quotesCol)
                    newRecord.set('ticker', itemTicker)
                    newRecord.set('price_cents', priceCents)
                    newRecord.set('currency', currency)
                    newRecord.set('quoted_at', quotedAt)
                    newRecord.set('change_percent', changePct)
                    newRecord.set('source', 'brapi.dev')
                    newRecord.set('raw_data', item)
                    $app.save(newRecord)
                  }
                  updatedCount++
                } catch (saveErr) {
                  console.log(
                    `[WARN][QUOTES_CRON] Erro ao salvar cotação de ${itemTicker}: ${saveErr.message}`,
                  )
                }
              }
            }
          } else {
            console.log(
              `[WARN][QUOTES_CRON] Brapi retornou status ${res.statusCode}: ${res.raw || ''}`,
            )
          }
        } catch (fetchErr) {
          console.log(`[WARN][QUOTES_CRON] Exceção na requisição à brapi.dev: ${fetchErr.message}`)
        }
      }
    }

    // 3. Câmbio USD/BRL e EUR/BRL via endpoint de moedas ou quote de moedas da brapi
    try {
      const currRes = $http.send({
        url: 'https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 20,
      })

      if (currRes.statusCode >= 200 && currRes.statusCode < 300) {
        const currBody = currRes.json || {}
        const currResults = currBody.currency || currBody.results || []
        for (let c = 0; c < currResults.length; c++) {
          const cItem = currResults[c]
          const pairFrom = (cItem.fromCurrency || '').toUpperCase()
          const pairTo = (cItem.toCurrency || '').toUpperCase()
          let pairSymbol = ''
          if (pairFrom && pairTo) {
            pairSymbol = `${pairFrom}-${pairTo}`
          } else if (cItem.name) {
            pairSymbol = cItem.name.toUpperCase().replace('/', '-')
          }

          const bidPrice =
            typeof cItem.bidPrice === 'number'
              ? cItem.bidPrice
              : typeof cItem.regularMarketPrice === 'number'
                ? cItem.regularMarketPrice
                : parseFloat(cItem.bidPrice || cItem.askPrice || '0')
          if (pairSymbol && bidPrice > 0) {
            const priceCents = Math.round(bidPrice * 100)
            const quotedAt = new Date().toISOString()
            const fxTicker = pairSymbol.replace('-', '') // USDBRL / EURBRL
            const tickersToSave = [pairSymbol, fxTicker]

            for (let t = 0; t < tickersToSave.length; t++) {
              const currentTicker = tickersToSave[t]
              try {
                let existingPair = null
                try {
                  existingPair = $app.findFirstRecordByData('quotes', 'ticker', currentTicker)
                } catch (_) {}

                if (existingPair) {
                  existingPair.set('price_cents', priceCents)
                  existingPair.set('currency', 'BRL')
                  existingPair.set('quoted_at', quotedAt)
                  existingPair.set('change_percent', 0)
                  existingPair.set('source', 'brapi_fx')
                  existingPair.set('raw_data', cItem)
                  $app.save(existingPair)
                } else {
                  const newPair = new Record(quotesCol)
                  newPair.set('ticker', currentTicker)
                  newPair.set('price_cents', priceCents)
                  newPair.set('currency', 'BRL')
                  newPair.set('quoted_at', quotedAt)
                  newPair.set('change_percent', 0)
                  newPair.set('source', 'brapi_fx')
                  newPair.set('raw_data', cItem)
                  $app.save(newPair)
                }
              } catch (pairSaveErr) {
                console.log(
                  `[WARN][QUOTES_CRON] Erro ao salvar par ${currentTicker}: ${pairSaveErr.message}`,
                )
              }
            }
            updatedCount++
          }
        }
      }
    } catch (currErr) {
      console.log(`[WARN][QUOTES_CRON] Erro ao buscar câmbio na brapi.dev: ${currErr.message}`)
    }

    console.log(
      `[INFO][QUOTES_CRON] Atualização de cotações concluída. Registros afetados: ${updatedCount}`,
    )
  } catch (globalErr) {
    console.log(`[ERROR][QUOTES_CRON] Falha geral no cron de cotações: ${globalErr.message}`)
  }
})

// Cron job 2: 21:00 UTC (18:00 Horário de Brasília) dias de semana (seg-sex)
cronAdd('quotes_refresh_closing', '0 21 * * 1-5', () => {
  const token = ($os.getenv('BRAPI_TOKEN') || '').trim()
  if (!token) {
    console.log('[WARN][QUOTES_CRON] BRAPI_TOKEN ausente. Atualização de cotações ignorada.')
    return
  }

  try {
    let quotesCol
    try {
      quotesCol = $app.findCollectionByNameOrId('quotes')
    } catch (_) {
      console.log('[WARN][QUOTES_CRON] Collection quotes não encontrada.')
      return
    }

    const tickersSet = {}
    try {
      const assetsList = $app.findRecordsByFilter(
        'assets',
        'is_active = true && ticker != ""',
        'ticker',
        1000,
        0,
      )
      for (let i = 0; i < assetsList.length; i++) {
        const rawTicker = (assetsList[i].getString('ticker') || '').trim().toUpperCase()
        if (rawTicker && rawTicker.length >= 2 && !rawTicker.includes(' ')) {
          tickersSet[rawTicker] = true
        }
      }
    } catch (astErr) {
      console.log('[WARN][QUOTES_CRON] Erro ao buscar ativos: ' + astErr.message)
    }

    const tickersList = Object.keys(tickersSet)
    let updatedCount = 0

    if (tickersList.length > 0) {
      const batchSize = 10
      for (let b = 0; b < tickersList.length; b += batchSize) {
        const batchTickers = tickersList.slice(b, b + batchSize)
        const tickersParam = batchTickers.join(',')

        try {
          const res = $http.send({
            url: `https://brapi.dev/api/quote/${encodeURIComponent(tickersParam)}`,
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 20,
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const body = res.json || {}
            const results = body.results || []
            for (let r = 0; r < results.length; r++) {
              const item = results[r]
              const itemTicker = (item.symbol || '').trim().toUpperCase()
              const price = item.regularMarketPrice
              if (itemTicker && typeof price === 'number' && !isNaN(price)) {
                const priceCents = Math.round(price * 100)
                const currency = (item.currency || 'BRL').toUpperCase()
                const changePct =
                  typeof item.regularMarketChangePercent === 'number'
                    ? item.regularMarketChangePercent
                    : 0
                const quotedAt = item.regularMarketTime
                  ? new Date(item.regularMarketTime).toISOString()
                  : new Date().toISOString()

                try {
                  let existingRecord = null
                  try {
                    existingRecord = $app.findFirstRecordByData('quotes', 'ticker', itemTicker)
                  } catch (_) {}

                  if (existingRecord) {
                    existingRecord.set('price_cents', priceCents)
                    existingRecord.set('currency', currency)
                    existingRecord.set('quoted_at', quotedAt)
                    existingRecord.set('change_percent', changePct)
                    existingRecord.set('source', 'brapi.dev')
                    existingRecord.set('raw_data', item)
                    $app.save(existingRecord)
                  } else {
                    const newRecord = new Record(quotesCol)
                    newRecord.set('ticker', itemTicker)
                    newRecord.set('price_cents', priceCents)
                    newRecord.set('currency', currency)
                    newRecord.set('quoted_at', quotedAt)
                    newRecord.set('change_percent', changePct)
                    newRecord.set('source', 'brapi.dev')
                    newRecord.set('raw_data', item)
                    $app.save(newRecord)
                  }
                  updatedCount++
                } catch (saveErr) {
                  console.log(
                    `[WARN][QUOTES_CRON] Erro ao salvar cotação de ${itemTicker}: ${saveErr.message}`,
                  )
                }
              }
            }
          }
        } catch (fetchErr) {
          console.log(`[WARN][QUOTES_CRON] Exceção na requisição à brapi.dev: ${fetchErr.message}`)
        }
      }
    }

    try {
      const currRes = $http.send({
        url: 'https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 20,
      })

      if (currRes.statusCode >= 200 && currRes.statusCode < 300) {
        const currBody = currRes.json || {}
        const currResults = currBody.currency || currBody.results || []
        for (let c = 0; c < currResults.length; c++) {
          const cItem = currResults[c]
          const pairFrom = (cItem.fromCurrency || '').toUpperCase()
          const pairTo = (cItem.toCurrency || '').toUpperCase()
          let pairSymbol = ''
          if (pairFrom && pairTo) {
            pairSymbol = `${pairFrom}-${pairTo}`
          } else if (cItem.name) {
            pairSymbol = cItem.name.toUpperCase().replace('/', '-')
          }

          const bidPrice =
            typeof cItem.bidPrice === 'number'
              ? cItem.bidPrice
              : typeof cItem.regularMarketPrice === 'number'
                ? cItem.regularMarketPrice
                : parseFloat(cItem.bidPrice || cItem.askPrice || '0')
          if (pairSymbol && bidPrice > 0) {
            const priceCents = Math.round(bidPrice * 100)
            const quotedAt = new Date().toISOString()
            const fxTicker = pairSymbol.replace('-', '') // USDBRL / EURBRL
            const tickersToSave = [pairSymbol, fxTicker]

            for (let t = 0; t < tickersToSave.length; t++) {
              const currentTicker = tickersToSave[t]
              try {
                let existingPair = null
                try {
                  existingPair = $app.findFirstRecordByData('quotes', 'ticker', currentTicker)
                } catch (_) {}

                if (existingPair) {
                  existingPair.set('price_cents', priceCents)
                  existingPair.set('currency', 'BRL')
                  existingPair.set('quoted_at', quotedAt)
                  existingPair.set('change_percent', 0)
                  existingPair.set('source', 'brapi_fx')
                  existingPair.set('raw_data', cItem)
                  $app.save(existingPair)
                } else {
                  const newPair = new Record(quotesCol)
                  newPair.set('ticker', currentTicker)
                  newPair.set('price_cents', priceCents)
                  newPair.set('currency', 'BRL')
                  newPair.set('quoted_at', quotedAt)
                  newPair.set('change_percent', 0)
                  newPair.set('source', 'brapi_fx')
                  newPair.set('raw_data', cItem)
                  $app.save(newPair)
                }
              } catch (pairSaveErr) {
                console.log(
                  `[WARN][QUOTES_CRON] Erro ao salvar par ${currentTicker}: ${pairSaveErr.message}`,
                )
              }
            }
            updatedCount++
          }
        }
      }
    } catch (currErr) {
      console.log(`[WARN][QUOTES_CRON] Erro ao buscar câmbio na brapi.dev: ${currErr.message}`)
    }

    console.log(
      `[INFO][QUOTES_CRON] Atualização de fechamento concluída. Registros afetados: ${updatedCount}`,
    )
  } catch (globalErr) {
    console.log(`[ERROR][QUOTES_CRON] Falha geral no cron de fechamento: ${globalErr.message}`)
  }
})

// Rota sob demanda para atualização manual (exige autenticação)
routerAdd('GET', '/backend/v1/quotes/debug-migrations', (e) => {
  const rows = []
  $app.db().newQuery('SELECT file, applied FROM _migrations').all(rows)
  return e.json(200, { rows })
})

routerAdd('POST', '/backend/v1/quotes/refresh', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, {
      code: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.',
    })
  }

  const token = ($os.getenv('BRAPI_TOKEN') || '').trim()
  if (!token) {
    return e.json(400, {
      code: 'BRAPI_TOKEN_MISSING',
      message: 'Token da brapi.dev (BRAPI_TOKEN) não configurado no servidor.',
    })
  }

  let quotesCol
  try {
    quotesCol = $app.findCollectionByNameOrId('quotes')
  } catch (_) {
    return e.json(500, {
      code: 'COLLECTION_NOT_FOUND',
      message: 'Collection quotes não existe no banco de dados.',
    })
  }

  // 1. Obter todos os tickers únicos: do body da requisição (se enviado) OU das posições/ativos do usuário autenticado
  const tickersSet = {}
  let customTickersProvided = false

  try {
    const reqInfo = e.requestInfo()
    const body = reqInfo ? reqInfo.body : {}
    if (body && Array.isArray(body.tickers) && body.tickers.length > 0) {
      customTickersProvided = true
      for (let t = 0; t < body.tickers.length; t++) {
        const rawTicker = String(body.tickers[t] || '')
          .trim()
          .toUpperCase()
        if (rawTicker && rawTicker.length >= 2 && !rawTicker.includes(' ')) {
          tickersSet[rawTicker] = true
        }
      }
    }
  } catch (_) {}

  // Se não foi enviada lista de tickers no body, busca tickers únicos de equities, real_estate_funds, crypto ou das posições do usuário
  if (!customTickersProvided) {
    try {
      const userFilter = `user_id = "${authRecord.id}" && is_active = true && ticker != ""`
      const assetsList = $app.findRecordsByFilter('assets', userFilter, 'ticker', 1000, 0)
      for (let i = 0; i < assetsList.length; i++) {
        const rawTicker = (assetsList[i].getString('ticker') || '').trim().toUpperCase()
        const assetClass = assetsList[i].getString('asset_class')
        // Ativos de renda fixa não têm ticker de mercado na brapi
        if (assetClass === 'fixed_income') continue
        if (rawTicker && rawTicker.length >= 2 && !rawTicker.includes(' ')) {
          tickersSet[rawTicker] = true
        }
      }
    } catch (astErr) {
      console.log('[WARN][QUOTES_REFRESH] Erro ao buscar ativos: ' + astErr.message)
    }
  }

  const tickersList = Object.keys(tickersSet)
  let updatedCount = 0
  const errors = []

  // 2. Buscar cotações na brapi.dev em lotes de até 10 tickers (respeitando plano free)
  if (tickersList.length > 0) {
    const batchSize = 10
    for (let b = 0; b < tickersList.length; b += batchSize) {
      const batchTickers = tickersList.slice(b, b + batchSize)
      const tickersParam = batchTickers.join(',')

      try {
        const res = $http.send({
          url: `https://brapi.dev/api/quote/${encodeURIComponent(tickersParam)}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 25,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.json || {}
          const results = body.results || []
          for (let r = 0; r < results.length; r++) {
            const item = results[r]
            const itemTicker = (item.symbol || '').trim().toUpperCase()
            const price = item.regularMarketPrice
            if (itemTicker && typeof price === 'number' && !isNaN(price)) {
              const priceCents = Math.round(price * 100)
              const currency = (item.currency || 'BRL').toUpperCase()
              const changePct =
                typeof item.regularMarketChangePercent === 'number'
                  ? item.regularMarketChangePercent
                  : 0
              const quotedAt = item.regularMarketTime
                ? new Date(item.regularMarketTime).toISOString()
                : new Date().toISOString()

              try {
                let existingRecord = null
                try {
                  existingRecord = $app.findFirstRecordByData('quotes', 'ticker', itemTicker)
                } catch (_) {}

                if (existingRecord) {
                  existingRecord.set('price_cents', priceCents)
                  existingRecord.set('currency', currency)
                  existingRecord.set('quoted_at', quotedAt)
                  existingRecord.set('change_percent', changePct)
                  existingRecord.set('source', 'brapi.dev')
                  existingRecord.set('raw_data', item)
                  $app.save(existingRecord)
                } else {
                  const newRecord = new Record(quotesCol)
                  newRecord.set('ticker', itemTicker)
                  newRecord.set('price_cents', priceCents)
                  newRecord.set('currency', currency)
                  newRecord.set('quoted_at', quotedAt)
                  newRecord.set('change_percent', changePct)
                  newRecord.set('source', 'brapi.dev')
                  newRecord.set('raw_data', item)
                  $app.save(newRecord)
                }
                updatedCount++
              } catch (saveErr) {
                errors.push(`Falha ao salvar ${itemTicker}: ${saveErr.message}`)
              }
            }
          }
        } else {
          errors.push(`brapi.dev retornou status ${res.statusCode}`)
        }
      } catch (fetchErr) {
        errors.push(`Erro de comunicação com brapi: ${fetchErr.message}`)
      }
    }
  }

  // 3. Câmbio USD/BRL e EUR/BRL
  try {
    const currRes = $http.send({
      url: 'https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 20,
    })

    if (currRes.statusCode >= 200 && currRes.statusCode < 300) {
      const currBody = currRes.json || {}
      const currResults = currBody.currency || currBody.results || []
      for (let c = 0; c < currResults.length; c++) {
        const cItem = currResults[c]
        const pairFrom = (cItem.fromCurrency || '').toUpperCase()
        const pairTo = (cItem.toCurrency || '').toUpperCase()
        let pairSymbol = ''
        if (pairFrom && pairTo) {
          pairSymbol = `${pairFrom}-${pairTo}`
        } else if (cItem.name) {
          pairSymbol = cItem.name.toUpperCase().replace('/', '-')
        }

        const bidPrice =
          typeof cItem.bidPrice === 'number'
            ? cItem.bidPrice
            : typeof cItem.regularMarketPrice === 'number'
              ? cItem.regularMarketPrice
              : parseFloat(cItem.bidPrice || cItem.askPrice || '0')
        if (pairSymbol && bidPrice > 0) {
          const priceCents = Math.round(bidPrice * 100)
          const quotedAt = new Date().toISOString()
          const fxTicker = pairSymbol.replace('-', '') // USDBRL ou EURBRL
          const tickersToSave = [pairSymbol, fxTicker]

          for (let t = 0; t < tickersToSave.length; t++) {
            const currentTicker = tickersToSave[t]
            try {
              let existingPair = null
              try {
                existingPair = $app.findFirstRecordByData('quotes', 'ticker', currentTicker)
              } catch (_) {}

              if (existingPair) {
                existingPair.set('price_cents', priceCents)
                existingPair.set('currency', 'BRL')
                existingPair.set('quoted_at', quotedAt)
                existingPair.set('change_percent', 0)
                existingPair.set('source', 'brapi_fx')
                existingPair.set('raw_data', cItem)
                $app.save(existingPair)
              } else {
                const newPair = new Record(quotesCol)
                newPair.set('ticker', currentTicker)
                newPair.set('price_cents', priceCents)
                newPair.set('currency', 'BRL')
                newPair.set('quoted_at', quotedAt)
                newPair.set('change_percent', 0)
                newPair.set('source', 'brapi_fx')
                newPair.set('raw_data', cItem)
                $app.save(newPair)
              }
            } catch (pairSaveErr) {
              errors.push(`Falha ao salvar par ${currentTicker}: ${pairSaveErr.message}`)
            }
          }
          updatedCount++
        }
      }
    }
  } catch (currErr) {
    errors.push(`Erro ao buscar moedas: ${currErr.message}`)
  }

  // 4. Trilha de auditoria (audit_logs)
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set('user_id', authRecord.id)
    log.set('event_type', 'QUOTES_REFRESHED')
    log.set('severity', 'info')
    log.set('entity', 'quotes')
    log.set('summary', `Cotações atualizadas sob demanda: ${updatedCount} itens sincronizados.`)
    log.set('details', {
      tickers_requested: tickersList,
      updated_count: updatedCount,
      errors: errors,
    })
    $app.save(log)
  } catch (logErr) {
    console.log('[WARN][QUOTES_REFRESH] Erro ao gravar log de auditoria: ' + logErr.message)
  }

  return e.json(200, {
    success: true,
    updated_count: updatedCount,
    tickers_count: tickersList.length,
    errors: errors.length > 0 ? errors : undefined,
  })
})
