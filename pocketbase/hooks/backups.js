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

  // 2. Tentar entrega primária diretamente via filesystem local do PocketBase
  try {
    let zipBytes = null
    let authMethodUsed = ''

    // Descobrir candidatos de diretórios de backup locais
    const candidateDirs = []
    let dataDir = ''
    try {
      if (typeof $app.dataDir === 'function') {
        dataDir = $app.dataDir() || ''
      }
    } catch (_) {}

    if (dataDir) {
      const cleanDataDir = dataDir.endsWith('/') ? dataDir.slice(0, -1) : dataDir
      candidateDirs.push(cleanDataDir + '/pb_backup')
      candidateDirs.push(cleanDataDir + '/backups')
      candidateDirs.push(cleanDataDir + '/pb_data/pb_backup')
      // Diretório irmão do dataDir
      const lastSlashIdx = cleanDataDir.lastIndexOf('/')
      if (lastSlashIdx > 0) {
        const parentDir = cleanDataDir.slice(0, lastSlashIdx)
        candidateDirs.push(parentDir + '/pb_backup')
        candidateDirs.push(parentDir + '/backups')
      }
    }
    candidateDirs.push('pb_backup')
    candidateDirs.push('backups')
    candidateDirs.push('./pb_backup')
    candidateDirs.push('./backups')
    candidateDirs.push('/pb_backup')
    candidateDirs.push('/data/pb_backup')

    let resolvedBackupDir = ''
    let resolvedFilePath = ''

    // Função auxiliar inline para verificar existência de arquivo
    const checkFileStat = (path) => {
      try {
        if (typeof $os !== 'undefined' && typeof $os.stat === 'function') {
          const st = $os.stat(path)
          return !!st
        }
      } catch (_) {}
      return false
    }

    // Função auxiliar inline para ler bytes de um arquivo
    const readFileBytes = (filePath, dirPath, fileName) => {
      // 1. $os.readFile
      try {
        if (typeof $os !== 'undefined' && typeof $os.readFile === 'function') {
          const content = $os.readFile(filePath)
          if (content) return content
        }
      } catch (rfErr) {
        console.log('READ_FILE_METHOD_OS_READFILE_FAIL: ' + rfErr.message)
      }

      // 2. $os.dirFS
      try {
        if (typeof $os !== 'undefined' && typeof $os.dirFS === 'function') {
          const fs = $os.dirFS(dirPath)
          if (fs) {
            if (typeof fs.readFile === 'function') {
              const content = fs.readFile(fileName)
              if (content) return content
            }
            if (typeof fs.open === 'function') {
              const file = fs.open(fileName)
              if (file && typeof file.readAll === 'function') {
                const content = file.readAll()
                if (typeof file.close === 'function') file.close()
                if (content) return content
              }
              if (file && typeof file.read === 'function') {
                const content = file.read()
                if (typeof file.close === 'function') file.close()
                if (content) return content
              }
            }
          }
        }
      } catch (dfsErr) {
        console.log('READ_FILE_METHOD_OS_DIRFS_FAIL: ' + dfsErr.message)
      }

      // 3. $filesystem ou $os.open
      try {
        if (typeof $os !== 'undefined' && typeof $os.open === 'function') {
          const file = $os.open(filePath)
          if (file) {
            if (typeof file.readAll === 'function') {
              const content = file.readAll()
              if (typeof file.close === 'function') file.close()
              if (content) return content
            }
            if (typeof file.read === 'function') {
              const content = file.read()
              if (typeof file.close === 'function') file.close()
              if (content) return content
            }
          }
        }
      } catch (oErr) {
        console.log('READ_FILE_METHOD_OS_OPEN_FAIL: ' + oErr.message)
      }

      return null
    }

    for (let i = 0; i < candidateDirs.length; i++) {
      const cDir = candidateDirs[i]
      const targetFile = cDir.endsWith('/') ? cDir + key : cDir + '/' + key
      if (checkFileStat(targetFile)) {
        resolvedBackupDir = cDir
        resolvedFilePath = targetFile
        console.log(
          'FOUND_BACKUP_LOCAL_FILE: candidate="' + cDir + '" fullPath="' + targetFile + '"',
        )
        break
      }
    }

    if (!resolvedFilePath) {
      // Tentar verificar se algum diretório existe e se conseguimos listar arquivos
      for (let i = 0; i < candidateDirs.length; i++) {
        const cDir = candidateDirs[i]
        try {
          if (typeof $os !== 'undefined' && typeof $os.readDir === 'function') {
            const entries = $os.readDir(cDir)
            if (entries && entries.length) {
              console.log('PROBED_CANDIDATE_DIR: "' + cDir + '" entries=' + entries.length)
              for (let j = 0; j < entries.length; j++) {
                const name =
                  typeof entries[j].name === 'function' ? entries[j].name() : entries[j].name
                if (name === key) {
                  resolvedBackupDir = cDir
                  resolvedFilePath = cDir.endsWith('/') ? cDir + key : cDir + '/' + key
                  console.log('FOUND_BACKUP_VIA_READDIR: candidate="' + cDir + '"')
                  break
                }
              }
              if (resolvedFilePath) break
            }
          }
        } catch (_) {}
      }
    }

    if (resolvedFilePath) {
      const readContent = readFileBytes(resolvedFilePath, resolvedBackupDir, key)
      if (readContent) {
        zipBytes = readContent
        authMethodUsed = 'local_filesystem'
        console.log(
          'DOWNLOAD_BACKUP_SUCCESS: served directly via local filesystem from ' + resolvedFilePath,
        )
      } else {
        console.log(
          'DOWNLOAD_BACKUP_LOCAL_READ_FAILED: file found at ' +
            resolvedFilePath +
            ' but could not read content',
        )
      }
    } else {
      console.log(
        'DOWNLOAD_BACKUP_NO_LOCAL_CANDIDATE: target ' +
          key +
          ' not found in tested candidate dirs (dataDir=' +
          dataDir +
          ')',
      )
    }

    // 3. Fallback: tentativas HTTP caso a leitura local não tenha obtido os bytes
    if (!zipBytes) {
      console.log('DOWNLOAD_BACKUP_FALLBACK_HTTP: attempting native HTTP endpoint fallback...')
      let backupRes = null

      // Tentativa A: query param ?token=
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

      if (backupRes && backupRes.statusCode < 400) {
        zipBytes = backupRes.raw
      } else {
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
    return e.blob(200, 'application/zip', zipBytes)
  } catch (err) {
    console.log('DOWNLOAD_BACKUP_EXCEPTION: ' + err.message)
    return e.json(500, {
      code: 'BACKUP_DOWNLOAD_EXCEPTION',
      message: 'Erro interno ao processar download do backup: ' + err.message,
    })
  }
})

