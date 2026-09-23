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

routerAdd('GET', '/backend/v1/backups/{key}/download', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem baixar arquivos de backup.',
    })
  }

  const rawKey = e.request?.pathValue ? e.request.pathValue('key') : e.pathParam('key')
  const key = (rawKey || '').trim()

  // Validação contra path traversal e formato de chave
  if (
    !key ||
    key.includes('/') ||
    key.includes('\\') ||
    key.includes('..') ||
    !key.endsWith('.zip')
  ) {
    return e.json(400, {
      code: 'INVALID_BACKUP_KEY',
      message: 'Nome de snapshot de backup inválido.',
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

  // 1. Validar se o backup informado realmente existe na lista da instância
  try {
    const listRes = $http.send({
      url: baseUrl + '/api/backups',
      method: 'GET',
      headers: {
        Authorization: superToken,
      },
      timeout: 15,
    })

    if (listRes.statusCode >= 400) {
      console.log(
        'CHECK_BACKUP_EXISTENCE_ERROR: status=' + listRes.statusCode + ' body=' + listRes.raw,
      )
      return e.json(listRes.statusCode, {
        code: 'BACKUP_LIST_FAILED',
        message:
          'Falha ao validar lista de backups no PocketBase: ' +
          (listRes.json?.message || listRes.raw || 'Erro desconhecido'),
      })
    }

    const availableItems = listRes.json || []
    const exists = availableItems.some((item) => item.key === key)
    if (!exists) {
      return e.json(404, {
        code: 'BACKUP_NOT_FOUND',
        message: 'Backup não encontrado.',
      })
    }
  } catch (checkErr) {
    console.log('CHECK_BACKUP_EXCEPTION: ' + checkErr.message)
    return e.json(500, {
      code: 'BACKUP_CHECK_EXCEPTION',
      message: 'Erro interno ao verificar existência do backup: ' + checkErr.message,
    })
  }

  // 2. Buscar o arquivo .zip na API nativa do PocketBase com token de superusuário
  try {
    let backupRes = null
    let authMethodUsed = ''

    // Tentativa A: query param ?token= (comportamento padrão do PocketBase para download de arquivos/backups)
    try {
      const urlWithToken =
        baseUrl +
        '/api/backups/' +
        encodeURIComponent(key) +
        '?token=' +
        encodeURIComponent(superToken)
      const resQuery = $http.send({
        url: urlWithToken,
        method: 'GET',
        timeout: 120,
      })
      if (resQuery.statusCode < 400) {
        backupRes = resQuery
        authMethodUsed = 'query_param_token'
        console.log('DOWNLOAD_BACKUP_SUCCESS: authenticated via query param ?token=')
      } else {
        console.log(
          'DOWNLOAD_BACKUP_TRY_QUERY_FAILED: status=' +
            resQuery.statusCode +
            ' body=' +
            resQuery.raw,
        )
      }
    } catch (tryQueryErr) {
      console.log('DOWNLOAD_BACKUP_TRY_QUERY_EXCEPTION: ' + tryQueryErr.message)
    }

    // Tentativa B: header Authorization com token direto
    if (!backupRes) {
      try {
        const resHeaderDirect = $http.send({
          url: baseUrl + '/api/backups/' + encodeURIComponent(key),
          method: 'GET',
          headers: {
            Authorization: superToken,
          },
          timeout: 120,
        })
        if (resHeaderDirect.statusCode < 400) {
          backupRes = resHeaderDirect
          authMethodUsed = 'header_authorization_direct'
          console.log('DOWNLOAD_BACKUP_SUCCESS: authenticated via Authorization direct header')
        } else {
          console.log(
            'DOWNLOAD_BACKUP_TRY_HEADER_FAILED: status=' +
              resHeaderDirect.statusCode +
              ' body=' +
              resHeaderDirect.raw,
          )
        }
      } catch (tryHeaderErr) {
        console.log('DOWNLOAD_BACKUP_TRY_HEADER_EXCEPTION: ' + tryHeaderErr.message)
      }
    }

    // Tentativa C: header Authorization com prefixo Bearer
    if (!backupRes) {
      try {
        const authHeader = superToken.startsWith('Bearer ') ? superToken : 'Bearer ' + superToken
        const resHeaderBearer = $http.send({
          url: baseUrl + '/api/backups/' + encodeURIComponent(key),
          method: 'GET',
          headers: {
            Authorization: authHeader,
          },
          timeout: 120,
        })
        if (resHeaderBearer.statusCode < 400) {
          backupRes = resHeaderBearer
          authMethodUsed = 'header_authorization_bearer'
          console.log('DOWNLOAD_BACKUP_SUCCESS: authenticated via Authorization Bearer header')
        } else {
          console.log(
            'DOWNLOAD_BACKUP_TRY_BEARER_FAILED: status=' +
              resHeaderBearer.statusCode +
              ' body=' +
              resHeaderBearer.raw,
          )
        }
      } catch (tryBearerErr) {
        console.log('DOWNLOAD_BACKUP_TRY_BEARER_EXCEPTION: ' + tryBearerErr.message)
      }
    }

    if (!backupRes || backupRes.statusCode >= 400) {
      const errStatus = backupRes ? backupRes.statusCode : 500
      const errRaw = backupRes ? backupRes.raw : 'Nenhuma tentativa obteve resposta com sucesso'
      console.log('DOWNLOAD_BACKUP_ERROR: status=' + errStatus + ' body=' + errRaw)
      return e.json(errStatus, {
        code: 'BACKUP_DOWNLOAD_FAILED',
        message:
          'Falha ao baixar backup no PocketBase: ' +
          (backupRes?.json?.message || errRaw || 'Erro desconhecido'),
      })
    }

    // Registrar evento de auditoria BACKUP_DOWNLOADED
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', authRecord.id)
      log.set('event_type', 'BACKUP_DOWNLOADED')
      log.set('severity', 'info')
      log.set('entity', 'backups')
      log.set('entity_id', key)
      log.set('summary', `Download de arquivo de backup efetuado: ${key}`)
      log.set('details', {
        key: key,
        downloaded_by: authRecord.getString('email'),
        auth_method: authMethodUsed,
        timestamp: new Date().toISOString(),
      })
      $app.save(log)
    } catch (auditErr) {
      console.log('AUDIT_LOG_ERROR_BACKUP_DOWNLOAD: ' + auditErr.message)
    }

    // Transmitir arquivo com headers adequados
    e.response.header().set('Content-Type', 'application/zip')
    e.response.header().set('Content-Disposition', 'attachment; filename="' + key + '"')
    return e.blob(200, 'application/zip', backupRes.raw)
  } catch (err) {
    console.log('DOWNLOAD_BACKUP_EXCEPTION: ' + err.message)
    return e.json(500, {
      code: 'BACKUP_DOWNLOAD_EXCEPTION',
      message: 'Erro interno ao processar download do backup: ' + err.message,
    })
  }
})
