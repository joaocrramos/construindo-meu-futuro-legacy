// Cron job diário às 06:00 horário do servidor (e endpoint administrativo para acionamento/teste manual)
// Gera alertas de:
// 1. Vencimentos próximos (30, 15 ou 7 dias) e hoje (maturity_date) de posições com saldo positivo
// 2. Saldos devedores/negativos (balance_cents < 0) em account_balances
// 3. Auditoria (evento ALERTS_GENERATED) quando ao menos 1 alerta for criado
// 4. Envio opcional consolidado por e-mail via Resend por usuário

cronAdd('daily_alerts_check', '0 6 * * *', () => {
  // Lógica auto-contida para execução via cron (pool JSVM isolado)
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  let totalAlertsCreated = 0
  const userAlertsMap = {} // userId -> array de { title, message, severity }

  try {
    const alertsCol = $app.findCollectionByNameOrId('alerts')

    // 1. Posições ativas (quantity_e8 > 0): verificar vencimento via maturity_date da posição ou due_date do ativo
    let positions = []
    try {
      positions = $app.findRecordsByFilter('positions', 'quantity_e8 > 0', 'created', 10000, 0)
    } catch (e) {
      console.log('[WARN][ALERTS_CRON] Erro ao buscar posições: ' + e.message)
    }

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      const userId = pos.getString('user_id')
      const posId = pos.id

      if (!userId) continue

      let posMatDate = pos.getString('maturity_date') || ''
      let assetTicker = 'Título'
      const astId = pos.getString('asset_id')

      if (astId) {
        try {
          const ast = $app.findRecordById('assets', astId)
          assetTicker = ast.getString('ticker') || ast.getString('name') || 'Título'
          const astDueDate = ast.getString('due_date') || ''
          const astIndexer = ast.getString('indexer_rate') || ''

          // Se a posição não tem maturity_date mas o ativo tem, ou para manter sincronizado:
          if (!posMatDate && astDueDate) {
            posMatDate = astDueDate
            try {
              pos.set('maturity_date', astDueDate)
              if (astIndexer && !pos.getString('indexer')) {
                pos.set('indexer', astIndexer)
              }
              $app.saveNoValidate(pos)
            } catch (_) {}
          }
        } catch (_) {}
      }

      const matDateStr = posMatDate.slice(0, 10)
      if (!matDateStr) continue

      // Calcular diferença em dias inteiros entre a data de vencimento e hoje
      const posDateParts = matDateStr.split('-')
      if (posDateParts.length !== 3) continue
      const targetDate = new Date(
        parseInt(posDateParts[0], 10),
        parseInt(posDateParts[1], 10) - 1,
        parseInt(posDateParts[2], 10),
      )
      const curDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const diffMs = targetDate.getTime() - curDate.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      let alertType = null
      let alertTitle = ''
      let alertMessage = ''
      let alertSeverity = 'info'

      // Formatação simples da data para dd/mm/aaaa
      const dateFormatted = `${posDateParts[2]}/${posDateParts[1]}/${posDateParts[0]}`

      // Escala de severidade de vencimento do motor de alertas:
      // - diffDays === 0: 'maturity_today', severidade 'critical' (vence hoje: ação imediata requerida)
      // - diffDays === 7: 'maturity_upcoming', severidade 'critical' (última semana: vencimento iminente)
      // - diffDays === 15: 'maturity_upcoming', severidade 'warn'
      // - diffDays === 30: 'maturity_upcoming', severidade 'info'
      //
      // Regra de disparo de e-mail transacional imediato via Resend:
      // Disparado exclusivamente quando um alerta NOVO nasce com severidade 'critical' (diffDays === 0 ou diffDays === 7).
      if (diffDays === 0) {
        alertType = 'maturity_today'
        alertSeverity = 'critical'
        alertTitle = `Vencimento Hoje: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vence hoje (${dateFormatted}). Lembre-se de verificar o resgate ou reinvestimento.`
      } else if (diffDays === 7) {
        alertType = 'maturity_upcoming'
        alertSeverity = 'critical'
        alertTitle = `Vencimento em 7 dias: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vencerá em 7 dias (${dateFormatted}). Planeje a alocação dos recursos.`
      } else if (diffDays === 15) {
        alertType = 'maturity_upcoming'
        alertSeverity = 'warn'
        alertTitle = `Vencimento em 15 dias: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vencerá em 15 dias (${dateFormatted}). Planeje a alocação dos recursos.`
      } else if (diffDays === 30) {
        alertType = 'maturity_upcoming'
        alertSeverity = 'info'
        alertTitle = `Vencimento em 30 dias: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vencerá em 30 dias (${dateFormatted}). Planeje a alocação dos recursos.`
      }

      if (alertType) {
        // Anti-duplicidade: verificar se já existe alerta do mesmo tipo para o mesmo user com a mesma due_date e reference_id
        let exists = false
        try {
          const existing = $app.findRecordsByFilter(
            'alerts',
            `user_id = "${userId}" && type = "${alertType}" && reference_id = "${posId}" && due_date ~ "${matDateStr}"`,
            '-created',
            1,
            0,
          )
          if (existing.length > 0) {
            exists = true
          }
        } catch (_) {}

        if (!exists) {
          try {
            const newAlert = new Record(alertsCol)
            newAlert.set('user_id', userId)
            newAlert.set('type', alertType)
            newAlert.set('title', alertTitle)
            newAlert.set('message', alertMessage)
            newAlert.set('severity', alertSeverity)
            newAlert.set('reference_id', posId)
            newAlert.set('due_date', `${matDateStr} 00:00:00.000Z`)
            newAlert.set('is_read', false)
            $app.save(newAlert)

            totalAlertsCreated++
            if (!userAlertsMap[userId]) userAlertsMap[userId] = []
            userAlertsMap[userId].push({
              title: alertTitle,
              message: alertMessage,
              severity: alertSeverity,
            })

            // Disparo imediato de e-mail via Resend para novos alertas CRÍTICOS
            if (alertSeverity === 'critical') {
              try {
                const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
                const resendFromEmail = (
                  $os.getenv('RESEND_FROM_EMAIL') || 'contato@construindomeufuturo.com'
                ).trim()
                const resendFromName = (
                  $os.getenv('RESEND_FROM_NAME') || 'Construindo Meu Futuro'
                ).trim()
                const siteUrl = (
                  $os.getenv('SITE_URL') || 'https://construindomeufuturo.com'
                ).replace(/\/+$/, '')

                if (!resendApiKey) {
                  console.log(
                    '[WARN][ALERTS_CRON] RESEND_API_KEY ausente. E-mail de alerta crítico ignorado para user ' +
                      userId +
                      ' (alerta: ' +
                      newAlert.id +
                      ').',
                  )
                } else {
                  let userEmail = ''
                  let userName = 'Investidor(a)'
                  try {
                    const userRec = $app.findRecordById('users', userId)
                    userEmail = (userRec.getString('email') || '').trim()
                    userName = userRec.getString('name') || 'Investidor(a)'
                  } catch (uErr) {
                    console.log(
                      '[WARN][ALERTS_CRON] Falha ao obter usuário ' +
                        userId +
                        ' para envio de e-mail: ' +
                        uErr.message,
                    )
                  }

                  if (userEmail && userEmail.includes('@')) {
                    // Formatar valor da posição em R$
                    const costCents = pos.getInt('total_cost_cents') || 0
                    const costFormatted = (costCents / 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                    const posValueDisplay = `R$ ${costFormatted}`

                    const diasTexto = diffDays === 0 ? 'hoje' : `em ${diffDays} dias`
                    const subject = `⚠️ Vencimento crítico: ${assetTicker} ${diasTexto}`

                    const htmlBody = `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="border-left: 4px solid #dc2626; padding-left: 12px; margin-bottom: 20px;">
                          <h2 style="color: #dc2626; margin: 0 0 4px 0; font-size: 18px;">⚠️ Alerta de Vencimento Crítico</h2>
                          <p style="margin: 0; color: #64748b; font-size: 13px;">Construindo Meu Futuro — Gestão Patrimonial</p>
                        </div>
                        <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
                          Olá, <strong>${userName}</strong>! Identificamos um vencimento iminente em sua carteira que requer atenção imediata para planejamento de resgate ou reinvestimento:
                        </p>
                        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Ativo:</strong> ${assetTicker}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Valor Aplicado:</strong> ${posValueDisplay}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Data de Vencimento:</strong> ${dateFormatted}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Prazo Restante:</strong> <span style="color: #dc2626; font-weight: bold;">${diffDays === 0 ? 'Vence Hoje' : `${diffDays} dias restantes`}</span></p>
                        </div>
                        <div style="margin: 24px 0;">
                          <a href="${siteUrl}/overview/alerts" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 13px;">
                            Acessar Central de Alertas
                          </a>
                        </div>
                        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                          Ou acesse diretamente pelo link: <a href="${siteUrl}/overview/alerts" style="color: #2563eb;">${siteUrl}/overview/alerts</a>
                        </p>
                        <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                          Mensagem automática disparada pelo monitor patrimonial Construindo Meu Futuro.
                        </p>
                      </div>
                    `

                    const res = $http.send({
                      url: 'https://api.resend.com/emails',
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        from: `${resendFromName} <${resendFromEmail}>`,
                        to: [userEmail],
                        subject: subject,
                        html: htmlBody,
                      }),
                      timeout: 15,
                    })

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                      console.log(
                        '[INFO][ALERTS_CRON] E-mail de alerta crítico enviado com sucesso para ' +
                          userEmail +
                          ' (alerta: ' +
                          newAlert.id +
                          ', ativo: ' +
                          assetTicker +
                          ')',
                      )
                    } else {
                      console.log(
                        '[WARN][ALERTS_CRON] Falha no envio do e-mail de alerta crítico via Resend (status ' +
                          res.statusCode +
                          ') para ' +
                          userEmail +
                          ' (alerta: ' +
                          newAlert.id +
                          '): ' +
                          (res.raw || ''),
                      )
                    }
                  }
                }
              } catch (mailErr) {
                // Falha no e-mail nunca quebra a verificação de alertas
                console.log(
                  '[WARN][ALERTS_CRON] Erro ao enviar e-mail de alerta crítico para ' +
                    userId +
                    ' (alerta: ' +
                    newAlert.id +
                    '): ' +
                    mailErr.message,
                )
              }
            }
          } catch (createErr) {
            console.log(
              '[WARN][ALERTS_CRON] Erro ao criar alerta de vencimento: ' + createErr.message,
            )
          }
        }
      }
    }

    // 2. Saldos devedores/negativos em contas (balance_cents < 0)
    let negativeBalances = []
    try {
      negativeBalances = $app.findRecordsByFilter(
        'account_balances',
        'balance_cents < 0',
        '-balance_cents',
        5000,
        0,
      )
    } catch (e) {
      console.log('[WARN][ALERTS_CRON] Erro ao buscar account_balances: ' + e.message)
    }

    for (let j = 0; j < negativeBalances.length; j++) {
      const bal = negativeBalances[j]
      const userId = bal.getString('user_id')
      const accId = bal.getString('account_id')
      const cents = bal.getInt('balance_cents')
      const curr = bal.getString('currency') || 'BRL'

      if (!userId || !accId) continue

      let accName = 'Conta'
      try {
        const acc = $app.findRecordById('accounts', accId)
        accName = acc.getString('name') || 'Conta'
      } catch (_) {}

      // Anti-duplicidade: verificar se já existe alerta não-lido de balance_negative para a mesma conta/reference_id
      let hasUnread = false
      try {
        const existing = $app.findRecordsByFilter(
          'alerts',
          `user_id = "${userId}" && type = "balance_negative" && reference_id = "${accId}" && is_read = false`,
          '-created',
          1,
          0,
        )
        if (existing.length > 0) {
          hasUnread = true
        }
      } catch (_) {}

      if (!hasUnread) {
        const formattedVal = (Math.abs(cents) / 100).toFixed(2).replace('.', ',')
        const alertTitle = `Saldo Negativo em Caixa: ${accName}`
        const alertMessage = `A conta ${accName} apresenta saldo devedor de ${curr} -${formattedVal}. Cubra o saldo para evitar encargos.`

        try {
          const newAlert = new Record(alertsCol)
          newAlert.set('user_id', userId)
          newAlert.set('type', 'balance_negative')
          newAlert.set('title', alertTitle)
          newAlert.set('message', alertMessage)
          newAlert.set('severity', 'warn')
          newAlert.set('reference_id', accId)
          newAlert.set('is_read', false)
          $app.save(newAlert)

          totalAlertsCreated++
          if (!userAlertsMap[userId]) userAlertsMap[userId] = []
          userAlertsMap[userId].push({
            title: alertTitle,
            message: alertMessage,
            severity: 'warn',
          })
        } catch (balErr) {
          console.log(
            '[WARN][ALERTS_CRON] Erro ao criar alerta de saldo negativo: ' + balErr.message,
          )
        }
      }
    }

    // 3. Auditoria: registrar apenas se pelo menos 1 alerta foi gerado
    if (totalAlertsCreated > 0) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('event_type', 'ALERTS_GENERATED')
        log.set('severity', 'info')
        log.set('entity', 'alerts')
        log.set('summary', `Alertas automáticos gerados pelo sistema: ${totalAlertsCreated}`)
        log.set('details', {
          count: totalAlertsCreated,
          users_affected: Object.keys(userAlertsMap).length,
          date: todayStr,
        })
        $app.save(log)
      } catch (auditErr) {
        console.log(
          '[WARN][ALERTS_CRON] Erro ao registrar auditoria de alertas: ' + auditErr.message,
        )
      }

      // 4. Envio consolidado por e-mail via Resend (se variáveis estiverem presentes)
      const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
      const resendFromEmail = (
        $os.getenv('RESEND_FROM_EMAIL') || 'contato@construindomeufuturo.com'
      ).trim()
      const resendFromName = ($os.getenv('RESEND_FROM_NAME') || 'Construindo Meu Futuro').trim()
      const siteUrl = ($os.getenv('SITE_URL') || 'https://construindomeufuturo.com').replace(
        /\/+$/,
        '',
      )

      if (resendApiKey) {
        const userIds = Object.keys(userAlertsMap)
        for (let u = 0; u < userIds.length; u++) {
          const uid = userIds[u]
          const list = userAlertsMap[uid]
          if (!list || list.length === 0) continue

          try {
            const userRec = $app.findRecordById('users', uid)
            const userEmail = (userRec.getString('email') || '').trim()
            const userName = userRec.getString('name') || 'Investidor(a)'

            if (userEmail && userEmail.includes('@')) {
              let itemsHtml = ''
              for (let m = 0; m < list.length; m++) {
                const itm = list[m]
                const colorBadge =
                  itm.severity === 'critical'
                    ? '#dc2626'
                    : itm.severity === 'warn'
                      ? '#d97706'
                      : '#2563eb'
                itemsHtml += `
                  <li style="margin-bottom: 12px; padding: 10px; background-color: #f8fafc; border-left: 4px solid ${colorBadge}; border-radius: 4px;">
                    <strong style="color: #0f172a; font-size: 13px;">${itm.title}</strong>
                    <p style="margin: 4px 0 0 0; color: #475569; font-size: 12px; line-height: 1.4;">${itm.message}</p>
                  </li>
                `
              }

              const htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 18px;">Construindo Meu Futuro — Seus alertas de hoje</h2>
                  <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 16px;">
                    Olá, <strong>${userName}</strong>! Identificamos eventos importantes na sua carteira que requerem sua atenção:
                  </p>
                  <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
                    ${itemsHtml}
                  </ul>
                  <div style="margin: 20px 0;">
                    <a href="${siteUrl}/overview/alerts" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 13px;">
                      Acessar Central de Alertas
                    </a>
                  </div>
                  <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                    Mensagem automática diária enviada pelo sistema de monitoramento patrimonial Construindo Meu Futuro.
                  </p>
                </div>
              `

              $http.send({
                url: 'https://api.resend.com/emails',
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: `${resendFromName} <${resendFromEmail}>`,
                  to: [userEmail],
                  subject: 'Construindo Meu Futuro — Seus alertas de hoje',
                  html: htmlBody,
                }),
                timeout: 15,
              })
            }
          } catch (emailErr) {
            console.log(
              '[WARN][ALERTS_CRON] Falha ao enviar e-mail consolidado para usuário ' +
                uid +
                ': ' +
                emailErr.message,
            )
          }
        }
      }
    }
  } catch (globalErr) {
    console.log('[ERROR][ALERTS_CRON] Exceção geral no cron de alertas: ' + globalErr.message)
  }
})

// Rota auxiliar manual (para acionamento imediato por admin ou testes)
routerAdd('POST', '/backend/v1/alerts/run-check', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { code: 'UNAUTHORIZED', message: 'Usuário não autenticado.' })
  }

  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  let totalAlertsCreated = 0
  const userAlertsMap = {}

  try {
    const alertsCol = $app.findCollectionByNameOrId('alerts')

    // 1. Posições ativas (quantity_e8 > 0): verificar vencimento via maturity_date da posição ou due_date do ativo
    let positions = []
    try {
      positions = $app.findRecordsByFilter('positions', 'quantity_e8 > 0', 'created', 10000, 0)
    } catch (err) {
      console.log('[WARN][ALERTS_CHECK] Erro ao buscar posições: ' + err.message)
    }

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      const userId = pos.getString('user_id')
      const posId = pos.id

      if (!userId) continue

      let posMatDate = pos.getString('maturity_date') || ''
      let assetTicker = 'Título'
      const astId = pos.getString('asset_id')

      if (astId) {
        try {
          const ast = $app.findRecordById('assets', astId)
          assetTicker = ast.getString('ticker') || ast.getString('name') || 'Título'
          const astDueDate = ast.getString('due_date') || ''
          const astIndexer = ast.getString('indexer_rate') || ''

          if (!posMatDate && astDueDate) {
            posMatDate = astDueDate
            try {
              pos.set('maturity_date', astDueDate)
              if (astIndexer && !pos.getString('indexer')) {
                pos.set('indexer', astIndexer)
              }
              $app.saveNoValidate(pos)
            } catch (_) {}
          }
        } catch (_) {}
      }

      const matDateStr = posMatDate.slice(0, 10)
      if (!matDateStr) continue

      const posDateParts = matDateStr.split('-')
      if (posDateParts.length !== 3) continue
      const targetDate = new Date(
        parseInt(posDateParts[0], 10),
        parseInt(posDateParts[1], 10) - 1,
        parseInt(posDateParts[2], 10),
      )
      const curDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const diffMs = targetDate.getTime() - curDate.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      let alertType = null
      let alertTitle = ''
      let alertMessage = ''
      let alertSeverity = 'info'

      const dateFormatted = `${posDateParts[2]}/${posDateParts[1]}/${posDateParts[0]}`

      // Escala de severidade de vencimento do motor de alertas:
      // - diffDays === 0: 'maturity_today', severidade 'critical' (vence hoje: ação imediata requerida)
      // - diffDays === 7: 'maturity_upcoming', severidade 'critical' (última semana: vencimento iminente)
      // - diffDays === 15: 'maturity_upcoming', severidade 'warn'
      // - diffDays === 30: 'maturity_upcoming', severidade 'info'
      //
      // Regra de disparo de e-mail transacional imediato via Resend:
      // Disparado exclusivamente quando um alerta NOVO nasce com severidade 'critical' (diffDays === 0 ou diffDays === 7).
      if (diffDays === 0) {
        alertType = 'maturity_today'
        alertSeverity = 'critical'
        alertTitle = `Vencimento Hoje: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vence hoje (${dateFormatted}). Lembre-se de verificar o resgate ou reinvestimento.`
      } else if (diffDays === 7) {
        alertType = 'maturity_upcoming'
        alertSeverity = 'critical'
        alertTitle = `Vencimento em 7 dias: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vencerá em 7 dias (${dateFormatted}). Planeje a alocação dos recursos.`
      } else if (diffDays === 15) {
        alertType = 'maturity_upcoming'
        alertSeverity = 'warn'
        alertTitle = `Vencimento em 15 dias: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vencerá em 15 dias (${dateFormatted}). Planeje a alocação dos recursos.`
      } else if (diffDays === 30) {
        alertType = 'maturity_upcoming'
        alertSeverity = 'info'
        alertTitle = `Vencimento em 30 dias: ${assetTicker}`
        alertMessage = `O título ${assetTicker} vencerá em 30 dias (${dateFormatted}). Planeje a alocação dos recursos.`
      }

      if (alertType) {
        let exists = false
        try {
          const existing = $app.findRecordsByFilter(
            'alerts',
            `user_id = "${userId}" && type = "${alertType}" && reference_id = "${posId}" && due_date ~ "${matDateStr}"`,
            '-created',
            1,
            0,
          )
          if (existing.length > 0) {
            exists = true
          }
        } catch (_) {}

        if (!exists) {
          try {
            const newAlert = new Record(alertsCol)
            newAlert.set('user_id', userId)
            newAlert.set('type', alertType)
            newAlert.set('title', alertTitle)
            newAlert.set('message', alertMessage)
            newAlert.set('severity', alertSeverity)
            newAlert.set('reference_id', posId)
            newAlert.set('due_date', `${matDateStr} 00:00:00.000Z`)
            newAlert.set('is_read', false)
            $app.save(newAlert)

            totalAlertsCreated++
            if (!userAlertsMap[userId]) userAlertsMap[userId] = []
            userAlertsMap[userId].push({
              title: alertTitle,
              message: alertMessage,
              severity: alertSeverity,
            })

            // Disparo imediato de e-mail via Resend para novos alertas CRÍTICOS
            if (alertSeverity === 'critical') {
              try {
                const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
                const resendFromEmail = (
                  $os.getenv('RESEND_FROM_EMAIL') || 'contato@construindomeufuturo.com'
                ).trim()
                const resendFromName = (
                  $os.getenv('RESEND_FROM_NAME') || 'Construindo Meu Futuro'
                ).trim()
                const siteUrl = (
                  $os.getenv('SITE_URL') || 'https://construindomeufuturo.com'
                ).replace(/\/+$/, '')

                if (!resendApiKey) {
                  console.log(
                    '[WARN][ALERTS_CHECK] RESEND_API_KEY ausente. E-mail de alerta crítico ignorado para user ' +
                      userId +
                      ' (alerta: ' +
                      newAlert.id +
                      ').',
                  )
                } else {
                  let userEmail = ''
                  let userName = 'Investidor(a)'
                  try {
                    const userRec = $app.findRecordById('users', userId)
                    userEmail = (userRec.getString('email') || '').trim()
                    userName = userRec.getString('name') || 'Investidor(a)'
                  } catch (uErr) {
                    console.log(
                      '[WARN][ALERTS_CHECK] Falha ao obter usuário ' +
                        userId +
                        ' para envio de e-mail: ' +
                        uErr.message,
                    )
                  }

                  if (userEmail && userEmail.includes('@')) {
                    // Formatar valor da posição em R$
                    const costCents = pos.getInt('total_cost_cents') || 0
                    const costFormatted = (costCents / 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                    const posValueDisplay = `R$ ${costFormatted}`

                    const diasTexto = diffDays === 0 ? 'hoje' : `em ${diffDays} dias`
                    const subject = `⚠️ Vencimento crítico: ${assetTicker} ${diasTexto}`

                    const htmlBody = `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="border-left: 4px solid #dc2626; padding-left: 12px; margin-bottom: 20px;">
                          <h2 style="color: #dc2626; margin: 0 0 4px 0; font-size: 18px;">⚠️ Alerta de Vencimento Crítico</h2>
                          <p style="margin: 0; color: #64748b; font-size: 13px;">Construindo Meu Futuro — Gestão Patrimonial</p>
                        </div>
                        <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
                          Olá, <strong>${userName}</strong>! Identificamos um vencimento iminente em sua carteira que requer atenção imediata para planejamento de resgate ou reinvestimento:
                        </p>
                        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Ativo:</strong> ${assetTicker}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Valor Aplicado:</strong> ${posValueDisplay}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Data de Vencimento:</strong> ${dateFormatted}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Prazo Restante:</strong> <span style="color: #dc2626; font-weight: bold;">${diffDays === 0 ? 'Vence Hoje' : `${diffDays} dias restantes`}</span></p>
                        </div>
                        <div style="margin: 24px 0;">
                          <a href="${siteUrl}/overview/alerts" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 13px;">
                            Acessar Central de Alertas
                          </a>
                        </div>
                        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                          Ou acesse diretamente pelo link: <a href="${siteUrl}/overview/alerts" style="color: #2563eb;">${siteUrl}/overview/alerts</a>
                        </p>
                        <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                          Mensagem automática disparada pelo monitor patrimonial Construindo Meu Futuro.
                        </p>
                      </div>
                    `

                    const res = $http.send({
                      url: 'https://api.resend.com/emails',
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        from: `${resendFromName} <${resendFromEmail}>`,
                        to: [userEmail],
                        subject: subject,
                        html: htmlBody,
                      }),
                      timeout: 15,
                    })

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                      console.log(
                        '[INFO][ALERTS_CHECK] E-mail de alerta crítico enviado com sucesso para ' +
                          userEmail +
                          ' (alerta: ' +
                          newAlert.id +
                          ', ativo: ' +
                          assetTicker +
                          ')',
                      )
                    } else {
                      console.log(
                        '[WARN][ALERTS_CHECK] Falha no envio do e-mail de alerta crítico via Resend (status ' +
                          res.statusCode +
                          ') para ' +
                          userEmail +
                          ' (alerta: ' +
                          newAlert.id +
                          '): ' +
                          (res.raw || ''),
                      )
                    }
                  }
                }
              } catch (mailErr) {
                console.log(
                  '[WARN][ALERTS_CHECK] Erro ao enviar e-mail de alerta crítico para ' +
                    userId +
                    ' (alerta: ' +
                    newAlert.id +
                    '): ' +
                    mailErr.message,
                )
              }
            }
          } catch (createErr) {
            console.log(
              '[WARN][ALERTS_CHECK] Erro ao criar alerta de vencimento: ' + createErr.message,
            )
          }
        }
      }
    }

    // 2. Saldos devedores/negativos em contas
    let negativeBalances = []
    try {
      negativeBalances = $app.findRecordsByFilter(
        'account_balances',
        'balance_cents < 0',
        '-balance_cents',
        5000,
        0,
      )
    } catch (err) {
      console.log('[WARN][ALERTS_CHECK] Erro ao buscar account_balances: ' + err.message)
    }

    for (let j = 0; j < negativeBalances.length; j++) {
      const bal = negativeBalances[j]
      const userId = bal.getString('user_id')
      const accId = bal.getString('account_id')
      const cents = bal.getInt('balance_cents')
      const curr = bal.getString('currency') || 'BRL'

      if (!userId || !accId) continue

      let accName = 'Conta'
      try {
        const acc = $app.findRecordById('accounts', accId)
        accName = acc.getString('name') || 'Conta'
      } catch (_) {}

      let hasUnread = false
      try {
        const existing = $app.findRecordsByFilter(
          'alerts',
          `user_id = "${userId}" && type = "balance_negative" && reference_id = "${accId}" && is_read = false`,
          '-created',
          1,
          0,
        )
        if (existing.length > 0) {
          hasUnread = true
        }
      } catch (_) {}

      if (!hasUnread) {
        const formattedVal = (Math.abs(cents) / 100).toFixed(2).replace('.', ',')
        const alertTitle = `Saldo Negativo em Caixa: ${accName}`
        const alertMessage = `A conta ${accName} apresenta saldo devedor de ${curr} -${formattedVal}. Cubra o saldo para evitar encargos.`

        try {
          const newAlert = new Record(alertsCol)
          newAlert.set('user_id', userId)
          newAlert.set('type', 'balance_negative')
          newAlert.set('title', alertTitle)
          newAlert.set('message', alertMessage)
          newAlert.set('severity', 'warn')
          newAlert.set('reference_id', accId)
          newAlert.set('is_read', false)
          $app.save(newAlert)

          totalAlertsCreated++
          if (!userAlertsMap[userId]) userAlertsMap[userId] = []
          userAlertsMap[userId].push({
            title: alertTitle,
            message: alertMessage,
            severity: 'warn',
          })
        } catch (balErr) {
          console.log(
            '[WARN][ALERTS_CHECK] Erro ao criar alerta de saldo negativo: ' + balErr.message,
          )
        }
      }
    }

    // 3. Auditoria
    if (totalAlertsCreated > 0) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('event_type', 'ALERTS_GENERATED')
        log.set('severity', 'info')
        log.set('entity', 'alerts')
        log.set('summary', `Alertas automáticos gerados pelo sistema: ${totalAlertsCreated}`)
        log.set('details', {
          count: totalAlertsCreated,
          users_affected: Object.keys(userAlertsMap).length,
          date: todayStr,
        })
        $app.save(log)
      } catch (auditErr) {
        console.log('[WARN][ALERTS_CHECK] Erro ao registrar auditoria: ' + auditErr.message)
      }

      // 4. E-mail consolidado
      const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
      const resendFromEmail = (
        $os.getenv('RESEND_FROM_EMAIL') || 'contato@construindomeufuturo.com'
      ).trim()
      const resendFromName = ($os.getenv('RESEND_FROM_NAME') || 'Construindo Meu Futuro').trim()
      const siteUrl = ($os.getenv('SITE_URL') || 'https://construindomeufuturo.com').replace(
        /\/+$/,
        '',
      )

      if (resendApiKey) {
        const userIds = Object.keys(userAlertsMap)
        for (let u = 0; u < userIds.length; u++) {
          const uid = userIds[u]
          const list = userAlertsMap[uid]
          if (!list || list.length === 0) continue

          try {
            const userRec = $app.findRecordById('users', uid)
            const userEmail = (userRec.getString('email') || '').trim()
            const userName = userRec.getString('name') || 'Investidor(a)'

            if (userEmail && userEmail.includes('@')) {
              let itemsHtml = ''
              for (let m = 0; m < list.length; m++) {
                const itm = list[m]
                const colorBadge =
                  itm.severity === 'critical'
                    ? '#dc2626'
                    : itm.severity === 'warn'
                      ? '#d97706'
                      : '#2563eb'
                itemsHtml += `
                  <li style="margin-bottom: 12px; padding: 10px; background-color: #f8fafc; border-left: 4px solid ${colorBadge}; border-radius: 4px;">
                    <strong style="color: #0f172a; font-size: 13px;">${itm.title}</strong>
                    <p style="margin: 4px 0 0 0; color: #475569; font-size: 12px; line-height: 1.4;">${itm.message}</p>
                  </li>
                `
              }

              const htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 18px;">Construindo Meu Futuro — Seus alertas de hoje</h2>
                  <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 16px;">
                    Olá, <strong>${userName}</strong>! Identificamos eventos importantes na sua carteira que requerem sua atenção:
                  </p>
                  <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
                    ${itemsHtml}
                  </ul>
                  <div style="margin: 20px 0;">
                    <a href="${siteUrl}/overview/alerts" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 13px;">
                      Acessar Central de Alertas
                    </a>
                  </div>
                  <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                    Mensagem automática diária enviada pelo sistema de monitoramento patrimonial Construindo Meu Futuro.
                  </p>
                </div>
              `

              $http.send({
                url: 'https://api.resend.com/emails',
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: `${resendFromName} <${resendFromEmail}>`,
                  to: [userEmail],
                  subject: 'Construindo Meu Futuro — Seus alertas de hoje',
                  html: htmlBody,
                }),
                timeout: 15,
              })
            }
          } catch (emailErr) {
            console.log(
              '[WARN][ALERTS_CHECK] Falha ao enviar e-mail consolidado: ' + emailErr.message,
            )
          }
        }
      }
    }

    return e.json(200, {
      success: true,
      alerts_created: totalAlertsCreated,
      users_affected: Object.keys(userAlertsMap).length,
      date: todayStr,
    })
  } catch (err) {
    return e.json(500, {
      code: 'ALERTS_CHECK_FAILED',
      message: 'Falha ao executar rotina de alertas: ' + err.message,
    })
  }
})