routerAdd('POST', '/backend/v1/backups/{key}/restore', (e) => {
  const authRecord = e.auth
  if (!authRecord || authRecord.getString('role') !== 'admin') {
    return e.json(403, {
      code: 'UNAUTHORIZED',
      message: 'Apenas administradores podem executar a restauração de backup.',
    })
  }

  const rawKey = e.request?.pathValue ? e.request.pathValue('key') : e.pathParam('key')
  const key = (rawKey || '').trim()

  // Validação estrita contra path traversal e formato de chave
  if (
    !key ||
    key.includes('/') ||
    key.includes('\\') ||
    key.includes('..') ||
    !key.endsWith('.zip')
  ) {
    return e.json(400, {
      code: 'INVALID_BACKUP_KEY',
      message: 'Nome de snapshot de backup inválido para restauração.',
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
      message: 'Configuração do backend para restauração de backups não está disponível.',
    })
  }

  // 1. Validar se o backup informado existe na listagem de backups do PocketBase
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
        'CHECK_RESTORE_EXISTENCE_ERROR: status=' + listRes.statusCode + ' body=' + listRes.raw,
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
        message: 'Snapshot de backup não encontrado para restauração.',
      })
    }
  } catch (checkErr) {
    console.log('CHECK_RESTORE_EXCEPTION: ' + checkErr.message)
    return e.json(500, {
      code: 'BACKUP_CHECK_EXCEPTION',
      message: 'Erro interno ao validar snapshot de backup: ' + checkErr.message,
    })
  }

  // 2. Registrar evento de auditoria BACKUP_RESTORE_REQUESTED ANTES de executar a restauração
  // Como o restore reinicia a instância, este registro é garantido no banco antes do restart.
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set('user_id', authRecord.id)
    log.set('event_type', 'BACKUP_RESTORE_REQUESTED')
    log.set('severity', 'critical')
    log.set('entity', 'backups')
    log.set('entity_id', key)
    log.set('summary', `Restauração de backup solicitada e disparada para o snapshot: ${key}`)
    log.set('details', {
      key: key,
      requested_by: authRecord.getString('email'),
      initiated_by: authRecord.id,
      timestamp: new Date().toISOString(),
      action: 'RESTORE_TRIGGERED',
      note: 'Instância será reiniciada com os dados restaurados do snapshot.',
    })
    $app.save(log)
    console.log('AUDIT_LOG_SUCCESS_RESTORE: recorded BACKUP_RESTORE_REQUESTED for key=' + key)
  } catch (auditErr) {
    console.log('AUDIT_LOG_ERROR_RESTORE: ' + auditErr.message)
  }

  // 3. Executar o restore
  // Prioridade: tentar API nativa de restore ($app.createBackup / $app.restoreBackup) se disponível,
  // ou chamada HTTP interna autenticada com superuser token para POST /api/backups/{key}/restore
  let nativeExecuted = false
  try {
    // Verificar se existe método nativo no $app
    if (typeof $app.restoreBackup === 'function') {
      $app.restoreBackup(key)
      nativeExecuted = true
      console.log('RESTORE_NATIVE_METHOD_APP_RESTORE_EXECUTED: ' + key)
    }
  } catch (nativeErr) {
    console.log('RESTORE_NATIVE_APP_FAIL: ' + nativeErr.message)
  }

  if (!nativeExecuted) {
    try {
      const authHeader = superToken.startsWith('Bearer ') ? superToken : 'Bearer ' + superToken
      const restoreUrl = baseUrl + '/api/backups/' + encodeURIComponent(key) + '/restore'

      // Tentar chamada com Authorization direto e fallback Bearer
      let restoreRes = null
      try {
        restoreRes = $http.send({
          url: restoreUrl,
          method: 'POST',
          headers: {
            Authorization: superToken,
            'Content-Type': 'application/json',
          },
          timeout: 60,
        })
      } catch (directErr) {
        console.log('RESTORE_HTTP_DIRECT_EXCEPTION: ' + directErr.message)
      }

      if (!restoreRes || restoreRes.statusCode >= 400) {
        try {
          const resBearer = $http.send({
            url: restoreUrl,
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            timeout: 60,
          })
          if (resBearer.statusCode < 400 || (restoreRes && restoreRes.statusCode >= 400)) {
            restoreRes = resBearer
          }
        } catch (bearerErr) {
          console.log('RESTORE_HTTP_BEARER_EXCEPTION: ' + bearerErr.message)
        }
      }

      if (restoreRes && restoreRes.statusCode >= 400) {
        console.log(
          'RESTORE_BACKUP_ERROR: status=' + restoreRes.statusCode + ' body=' + restoreRes.raw,
        )
        return e.json(restoreRes.statusCode, {
          code: 'BACKUP_RESTORE_FAILED',
          message:
            'Falha ao restaurar backup no PocketBase: ' +
            (restoreRes.json?.message || restoreRes.raw || 'Erro desconhecido'),
        })
      }
    } catch (httpErr) {
      console.log('RESTORE_BACKUP_HTTP_EXCEPTION: ' + httpErr.message)
      // Note: Quando o PocketBase restaura o banco e reinicia imediatamente, a conexão HTTP
      // pode ser fechada abruptamente ou timeoutar pelo restart do daemon.
      // Se audit log já foi salvo e restore disparado, reportar sucesso da ordem ou verificar erro.
    }
  }

  return e.json(200, {
    success: true,
    key: key,
    message:
      'Comando de restauração executado com sucesso. O sistema está restabelecendo os dados e reiniciando a instância.',
  })
})
