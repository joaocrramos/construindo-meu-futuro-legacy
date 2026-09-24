// Bootstrap removido: o administrador inicial é provisionado manualmente pelo proprietário no painel de superusuário (ADR-017 revisada).
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
  },
)
