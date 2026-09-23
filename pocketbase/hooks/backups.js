routerAdd('GET', '/backend/v1/backups', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem gerenciar backups.',
    })
  }

  let baseUrl = $os.getenv('PB_INSTANCE_URL') || ''
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const superToken = $os.getenv('PB_SUPERUSER_TOKEN') || ''

  if (!baseUrl || !superToken) {
    return e.json(500, {
      code: 'BACKUP_CONFIG_MISSING',
      message: 'Configuração do backend para gerenciamento de backups não está disponível.',
    })
  }

  try {
    const res = $http.send({
      url: baseUrl + '/api/backups',
      method: 'GET',
      headers: {
        Authorization: superToken,
      },
      timeout: 15,
    })

    if (res.statusCode >= 400) {
      console.log('LIST_BACKUPS_ERROR: status=' + res.statusCode + ' body=' + res.raw)
      return e.json(res.statusCode, {
        code: 'BACKUP_LIST_FAILED',
        message:
          'Falha ao listar backups no PocketBase: ' +
          (res.json?.message || res.raw || 'Erro desconhecido'),
      })
    }

    const backupsList = res.json || []
    return e.json(200, {
      items: backupsList,
      total: backupsList.length,
    })
  } catch (err) {
    console.log('LIST_BACKUPS_EXCEPTION: ' + err.message)
    return e.json(500, {
      code: 'BACKUP_LIST_EXCEPTION',
      message: 'Erro interno ao consultar lista de backups: ' + err.message,
    })
  }
})

routerAdd('POST', '/backend/v1/backups', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem criar backups.',
    })
  }

  let baseUrl = $os.getenv('PB_INSTANCE_URL') || ''
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const superToken = $os.getenv('PB_SUPERUSER_TOKEN') || ''

  if (!baseUrl || !superToken) {
    return e.json(500, {
      code: 'BACKUP_CONFIG_MISSING',
      message: 'Configuração do backend para criação de backups não está disponível.',
    })
  }

  const reqBody = e.requestInfo().body || {}
  let customName = (reqBody.name || '').trim()
  if (!customName) {
    const now = new Date()
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    const timestampStr =
      now.getUTCFullYear() +
      pad(now.getUTCMonth() + 1) +
      pad(now.getUTCDate()) +
      '_' +
      pad(now.getUTCHours()) +
      pad(now.getUTCMinutes()) +
      pad(now.getUTCSeconds())
    customName = 'backup_' + timestampStr + '.zip'
  }

  if (!customName.endsWith('.zip')) {
    customName = customName + '.zip'
  }

  try {
    const res = $http.send({
      url: baseUrl + '/api/backups',
      method: 'POST',
      headers: {
        Authorization: superToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: customName }),
      timeout: 60,
    })

    if (res.statusCode >= 400) {
      console.log('CREATE_BACKUP_ERROR: status=' + res.statusCode + ' body=' + res.raw)
      return e.json(res.statusCode, {
        code: 'BACKUP_CREATE_FAILED',
        message:
          'Falha ao criar backup no PocketBase: ' +
          (res.json?.message || res.raw || 'Erro desconhecido'),
      })
    }

    // Registrar evento em audit_logs
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', authRecord.id)
      log.set('event_type', 'BACKUP_CREATED')
      log.set('severity', 'info')
      log.set('entity', 'backups')
      log.set('entity_id', customName)
      log.set('summary', `Backup manual criado com sucesso: ${customName}`)
      log.set('details', {
        name: customName,
        initiated_by: authRecord.getString('email'),
        timestamp: new Date().toISOString(),
      })
      $app.save(log)
    } catch (auditErr) {
      console.log('AUDIT_LOG_ERROR_BACKUP: ' + auditErr.message)
    }

    return e.json(200, {
      success: true,
      name: customName,
      message: 'Backup criado com sucesso no PocketBase.',
    })
  } catch (err) {
    console.log('CREATE_BACKUP_EXCEPTION: ' + err.message)
    return e.json(500, {
      code: 'BACKUP_CREATE_EXCEPTION',
      message: 'Erro interno ao disparar criação de backup: ' + err.message,
    })
  }
})
