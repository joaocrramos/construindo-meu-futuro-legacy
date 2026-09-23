routerAdd('POST', '/backend/v1/invitations', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem emitir convites.',
    })
  }

  const data = e.requestInfo().body || {}
  const email = (data.email || '').trim().toLowerCase()
  const role = data.role === 'admin' ? 'admin' : 'user'

  if (!email || !email.includes('@')) {
    return e.json(400, { code: 'INVALID_EMAIL', message: 'E-mail inválido para convite.' })
  }

  // Verificar se usuário com este e-mail já existe
  try {
    const existingUser = $app.findAuthRecordByEmail('users', email)
    if (existingUser) {
      return e.json(400, {
        code: 'USER_ALREADY_EXISTS',
        message: 'Já existe um usuário cadastrado com este e-mail.',
      })
    }
  } catch (_) {}

  // Verificar se há convite ativo (pending) para o mesmo e-mail
  try {
    const activeInvites = $app.findRecordsByFilter(
      'invitations',
      `email = "${email}" && status = "pending"`,
      '',
      1,
      0,
    )
    if (activeInvites.length > 0) {
      const inv = activeInvites[0]
      const expDate = new Date(inv.getString('expires_at'))
      if (expDate > new Date()) {
        return e.json(400, {
          code: 'INVITE_ALREADY_PENDING',
          message: 'Já existe um convite pendente ativo para este e-mail.',
        })
      }
    }
  } catch (_) {}

  // Gerar token seguro e public_id
  const rawSecret = $security.randomString(48)
  const tokenPublicId = $security.randomString(16).toLowerCase()
  const plainToken = tokenPublicId + '.' + rawSecret
  const tokenHash = $security.sha256(plainToken)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const invitationsCol = $app.findCollectionByNameOrId('invitations')
  const record = new Record(invitationsCol)
  record.set('email', email)
  record.set('token_hash', tokenHash)
  record.set('token_public_id', tokenPublicId)
  record.set('role', role)
  record.set('status', 'pending')
  record.set('invited_by', authRecord.id)
  record.set('expires_at', expiresAt)

  $app.save(record)

  // Registrar em audit_logs
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set('user_id', authRecord.id)
    log.set('event_type', 'INVITE_CREATED')
    log.set('severity', 'info')
    log.set('entity', 'invitations')
    log.set('entity_id', record.id)
    log.set('summary', `Convite emitido para ${email}`)
    log.set('details', { email: email, role: role, token_public_id: tokenPublicId })
    $app.save(log)
  } catch (err) {
    console.log('AUDIT_LOG_ERROR: ' + err.message)
  }

  // Envio de e-mail de convite com Resend (fallback gracioso)
  let emailSent = false
  const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
  const resendFromEmail = (
    $os.getenv('RESEND_FROM_EMAIL') || 'contato@construindomeufuturo.com'
  ).trim()
  const resendFromName = ($os.getenv('RESEND_FROM_NAME') || 'Construindo Meu Futuro').trim()
  const siteUrl = ($os.getenv('SITE_URL') || 'https://construindomeufuturo.com').replace(/\/+$/, '')

  if (!resendApiKey) {
    console.log(
      '[WARN][INVITATIONS] RESEND_API_KEY não configurada. Disparo de e-mail de convite ignorado para ' +
        email +
        '.',
    )
  } else {
    try {
      const inviteUrl = `${siteUrl}/register?token=${encodeURIComponent(plainToken)}`
      const fromHeader = `${resendFromName} <${resendFromEmail}>`
      const subject = 'Convite de Acesso — Construindo Meu Futuro'
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">Você foi convidado para o Construindo Meu Futuro</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Você recebeu um convite exclusivo para criar sua conta e acessar a plataforma de gestão patrimonial e financeira pessoal.
          </p>
          <div style="margin: 24px 0;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px;">
              Aceitar Convite e Concluir Cadastro
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            Se o botão acima não funcionar, copie e cole o link no navegador:<br/>
            <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
          </p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Este convite é intransferível e expira em 7 dias. Se você não esperava este e-mail, pode ignorá-lo com segurança.
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
          from: fromHeader,
          to: [email],
          subject: subject,
          html: htmlBody,
        }),
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        emailSent = true
        console.log('[INFO][INVITATIONS] E-mail de convite enviado via Resend para ' + email)
      } else {
        console.log(
          '[WARN][INVITATIONS] Falha no Resend (status ' + res.statusCode + '): ' + (res.raw || ''),
        )
      }
    } catch (sendErr) {
      console.log('[WARN][INVITATIONS] Erro ao enviar e-mail com Resend: ' + sendErr.message)
    }
  }

  return e.json(200, {
    id: record.id,
    email: record.getString('email'),
    role: record.getString('role'),
    status: record.getString('status'),
    expires_at: record.getString('expires_at'),
    created: record.getString('created'),
    token: plainToken,
    email_sent: emailSent,
  })
})

