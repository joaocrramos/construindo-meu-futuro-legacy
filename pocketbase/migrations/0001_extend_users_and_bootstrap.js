migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar novos campos no collection users se não existirem
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['admin', 'user'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('status')) {
      users.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          values: ['active', 'suspended', 'pending'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('must_change_password')) {
      users.fields.add(
        new BoolField({
          name: 'must_change_password',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('phone')) {
      users.fields.add(
        new TextField({
          name: 'phone',
          required: false,
          max: 30,
        }),
      )
    }

    if (!users.fields.getByName('last_login')) {
      users.fields.add(
        new DateField({
          name: 'last_login',
          required: false,
        }),
      )
    }

    // Atualizar regras de RLS do collection users conforme DATABASE_SCHEMA.md
    users.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.createRule = "@request.auth.role = 'admin'"
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.deleteRule = "@request.auth.role = 'admin'"

    app.save(users)

    // 2. Bootstrap do Administrador a partir do segredo BOOTSTRAP_ADMIN_EMAIL
    let adminEmail = ''
    try {
      if (
        typeof $secrets !== 'undefined' &&
        $secrets &&
        typeof $secrets.has === 'function' &&
        $secrets.has('BOOTSTRAP_ADMIN_EMAIL')
      ) {
        adminEmail = $secrets.get('BOOTSTRAP_ADMIN_EMAIL') || ''
      }
    } catch (_) {}
    if (!adminEmail) {
      try {
        if (typeof $os !== 'undefined' && $os && typeof $os.getenv === 'function') {
          adminEmail = $os.getenv('BOOTSTRAP_ADMIN_EMAIL') || ''
        }
      } catch (_) {}
    }

    if (adminEmail && adminEmail.trim() !== '') {
      const cleanEmail = adminEmail.trim().toLowerCase()
      let existingUser = null
      try {
        existingUser = app.findAuthRecordByEmail('_pb_users_auth_', cleanEmail)
      } catch (_) {
        existingUser = null
      }

      if (!existingUser) {
        const record = new Record(users)
        record.setEmail(cleanEmail)
        // Senha aleatória de alta entropia inutilizável, sem log e sem exibição
        const unusablePassword = $security.randomString(40) + 'A1!'
        record.setPassword(unusablePassword)
        record.setVerified(false)
        record.set('name', 'Administrador')
        record.set('role', 'admin')
        record.set('status', 'pending')
        record.set('must_change_password', true)
        app.save(record)
      }
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Reversão dos campos customizados
    const fieldsToRemove = ['role', 'status', 'must_change_password', 'phone', 'last_login']
    for (const fieldName of fieldsToRemove) {
      const field = users.fields.getByName(fieldName)
      if (field) {
        users.fields.removeByName(fieldName)
      }
    }

    // Reversão das regras RLS para o padrão nativo
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'

    app.save(users)

    // Remover usuário admin criado no bootstrap se existir
    let adminEmail = ''
    try {
      if (
        typeof $secrets !== 'undefined' &&
        $secrets &&
        typeof $secrets.has === 'function' &&
        $secrets.has('BOOTSTRAP_ADMIN_EMAIL')
      ) {
        adminEmail = $secrets.get('BOOTSTRAP_ADMIN_EMAIL') || ''
      }
    } catch (_) {}
    if (!adminEmail) {
      try {
        if (typeof $os !== 'undefined' && $os && typeof $os.getenv === 'function') {
          adminEmail = $os.getenv('BOOTSTRAP_ADMIN_EMAIL') || ''
        }
      } catch (_) {}
    }

    if (adminEmail && adminEmail.trim() !== '') {
      const cleanEmail = adminEmail.trim().toLowerCase()
      try {
        const record = app.findAuthRecordByEmail('_pb_users_auth_', cleanEmail)
        app.delete(record)
      } catch (_) {}
    }
  },
)
