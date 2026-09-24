/**
 * Hook de autenticação e governança de sessão (ADR-019 / ADR-006).
 *
 * Registra o timestamp `last_login` a cada autenticação bem-sucedida de usuário
 * na collection `users` (_pb_users_auth_).
 *
 * Mecanismo:
 * - O PocketBase dispara `onRecordAuthRequest(callback, ...collections)` ao processar
 *   qualquer método de autenticação de record (authWithPassword, authWithOAuth2, authRefresh).
 * - Ao chamar `e.next()`, o PocketBase autentica o usuário e popula `e.record`.
 * - Se `e.record` pertencer à collection 'users', atualizamos `last_login` com o timestamp ISO UTC atual.
 * - Falhas ao persistir `last_login` NUNCA devem abortar a resposta de login (resiliência total).
 */

onRecordAuthRequest((e) => {
  e.next()

  try {
    const record = e.record
    if (!record) {
      return
    }

    // Garante que só opera na collection users
    const colName = record.collection() ? record.collection().name : ''
    if (colName !== 'users') {
      return
    }

    // Data/hora atual em formato ISO / UTC aceito pelo campo date do PocketBase
    const nowIso = new Date().toISOString()
    record.set('last_login', nowIso)

    // Salva o registro atualizado no banco via $app
    $app.save(record)
  } catch (err) {
    // Falha ao gravar last_login NUNCA deve bloquear o login do usuário
    console.error('Falha não-bloqueante ao atualizar last_login do usuario:', err)
  }
}, 'users')