routerAdd('GET', '/backend/v1/admin/email-status', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem consultar a configuração de e-mail.',
    })
  }

  const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
  const resendFromEmail = ($os.getenv('RESEND_FROM_EMAIL') || '').trim()
  const resendFromName = ($os.getenv('RESEND_FROM_NAME') || '').trim()
  const siteUrl = ($os.getenv('SITE_URL') || '').trim()

  return e.json(200, {
    resend_configured: Boolean(resendApiKey),
    has_resend_api_key: Boolean(resendApiKey),
    has_from_email: Boolean(resendFromEmail),
    from_email: resendFromEmail || 'contato@construindomeufuturo.com (padrão)',
    has_from_name: Boolean(resendFromName),
    from_name: resendFromName || 'Construindo Meu Futuro (padrão)',
    has_site_url: Boolean(siteUrl),
    site_url: siteUrl || 'https://construindomeufuturo.com (padrão)',
  })
})

routerAdd('POST', '/backend/v1/email/test', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem enviar e-mails de teste.',
    })
  }

  const data = e.requestInfo().body || {}
  const toEmail = (data.email || data.to || '').trim().toLowerCase()

  if (!toEmail || !toEmail.includes('@') || !toEmail.includes('.')) {
    return e.json(400, {
      code: 'INVALID_EMAIL',
      message: 'Por favor, informe um endereço de e-mail de destino válido.',
    })
  }

  const resendApiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
  const resendFromEmail = (
    $os.getenv('RESEND_FROM_EMAIL') || 'contato@construindomeufuturo.com'
  ).trim()
  const resendFromName = ($os.getenv('RESEND_FROM_NAME') || 'Construindo Meu Futuro').trim()
  const siteUrl = ($os.getenv('SITE_URL') || 'https://construindomeufuturo.com').replace(/\/+$/, '')

  if (!resendApiKey) {
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', authRecord.id)
      log.set('event_type', 'EMAIL_TEST_FAILED')
      log.set('severity', 'warn')
      log.set('entity', 'system')
      log.set('summary', `Tentativa de e-mail de teste falhou: RESEND_API_KEY ausente (${toEmail})`)
      log.set('details', {
        to: toEmail,
        reason: 'RESEND_API_KEY_MISSING',
        from: `${resendFromName} <${resendFromEmail}>`,
      })
      $app.save(log)
    } catch (_) {}

    return e.json(400, {
      code: 'RESEND_NOT_CONFIGURED',
      message:
        'A variável RESEND_API_KEY não está configurada no ambiente. Configure-a no painel Skip Cloud para habilitar o envio.',
    })
  }

  const fromHeader = `${resendFromName} <${resendFromEmail}>`
  const subject = 'E-mail de Teste — Construindo Meu Futuro'
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 20px;">Teste de Conectividade Resend</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 16px;">
        Este é um e-mail de teste disparado a partir do painel de administração da plataforma <strong>Construindo Meu Futuro</strong> para verificar a integração com a API do Resend.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
        <p style="margin: 4px 0;"><strong>Remetente configurado:</strong> ${fromHeader}</p>
        <p style="margin: 4px 0;"><strong>Destinatário:</strong> ${toEmail}</p>
        <p style="margin: 4px 0;"><strong>Ambiente / URL base:</strong> <a href="${siteUrl}" style="color: #2563eb; text-decoration: none;">${siteUrl}</a></p>
        <p style="margin: 4px 0;"><strong>Disparado por:</strong> ${authRecord.getString('name') || authRecord.getString('email')} (${authRecord.id})</p>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #16a34a; font-weight: 600; margin-bottom: 8px;">
        ✓ Se você recebeu esta mensagem, sua integração transacional está funcionando perfeitamente!
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        Construindo Meu Futuro &bull; Mensagem automática gerada pelo sistema de verificação de e-mail.
      </p>
    </div>
  `

  try {
    const res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [toEmail],
        subject: subject,
        html: htmlBody,
      }),
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const resJson = res.json || {}
      const resendId = resJson.id || ''

      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', authRecord.id)
        log.set('event_type', 'EMAIL_TEST_SENT')
        log.set('severity', 'info')
        log.set('entity', 'system')
        log.set('summary', `E-mail de teste enviado com sucesso para ${toEmail}`)
        log.set('details', {
          to: toEmail,
          from: fromHeader,
          resend_id: resendId,
          status_code: res.statusCode,
        })
        $app.save(log)
      } catch (logErr) {
        console.log('[WARN][EMAIL_TEST] Falha ao registrar audit log: ' + logErr.message)
      }

      return e.json(200, {
        success: true,
        message: `E-mail de teste enviado para ${toEmail}`,
        resend_id: resendId,
      })
    }

    // Falha da API do Resend (ex.: domínio não verificado, chave inválida, etc.)
    const rawBody = res.raw || ''
    let errorDetail = 'Erro retornado pela API do Resend.'
    try {
      const errJson = res.json || {}
      if (errJson.message) {
        errorDetail = errJson.message
      }
    } catch (_) {}

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', authRecord.id)
      log.set('event_type', 'EMAIL_TEST_FAILED')
      log.set('severity', 'warn')
      log.set('entity', 'system')
      log.set('summary', `Falha ao enviar e-mail de teste para ${toEmail}: ${errorDetail}`)
      log.set('details', {
        to: toEmail,
        from: fromHeader,
        status_code: res.statusCode,
        raw_error: rawBody,
      })
      $app.save(log)
    } catch (_) {}

    return e.json(400, {
      code: 'RESEND_API_ERROR',
      message: `Falha ao enviar via Resend (HTTP ${res.statusCode}): ${errorDetail}`,
      details: rawBody,
    })
  } catch (sendErr) {
    const errorMsg = sendErr && sendErr.message ? sendErr.message : String(sendErr)

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', authRecord.id)
      log.set('event_type', 'EMAIL_TEST_FAILED')
      log.set('severity', 'warn')
      log.set('entity', 'system')
      log.set('summary', `Exceção ao disparar e-mail de teste para ${toEmail}: ${errorMsg}`)
      log.set('details', {
        to: toEmail,
        from: fromHeader,
        error: errorMsg,
      })
      $app.save(log)
    } catch (_) {}

    return e.json(400, {
      code: 'SEND_EXCEPTION',
      message: `Erro na comunicação com o servidor de e-mail: ${errorMsg}`,
    })
  }
})

routerAdd('POST', '/backend/v1/invitations/revoke', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem revogar convites.',
    })
  }

  const data = e.requestInfo().body || {}
  const inviteId = data.id

  if (!inviteId) {
    return e.json(400, { code: 'INVALID_ID', message: 'ID do convite não informado.' })
  }

  let record
  try {
    record = $app.findRecordById('invitations', inviteId)
  } catch (_) {
    return e.json(404, { code: 'NOT_FOUND', message: 'Convite não encontrado.' })
  }

  if (record.getString('status') !== 'pending') {
    return e.json(400, {
      code: 'CANNOT_REVOKE',
      message: 'Apenas convites com status pendente podem ser revogados.',
    })
  }

  record.set('status', 'revoked')
  $app.save(record)

  // Audit log
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set('user_id', authRecord.id)
    log.set('event_type', 'INVITE_REVOKED')
    log.set('severity', 'info')
    log.set('entity', 'invitations')
    log.set('entity_id', record.id)
    log.set('summary', `Convite para ${record.getString('email')} foi revogado`)
    $app.save(log)
  } catch (err) {
    console.log('AUDIT_LOG_ERROR: ' + err.message)
  }

  return e.json(200, { success: true, id: record.id, status: 'revoked' })
})

routerAdd('GET', '/backend/v1/invitations/validate', (e) => {
  const token = (e.requestInfo().query.token || '').trim()
  if (!token || !token.includes('.')) {
    return e.json(400, {
      code: 'INVITE_INVALID_TOKEN',
      message: 'Token de convite inválido ou ausente.',
    })
  }

  const parts = token.split('.')
  const tokenPublicId = parts[0]
  const tokenHash = $security.sha256(token)

  let record
  try {
    record = $app.findFirstRecordByData('invitations', 'token_public_id', tokenPublicId)
  } catch (_) {
    return e.json(404, { code: 'INVITE_INVALID_TOKEN', message: 'Convite não encontrado.' })
  }

  if (record.getString('token_hash') !== tokenHash) {
    return e.json(400, { code: 'INVITE_INVALID_TOKEN', message: 'Token de convite não confere.' })
  }

  const currentStatus = record.getString('status')
  if (currentStatus === 'accepted') {
    return e.json(400, { code: 'INVITE_ALREADY_USED', message: 'Este convite já foi utilizado.' })
  }
  if (currentStatus === 'revoked') {
    return e.json(400, {
      code: 'INVITE_REVOKED',
      message: 'Este convite foi revogado por um administrador.',
    })
  }
  if (currentStatus !== 'pending') {
    return e.json(400, { code: 'INVITE_INVALID_STATUS', message: 'Convite em estado inválido.' })
  }

  const expiresAt = new Date(record.getString('expires_at'))
  if (expiresAt < new Date()) {
    record.set('status', 'expired')
    $app.save(record)
    return e.json(400, { code: 'INVITE_EXPIRED', message: 'Este convite está expirado.' })
  }

  return e.json(200, {
    valid: true,
    email: record.getString('email'),
    role: record.getString('role'),
  })
})

routerAdd('POST', '/backend/v1/invitations/accept', (e) => {
  const data = e.requestInfo().body || {}
  const token = (data.token || '').trim()
  const name = (data.name || '').trim()
  const password = data.password || ''

  if (!token || !token.includes('.')) {
    return e.json(400, { code: 'INVITE_INVALID_TOKEN', message: 'Token de convite inválido.' })
  }
  if (!name || name.length < 2) {
    return e.json(400, { code: 'INVALID_NAME', message: 'O nome deve ter no mínimo 2 caracteres.' })
  }
  if (!password || password.length < 8) {
    return e.json(400, {
      code: 'INVALID_PASSWORD',
      message: 'A senha deve ter no mínimo 8 caracteres.',
    })
  }

  const parts = token.split('.')
  const tokenPublicId = parts[0]
  const tokenHash = $security.sha256(token)

  let record
  try {
    record = $app.findFirstRecordByData('invitations', 'token_public_id', tokenPublicId)
  } catch (_) {
    return e.json(404, { code: 'INVITE_INVALID_TOKEN', message: 'Convite não encontrado.' })
  }

  if (record.getString('token_hash') !== tokenHash) {
    return e.json(400, { code: 'INVITE_INVALID_TOKEN', message: 'Token de convite não confere.' })
  }

  const currentStatus = record.getString('status')
  if (currentStatus === 'accepted') {
    return e.json(400, { code: 'INVITE_ALREADY_USED', message: 'Este convite já foi utilizado.' })
  }
  if (currentStatus === 'revoked') {
    return e.json(400, {
      code: 'INVITE_REVOKED',
      message: 'Este convite foi revogado por um administrador.',
    })
  }
  if (currentStatus !== 'pending') {
    return e.json(400, { code: 'INVITE_INVALID_STATUS', message: 'Convite em estado inválido.' })
  }

  const expiresAt = new Date(record.getString('expires_at'))
  if (expiresAt < new Date()) {
    record.set('status', 'expired')
    $app.save(record)
    return e.json(400, { code: 'INVITE_EXPIRED', message: 'Este convite está expirado.' })
  }

  const email = record.getString('email')
  const role = record.getString('role') || 'user'

  // Criar o usuário e marcar convite como aceito dentro de transação atômica
  let newUserId = ''
  try {
    $app.runInTransaction((txApp) => {
      // 1. Criar usuário em users
      const usersCol = txApp.findCollectionByNameOrId('users')
      const userRec = new Record(usersCol)
      userRec.setEmail(email)
      userRec.setPassword(password)
      userRec.setVerified(true)
      userRec.set('name', name)
      userRec.set('role', role)
      userRec.set('status', 'active')
      userRec.set('must_change_password', false)
      txApp.save(userRec)
      newUserId = userRec.id

      // 2. Atualizar convite
      record.set('status', 'accepted')
      record.set('accepted_at', new Date().toISOString())
      txApp.save(record)

      // 3. Registrar audit log
      const auditCol = txApp.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userRec.id)
      log.set('event_type', 'INVITE_ACCEPTED')
      log.set('severity', 'info')
      log.set('entity', 'users')
      log.set('entity_id', userRec.id)
      log.set('summary', `Cadastro concluído via convite para ${email}`)
      txApp.save(log)
    })
  } catch (err) {
    return e.json(400, {
      code: 'REGISTRATION_FAILED',
      message: 'Falha ao concluir cadastro: ' + err.message,
    })
  }

  return e.json(200, {
    success: true,
    userId: newUserId,
    email: email,
    message: 'Cadastro concluído com sucesso! Você já pode fazer login.',
  })
})
