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

  return e.json(200, {
    id: record.id,
    email: record.getString('email'),
    role: record.getString('role'),
    status: record.getString('status'),
    expires_at: record.getString('expires_at'),
    created: record.getString('created'),
    token: plainToken,
  })
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
